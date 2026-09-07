import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import { buildSubject, buildPreheader, VOTE_SUBJECT_EVENTS } from "./subject.js";
import { createTranslator } from "./i18n.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "templates");
const DEFAULT_TEMPLATE = path.join(TEMPLATES_DIR, "digest.html");
const INSTANT_TEMPLATE = path.join(TEMPLATES_DIR, "instant.html");
const TRANSACTIONAL_TEMPLATE = path.join(TEMPLATES_DIR, "transactional.html");
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

function localizeEvent(t, event) {
  const normalizedType = event.type === "profile_withdrawn" ? "proposal_withdrawn" : event.type;
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

function buildTransactionalChrome(t, brand) {
  const platformName = brand.platformName;
  return {
    locale: t.locale,
    title: t("body.title", { platformName }),
    footer: {
      receivingNote: t("body.footer.transactional_receiving_note", { platformName }),
      managePreferences: t("body.footer.manage_preferences"),
      unsubscribe: t("body.footer.unsubscribe"),
      separator: t("body.footer.separator"),
    },
  };
}

function buildInstantChrome(t, brand) {
  const platformName = brand.platformName;
  return {
    locale: t.locale,
    title: t("body.title", { platformName }),
    labelVote: t("body.label.vote"),
    labelProposal: t("body.label.proposal"),
    ctaViewProposal: t("body.cta.view_proposal"),
    ctaVoteNow: t("body.cta.vote_now"),
    ctaViewResults: t("body.cta.view_results"),
    footer: {
      receivingNote: t("body.footer.instant_receiving_note", { platformName }),
      managePreferences: t("body.footer.manage_preferences"),
      unsubscribe: t("body.footer.unsubscribe"),
      separator: t("body.footer.separator"),
    },
  };
}

function buildInstantPreheader(data, brand, t) {
  const firstVote = data.votes?.[0];
  const firstProposal = firstVote?.proposals?.[0];
  const firstEvent = firstProposal?.events?.[0] ?? firstVote?.events?.[0];
  const contextTitle =
    firstEvent && VOTE_SUBJECT_EVENTS.has(firstEvent.type)
      ? (firstVote?.name ?? "").trim()
      : (firstProposal?.title ?? "").trim();
  return t.raw("preheader.instant", {
    platformName: brand.platformName,
    contextTitle: contextTitle || t("body.header.instant_label"),
  });
}

function getFrontendBaseUrl() {
  return String(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
}

export function hydrate(fixture, t) {
  const votes = (fixture.votes ?? []).map((vote) => ({
    ...vote,
    events: (vote.events ?? []).map((event) => localizeEvent(t, event)),
    proposals: (vote.proposals ?? []).map((proposal) => ({
      ...proposal,
      events: (proposal.events ?? []).map((event) => localizeEvent(t, event)),
    })),
  }));

  const totalVotes = votes.length;
  const totalEvents = votes.reduce(
    (sum, vote) =>
      sum +
      vote.events.length +
      vote.proposals.reduce((innerSum, proposal) => innerSum + proposal.events.length, 0),
    0,
  );

  const period = fixture.period ?? "6h";
  const periodVerbose = fixture.periodVerbose ?? t.raw(`body.periodVerbose.${period}`);

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
    preferencesUrl: fixture.preferencesUrl ?? "https://ekklesia.example/preferences",
    unsubscribeUrl: fixture.unsubscribeUrl ?? "https://ekklesia.example/unsubscribe",
    preheader: fixture.preheader,
  };

  if (!data.preheader) {
    data.preheader = buildPreheader(data, t);
  }

  return data;
}

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
  const templatePath = options.templatePath ?? INSTANT_TEMPLATE;
  const [templateFn, brand] = await Promise.all([
    loadTemplate(templatePath),
    resolveBrand(options.brand),
  ]);
  const locale = options.locale ?? fixture.locale ?? "en";
  const t = await createTranslator(locale);

  const data = hydrate(fixture, t);
  data.brand = brand;
  data.t = buildInstantChrome(t, brand);
  data.preheader = buildInstantPreheader(data, brand, t);

  const firstVote = data.votes?.[0];
  const firstProposal = firstVote?.proposals?.[0];
  const firstEvent = firstProposal?.events?.[0] ?? firstVote?.events?.[0];
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

export async function renderTransactional(options = {}) {
  const {
    heading = "",
    body = "",
    ctaLabel = "",
    ctaUrl = "",
    note = "",
    brand: brandOverride,
    locale: localeOpt = "en",
    preheader: preheaderOpt,
    preferencesUrl: preferencesUrlOpt,
    unsubscribeUrl: unsubscribeUrlOpt,
    transactionalType,
    showUnsubscribe = true,
  } = options;
  const [templateFn, brand] = await Promise.all([
    loadTemplate(TRANSACTIONAL_TEMPLATE),
    resolveBrand(brandOverride),
  ]);

  const t = await createTranslator(localeOpt);
  const chrome = buildTransactionalChrome(t, brand);
  const platformName = brand.platformName;

  const base = getFrontendBaseUrl();
  const preferencesUrl = preferencesUrlOpt ?? `${base}/dashboard`;
  const unsubscribeUrl = unsubscribeUrlOpt ?? `${base}/dashboard`;

  let preheader = preheaderOpt;
  if (preheader == null || preheader === "") {
    const key =
      transactionalType === "verify_email"
        ? "preheader.transactional.verify_email"
        : "preheader.transactional.default";
    preheader = t.raw(key, { platformName });
  }

  const html = stripHtmlComments(
    templateFn({
      heading,
      body,
      ctaLabel,
      ctaUrl,
      note,
      brand,
      t: chrome,
      preheader,
      preferencesUrl,
      unsubscribeUrl,
      showUnsubscribe,
    }),
  );
  return { html, brand };
}
