/**
 * Import categories from categories.csv for a given vote.
 * Uses only Pillar (title) and Pillar description (description), deduplicated.
 *
 * Set VOTE_ID below to the vote ObjectId, then run:
 *   node __setup/importCategories.js
 * From __setup: node importCategories.js
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
import { Category } from "../schema/Category.js";

/** Set this to the vote ObjectId you want to import categories for. */
const VOTE_ID = null;

const CSV_PATH = path.join(__dirname, "categories.csv");

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

/**
 * Import categories from categories.csv for the given voteId.
 * Uses only Pillar (title) and Pillar description (description), deduplicated.
 * @param {import('mongoose').Types.ObjectId} voteId
 * @returns {Promise<import('../schema/Category.js').Category[]>}
 */
export async function importCategoriesForVote(voteId) {
    const raw = readFileSync(CSV_PATH, "utf8");
    const lines = raw.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
        throw new Error("categories.csv must have a header row and at least one data row.");
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

    // Unique pillars: key = Pillar, value = { title, description }
    const seen = new Map();
    for (const row of rows) {
        const pillar = (row["Pillar"] ?? "").trim();
        if (!pillar) continue;
        if (seen.has(pillar)) continue;
        const pillarDesc = (row["Pillar description"] ?? "").trim();
        seen.set(pillar, { title: pillar, description: pillarDesc || "" });
    }

    const categories = [];
    let sortOrder = 0;
    for (const { title, description } of seen.values()) {
        sortOrder += 1;
        const cat = await Category.create({
            voteId,
            title,
            description: description ?? "",
            sortOrder,
        });
        categories.push(cat);
    }
    return categories;
}

async function run() {
    if (!VOTE_ID) {
        console.error("Set VOTE_ID in __setup/importCategories.js to the vote ObjectId you want to import categories for.");
        process.exit(1);
    }
    try {
        console.log("Connecting to database...");
        await connectToDatabase();
        console.log("Importing categories from categories.csv...");
        const categories = await importCategoriesForVote(VOTE_ID);
        console.log(`Imported ${categories.length} categories for vote ${VOTE_ID}.`);
    } catch (error) {
        console.error("Error importing categories:", error);
        throw error;
    } finally {
        console.log("Disconnecting from database...");
        await disconnectFromDatabase();
        process.exit(0);
    }
}

const isMain =
    process.argv[1] &&
    path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
if (isMain) run();
