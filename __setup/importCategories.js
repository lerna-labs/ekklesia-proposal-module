/**
 * Import categories from __setup/categories.csv into the Category collection.
 * CSV is semicolon-delimited. Schema: budgetId, title, description, metaData, sortOrder.
 *
 * Usage (from project root):
 *   BUDGET_ID=<mongodb-object-id> node __setup/importCategories.js
 * Or (from __setup):
 *   BUDGET_ID=<mongodb-object-id> node importCategories.js
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

function getBudgetId() {
    const id = process.env.BUDGET_ID?.trim();
    if (!id) {
        console.error("BUDGET_ID is required. Example: BUDGET_ID=507f1f77bcf86cd799439011 node __setup/importCategories.js");
        process.exit(1);
    }
    if (!mongoose.Types.ObjectId.isValid(id) || id.length !== 24) {
        console.error("BUDGET_ID must be a valid 24-character MongoDB ObjectId.");
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
    const budgetId = getBudgetId();

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
        metaData.kpis = [];

        await Category.create({
            budgetId,
            title,
            description: descriptionStrategy || pillarDesc || title,
            metaData: Object.keys(metaData).length ? metaData : undefined,
            sortOrder,
        });
        created++;
        console.log(`  ${created}. ${title}`);
    }

    await disconnectFromDatabase();
    console.log(`\nImported ${created} categories for budget ${budgetId}`);
}

importCategories().catch((err) => {
    console.error(err);
    process.exit(1);
});
