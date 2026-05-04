import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import { buildSubject, buildPreheader } from "./subject.js";
import { createTranslator } from "./i18n.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATE = path.join(__dirname, "digest.html");
const TRANSACTIONAL_TEMPLATE = path.join(__dirname, "transactional.html");
const BRANDING_DIR = path.join(__dirname, "branding");
const DEFAULT_BRAND_FILE = path.join(BRANDING_DIR, "default.json");

Handlebars.registerHelper("eq", (a, b) => a === b);

let cachedTemplate = null;
let cachedTemplatePath = null;
let cachedDefaultBrand = null;

async function loadTemplate(templatePath) {
  if (cachedTemplate && cachedTemplatePath === templatePath) return cachedTemplate;
  const src = await fs.readFile(templatePath, "utf8");
  cachedTemplate = Handlebars.compile(src, { noEscape: false });
  cachedTemplatePath = templatePath;
  return cachedTemplate;
}

async function loadBrandFile(pathOrName) {
  const candidate = path.isAbsolute(pathOrName)
    ? pathOrName
    : pathOrName.includes(path.sep) || pathOrName.endsWith(".json")
      ? path.resolve(pathOrName)
      : path.join(BRANDING_DIR, `${pathOrName}.json`);
  const raw = await fs.readFile(candidate, "utf8");
  return JSON.parse(raw);
}

async function loadDefaultBrand() {
  if (cachedDefaultBrand) return cachedDefaultBrand;
  const raw = await fs.readFile(DEFAULT_BRAND_FILE, "utf8");
  cachedDefaultBrand = JSON.parse(raw);
  return cachedDefaultBrand;
}

function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge(base, overrides) {
  if (!isPlainObject(overrides)) return overrides;
  const out = { ...base };
  for (const [k, v] of Object.entries(overrides)) {
    out[k] = isPlainObject(v) && isPlainObject(base?.[k]) ? deepMerge(base[k], v) : v;
  }
  return out;
}

/**
 * Resolve a brand override into a fully-populated brand object merged on top
 * of branding/default.json. Accepts: undefined (defaults only), a string
 * (bare name → branding/<name>.json, path → that file), or a partial brand
 * object (merged directly).
 * @param {string|object|undefined} brand
 * @returns {Promise<object>} merged brand config
 */
export async function resolveBrand(brand) {
  const defaults = await loadDefaultBrand();
  if (!brand) return defaults;
  const overrides = typeof brand === "string" ? await loadBrandFile(brand) : brand;
  return deepMerge(defaults, overrides);
}

function stripHtmlComments(html) {
  return html
    .replace(/\r\n/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^[ \t]+$/gm, "")
    .replace(/\n{2,}/g, "\n");
}

/**
 * Resolve catalog keys for an event so the template can render it without
 * knowing which strings are translatable. Known types look up their badge
 * + headline (+ reason_label for withdrawals) from the catalog; unknown types
 * fall back to the payload's own `badge` / `headline` if supplied (the
 * escape hatch for admin-configured events). Both paths hand through to the
 * same template block, which treats the fields as pre-localized strings.
 */
function localizeEvent(t, event) {
  const normalizedType =
    event.type === "profile_withdrawn" ? "proposal_withdrawn" : event.type;
  const typeKey = `body.event.${normalizedType}`;
  const localized = {
    ...event,
    type: normalizedType,
    badgeLabel: t(`${typeKey}.badge`),
    headline: t(`${typeKey}.headline`, event),
  };
  if (normalizedType === "proposal_withdrawn") {
    localized.reasonLabel = t(`${typeKey}.reason_label`);
    localized.commentLabel = t(`${typeKey}.comment_label`);
  }
  return localized;
}

/**
 * Pre-resolve every template-chrome string into a flat `t` object. The
 * template reads these via triple-brace (`{{{t.x}}}`) since some values
 * embed trusted HTML (<strong>) from the catalog.
 */
function buildChrome(t, data, brand) {
  const { summary } = data;
  const platformName = brand.platformName;
  const period = summary.period;
  return {
    locale: t.locale,
    title: t("body.title", { platformName }),
    headerLabel: t("body.header.digest_label", { period }),
    summary: t("body.summary", summary),
    labelVote: t("body.label.vote"),
    labelProposal: t("body.label.proposal"),
    ctaViewProposal: t("body.cta.view_proposal"),
    ctaViewResults: t("body.cta.view_results"),
    footer: {
      receivingNote: t("body.footer.receiving_note", { period, platformName }),
      managePreferences: t("body.footer.manage_preferences"),
      unsubscribe: t("body.footer.unsubscribe"),
      separator: t("body.footer.separator"),
    },
  };
}

/**
 * Fill in derived fields so fixtures can stay minimal: derive `summary`
 * (totals + plural flags + period strings), localize each event, and build
 * the default preheader. The translator is required — it owns every piece of
 * user-visible copy.
 * @param {object} fixture - raw fixture payload
 * @param {Function} t - translator from createTranslator
 * @returns {object} render context minus `brand` + `t` chrome
 */
export function hydrate(fixture, t) {
  const votes = (fixture.votes ?? []).map((vote) => ({
    ...vote,
    proposals: (vote.proposals ?? []).map((proposal) => ({
      ...proposal,
      events: (proposal.events ?? []).map((event) => localizeEvent(t, event)),
    })),
  }));

  const totalVotes = votes.length;
  const totalEvents = votes.reduce(
    (sum, vote) =>
      sum +
      vote.proposals.reduce(
        (innerSum, proposal) => innerSum + proposal.events.length,
        0,
      ),
    0,
  );

  const period = fixture.period ?? "6h";
  const periodVerbose =
    fixture.periodVerbose ?? t.raw(`body.periodVerbose.${period}`);

  const summary = {
    period,
    periodVerbose,
    totalEvents,
    totalVotes,
    plural: totalEvents !== 1,
    plural_votes: totalVotes !== 1,
    ...(fixture.summary ?? {}),
  };

  const data = {
    summary,
    votes,
    preferencesUrl:
      fixture.preferencesUrl ?? "https://ekklesia.example/preferences",
    unsubscribeUrl:
      fixture.unsubscribeUrl ?? "https://ekklesia.example/unsubscribe",
    preheader: fixture.preheader,
  };

  if (!data.preheader) {
    data.preheader = buildPreheader(data, t);
  }

  return data;
}

/**
 * Render a digest email from a fixture JSON file.
 * @param {string} fixturePath - absolute path to the fixture file
 * @param {object} [options]
 * @param {string} [options.templatePath] - override the template location
 * @param {string|object} [options.brand] - brand name, path, or partial object
 * @param {string} [options.locale] - BCP 47 tag for catalog resolution.
 *   Falls back to `fixture.locale`, then "en".
 * @param {string} [options.platformName] - explicit platform-name override
 *   for the subject line. Falls back to the resolved brand's platformName.
 * @returns {Promise<{html: string, subject: string, preheader: string, data: object, locale: string}>}
 */
export async function renderDigest(fixturePath, options = {}) {
  const templatePath = options.templatePath ?? DEFAULT_TEMPLATE;
  const [templateFn, fixtureRaw, brand] = await Promise.all([
    loadTemplate(templatePath),
    fs.readFile(fixturePath, "utf8"),
    resolveBrand(options.brand),
  ]);
  const fixture = JSON.parse(fixtureRaw);
  const locale = options.locale ?? fixture.locale ?? "en";
  const t = await createTranslator(locale);

  const data = hydrate(fixture, t);
  data.brand = brand;
  data.t = buildChrome(t, data, brand);

  const html = stripHtmlComments(templateFn(data));
  const subject = buildSubject(data, {
    platformName: options.platformName ?? brand.platformName,
    t,
  });
  return {
    html,
    subject,
    preheader: data.preheader,
    data,
    locale: t.locale,
  };
}

export async function renderDigestFromPayload(fixture, options = {}) {
  const templatePath = options.templatePath ?? DEFAULT_TEMPLATE;
  const [templateFn, brand] = await Promise.all([
    loadTemplate(templatePath),
    resolveBrand(options.brand),
  ]);
  const locale = options.locale ?? fixture.locale ?? "en";
  const t = await createTranslator(locale);

  const data = hydrate(fixture, t);
  data.brand = brand;
  data.t = buildChrome(t, data, brand);

  const html = stripHtmlComments(templateFn(data));
  const subject = buildSubject(data, {
    platformName: options.platformName ?? brand.platformName,
    t,
  });

  return {
    html,
    subject,
    preheader: data.preheader,
    data,
    locale: t.locale,
  };
}

export async function renderInstantDigestFromPayload(fixture, options = {}) {
  const templatePath = options.templatePath ?? DEFAULT_TEMPLATE;
  const [templateFn, brand] = await Promise.all([
    loadTemplate(templatePath),
    resolveBrand(options.brand),
  ]);
  const locale = options.locale ?? fixture.locale ?? "en";
  const t = await createTranslator(locale);

  const data = hydrate(fixture, t);
  data.brand = brand;
  data.t = buildChrome(t, data, brand);

  const firstVote = data.votes?.[0];
  const firstProposal = firstVote?.proposals?.[0];
  const firstEvent = firstProposal?.events?.[0];
  if (!firstEvent?.type) {
    throw new Error("renderInstantDigestFromPayload requires at least one event");
  }

  const eventType = String(firstEvent.type).trim();
  const subject = t.raw(`subject.instant.${eventType}`, {
    platformName: options.platformName ?? brand.platformName,
    proposalTitle: firstProposal?.title ?? "",
    voteName: firstVote?.name ?? "",
  });
  const html = stripHtmlComments(templateFn(data));

  return {
    html,
    subject,
    preheader: data.preheader,
    data,
    locale: t.locale,
  };
}

/**
 * Render a simple transactional email with brand-aware chrome.
 * @param {object} options
 * @param {string} options.heading
 * @param {string} options.body
 * @param {string} options.ctaLabel
 * @param {string} options.ctaUrl
 * @param {string} [options.note]
 * @param {string|object} [options.brand]
 * @returns {Promise<{html: string, brand: object}>}
 */
export async function renderTransactional(options = {}) {
  const {
    heading = "",
    body = "",
    ctaLabel = "",
    ctaUrl = "",
    note = "",
    brand: brandOverride,
  } = options;
  const [templateFn, brand] = await Promise.all([
    loadTemplate(TRANSACTIONAL_TEMPLATE),
    resolveBrand(brandOverride),
  ]);

  const html = stripHtmlComments(
    templateFn({
      heading,
      body,
      ctaLabel,
      ctaUrl,
      note,
      brand,
    })
  );
  return { html, brand };
}
