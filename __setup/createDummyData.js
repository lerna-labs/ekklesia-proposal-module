/**
 * Create dummy data: 1 vote, import categories, 10 live proposals (random proposer, varying category per proposal), 1 draft.
 * Default comments (one per COMMENT_USERS + one withdrawn) are added only to "Comment test proposal".
 * Uses current schemas: Vote, Category, Proposal, Comment, User.
 *
 * Usage (from project root): node __setup/createDummyData.js
 * From __setup: node createDummyData.js
 */

import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.development") });

import { loadEnvironmentVariables } from "../helper/envLoader.js";
loadEnvironmentVariables();

import { connectToDatabase, disconnectFromDatabase } from "../helper/dbManager.js";
import { Vote } from "../schema/Vote.js";
import { Proposal } from "../schema/Proposal.js";
import { Comment } from "../schema/Comment.js";
import { User } from "../schema/User.js";
import { importCategoriesForVote } from "./importCategories.js";

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

/** Build metaData for a live Budget 2026 proposal (matches validation/budget2026/validationScript.js). */
function buildBudget2026MetaData(template, categoryIds) {
    const ids = Array.isArray(categoryIds) ? categoryIds : (categoryIds ? [categoryIds] : []);
    const pillars = ids.map((id) => String(id));
    const wpBudget = Math.floor(template.totalBudget * 0.6);
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
        });
        console.log(`Vote created: ${vote._id}`);

        // 2. Import categories for this vote
        console.log("Importing categories from categories.csv...");
        const categories = await importCategoriesForVote(vote._id);
        if (categories.length === 0) {
            throw new Error("No categories imported. Check categories.csv.");
        }
        console.log(`Imported ${categories.length} categories.`);

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

        // 4. Create 10 live proposals (random proposer per proposal, different category per proposal), then one draft
        const COMMENT_TEST_PROPOSAL_TITLE = "Comment test proposal";

        const LIVE_PROPOSAL_TEMPLATES = [
            { title: COMMENT_TEST_PROPOSAL_TITLE, summary: "Proposal used to test comments (one per user + withdrawn).", totalBudget: 50000, contactName: "Comment Test Proposer", contactEmail: "comment-test@example.com" },
            { title: "Community Website and Documentation Hub", summary: "Build a community website and documentation hub.", totalBudget: 150000, contactName: "Test Proposer", contactEmail: "proposal-1@example.com" },
            { title: "Open-Source Tooling and Developer Experience", summary: "Improve developer experience and maintain open-source tooling.", totalBudget: 85000, contactName: "Stake Test Proposer", contactEmail: "proposal-2@example.com" },
            { title: "Governance Dashboard and Analytics", summary: "Deliver a governance dashboard with analytics and reporting.", totalBudget: 120000, contactName: "Gov Lead", contactEmail: "proposal-3@example.com" },
            { title: "Security Audits and Best Practices", summary: "Fund security audits and publish best-practice guides.", totalBudget: 95000, contactName: "Security Lead", contactEmail: "proposal-4@example.com" },
            { title: "Education and Onboarding Program", summary: "Create an education and onboarding program for new contributors.", totalBudget: 78000, contactName: "Education Lead", contactEmail: "proposal-5@example.com" },
            { title: "Research and Standards Working Group", summary: "Run a research and standards working group with quarterly reports.", totalBudget: 110000, contactName: "Research Lead", contactEmail: "proposal-6@example.com" },
            { title: "Infrastructure and DevOps Support", summary: "Provide infrastructure and DevOps support for core projects.", totalBudget: 135000, contactName: "DevOps Lead", contactEmail: "proposal-7@example.com" },
            { title: "Community Events and Meetups", summary: "Organise community events, meetups and hackathons over 12 months.", totalBudget: 65000, contactName: "Events Lead", contactEmail: "proposal-8@example.com" },
            { title: "Multilingual Documentation and Localisation", summary: "Expand documentation and localise key resources.", totalBudget: 88000, contactName: "Localisation Lead", contactEmail: "proposal-9@example.com" },
        ];

        const liveProposals = [];
        for (let i = 0; i < LIVE_PROPOSAL_TEMPLATES.length; i++) {
            const t = LIVE_PROPOSAL_TEMPLATES[i];
            const proposer = randomProposer();
            // Some proposals have one category, others have two (when we have at least 2 categories)
            const singleCat = categories[i % categories.length];
            const categoryIds =
                categories.length >= 2 && i % 3 === 1
                    ? [singleCat._id, categories[(i + 1) % categories.length]._id]
                    : [singleCat._id];
            const categoryTitles = categoryIds.map((id) => categories.find((c) => String(c._id) === String(id))?.title ?? id).join(", ");
            console.log(`Creating live proposal ${i + 1}/10: ${t.title} (proposer: ${proposer.name}, categories: ${categoryTitles})...`);
            const metaData = buildBudget2026MetaData(t, categoryIds);
            const totalBudget = metaData.proposalDetails?.workPackages?.reduce((sum, wp) => {
                const rows = wp.budgetBreakdown || [];
                return sum + rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
            }, 0) ?? 0;
            const p = await Proposal.create({
                proposerId: proposer.id,
                voteId: vote._id,
                title: t.title,
                summary: t.summary,
                status: "live",
                submittedAt: now,
                totalBudget,
                metaData,
            });
            liveProposals.push(p);
            console.log(`  Created: ${p._id}`);
        }

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
        console.log(`  Categories: ${categories.length}`);
        console.log(`  Proposers (all have User entries): ${PROPOSERS.map((p) => p.name).join(", ")}`);
        console.log(`  Live proposals: 10 (random proposer, varying category per proposal)`);
        liveProposals.forEach((p, i) => console.log(`    ${i + 1}. ${p.title}: ${p._id}`));
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
