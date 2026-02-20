/**
 * Import categories from __setup/categories.csv into the Category collection.
 * Optionally loads __setup/kpis.csv to set category metaData.kpis (Focus Area → Associated KPIs).
 * categories.csv is semicolon-delimited. kpis.csv is comma-delimited.
 *
 * Usage (from project root):
 *   VOTE_ID=<mongodb-object-id> node __setup/importCategories.js
 * Or (from __setup):
 *   VOTE_ID=<mongodb-object-id> node importCategories.js
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.development") });

import { connectToDatabase, disconnectFromDatabase } from "../helper/dbManager.js";
import { Category } from "../schema/Category.js";
import mongoose from "mongoose";

const CSV_PATH = path.join(__dirname, "categories.csv");
const KPIS_CSV_PATH = path.join(__dirname, "kpis.csv");

/** Parse comma-delimited CSV line (for kpis.csv), respecting double-quoted fields. */
function parseCommaCsvLine(line) {
    const fields = [];
    let i = 0;
    while (i < line.length) {
        if (line[i] === '"') {
            let searchStart = i + 1;
            while (searchStart < line.length) {
                const next = line.indexOf('"', searchStart);
                if (next === -1) {
                    fields.push(line.slice(i + 1).replace(/""/g, '"'));
                    i = line.length;
                    break;
                }
                if (line[next + 1] === '"') {
                    searchStart = next + 2;
                    continue;
                }
                fields.push(line.slice(i + 1, next).replace(/""/g, '"'));
                i = next + 1;
                if (line[i] === ",") i++;
                break;
            }
            continue;
        }
        const sep = line.indexOf(",", i);
        if (sep === -1) {
            fields.push(line.slice(i).trim());
            break;
        }
        fields.push(line.slice(i, sep).trim());
        i = sep + 1;
    }
    return fields;
}

/** Returns Map of Focus Area title -> string[] of KPI names. Empty map if kpis.csv missing. */
function loadKpisByFocusArea() {
    try {
        const raw = readFileSync(KPIS_CSV_PATH, "utf8");
        const lines = raw.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) return new Map();
        const header = parseCommaCsvLine(lines[0]);
        const focusIdx = header.findIndex((h) => h.trim() === "Focus Area");
        const kpisIdx = header.findIndex((h) => (h && h.trim()) === "Associated KPIs");
        if (focusIdx === -1 || kpisIdx === -1) return new Map();
        const map = new Map();
        for (let i = 1; i < lines.length; i++) {
            const values = parseCommaCsvLine(lines[i]);
            const focusArea = (values[focusIdx] ?? "").trim();
            if (!focusArea) continue;
            const kpisRaw = (values[kpisIdx] ?? "").trim();
            const kpis = kpisRaw ? kpisRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
            if (kpis.length === 0) continue; // skip pillar-only rows (no KPIs listed)
            map.set(focusArea, kpis);
        }
        return map;
    } catch {
        return new Map();
    }
}

/** Get KPIs for a category title: exact match, or first focus area that is a prefix of title. */
function getKpisForTitle(title, kpisByFocusArea) {
    const exact = kpisByFocusArea.get(title);
    if (exact !== undefined) return exact;
    for (const [focusArea, kpis] of kpisByFocusArea) {
        if (title.startsWith(focusArea) || focusArea.startsWith(title)) return kpis;
    }
    return [];
}

function getVoteId() {
    const id = process.env.VOTE_ID?.trim();
    if (!id) {
        console.error("VOTE_ID is required. Example: VOTE_ID=507f1f77bcf86cd799439011 node __setup/importCategories.js");
        process.exit(1);
    }
    if (!mongoose.Types.ObjectId.isValid(id) || id.length !== 24) {
        console.error("VOTE_ID must be a valid 24-character MongoDB ObjectId.");
        process.exit(1);
    }
    return new mongoose.Types.ObjectId(id);
}

/**
 * Parse a semicolon-delimited CSV line, respecting double-quoted fields
 * (quoted fields may contain semicolons).
 */
function parseCsvLine(line) {
    const fields = [];
    let i = 0;
    while (i < line.length) {
        if (line[i] === '"') {
            let searchStart = i + 1;
            while (searchStart < line.length) {
                const next = line.indexOf('"', searchStart);
                if (next === -1) {
                    fields.push(line.slice(i + 1).replace(/""/g, '"'));
                    i = line.length;
                    break;
                }
                if (line[next + 1] === '"') {
                    searchStart = next + 2;
                    continue;
                }
                fields.push(line.slice(i + 1, next).replace(/""/g, '"'));
                i = next + 1;
                if (line[i] === ";") i++;
                break;
            }
            continue;
        }
        const sep = line.indexOf(";", i);
        if (sep === -1) {
            fields.push(line.slice(i).trim());
            break;
        }
        fields.push(line.slice(i, sep).trim());
        i = sep + 1;
    }
    return fields;
}

async function importCategories() {
    const voteId = getVoteId();
    const kpisByFocusArea = loadKpisByFocusArea();

    const raw = readFileSync(CSV_PATH, "utf8");
    const lines = raw.split(/\r?\n/).filter((l) => l.trim());

    if (lines.length < 2) {
        console.error("CSV must have a header row and at least one data row.");
        process.exit(1);
    }

    const header = parseCsvLine(lines[0]);
    const dataRows = lines.slice(1);

    const rows = dataRows.map((line) => {
        const values = parseCsvLine(line);
        const row = {};
        header.forEach((h, i) => {
            row[h] = values[i] ?? "";
        });
        return row;
    });

    await connectToDatabase();

    let created = 0;
    let sortOrder = 0;

    for (const row of rows) {
        const title = (row["Focus Area"] ?? "").trim();
        if (!title) continue;

        sortOrder += 1;
        const descriptionStrategy = (row["Description / Strategy"] ?? "").trim();
        const pillarDesc = (row["Pillar description"] ?? "").trim();

        const metaData = {};
        const pillar = (row["Pillar"] ?? "").trim();
        if (pillar) metaData.pillar = pillar;
        if (pillarDesc) metaData.pillarDescription = pillarDesc;
        const hlta = (row["High level thematic area"] ?? "").trim();
        if (hlta) metaData.highLevelThematicArea = hlta;
        if (descriptionStrategy) metaData.descriptionStrategy = descriptionStrategy;
        const expectedEnhancement = (row["Expected Enhancement"] ?? "").trim();
        if (expectedEnhancement) metaData.expectedEnhancement = expectedEnhancement;
        metaData.kpis = getKpisForTitle(title, kpisByFocusArea);

        await Category.create({
            voteId,
            title,
            description: descriptionStrategy || pillarDesc || title,
            metaData: Object.keys(metaData).length ? metaData : undefined,
            sortOrder,
        });
        created++;
        console.log(`  ${created}. ${title}`);
    }

    await disconnectFromDatabase();
    console.log(`\nImported ${created} categories for vote ${voteId}`);
}

importCategories().catch((err) => {
    console.error(err);
    process.exit(1);
});
