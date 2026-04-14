/**
 * Create dummy data: 1 vote (with pillars from categories.csv), 12 live proposals (for pagination), 1 withdrawn proposal, 1 live "Proposal with multiple versions (revision history)" (version 3, 2 archived), 2 drafts (one minimal, one "Ready to submit proposal" for stake_test1...43wf with full data except treasury hash), and 2 proposals loaded from proposal1.json and proposal2.json (voteId and pillars remapped to the dummy vote).
 * Default comments (one per COMMENT_USERS + one withdrawn) are added only to "Comment test proposal".
 * Uses current schemas: Vote, Proposal, Comment, User.
 *
 * Usage (from project root): node __setup/createDummyData.js
 * From __setup: node createDummyData.js
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.development") });

import { loadEnvironmentVariables } from "../helper/envLoader.js";
loadEnvironmentVariables();

import { connectToDatabase, disconnectFromDatabase } from "../helper/dbManager.js";
import { Vote } from "../schema/Vote.js";
import { Proposal } from "../schema/Proposal.js";
import { Comment } from "../schema/Comment.js";
import { User } from "../schema/User.js";

const CSV_PATH = path.join(__dirname, "categories.csv");
const PROPOSAL1_JSON_PATH = path.join(__dirname, "proposal1.json");
const PROPOSAL2_JSON_PATH = path.join(__dirname, "proposal2.json");

/**
 * Convert MongoDB extended JSON (e.g. { "$oid": "..." }, { "$date": "..." }) in a parsed object to native ObjectId/Date.
 * Mutates the object in place and returns it.
 */
function convertMongoExtendedJson(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) {
        obj.forEach((item, i) => { obj[i] = convertMongoExtendedJson(item); });
        return obj;
    }
    if (Object.keys(obj).length === 1) {
        if ("$oid" in obj) return new mongoose.Types.ObjectId(obj.$oid);
        if ("$date" in obj) return new Date(obj.$date);
    }
    for (const key of Object.keys(obj)) {
        obj[key] = convertMongoExtendedJson(obj[key]);
    }
    return obj;
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

/**
 * Parse categories.csv and return pillars array { _id, title, description, sortOrder } (deduplicated by pillar title).
 * @returns {Array<{ _id: string, title: string, description: string, sortOrder: number }>}
 */
function buildPillarsFromCsv() {
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
    const seen = new Map();
    for (const row of rows) {
        const pillar = (row["Pillar"] ?? "").trim();
        if (!pillar) continue;
        if (seen.has(pillar)) continue;
        const pillarDesc = (row["Pillar description"] ?? "").trim();
        seen.set(pillar, { title: pillar, description: pillarDesc || "" });
    }
    const pillars = [];
    let sortOrder = 0;
    for (const { title, description } of seen.values()) {
        sortOrder += 1;
        pillars.push({
            _id: new mongoose.Types.ObjectId().toString(),
            title,
            description: description ?? "",
            sortOrder,
        });
    }
    return pillars;
}

/** Legal declarations (Budget 2026 schema: submitterName, authorizationEntity, etc.). */
const LEGAL_DECLARATIONS = {
    authorizationEntity: true,
    authorizationAttestation: true,
    submitterName: "Test Submitter",
    submitterRole: "Lead",
    submitterEmail: "submitter@example.com",
};

/**
 * Build admin section metaData (administrator, contractingParty, primaryContact, signatoryContact, kycInfo, independentAudits).
 * @param {object} template - { contactName, contactEmail }
 * @param {number} index - Proposal index; used to vary administrator and contracting party type.
 */
function buildBudget2026AdminMetaData(template, index) {
    const adminChoice = index % 2 === 0 ? "Intersect" : "Other";
    const entityType = index % 3 === 0 ? "company" : "individual"; // alternate: 0,1 -> company; 2 -> individual (then repeat)
    const isCompany = entityType === "company";
    const kycSubmitted = index % 4 !== 3 ? "Yes" : "No"; // most Yes, one in four No

    const baseContact = {
        name: template.contactName || "Test Contact",
        email: template.contactEmail || "admin-contact@example.com",
    };

    const contractingParty = {
        legalEntityType: entityType,
        legalEntityName: isCompany ? "Acme Solutions Ltd" : "",
        legalEntityRegistrationNumber: isCompany ? "REG-123456" : "",
        legalEntityCountry: isCompany ? "Singapore" : "",
        legalEntityAddressLine1: isCompany ? "1 Business Park Drive" : "",
        legalEntityAddressLine2: isCompany ? "Suite 100" : "",
        legalEntityAddressLine3: isCompany ? "" : "",
        govtIssuedIdNumber: isCompany ? "" : "PASSPORT-XYZ789",
        countryOfResidence: isCompany ? "" : "DE",
        residentialAddressLine1: isCompany ? "" : "42 Main Street",
        residentialAddressLine2: isCompany ? "" : "Apt 5",
        residentialAddressLine3: isCompany ? "" : "",
    };

    return {
        administrator: adminChoice,
        intersectAdministratorFeeConsent: adminChoice === "Intersect",
        otherAdministrator: adminChoice === "Other" ? "External Admin Corp will handle contracting and payments." : "",
        contractingParty,
        primaryContact: { ...baseContact },
        signatoryContact: {
            title: isCompany ? "Director" : "Proposer",
            name: template.contactName || "Jane Signatory",
            email: template.contactEmail ? `signatory-${template.contactEmail}` : "signatory@example.com",
            authorization: true,
        },
        kycInfo: {
            submitted: kycSubmitted,
            email: kycSubmitted === "No" ? "kyc-submit@example.com" : "",
        },
        independentAudits: "Third-party audit firm TBD; 5% of budget reserved for annual audit.",
    };
}

/** Random conversion rate per proposal in [0.2, 1.2], rounded to 2 decimals. */
function randomConversionRate() {
    return Math.round((0.2 + Math.random() * 1) * 100) / 100;
}

/** Trim string to target length (for dummy data field limits). No padding. */
function toLength(str, targetLen) {
    const s = String(str ?? "").trim();
    return s.length > targetLen ? s.slice(0, targetLen) : s;
}

/** Pillar rationale: actual markdown text (bold, lists; no headings – editor does not support headings). */
const PILLAR_RATIONALE_MARKDOWN = `**Alignment with strategic pillars**

This proposal has been designed to align with the budget priorities and strategic pillars of the Cardano ecosystem. Our objectives map directly to the framework set out for this funding round.

**How this proposal supports the pillars**

- **Technical delivery**: We will deliver measurable outputs that advance the stated priorities, with clear milestones and quarterly reporting.
- **Community impact**: Our work will support broader adoption and utility through documented outcomes, open materials, and engagement with the community.
- **Governance and transparency**: We are committed to public reporting, open documentation where appropriate, and responsiveness to DRep and community feedback.

**Reporting and KPIs**

We will report against the relevant KPIs and provide evidence of progress. Our approach ensures that the community can assess impact and that funds are used as intended.`;

const COST_CATEGORIES = [
    "Resources (Labor)",
    "Development",
    "Infrastructure",
    "Security & Audits",
    "Legal & Compliance",
    "Engagement & Ecosystem support",
    "Research",
    "Operations",
    "Governance",
];

/**
 * Build multiple work packages with data near field limits. totalBudgetAda is distributed across WPs.
 * Returns { workPackages, totalFromBreakdown }.
 */
function buildWorkPackages(template, totalBudgetAda, proposalIndex = 0) {
    const numWps = 3;
    const shares = [0.4, 0.35, 0.25];
    const workPackages = [];
    let totalFromBreakdown = 0;

    const longSummary = toLength(
        template.summary + "\n\nThis work package contributes to the overall proposal objectives. We will coordinate with other work streams and report progress quarterly. Deliverables will be documented and made available to the community.",
        9800,
    );
    const objectiveBase = "Deliver measurable outcomes aligned with the proposal scope; report progress and metrics; ensure transparency and community visibility; maintain documentation and handover materials.";
    const expectedValueBase = "This work package will deliver value to the Cardano ecosystem through measurable outputs, community engagement, and sustainable practices. ROI will be tracked via KPIs and reported in quarterly reviews.";
    const metricBase = "Success will be measured by on-time delivery of milestones, quality of outputs, community feedback, and adherence to the agreed budget. We will use a combination of quantitative metrics and qualitative assessments.";

    for (let w = 0; w < numWps; w++) {
        const wpShare = shares[w];
        const wpBudget = Math.round(totalBudgetAda * wpShare);
        const numRows = w === 0 ? 3 : 2;
        const rowAmount = Math.floor(wpBudget / numRows);
        const remainder = wpBudget - rowAmount * numRows;

        const budgetBreakdown = [];
        for (let r = 0; r < numRows; r++) {
            const amount = r === 0 ? rowAmount + remainder : rowAmount;
            const category = COST_CATEGORIES[(proposalIndex + w + r) % COST_CATEGORIES.length];
            budgetBreakdown.push({
                costCategory: category,
                name: toLength(`Budget item ${w + 1}.${r + 1} – ${category}`, 195),
                description: toLength(
                    `This line item covers ${category.toLowerCase()} for work package ${w + 1}. Scope includes labour, materials, and overhead as described in the proposal. We will track spend and report against this category.`,
                    590,
                ),
                quantity: 1,
                unitPrice: amount,
                total: amount,
            });
        }
        const wpTotal = budgetBreakdown.reduce((s, row) => s + (row.total ?? 0), 0);
        totalFromBreakdown += wpTotal;

        const wpName = toLength(`WP${w + 1} – ${template.title}`, 97);
        workPackages.push({
            name: wpName,
            summary: longSummary,
            initiativeType: w % 2 === 0 ? "New Initiative" : "Maintenance",
            proposalType: w % 2 === 0 ? "Technical (software/IT)" : "Non-technical",
            supportingDocuments: [
                { title: toLength("Design document and technical specification", 98), url: "https://example.com/design-wp" + (w + 1) + ".pdf" },
                { title: toLength("Project plan and timeline", 98), url: "https://example.com/plan-wp" + (w + 1) + ".pdf" },
            ],
            coreObjectives: [
                toLength(objectiveBase + " (WP" + (w + 1) + ")", 998),
                toLength("Second objective: ensure quality and sustainability of deliverables.", 998),
            ],
            expectedValue: toLength(expectedValueBase, 998),
            metric: toLength(metricBase, 598),
            milestones: [
                {
                    name: toLength(`Milestone ${w + 1}.1 – Kickoff and planning`, 98),
                    deliverables: toLength(
                        `Deliverables for this milestone include a detailed plan, resource allocation, and approval from stakeholders. We will document scope, timeline, and success criteria. This milestone sets the foundation for the work package.`,
                        3990,
                    ),
                    acceptanceCriteria: toLength(
                        `Acceptance criteria: plan reviewed and approved; resources assigned; timeline agreed; risks documented and mitigated where possible.`,
                        3990,
                    ),
                    duration: 2,
                },
                {
                    name: toLength(`Milestone ${w + 1}.2 – Delivery and review`, 98),
                    deliverables: toLength(
                        `Final deliverables as per the scope: outputs completed, tested, and documented. Handover materials and runbooks prepared for ongoing maintenance.`,
                        3990,
                    ),
                    acceptanceCriteria: toLength(
                        `Acceptance criteria: all deliverables completed; quality checks passed; documentation and handover completed.`,
                        3990,
                    ),
                    duration: 4,
                },
            ],
            budgetBreakdown,
            noMilestonesBreakdown: false,
            milestoneAlternative: "",
        });
    }

    return { workPackages, totalFromBreakdown };
}

/** Build metaData for a live Budget 2026 proposal (matches validation/budget2026/validationScript.js). */
function buildBudget2026MetaData(template, categoryIds, proposalIndex = 0) {
    const ids = Array.isArray(categoryIds) ? categoryIds : (categoryIds ? [categoryIds] : []);
    const pillars = ids.map((id) => String(id));
    const { workPackages, totalFromBreakdown } = buildWorkPackages(template, template.totalBudget, proposalIndex);
    const adminMeta = buildBudget2026AdminMetaData(template, proposalIndex);

    const pillarRationale = PILLAR_RATIONALE_MARKDOWN;
    const kpiAlignment = toLength(
        "KPIs aligned with roadmap deliverables: we will track delivery milestones, community engagement, and budget utilisation. Quarterly reports will include metrics on scope, timeline, and outcomes. " +
        "This ensures transparency and allows the community to assess impact.",
        9900,
    );
    const trackRecord = toLength(
        "Previous community projects delivered on time and within budget. Our team has experience with governance tooling, documentation, and open-source collaboration. " +
        "We have contributed to Cardano ecosystem projects and understand the reporting and compliance requirements.",
        9900,
    );
    const priorFunding = toLength(
        "None previously from Cardano Treasury or Catalyst. Team members have received grants from other ecosystems; we will disclose any relevant overlaps and ensure no double-funding. " +
        "This proposal is our first submission to this specific funding round.",
        9900,
    );

    return {
        treasuryDonationTxHash: "abc123def456789",
        treasuryDonationConfirmed: true,
        trackRecord,
        estimatedDuration: 6,
        strategyFramework: {
            pillars,
            pillarRationale,
            kpiAlignment,
        },
        proposalDetails: {
            conversionRate: randomConversionRate(),
            workPackages,
        },
        proposerDetails: {
            name: template.contactName,
            email: template.contactEmail || "proposal@example.com",
            links: [
                { title: toLength("Project repository and documentation", 98), url: "https://example.com" },
                { title: toLength("Community forum and updates", 98), url: "https://example.com/forum" },
            ],
        },
        supportingInfoLinks: [
            { title: toLength("Project plan and budget breakdown", 98), url: "https://example.com/plan.pdf" },
            { title: toLength("Technical specification and architecture", 98), url: "https://example.com/spec.pdf" },
        ],
        treasuryRepayment: "No",
        treasuryRepaymentCircumstances: "",
        priorFunding,
        ...adminMeta,
        legalDeclarations: LEGAL_DECLARATIONS,
    };
}

const ADMINS = [
    "stake_test1uqwcrkr4chst8xnk5se4442fz5ku5ekql644zew5l5uwswgf643wf", // MAD 
    "stake_test1uqvx67glm2hdjcfp9pg0d59x0595n372k8sh437vk3hda0gukg9fa", // ADAM - Hydra Voter DRep #0
    "stake_test1ury4vups5rm3dahv3vht7lp83kdpxc0assfgwulm2z4rn4qe9ceqz", // SIMO 
    "stake_test1urtue405zxlphdej5dmsl4x8nd6t6h78ttrkhhl88ukc3yckckjnu", // LORENZO
    "stake_test1ur34vgj0kk338wlfsdf7fnxs9uukh24047lc2wfmm0mgptgq7849c" // spannercode
];

/** Proposers used for dummy proposals; each must have a User record. */
const PROPOSERS = [
    { id: "stake_test1uqwcrkr4chst8xnk5se4442fz5ku5ekql644zew5l5uwswgf643wf", name: "Test Proposer 43wf" },
    { id: "stake_test1uz22g9jd408t8zq8g3dw8p60qla49qjgvhh7z74kjpvuyrctlwf4m", name: "Test Proposer wf4m" },
];

const COMMENT_USERS = [
    "stake_test1uqwcrkr4chst8xnk5se4442fz5ku5ekql644zew5l5uwswgf643wf",
    "stake_test1uz22g9jd408t8zq8g3dw8p60qla49qjgvhh7z74kjpvuyrctlwf4m",
    "stake_test1urv58h0er3ara4sezax8hdff90q4mzj74tmahpthvxzhqnq2ethrx",
    "drep1ytlf69wakmx78jja8rp6gusx2yprnqvp4zmw3lfwqqednhqnkkjag"
];

async function createDummyData() {
    try {
        console.log("Connecting to database...");
        await connectToDatabase();

        // 1. Create one vote (all required date fields)
        console.log("Creating vote...");
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
        const votingStart = new Date(reviewEnd);
        votingStart.setDate(votingStart.getDate() + 1);
        const votingEnd = new Date(votingStart);
        votingEnd.setMonth(votingEnd.getMonth() + 1);

        // Build pillars from categories.csv (same path as on proposals: metaData.strategyFramework.pillars)
        console.log("Building pillars from categories.csv...");
        const pillars = buildPillarsFromCsv();
        if (pillars.length === 0) {
            throw new Error("No pillars from categories.csv. Check categories.csv.");
        }
        console.log(`Built ${pillars.length} pillars.`);

        const vote = await Vote.create({
            title: "Cardano Budget Process 2026",
            description: "-",
            slug: "cardano-budget-2026",
            admins: ADMINS,
            submissionStartDate: submissionStart,
            submissionEndDate: submissionEnd,
            feedbackStartDate: feedbackStart,
            feedbackEndDate: feedbackEnd,
            reviewStartDate: reviewStart,
            reviewEndDate: reviewEnd,
            votingStartDate: votingStart,
            votingEndDate: votingEnd,
            validationScript: "budget2026/validationScript.js",
            excludeScript: "budget2026/excludeScript.js",
            form: "budget2026",
            depositOptions: {
                treasuryDonation: 1_000_000_000, // 1000 ADA in lovelace
                depositAddress: "", // placeholder for "no deposit"
                depositAmount: 0,
            },
            sortOptions: [
                { value: "submittedAt", label: "Submission Date", field: "submittedAt" },
                { value: "title", label: "Proposal Title", field: "title" },
                { value: "totalBudget", label: "Total Budget", field: "metaData.totalBudget" },
                { value: "commentCount", label: "Comment Count", field: "commentCount" },
                { value: "updatedAt", label: "Last Updated", field: "updatedAt" },
            ],
            filterOptions: [
                {
                    param: "status",
                    label: "Status",
                    field: "status",
                    allowedValues: ["live", "withdrawn", "draft"],
                    multiple: true,
                },
                {
                    param: "category",
                    label: "Category",
                    field: "metaData.strategyFramework.pillars",
                    allowedValues: [],
                    multiple: true,
                    optionsPath: "metaData.strategyFramework.pillars",
                },
            ],
            searchOptions: [
                { field: "title", matchType: "like", caseSensitive: false },
                { field: "summary", matchType: "like", caseSensitive: false },
                { field: "proposerId", matchType: "like", caseSensitive: false },
                { field: "metaData.proposerDetails.name", matchType: "like", caseSensitive: false },
                { field: "_id", matchType: "objectId" },
            ],
            metaData: { strategyFramework: { pillars } },
        });
        console.log(`Vote created: ${vote._id}`);

        // 3. Ensure all proposers have User table entries (required for proposal creation)
        for (const proposer of PROPOSERS) {
            await User.findOneAndUpdate(
                { _id: proposer.id },
                { $set: { name: proposer.name, lastLogin: now, updatedAt: now } },
                { upsert: true }
            );
            console.log("Proposer user ensured:", proposer.id, "(", proposer.name, ")");
        }

        // Ensure admins, commenters, and DRep have User entries
        for (let i = 0; i < ADMINS.length; i++) {
            await User.findOneAndUpdate(
                { _id: ADMINS[i] },
                { $set: { name: `Test Admin ${i + 1}`, lastLogin: now, updatedAt: now } },
                { upsert: true }
            );
            console.log("Admin user ensured:", ADMINS[i]);
        }
        const COMMENTER_ID = "stake_test1urv58h0er3ara4sezax8hdff90q4mzj74tmahpthvxzhqnq2ethrx";
        await User.findOneAndUpdate(
            { _id: COMMENTER_ID },
            { $set: { name: "Test Commenter", lastLogin: now, updatedAt: now } },
            { upsert: true }
        );
        console.log("Commenter user ensured:", COMMENTER_ID);
        const DREP_ID = "drep1ytlf69wakmx78jja8rp6gusx2yprnqvp4zmw3lfwqqednhqnkkjag";
        await User.findOneAndUpdate(
            { _id: DREP_ID },
            { $set: { name: "Test DRep", lastLogin: now, updatedAt: now } },
            { upsert: true }
        );
        console.log("DRep user ensured:", DREP_ID);

        /** Pick a random proposer from PROPOSERS for assignment to a proposal. */
        function randomProposer() {
            return PROPOSERS[Math.floor(Math.random() * PROPOSERS.length)];
        }

        // 4. Create 12 live proposals (for pagination), one withdrawn proposal, then one draft
        const COMMENT_TEST_PROPOSAL_TITLE = "Comment test proposal";
        const SUMMARY_MAX_LENGTH = 2000; // budget2026 validation: Executive Summary max 2000

        /** Build a summary with allowed markdown only (bold, lists; no headings). Trim to max 2000 chars. */
        function buildFullLengthSummary() {
            const sections = [
                "**Executive summary**\n\nThis proposal requests funding for a **governance dashboard** and analytics platform. The dashboard will aggregate voting activity, proposal lifecycle data, and treasury-related metrics so that DReps, proposers, and the community can make informed decisions.\n\n",
                "**Problem statement**\n\nToday, stakeholders lack a single place to view participation rates, outcome trends, and treasury flows. Data is scattered across tools and reports. This makes it harder to assess impact and to hold the process accountable.\n\n",
                "**Solution**\n\nWe will deliver a public dashboard with:\n\n- **Real-time metrics**: votes cast, proposals by status, budget allocated vs spent.\n- **Charts and filters**: by category, proposer, time period.\n- **Exports** for auditors and researchers (CSV/API).\n- Transparent, auditable data sources and methodology.\n\n",
                "**Implementation**\n\nPhase 1 (months 1–3): data pipeline and core metrics. Phase 2 (months 4–6): visualisations and filters. Phase 3 (months 7–9): exports and documentation. We will use an open-source stack and publish the code.\n\n",
                "**Impact**\n\nDReps can evaluate participation and outcomes at a glance. Proposers can see how their proposals compare. The community can track treasury usage over time. Transparency and accountability improve across the ecosystem.\n\n",
                "**Team and budget**\n\nOur team has delivered similar dashboards for other governance contexts. The budget covers design, development, hosting, and maintenance for 12 months. We will report quarterly and hand over documentation for long-term sustainability.",
            ];
            let s = sections.join("");
            return s.length > SUMMARY_MAX_LENGTH ? s.slice(0, SUMMARY_MAX_LENGTH) : s;
        }

        // totalBudget in ADA: range 50,000 to 98,000,000 across proposals
        const LIVE_PROPOSAL_TEMPLATES = [
            {
                title: COMMENT_TEST_PROPOSAL_TITLE,
                summary: "Proposal used to test **comments** (one per user + withdrawn).\n\nWe use this to verify:\n- Comment threads\n- Withdrawn comment state\n- Line clamping with _markdown_ in summaries.",
                totalBudget: 50000,
                contactName: "Comment Test Proposer",
                contactEmail: "comment-test@example.com",
            },
            {
                title: "Community Website and Documentation Hub",
                summary: "**Executive summary**\n\nWe propose building a **community website** and documentation hub with full localisation and accessibility.\n\n**Scope**\n\n- Maintain and update content; run feedback loops with the community.\n- Integrate with governance tools and provide API docs for developers.\n- Deliverables: live site, API documentation, and contributor guides.\n\n**Impact**\n\nA single, well-maintained hub will make it easier for newcomers and contributors to find accurate, up-to-date information.",
                totalBudget: 150000,
                contactName: "Test Proposer",
                contactEmail: "proposal-1@example.com",
            },
            {
                title: "Open-Source Tooling and Developer Experience",
                summary: "**Aim**\n\nImprove **developer experience** and maintain open-source tooling.\n\n**Plan**\n\n1. Extend existing CLI and SDKs\n2. Add integration tests and CI templates\n3. Publish guides and _best practices_\n\nTarget: reduce time-to-first-contribution and improve reliability of community-built tooling.",
                totalBudget: 850000,
                contactName: "Stake Test Proposer",
                contactEmail: "proposal-2@example.com",
            },
            {
                title: "Governance Dashboard and Analytics",
                summary: buildFullLengthSummary(),
                totalBudget: 1200000,
                contactName: "Gov Lead",
                contactEmail: "proposal-3@example.com",
            },
            {
                title: "Security Audits and Best Practices",
                summary: "**Executive summary**\n\nThis proposal funds **security audits** and the publication of best-practice guides for the ecosystem.\n\n**Approach**\n\n- Commission independent audits for critical components and document findings.\n- Outputs: audit reports (redacted where needed), **hardening checklists** for node and wallet operators, and incident response playbooks.\n\n**Impact**\n\nReducing risk and raising the bar for ecosystem security benefits all participants and strengthens trust in the infrastructure.",
                totalBudget: 5500000,
                contactName: "Security Lead",
                contactEmail: "proposal-4@example.com",
            },
            {
                title: "Education and Onboarding Program",
                summary: "Create an education and onboarding program for new contributors.\n\n**Goals:** Structured learning paths (technical and non-technical), mentorship and office hours, _certification_ or recognition for completed tracks. We will partner with existing initiatives and fill gaps so that newcomers can ramp up quickly and sustainably.",
                totalBudget: 780000,
                contactName: "Education Lead",
                contactEmail: "proposal-5@example.com",
            },
            {
                title: "Research and Standards Working Group",
                summary: "**Executive summary**\n\nWe propose running a **research and standards** working group with quarterly public reports.\n\n**Activities**\n\n- Coordinate with academia and industry; publish specs and reference implementations.\n- Liaise with other standardisation bodies.\n- Maintain a roadmap, run open calls, and produce quarterly reports.\n\n**Impact**\n\nResearch outputs become visible and standards evolve in a coordinated way, supporting long-term interoperability and innovation.",
                totalBudget: 11000000,
                contactName: "Research Lead",
                contactEmail: "proposal-6@example.com",
            },
            {
                title: "Infrastructure and DevOps Support",
                summary: "**Executive summary**\n\nThis proposal provides **infrastructure** and DevOps support for core projects.\n\n**Scope**\n\n- **CI/CD**, monitoring, and incident response.\n- Cost-effective and reproducible setups; documentation for runbooks and _disaster recovery_.\n\n**Impact**\n\nCritical services remain stable and maintainers can focus on product work instead of undifferentiated infrastructure tasks.",
                totalBudget: 25000000,
                contactName: "DevOps Lead",
                contactEmail: "proposal-7@example.com",
            },
            {
                title: "Community Events and Meetups",
                summary: "**Executive summary**\n\nWe will organise community events, **meetups**, and hackathons over 12 months.\n\n**Plan**\n\n- Quarterly online summits and regional in-person meetups where possible.\n- One flagship hackathon with prizes and mentorship.\n- Work with local organisers; track attendance and feedback to iterate and grow engagement.",
                totalBudget: 650000,
                contactName: "Events Lead",
                contactEmail: "proposal-8@example.com",
            },
            {
                title: "Multilingual Documentation and Localisation",
                summary: "**Executive summary**\n\nWe propose expanding documentation and **localising** key resources.\n\n**Approach**\n\n- Prioritise high-traffic pages and tutorials.\n- Use community translators and review workflows; maintain glossaries and style guides.\n- Target languages chosen with community input.\n\n**Impact**\n\nNon-English speakers can contribute and learn effectively, broadening participation and adoption.",
                totalBudget: 4200000,
                contactName: "Localisation Lead",
                contactEmail: "proposal-9@example.com",
            },
            {
                title: "Developer Grants and Bounty Program",
                summary: "**Executive summary**\n\nThis proposal runs a **developer grants** and bounty program.\n\n**Structure**\n\n- Open rounds with clear criteria and deadlines.\n- Bounties for specific bugs, features, or docs; transparent selection and payment.\n- Publish guidelines, accept applications, disburse funds in ADA with clear reporting.\n\n**Impact**\n\nBuilders are rewarded for concrete contributions and the community can see where funds go.",
                totalBudget: 68000000,
                contactName: "Grants Lead",
                contactEmail: "proposal-10@example.com",
            },
            {
                title: "Node Operations and Monitoring Tools",
                summary: "**Executive summary**\n\nWe will deliver **node operations** tooling and monitoring dashboards.\n\n**Scope**\n\n- Deployment and config automation; health checks, alerts, and _metrics_.\n- Runbooks for common operations.\n\n**Impact**\n\nOperators get a single place to see status and act, reducing downtime and operational burden.",
                totalBudget: 98000000,
                contactName: "Ops Lead",
                contactEmail: "proposal-11@example.com",
            },
        ];

        const liveProposals = [];
        for (let i = 0; i < LIVE_PROPOSAL_TEMPLATES.length; i++) {
            const t = LIVE_PROPOSAL_TEMPLATES[i];
            const proposer = randomProposer();
            // Some proposals have one pillar, others have two (when we have at least 2 pillars)
            const singlePillar = pillars[i % pillars.length];
            const categoryIds =
                pillars.length >= 2 && i % 3 === 1
                    ? [singlePillar._id, pillars[(i + 1) % pillars.length]._id]
                    : [singlePillar._id];
            const categoryTitles = categoryIds.map((id) => pillars.find((p) => String(p._id) === String(id))?.title ?? id).join(", ");
            console.log(`Creating live proposal ${i + 1}/12: ${t.title} (proposer: ${proposer.name}, pillars: ${categoryTitles})...`);
            const metaData = buildBudget2026MetaData(t, categoryIds, i);
            const sumWpAda = metaData.proposalDetails?.workPackages?.reduce((sum, wp) => {
                const rows = wp.budgetBreakdown || [];
                return sum + rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
            }, 0) ?? 0;
            metaData.totalBudget =
                metaData.administrator === "Intersect"
                    ? Math.round(sumWpAda * 1.03)
                    : Math.round(sumWpAda);
            // Stagger submittedAt so each proposal has a distinct timestamp (oldest = index 0, newest = last)
            const submittedAt = new Date(now.getTime() - (LIVE_PROPOSAL_TEMPLATES.length - 1 - i) * 24 * 60 * 60 * 1000);
            const p = await Proposal.create({
                proposerId: proposer.id,
                voteId: vote._id,
                title: t.title,
                summary: t.summary,
                status: "live",
                submittedAt,
                metaData,
            });
            liveProposals.push(p);
            console.log(`  Created: ${p._id}`);
        }

        // Create one withdrawn proposal (for testing withdrawn state and withdrawal details UI)
        const withdrawnProposer = randomProposer();
        const withdrawnTemplate = {
            title: "Withdrawn proposal (no longer active)",
            summary: "This proposal was **withdrawn** by the proposer.\n\n_Reason:_ Decided to resubmit in a later round with updated scope and budget.\n\nWe will incorporate feedback from the community and DReps, revise the work packages, and resubmit when the next funding round opens. Thank you to everyone who commented.",
            totalBudget: 720000,
            contactName: "Withdrawn Proposer",
            contactEmail: "withdrawn@example.com",
        };
        const withdrawnCategoryIds = [pillars[0]._id];
        const withdrawnMetaData = buildBudget2026MetaData(withdrawnTemplate, withdrawnCategoryIds, 12);
        const withdrawnSumWpAda = withdrawnMetaData.proposalDetails?.workPackages?.reduce((sum, wp) => {
            const rows = wp.budgetBreakdown || [];
            return sum + rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
        }, 0) ?? 0;
        withdrawnMetaData.totalBudget =
            withdrawnMetaData.administrator === "Intersect"
                ? Math.round(withdrawnSumWpAda * 1.03)
                : Math.round(withdrawnSumWpAda);
        console.log("Creating withdrawn proposal...");
        const withdrawnProposal = await Proposal.create({
            proposerId: withdrawnProposer.id,
            voteId: vote._id,
            title: withdrawnTemplate.title,
            summary: withdrawnTemplate.summary,
            status: "withdrawnByProposer",
            submittedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            metaData: withdrawnMetaData,
            withdrawalDetails: {
                category: "Other",
                userId: withdrawnProposer.id,
                comment: "Proposer decided to withdraw and resubmit in a later round.",
                date: now,
            },
        });
        console.log(`  Withdrawn proposal created: ${withdrawnProposal._id}`);

        // Create a live proposal with several archived versions (for testing revision history / version badge)
        const multiVersionProposer = randomProposer();
        const multiVersionTitle = "Proposal with multiple versions (revision history)";
        const multiVersionCategoryIds = [pillars[0]._id];
        const multiVersionTemplate = {
            title: multiVersionTitle,
            summary: "Current version (v3). Use this proposal to test the revision history section and the Version badge on the card.",
            totalBudget: 660000,
            contactName: "Multi-Version Proposer",
            contactEmail: "multiversion@example.com",
        };
        const multiVersionMetaData = buildBudget2026MetaData(multiVersionTemplate, multiVersionCategoryIds, 0);
        const multiVersionSumWpAda = multiVersionMetaData.proposalDetails?.workPackages?.reduce((sum, wp) => {
            const rows = wp.budgetBreakdown || [];
            return sum + rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
        }, 0) ?? 0;
        multiVersionMetaData.totalBudget =
            multiVersionMetaData.administrator === "Intersect"
                ? Math.round(multiVersionSumWpAda * 1.03)
                : Math.round(multiVersionSumWpAda);

        console.log("Creating proposal with multiple versions (revision history)...");
        // Current live proposal (v3) — create first so we can set currentProposalId on archived docs
        const multiVersionProposal = await Proposal.create({
            proposerId: multiVersionProposer.id,
            voteId: vote._id,
            title: multiVersionTitle,
            summary: multiVersionTemplate.summary,
            status: "live",
            submittedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
            metaData: multiVersionMetaData,
        });
        const currentProposalId = multiVersionProposal._id;
        // Archived version 1 (oldest)
        const arch1 = await Proposal.create({
            proposerId: multiVersionProposer.id,
            voteId: vote._id,
            title: "Proposal with multiple versions (revision history) – v1",
            summary: "First submitted version. Original scope and budget.",
            status: "archived",
            submittedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
            metaData: { ...multiVersionMetaData, totalBudget: 60000 },
            versions: [],
            currentProposalId,
        });
        console.log(`  Archived v1: ${arch1._id}`);
        // Archived version 2
        const arch2 = await Proposal.create({
            proposerId: multiVersionProposer.id,
            voteId: vote._id,
            title: "Proposal with multiple versions (revision history) – v2",
            summary: "Revised version with updated scope and timeline.",
            status: "archived",
            submittedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            metaData: { ...multiVersionMetaData, totalBudget: 63000 },
            versions: [],
            currentProposalId,
        });
        console.log(`  Archived v2: ${arch2._id}`);
        await Proposal.findByIdAndUpdate(multiVersionProposal._id, {
            $set: {
                version: 3,
                versions: [
                    { _id: arch1._id, createdAt: arch1.createdAt },
                    { _id: arch2._id, createdAt: arch2.createdAt },
                ],
            },
        });
        console.log(`  Live proposal (v3) with revision history: ${multiVersionProposal._id}`);

        const commentTestProposal = liveProposals.find((p) => p.title === COMMENT_TEST_PROPOSAL_TITLE);

        const draftProposer = randomProposer();
        console.log("Creating draft proposal...");
        const draftProposal = await Proposal.create({
            proposerId: draftProposer.id,
            voteId: vote._id,
            title: "Draft proposal (in progress)",
            summary: "",
            status: "draft",
            metaData: {
                trackRecord: "",
                estimatedDuration: 1,
                strategyFramework: { pillars: [], pillarRationale: "", kpiAlignment: "" },
                proposalDetails: { conversionRate: 0, workPackages: [] },
                proposerDetails: { name: "", email: "", links: [] },
                supportingInfoLinks: [],
                treasuryRepayment: "",
                treasuryRepaymentCircumstances: "",
                priorFunding: "",
                administrator: "",
                intersectAdministratorFeeConsent: false,
                otherAdministrator: "",
                contractingParty: {
                    legalEntityType: "",
                    legalEntityName: "",
                    legalEntityRegistrationNumber: "",
                    legalEntityCountry: "",
                    legalEntityAddressLine1: "",
                    legalEntityAddressLine2: "",
                    legalEntityAddressLine3: "",
                    govtIssuedIdNumber: "",
                    countryOfResidence: "",
                    residentialAddressLine1: "",
                    residentialAddressLine2: "",
                    residentialAddressLine3: "",
                },
                primaryContact: { name: "", email: "" },
                signatoryContact: { title: "", name: "", email: "", authorization: false },
                kycInfo: { submitted: "", email: "" },
                independentAudits: "",
            },
        });
        console.log(`Draft proposal created: ${draftProposal._id} (proposerId: ${draftProposer.id}, ${draftProposer.name})`);

        // Draft "Ready to submit proposal" — same vote, proposer stake_test1uqwcrkr4chst8xnk5se4442fz5ku5ekql644zew5l5uwswgf643wf, full metaData except treasuryDonationTxHash
        const readyToSubmitStakeId = "stake_test1uqwcrkr4chst8xnk5se4442fz5ku5ekql644zew5l5uwswgf643wf";
        const readyToSubmitTemplate = {
            title: "Ready to submit proposal",
            summary: "This draft has all sections completed and is ready to submit once the treasury donation transaction hash is entered.",
            totalBudget: 750000,
            contactName: "Test Proposer 43wf",
            contactEmail: "proposal-ready@example.com",
        };
        const readyToSubmitCategoryIds = [pillars[0]._id];
        const readyToSubmitMetaData = buildBudget2026MetaData(readyToSubmitTemplate, readyToSubmitCategoryIds, 0);
        readyToSubmitMetaData.treasuryDonationTxHash = "";
        readyToSubmitMetaData.treasuryDonationConfirmed = false;
        const readyToSubmitSumWpAda = readyToSubmitMetaData.proposalDetails?.workPackages?.reduce((sum, wp) => {
            const rows = wp.budgetBreakdown || [];
            return sum + rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
        }, 0) ?? 0;
        readyToSubmitMetaData.totalBudget =
            readyToSubmitMetaData.administrator === "Intersect"
                ? Math.round(readyToSubmitSumWpAda * 1.03)
                : Math.round(readyToSubmitSumWpAda);
        console.log("Creating draft 'Ready to submit proposal'...");
        const readyToSubmitProposal = await Proposal.create({
            proposerId: readyToSubmitStakeId,
            voteId: vote._id,
            title: readyToSubmitTemplate.title,
            summary: readyToSubmitTemplate.summary,
            status: "draft",
            metaData: readyToSubmitMetaData,
        });
        console.log(`  Ready to submit proposal created: ${readyToSubmitProposal._id} (proposerId: ${readyToSubmitStakeId})`);

        // Load and restore proposal1.json and proposal2.json (remap voteId and pillars to dummy vote)
        const proposalJsonPaths = [PROPOSAL1_JSON_PATH, PROPOSAL2_JSON_PATH];
        for (const filePath of proposalJsonPaths) {
            const raw = readFileSync(filePath, "utf8");
            const doc = JSON.parse(raw);
            convertMongoExtendedJson(doc);
            delete doc._id;
            delete doc.createdAt;
            delete doc.updatedAt;
            doc.voteId = vote._id;
            if (doc.metaData?.strategyFramework && pillars.length > 0) {
                doc.metaData.strategyFramework.pillars = pillars.slice(0, 5).map((p) => p._id);
            }
            if (doc.status === "live" && !doc.submittedAt) {
                doc.submittedAt = new Date();
            }
            const restored = await Proposal.create(doc);
            console.log(`  Restored ${path.basename(filePath)}: ${restored._id} (${doc.title})`);
        }

        // 5. Create comments only on "Comment test proposal": one per COMMENT_USERS user + one withdrawn
        const commentBodies = [
            "This looks like a great proposal! I fully support this initiative.",
            "I have some concerns about the budget allocation. Can we discuss?",
            "Excellent work. The community will benefit greatly.",
            "I think we need more details on the implementation timeline.",
            "This aligns perfectly with our long-term goals.",
        ];
        const createdComments = [];

        for (let i = 0; i < COMMENT_USERS.length; i++) {
            const c = await Comment.create({
                proposalId: commentTestProposal._id,
                parentId: null,
                userId: COMMENT_USERS[i],
                content: commentBodies[i % commentBodies.length],
                status: "live",
            });
            createdComments.push(c);
        }

        const withdrawnComment = await Comment.create({
            proposalId: commentTestProposal._id,
            parentId: null,
            userId: PROPOSERS[0].id,
            content: "This comment was withdrawn by the admin.",
            status: "withdrawnByAdmin",
            withdrawalDetails: {
                category: "Spam",
                userId: "stake_test1uqwcrkr4chst8xnk5se4442fz5ku5ekql644zew5l5uwswgf643wf",
                comment: "Duplicate content posted multiple times.",
                date: now,
            },
        });
        createdComments.push(withdrawnComment);

        console.log(`Created ${createdComments.length} comments on "${COMMENT_TEST_PROPOSAL_TITLE}" (${COMMENT_USERS.length} live + 1 withdrawn).`);

        console.log("\n✅ Dummy data created successfully.");
        console.log(`  Vote: ${vote._id} (slug: ${vote.slug})`);
        console.log(`  Pillars: ${pillars.length}`);
        console.log(`  Proposers (all have User entries): ${PROPOSERS.map((p) => p.name).join(", ")}`);
        console.log(`  Live proposals: 12 (for pagination; random proposer, varying category per proposal)`);
        liveProposals.forEach((p, i) => console.log(`    ${i + 1}. ${p.title}: ${p._id}`));
        console.log(`  Withdrawn proposal: ${withdrawnProposal._id} (${withdrawnProposal.title})`);
        console.log(`  Proposal with multiple versions (revision history): ${multiVersionProposal._id} (version 3, 2 archived)`);
        console.log(`  Comment test proposal (has comments): ${commentTestProposal._id}`);
        console.log(`  Draft proposal: ${draftProposal._id} (proposerId: ${draftProposer.id})`);
        console.log(`  Ready to submit proposal (draft): ${readyToSubmitProposal._id} (proposerId: ${readyToSubmitStakeId})`);
        console.log(`  Restored from JSON: proposal1.json, proposal2.json`);
        console.log(`  Comments: ${createdComments.length} (on "${COMMENT_TEST_PROPOSAL_TITLE}" only)`);
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
