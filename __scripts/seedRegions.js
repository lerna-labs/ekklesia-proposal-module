/**
 * Seed the regions collection from __scripts/regions.json.
 * File must be a JSON array of region name strings.
 *
 * Usage (from project root):
 *   node __scripts/seedRegions.js
 * Or (from __scripts):
 *   node seedRegions.js
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.development") });

import { loadEnvironmentVariables } from "../helper/envLoader.js";
loadEnvironmentVariables();

import { connectToDatabase, disconnectFromDatabase } from "../helper/dbManager.js";
import { Region } from "../schema/Region.js";

const REGIONS_JSON_PATH = path.join(__dirname, "regions.json");

async function seedRegions() {
    let data;
    try {
        const raw = readFileSync(REGIONS_JSON_PATH, "utf8");
        data = JSON.parse(raw);
    } catch (err) {
        if (err.code === "ENOENT") {
            console.error(`Missing ${REGIONS_JSON_PATH}. Create it with a JSON array of region name strings.`);
        } else {
            console.error("Failed to read or parse regions.json:", err.message);
        }
        process.exit(1);
    }

    if (!Array.isArray(data)) {
        console.error("regions.json must be a JSON array of strings (region names).");
        process.exit(1);
    }

    const names = [];
    const seen = new Set();
    for (const item of data) {
        if (typeof item !== "string") {
            console.error("regions.json must be a JSON array of strings only.");
            process.exit(1);
        }
        const name = item.trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) {
            console.error(`Duplicate region name in regions.json: "${name}"`);
            process.exit(1);
        }
        seen.add(key);
        names.push(name);
    }

    if (names.length === 0) {
        console.error("No valid region names in regions.json.");
        process.exit(1);
    }

    await connectToDatabase();

    await Region.deleteMany({});
    await Region.insertMany(names.map((name) => ({ name })));

    await disconnectFromDatabase();
    console.log(`Seeded ${names.length} regions.`);
}

seedRegions().catch((err) => {
    console.error(err);
    process.exit(1);
});
