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

function resolveFixture(all, request) {
  if (!request) return null;
  const needle = request.endsWith(".json") ? request : `${request}.json`;
  return (
    all.find((f) => f === needle) ||
    all.find((f) => f.startsWith(request)) ||
    null
  );
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

async function runOne(fixtureFile, { send, platformName }) {
  const fixturePath = path.join(FIXTURES_DIR, fixtureFile);
  const base = path.basename(fixtureFile, ".json");

  const { html, subject, preheader } = await renderDigest(fixturePath, {
    templatePath: TEMPLATE_PATH,
    platformName,
  });

  await fs.mkdir(OUT_DIR, { recursive: true });
  const previewPath = path.join(OUT_DIR, `${base}.html`);
  await fs.writeFile(previewPath, html);

  console.log(`\n[${base}]`);
  console.log(`  subject:   ${subject}`);
  console.log(`  preheader: ${preheader}`);
  console.log(`  preview:   ${previewPath}`);

  if (!send) return { base, sent: false };

  const cfg = mailtrapConfig();
  if (!cfg.token || !cfg.inboxId) {
    console.log(
      "  skip send: MAILTRAP_TOKEN and/or MAILTRAP_INBOX_ID not set",
    );
    return { base, sent: false };
  }

  const result = await sendToMailtrap({
    subject,
    html,
    to: { email: cfg.to },
    from: { email: cfg.from, name: cfg.fromName },
    inboxId: cfg.inboxId,
    token: cfg.token,
    category: base,
  });
  console.log(`  sent:      ${JSON.stringify(result)}`);
  return { base, sent: true, result };
}

function printUsage(fixtures) {
  console.log("Digest email test runner\n");
  console.log("Available scenarios:");
  for (const f of fixtures) console.log(`  ${f}`);
  console.log("\nUsage:");
  console.log("  node __emails/test.js --all");
  console.log("  node __emails/test.js --scenario=04-few-single-vote");
  console.log("  node __emails/test.js --all --preview      # render-only, no send");
  console.log(
    "  node __emails/test.js --all --platformName='Hydra Voting'",
  );
}

async function main() {
  const args = parseArgs(process.argv);
  const fixtures = await listFixtures();

  if (!fixtures.length) {
    console.error(`No fixtures found in ${FIXTURES_DIR}`);
    process.exit(1);
  }

  const runAll = Boolean(args.get("all"));
  const scenarioArg = args.get("scenario");
  const previewOnly = Boolean(args.get("preview") || args.get("no-send"));
  const platformName = args.get("platformName") || undefined;

  if (!runAll && !scenarioArg) {
    printUsage(fixtures);
    return;
  }

  let targets;
  if (runAll) {
    targets = fixtures;
  } else {
    const match = resolveFixture(fixtures, scenarioArg);
    if (!match) {
      console.error(`No fixture matches "${scenarioArg}"`);
      printUsage(fixtures);
      process.exit(1);
    }
    targets = [match];
  }

  const delayMs = Number(args.get("delay") ?? 750);
  for (let i = 0; i < targets.length; i++) {
    if (i > 0 && !previewOnly && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    await runOne(targets[i], { send: !previewOnly, platformName });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
