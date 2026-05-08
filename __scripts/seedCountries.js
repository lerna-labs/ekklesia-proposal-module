/**
 * Seed the countries collection from __scripts/countries.json.
 * Each entry must have: name (English full name), code (ISO 3166-1 alpha-2, e.g. "US").
 *
 * Usage (from project root):
 *   node __scripts/seedCountries.js
 * Or (from __scripts):
 *   node seedCountries.js
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
import { Country } from "../schema/Country.js";

const COUNTRIES_JSON_PATH = path.join(__dirname, "countries.json");

async function seedCountries() {
    let data;
    try {
        const raw = readFileSync(COUNTRIES_JSON_PATH, "utf8");
        data = JSON.parse(raw);
    } catch (err) {
        if (err.code === "ENOENT") {
            console.error(`Missing ${COUNTRIES_JSON_PATH}. Create it with an array of { "name": "English name", "code": "XX" }.`);
        } else {
            console.error("Failed to read or parse countries.json:", err.message);
        }
        process.exit(1);
    }

    if (!Array.isArray(data)) {
        console.error("countries.json must be a JSON array of { name, code } objects.");
        process.exit(1);
    }

    const entries = data
        .map((item) => {
            const name = (item.name ?? "").trim();
            const code = (item.code ?? item["alpha-2"] ?? "").toString().trim().toUpperCase();
            if (!name || !code || code.length !== 2) return null;
            return { name, code };
        })
        .filter(Boolean);

    if (entries.length === 0) {
        console.error("No valid country entries (name + 2-letter code) in countries.json.");
        process.exit(1);
    }

    await connectToDatabase();

    await Country.deleteMany({});
    await Country.insertMany(entries);

    await disconnectFromDatabase();
    console.log(`Seeded ${entries.length} countries.`);
}

seedCountries().catch((err) => {
    console.error(err);
    process.exit(1);
});
