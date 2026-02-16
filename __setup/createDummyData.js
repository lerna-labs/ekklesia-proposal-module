/**
 * Create dummy data: 1 budget, import categories for it, 1 proposal, 10 comments (including replies).
 * Uses current schemas: Budget, Category, Proposal, Comment, User.
 *
 * Usage (from project root): node __setup/createDummyData.js
 * From __setup: node createDummyData.js
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
import { Budget } from "../schema/Budget.js";
import { Category } from "../schema/Category.js";
import { Proposal } from "../schema/Proposal.js";
import { Comment } from "../schema/Comment.js";
import { User } from "../schema/User.js";

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

/** Import categories from CSV for the given budgetId. Returns created categories. */
async function importCategoriesForBudget(budgetId) {
    const kpisByFocusArea = loadKpisByFocusArea();

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

    const categories = [];
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

        const cat = await Category.create({
            budgetId,
            title,
            description: descriptionStrategy || pillarDesc || title,
            metaData: Object.keys(metaData).length ? metaData : undefined,
            sortOrder,
        });
        categories.push(cat);
    }
    return categories;
}

const LEGAL_TRUE = {
    dataProtection: true,
    authorizationEntity: true,
    authorizationAttestation: true,
    antiBribery: true,
    authenticity: true,
    ipOwnership: true,
    conflicts: true,
    compliance: true,
    sanctions: true,
    noContract: true,
    noGuarantee: true,
};

async function createDummyData() {
    try {
        console.log("Connecting to database...");
        await connectToDatabase();

        // 1. Create one budget (all required date fields)
        console.log("Creating budget...");
        const now = new Date();
        const submissionStart = new Date(now);
        submissionStart.setMonth(submissionStart.getMonth() - 1);
        const submissionEnd = new Date(now);
        submissionEnd.setMonth(submissionEnd.getMonth() + 2);
        const feedbackStart = new Date(submissionEnd);
        feedbackStart.setDate(feedbackStart.getDate() + 1);
        const feedbackEnd = new Date(feedbackStart);
        feedbackEnd.setMonth(feedbackEnd.getMonth() + 1);
        const reviewStart = new Date(feedbackEnd);
        reviewStart.setDate(reviewStart.getDate() + 1);
        const reviewEnd = new Date(reviewStart);
        reviewEnd.setMonth(reviewEnd.getMonth() + 1);

        const budget = await Budget.create({
            title: "Test Budget 2026",
            description: "A test budget for demonstration with one proposal and comments.",
            slug: "test-budget-2026",
            admins: ["stake1ux7kxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxm4p1", "stake1ur9mxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxw6x3"],
            submissionStartDate: submissionStart,
            submissionEndDate: submissionEnd,
            feedbackStartDate: feedbackStart,
            feedbackEndDate: feedbackEnd,
            reviewStartDate: reviewStart,
            reviewEndDate: reviewEnd,
        });
        console.log(`Budget created: ${budget._id}`);

        // 2. Import categories for this budget
        console.log("Importing categories from categories.csv...");
        const categories = await importCategoriesForBudget(budget._id);
        if (categories.length === 0) {
            throw new Error("No categories imported. Check categories.csv.");
        }
        console.log(`Imported ${categories.length} categories.`);

        // 3. Create a user for the proposer
        const proposerId = "dummy-proposer-001";
        await User.findOneAndUpdate(
            { _id: proposerId },
            { $set: { name: "Test Proposer", lastLogin: now, updatedAt: now } },
            { upsert: true }
        );
        console.log("Proposer user ensured:", proposerId);

        // 4. Create one proposal (live, with required metaData and legalDeclarations)
        const categoryId = categories[0]._id;
        console.log("Creating proposal...");
        const proposal = await Proposal.create({
            proposerId,
            budgetId: budget._id,
            title: "Community Website and Documentation Hub",
            description: "A single proposal to build a community website and documentation hub.",
            status: "live",
            submittedAt: now,
            totalBudget: 150000,
            metaData: {
                contractingParty: {
                    legalEntityName: "Test Community Ltd",
                    legalEntityType: "company",
                    legalEntityRegistrationNumber: "12345",
                    legalEntityCountry: "GB",
                    legalEntityAddress: "1 Test Street",
                },
                primaryContact: {
                    name: "Test Proposer",
                    title: "Lead",
                    email: "test@example.com",
                    socialMedia: "",
                },
                signatoryContact: {
                    name: "Test Proposer",
                    title: "Lead",
                    email: "test@example.com",
                    authorization: true,
                },
                proposalType: "technical",
                kycInfo: { submitted: true, email: "test@example.com" },
                strategicFocusArea: categoryId,
                keyPerformanceIndicators: [
                    { kpi: "Documentation pages", contributionStrategy: "Monthly updates" },
                ],
                financialAndAdministrative: {
                    conversionRate: 0.4,
                    initiativeType: "new",
                    priorFunding: "None",
                    treasuryRepayment: false,
                },
                legalDeclarations: LEGAL_TRUE,
            },
        });
        console.log(`Proposal created: ${proposal._id}`);

        // 5. Create 10 comments (including replies): e.g. 5 top-level, 3 replies, 2 nested replies
        const commentBodies = [
            "This looks like a great proposal! I fully support this initiative.",
            "I have some concerns about the budget allocation. Can we discuss?",
            "Excellent work. The community will benefit greatly.",
            "I think we need more details on the implementation timeline.",
            "This aligns perfectly with our long-term goals.",
            "Thanks for your feedback! I'll address that in the next update.",
            "Good point! I've added more details to address this.",
            "I appreciate your support. Here's a clarification...",
            "That's a valid concern. Here's what I'm thinking...",
            "I'll include that in the next revision.",
        ];
        const userIds = [proposerId, "dummy-commenter-002", "dummy-commenter-003"];

        const createdComments = [];
        // Top-level comments (5)
        for (let i = 0; i < 5; i++) {
            const c = await Comment.create({
                proposalId: proposal._id,
                parentId: null,
                userId: userIds[i % userIds.length],
                content: commentBodies[i],
                status: "live",
            });
            createdComments.push(c);
        }
        // Replies (3) to first three top-level
        for (let i = 0; i < 3; i++) {
            const c = await Comment.create({
                proposalId: proposal._id,
                parentId: createdComments[i]._id,
                userId: userIds[(i + 1) % userIds.length],
                content: commentBodies[5 + i],
                status: "live",
            });
            createdComments.push(c);
        }
        // Nested replies (2) to first two replies
        const firstReply = createdComments[5];
        const secondReply = createdComments[6];
        const nested1 = await Comment.create({
            proposalId: proposal._id,
            parentId: firstReply._id,
            userId: userIds[0],
            content: commentBodies[8],
            status: "live",
        });
        createdComments.push(nested1);
        const nested2 = await Comment.create({
            proposalId: proposal._id,
            parentId: secondReply._id,
            userId: userIds[2],
            content: commentBodies[9],
            status: "live",
        });
        createdComments.push(nested2);

        console.log(`Created ${createdComments.length} comments (5 top-level, 3 replies, 2 nested).`);

        console.log("\n✅ Dummy data created successfully.");
        console.log(`  Budget: ${budget._id} (slug: ${budget.slug})`);
        console.log(`  Categories: ${categories.length}`);
        console.log(`  Proposal: ${proposal._id}`);
        console.log(`  Comments: ${createdComments.length}`);
    } catch (error) {
        console.error("Error creating dummy data:", error);
        throw error;
    } finally {
        console.log("\nDisconnecting from database...");
        await disconnectFromDatabase();
        process.exit(0);
    }
}

createDummyData();
