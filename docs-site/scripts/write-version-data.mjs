#!/usr/bin/env node
// Write the module version and build date where Jekyll can read them.
//
// Jekyll has no way to read package.json, so the build writes the values it
// needs into _data/version.yml first. The version comes from the module's own
// package.json, one directory up, so the footer states which release of the
// Proposal Module the published pages describe. The file is generated, not
// committed, which keeps it tied to the build rather than to whoever last
// remembered to update a string by hand.

import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = join(here, "..");
const modulePackage = join(siteRoot, "..", "package.json");

const { version } = JSON.parse(readFileSync(modulePackage, "utf8"));
const built = new Date().toISOString().slice(0, 10);

mkdirSync(join(siteRoot, "_data"), { recursive: true });
writeFileSync(
  join(siteRoot, "_data", "version.yml"),
  `version: '${version}'\nbuilt: '${built}'\n`,
);

console.log(`_data/version.yml written: v${version}, built ${built}`);
