import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import { buildSubject, buildPreheader } from "./subject.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATE = path.join(__dirname, "digest.html");

Handlebars.registerHelper("eq", (a, b) => a === b);

let cachedTemplate = null;
let cachedTemplatePath = null;

async function loadTemplate(templatePath) {
  if (cachedTemplate && cachedTemplatePath === templatePath) return cachedTemplate;
  const src = await fs.readFile(templatePath, "utf8");
  cachedTemplate = Handlebars.compile(src, { noEscape: false });
  cachedTemplatePath = templatePath;
  return cachedTemplate;
}

function stripHtmlComments(html) {
  return html
    .replace(/\r\n/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^[ \t]+$/gm, "")
    .replace(/\n{2,}/g, "\n");
}

function verboseFor(period) {
  if (period === "24h") return "24 hours";
  if (period === "6h") return "6 hours";
  return period;
}

/**
 * Fill in derived fields so fixtures can stay minimal. Adds a `summary` object
 * (totals + plural flags + period strings) and a `preheader` string when the
 * fixture omits them.
 * @param {object} fixture - raw fixture payload
 * @returns {object} fully-populated render context
 */
export function hydrate(fixture) {
  const votes = fixture.votes ?? [];
  const totalVotes = votes.length;
  const totalEvents = votes.reduce(
    (sum, vote) =>
      sum +
      (vote.proposals ?? []).reduce(
        (innerSum, proposal) => innerSum + (proposal.events?.length ?? 0),
        0,
      ),
    0,
  );

  const period = fixture.period ?? "6h";
  const periodVerbose = fixture.periodVerbose ?? verboseFor(period);

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
    candidate: fixture.candidate ?? { displayName: "there" },
    summary,
    votes,
    preferencesUrl:
      fixture.preferencesUrl ?? "https://ekklesia.example/preferences",
    unsubscribeUrl:
      fixture.unsubscribeUrl ?? "https://ekklesia.example/unsubscribe",
    preheader: fixture.preheader,
  };

  if (!data.preheader) {
    data.preheader = buildPreheader(data);
  }

  return data;
}

/**
 * Render a digest email from a fixture JSON file.
 * @param {string} fixturePath - absolute path to the fixture file
 * @param {object} [options]
 * @param {string} [options.templatePath] - override the template location
 * @param {string} [options.platformName] - brand label for subject prefix
 * @returns {Promise<{html: string, subject: string, preheader: string, data: object}>}
 */
export async function renderDigest(fixturePath, options = {}) {
  const templatePath = options.templatePath ?? DEFAULT_TEMPLATE;
  const [templateFn, fixtureRaw] = await Promise.all([
    loadTemplate(templatePath),
    fs.readFile(fixturePath, "utf8"),
  ]);
  const fixture = JSON.parse(fixtureRaw);
  const data = hydrate(fixture);
  const html = stripHtmlComments(templateFn(data));
  const subject = buildSubject(data, { platformName: options.platformName });
  return { html, subject, preheader: data.preheader, data };
}
