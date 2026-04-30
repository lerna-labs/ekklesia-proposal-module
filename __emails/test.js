#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { loadEnvironmentVariables } from "../helper/envLoader.js";
import { renderDigest } from "./render.js";
import { sendToMailtrap } from "./mailtrap.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const FIXTURES_DIR = path.join(__dirname, "fixtures");
const BRANDING_DIR = path.join(__dirname, "branding");
const I18N_DIR = path.join(__dirname, "i18n");
const TEMPLATE_PATH = path.join(__dirname, "digest.html");
const OUT_DIR = path.join(__dirname, ".rendered");
const LOCAL_ENV_PATH = path.join(__dirname, ".env");

loadEnvironmentVariables(PROJECT_ROOT);
dotenv.config({ path: LOCAL_ENV_PATH, override: true, quiet: true });

function parseArgs(argv) {
  const out = new Map();
  for (const arg of argv.slice(2)) {
    if (!arg.startsWith("--")) continue;
    const [key, value] = arg.slice(2).split("=");
    out.set(key, value === undefined ? true : value);
  }
  return out;
}

async function listFixtures() {
  const entries = await fs.readdir(FIXTURES_DIR);
  return entries.filter((f) => f.endsWith(".json")).sort();
}

async function listBrands() {
  const entries = await fs.readdir(BRANDING_DIR);
  return entries
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.basename(f, ".json"))
    .sort();
}

async function listLocales() {
  try {
    const entries = await fs.readdir(I18N_DIR);
    return entries
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.basename(f, ".json"))
      .sort();
  } catch (err) {
    if (err.code === "ENOENT") return ["en"];
    throw err;
  }
}

function resolveFixture(all, request) {
  if (!request) return null;
  const needle = request.endsWith(".json") ? request : `${request}.json`;
  return (
    all.find((f) => f === needle) ||
    all.find((f) => f.startsWith(request)) ||
    null
  );
}

/**
 * A brand identifier passed on the CLI may be a bare name, a relative path, or
 * an absolute path to a JSON file. The output filename suffix and Mailtrap
 * category both need a short, filesystem-safe tag — reduce to the file's basename
 * without extension.
 */
function brandTag(brand) {
  if (!brand) return "default";
  const base = path.basename(String(brand));
  return base.endsWith(".json") ? base.slice(0, -5) : base;
}

async function resolveBrandList(args) {
  const brandsArg = args.get("brands");
  const brandArg = args.get("brand");

  if (brandsArg === true || brandsArg === "all") {
    return listBrands();
  }
  if (typeof brandsArg === "string") {
    return brandsArg
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (brandArg) return [brandArg];
  if (process.env.EMAIL_BRAND) return [process.env.EMAIL_BRAND];
  return ["default"];
}

async function resolveLocaleList(args) {
  const localesArg = args.get("locales");
  const localeArg = args.get("locale");

  if (localesArg === true || localesArg === "all") {
    return listLocales();
  }
  if (typeof localesArg === "string") {
    return localesArg
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (localeArg) return [localeArg];
  if (process.env.EMAIL_LOCALE) return [process.env.EMAIL_LOCALE];
  return [undefined]; // let render.js resolve (fixture.locale ?? "en")
}

function mailtrapConfig() {
  return {
    token: process.env.MAILTRAP_TOKEN,
    inboxId: process.env.MAILTRAP_INBOX_ID,
    to: process.env.MAILTRAP_TO || "inbox@ekklesia.test",
    from: process.env.MAILTRAP_FROM || "no-reply@ekklesia.test",
    fromName: process.env.MAILTRAP_FROM_NAME || "Ekklesia (sandbox)",
  };
}

async function runOne(fixtureFile, brand, locale, { send, platformName }) {
  const fixturePath = path.join(FIXTURES_DIR, fixtureFile);
  const base = path.basename(fixtureFile, ".json");
  const tag = brandTag(brand);

  const { html, subject, preheader, locale: resolvedLocale } =
    await renderDigest(fixturePath, {
      templatePath: TEMPLATE_PATH,
      platformName,
      brand,
      locale,
    });

  await fs.mkdir(OUT_DIR, { recursive: true });
  const previewPath = path.join(
    OUT_DIR,
    `${base}.${tag}.${resolvedLocale}.html`,
  );
  await fs.writeFile(previewPath, html);

  const requestedTag = locale && locale !== resolvedLocale ? `${locale}→${resolvedLocale}` : resolvedLocale;
  console.log(`\n[${base} · ${tag} · ${requestedTag}]`);
  console.log(`  subject:   ${subject}`);
  console.log(`  preheader: ${preheader}`);
  console.log(`  preview:   ${previewPath}`);

  if (!send) return { base, tag, locale: resolvedLocale, sent: false };

  const cfg = mailtrapConfig();
  if (!cfg.token || !cfg.inboxId) {
    console.log(
      "  skip send: MAILTRAP_TOKEN and/or MAILTRAP_INBOX_ID not set",
    );
    return { base, tag, locale: resolvedLocale, sent: false };
  }

  const result = await sendToMailtrap({
    subject,
    html,
    to: { email: cfg.to },
    from: { email: cfg.from, name: cfg.fromName },
    inboxId: cfg.inboxId,
    token: cfg.token,
    category: `${base}.${tag}.${resolvedLocale}`,
  });
  console.log(`  sent:      ${JSON.stringify(result)}`);
  return { base, tag, locale: resolvedLocale, sent: true, result };
}

function printUsage(fixtures, brands, locales) {
  console.log("Digest email test runner\n");
  console.log("Available scenarios:");
  for (const f of fixtures) console.log(`  ${f}`);
  console.log("\nAvailable brands:");
  for (const b of brands) console.log(`  ${b}`);
  console.log("\nAvailable locales (i18n/<tag>.json):");
  for (const l of locales) console.log(`  ${l}`);
  console.log("\nUsage:");
  console.log("  node __emails/test.js --all");
  console.log("  node __emails/test.js --scenario=04-few-single-vote");
  console.log("  node __emails/test.js --all --preview                       # render-only, no send");
  console.log("");
  console.log("  # Brands");
  console.log("  node __emails/test.js --all --brand=intersect               # single brand");
  console.log("  node __emails/test.js --all --brands=default,intersect      # fan out over brands");
  console.log("  node __emails/test.js --all --brands=all                    # every file in branding/");
  console.log("  node __emails/test.js --all --brand=/abs/path/brand.json    # bare path also works");
  console.log("");
  console.log("  # Locales — for translation contributors");
  console.log("  node __emails/test.js --all --preview --locale=es           # resolves i18n/es.json (falls back to en per key)");
  console.log("  node __emails/test.js --all --preview --locales=en,es       # render both side-by-side for review");
  console.log("  node __emails/test.js --all --preview --locales=all         # every file in i18n/");
  console.log("");
  console.log("  # Combine — quick visual matrix across brands × locales");
  console.log("  node __emails/test.js --scenario=07 --preview --brands=all --locales=all");
  console.log("");
  console.log(
    "  node __emails/test.js --all --platformName='Hydra Voting'   # subject-only override",
  );
  console.log("\nRendered previews are written to __emails/.rendered/<scenario>.<brand>.<locale>.html");
}

async function main() {
  const args = parseArgs(process.argv);
  const [fixtures, brandCatalog, localeCatalog] = await Promise.all([
    listFixtures(),
    listBrands(),
    listLocales(),
  ]);

  if (!fixtures.length) {
    console.error(`No fixtures found in ${FIXTURES_DIR}`);
    process.exit(1);
  }

  const runAll = Boolean(args.get("all"));
  const scenarioArg = args.get("scenario");
  const previewOnly = Boolean(args.get("preview") || args.get("no-send"));
  const platformName = args.get("platformName") || undefined;
  const [brands, locales] = await Promise.all([
    resolveBrandList(args),
    resolveLocaleList(args),
  ]);

  if (!runAll && !scenarioArg) {
    printUsage(fixtures, brandCatalog, localeCatalog);
    return;
  }

  let targets;
  if (runAll) {
    targets = fixtures;
  } else {
    const match = resolveFixture(fixtures, scenarioArg);
    if (!match) {
      console.error(`No fixture matches "${scenarioArg}"`);
      printUsage(fixtures, brandCatalog, localeCatalog);
      process.exit(1);
    }
    targets = [match];
  }

  const totalRenders = targets.length * brands.length * locales.length;
  console.log(
    `Running ${targets.length} scenario(s) × ${brands.length} brand(s) × ${locales.length} locale(s) = ${totalRenders} render(s)`,
  );

  const delayMs = Number(args.get("delay") ?? 750);
  let first = true;
  for (const target of targets) {
    for (const brand of brands) {
      for (const locale of locales) {
        if (!first && !previewOnly && delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        first = false;
        await runOne(target, brand, locale, {
          send: !previewOnly,
          platformName,
        });
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
