/**
 * Create dummy data: 1 vote (with pillars from categories.csv), 12 live proposals (for pagination), 1 withdrawn proposal, 1 draft.
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

/** Legal declarations (Budget 2026 schema: dataProcessingConsent, submitterName, etc.). */
const LEGAL_DECLARATIONS = {
    dataProcessingConsent: true,
    publicVisibilityConsent: true,
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
            totalProposalsSubmitted: String((index % 5) + 1),
        },
        independentAudits: "Third-party audit firm TBD; 5% of budget reserved for annual audit.",
    };
}

/** Build metaData for a live Budget 2026 proposal (matches validation/budget2026/validationScript.js). */
function buildBudget2026MetaData(template, categoryIds, proposalIndex = 0) {
    const ids = Array.isArray(categoryIds) ? categoryIds : (categoryIds ? [categoryIds] : []);
    const pillars = ids.map((id) => String(id));
    const wpBudget = Math.floor(template.totalBudget * 0.6);
    const adminMeta = buildBudget2026AdminMetaData(template, proposalIndex);
    return {
        treasuryDonationTxHash: "abc123def456789",
        treasuryDonationConfirmed: true,
        trackRecord: "Previous community projects delivered on time.",
        estimatedDuration: 6,
        strategyFramework: {
            pillars,
            pillarRationale: "Alignment with test budget priorities.",
            kpiAlignment: "KPIs aligned with roadmap deliverables.",
        },
        proposalDetails: {
            conversionRate: 0.4,
            workPackages: [
                {
                    name: `WP1 – ${template.title.slice(0, 30)}`,
                    summary: template.summary,
                    initiativeType: "New Initiative",
                    proposalType: "Technical (software/IT)",
                    supportingDocuments: [{ title: "Design doc", url: "https://example.com/design.pdf" }],
                    coreObjectives: ["Deliver scope", "Report progress"],
                    expectedValue: "Value for community.",
                    metric: "On-time delivery.",
                    milestones: [
                        {
                            name: "M1 – Kickoff",
                            deliverables: "Plan and approval",
                            acceptanceCriteria: "Approved",
                            duration: "2 weeks",
                        },
                    ],
                    budgetBreakdown: [
                        {
                            costCategory: "Development",
                            name: "Core development",
                            description: "Core work",
                            quantity: 1,
                            unitPrice: wpBudget,
                            total: wpBudget,
                        },
                    ],
                },
            ],
        },
        proposerDetails: {
            name: template.contactName,
            email: template.contactEmail || "proposal@example.com",
            links: [{ title: "Project", url: "https://example.com" }],
        },
        supportingInfoLinks: [{ title: "Project plan", url: "https://example.com/plan.pdf" }],
        treasuryRepayment: "No",
        treasuryRepaymentCircumstances: "",
        priorFunding: "None",
        ...adminMeta,
        legalDeclarations: LEGAL_DECLARATIONS,
    };
}

const ADMINS = [
    "stake_test1uqwcrkr4chst8xnk5se4442fz5ku5ekql644zew5l5uwswgf643wf", // MAD 
    "stake_test1uqvx67glm2hdjcfp9pg0d59x0595n372k8sh437vk3hda0gukg9fa", // ADAM - Hydra Voter DRep #0
    "stake_test1ury4vups5rm3dahv3vht7lp83kdpxc0assfgwulm2z4rn4qe9ceqz" // SIMO 
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

        // Build pillars from categories.csv (same path as on proposals: metaData.strategyFramework.pillars)
        console.log("Building pillars from categories.csv...");
        const pillars = buildPillarsFromCsv();
        if (pillars.length === 0) {
            throw new Error("No pillars from categories.csv. Check categories.csv.");
        }
        console.log(`Built ${pillars.length} pillars.`);

        const vote = await Vote.create({
            title: "Test Budget 2026",
            description: "A test vote for demonstration with one proposal and comments.",
            slug: "test-budget-2026",
            admins: ADMINS,
            submissionStartDate: submissionStart,
            submissionEndDate: submissionEnd,
            feedbackStartDate: feedbackStart,
            feedbackEndDate: feedbackEnd,
            reviewStartDate: reviewStart,
            reviewEndDate: reviewEnd,
            validationScript: "budget2026/validationScript.js",
            excludeScript: "budget2026/excludeScript.js",
            form: "budget2026",
            depositOptions: {
                treasuryDonation: 1_000_000_000, // 1000 ADA in lovelace
                depositAddress: "", // placeholder for "no deposit"
                depositAmount: 0,
            },
            sortOptions: [
                { value: "title", label: "Proposal Title", field: "title" },
                { value: "totalBudget", label: "Total Budget", field: "metaData.totalBudget" },
                { value: "commentCount", label: "Comment Count", field: "commentCount" },
                { value: "submittedAt", label: "Submission Date", field: "submittedAt" },
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

        /** Build a summary at max allowed length (2000 chars) with paragraphs and markdown for line-clamp testing. */
        function buildFullLengthSummary() {
            const sections = [
                "## Executive summary\n\nThis proposal requests funding for a **governance dashboard** and analytics platform. The dashboard will aggregate voting activity, proposal lifecycle data, and treasury-related metrics so that DReps, proposers, and the community can make informed decisions.\n\n",
                "### Problem statement\n\nToday, stakeholders lack a single place to view participation rates, outcome trends, and treasury flows. Data is scattered across tools and reports. This makes it harder to assess impact and to hold the process accountable.\n\n",
                "### Solution\n\nWe will deliver a public dashboard with:\n\n- **Real-time metrics**: votes cast, proposals by status, budget allocated vs spent.\n- **Charts and filters**: by category, proposer, time period.\n- **Exports** for auditors and researchers (CSV/API).\n- Transparent, auditable data sources and methodology.\n\n",
                "### Implementation\n\nPhase 1 (months 1–3): data pipeline and core metrics. Phase 2 (months 4–6): visualisations and filters. Phase 3 (months 7–9): exports and documentation. We will use open-source stack and publish the code.\n\n",
                "### Impact\n\nDReps can evaluate participation and outcomes at a glance. Proposers can see how their proposals compare. The community can track treasury usage over time. Transparency and accountability improve across the ecosystem.\n\n",
                "### Team and budget\n\nOur team has delivered similar dashboards for other governance contexts. The budget covers design, development, hosting, and maintenance for 12 months. We will report quarterly and hand over documentation for long-term sustainability. _This summary uses the full allowed length (2000 characters) to test rendering and line clamping._",
            ];
            let s = sections.join("");
            if (s.length > SUMMARY_MAX_LENGTH) {
                s = s.slice(0, SUMMARY_MAX_LENGTH);
            } else if (s.length < SUMMARY_MAX_LENGTH) {
                const filler = " Additional context and supporting detail for testing. ";
                while (s.length < SUMMARY_MAX_LENGTH) {
                    s += filler;
                }
                s = s.slice(0, SUMMARY_MAX_LENGTH);
            }
            return s;
        }

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
                summary: "Build a community website and documentation hub.",
                totalBudget: 150000,
                contactName: "Test Proposer",
                contactEmail: "proposal-1@example.com",
            },
            {
                title: "Open-Source Tooling and Developer Experience",
                summary: "## Aim\n\nImprove **developer experience** and maintain open-source tooling.\n\n### Plan\n\n1. Extend existing CLI and SDKs\n2. Add integration tests and CI templates\n3. Publish guides and _best practices_\n\nTarget: reduce time-to-first-contribution and improve reliability of community-built tooling.",
                totalBudget: 85000,
                contactName: "Stake Test Proposer",
                contactEmail: "proposal-2@example.com",
            },
            {
                title: "Governance Dashboard and Analytics",
                summary: buildFullLengthSummary(),
                totalBudget: 120000,
                contactName: "Gov Lead",
                contactEmail: "proposal-3@example.com",
            },
            {
                title: "Security Audits and Best Practices",
                summary: "Fund **security audits** and publish best-practice guides. We will commission independent audits for critical components and document findings. Outputs: audit reports (redacted where needed), **hardening checklists** for node and wallet operators, and response playbooks. This reduces risk and raises the bar for ecosystem security.",
                totalBudget: 95000,
                contactName: "Security Lead",
                contactEmail: "proposal-4@example.com",
            },
            {
                title: "Education and Onboarding Program",
                summary: "Create an education and onboarding program for new contributors.\n\n**Goals:** Structured learning paths (technical and non-technical), mentorship and office hours, _certification_ or recognition for completed tracks. We will partner with existing initiatives and fill gaps so that newcomers can ramp up quickly and sustainably.",
                totalBudget: 78000,
                contactName: "Education Lead",
                contactEmail: "proposal-5@example.com",
            },
            {
                title: "Research and Standards Working Group",
                summary: "Run a **research and standards** working group with quarterly reports. We will coordinate with academia and industry, publish specs and reference implementations, and liaise with other standardisation bodies. The working group will maintain a roadmap, run open calls, and produce quarterly reports so that research outputs are visible and standards evolve in a coordinated way.",
                totalBudget: 110000,
                contactName: "Research Lead",
                contactEmail: "proposal-6@example.com",
            },
            {
                title: "Infrastructure and DevOps Support",
                summary: "Provide **infrastructure** and DevOps support for core projects: CI/CD, monitoring, incident response, cost-effective and reproducible setups, and documentation for runbooks and _disaster recovery_. This keeps critical services stable and frees maintainers to focus on product work.",
                totalBudget: 135000,
                contactName: "DevOps Lead",
                contactEmail: "proposal-7@example.com",
            },
            {
                title: "Community Events and Meetups",
                summary: "Organise community events, **meetups** and hackathons over 12 months. Quarterly online summits, regional in-person meetups where possible, and one flagship hackathon with prizes and mentorship. We will work with local organisers and track attendance and feedback to iterate and grow engagement.",
                totalBudget: 65000,
                contactName: "Events Lead",
                contactEmail: "proposal-8@example.com",
            },
            {
                title: "Multilingual Documentation and Localisation",
                summary: "Expand documentation and **localise** key resources. Prioritise high-traffic pages and tutorials; use community translators and review workflows; maintain glossaries and style guides. Target languages will be chosen with community input so that non-English speakers can contribute and learn effectively.",
                totalBudget: 88000,
                contactName: "Localisation Lead",
                contactEmail: "proposal-9@example.com",
            },
            {
                title: "Developer Grants and Bounty Program",
                summary: "Run a **developer grants** and bounty program. Open rounds with clear criteria and deadlines; bounties for specific bugs, features, or docs; transparent selection and payment. The program will publish guidelines, accept applications, and disburse funds in ADA with clear reporting so that builders are rewarded and the community can see where funds go.",
                totalBudget: 200000,
                contactName: "Grants Lead",
                contactEmail: "proposal-10@example.com",
            },
            {
                title: "Node Operations and Monitoring Tools",
                summary: "Deliver **node operations** tooling and monitoring dashboards: deployment and config automation, health checks, alerts, and _metrics_, plus runbooks for common operations. Operators get a single place to see status and act, reducing downtime and operational burden.",
                totalBudget: 98000,
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
            const totalBudget = metaData.proposalDetails?.workPackages?.reduce((sum, wp) => {
                const rows = wp.budgetBreakdown || [];
                return sum + rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
            }, 0) ?? 0;
            metaData.totalBudget = totalBudget;
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
            totalBudget: 72000,
            contactName: "Withdrawn Proposer",
            contactEmail: "withdrawn@example.com",
        };
        const withdrawnCategoryIds = [pillars[0]._id];
        const withdrawnMetaData = buildBudget2026MetaData(withdrawnTemplate, withdrawnCategoryIds, 12);
        const withdrawnTotalBudget = withdrawnMetaData.proposalDetails?.workPackages?.reduce((sum, wp) => {
            const rows = wp.budgetBreakdown || [];
            return sum + rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
        }, 0) ?? 0;
        withdrawnMetaData.totalBudget = withdrawnTotalBudget;
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
                estimatedDuration: 0,
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
                kycInfo: { submitted: "", email: "", totalProposalsSubmitted: "" },
                independentAudits: "",
            },
        });
        console.log(`Draft proposal created: ${draftProposal._id} (proposerId: ${draftProposer.id}, ${draftProposer.name})`);

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
        console.log(`  Comment test proposal (has comments): ${commentTestProposal._id}`);
        console.log(`  Draft proposal: ${draftProposal._id} (proposerId: ${draftProposer.id})`);
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
