/**
 * Create dummy data: 1 vote, import categories, 10 live proposals (same proposer), 1 draft.
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

const LEGAL_TRUE = {
    dataProtection: true,
    publicVisibilityConsent: true,
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

const ADMINS = [
    "stake_test1uqwcrkr4chst8xnk5se4442fz5ku5ekql644zew5l5uwswgf643wf", // MAD 
    "stake_test1uqvx67glm2hdjcfp9pg0d59x0595n372k8sh437vk3hda0gukg9fa", // ADAM - Hydra Voter DRep #0
    "stake_test1ury4vups5rm3dahv3vht7lp83kdpxc0assfgwulm2z4rn4qe9ceqz" // SIMO 
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
        });
        console.log(`Vote created: ${vote._id}`);

        // 2. Import categories for this vote
        console.log("Importing categories from categories.csv...");
        const categories = await importCategoriesForVote(vote._id);
        if (categories.length === 0) {
            throw new Error("No categories imported. Check categories.csv.");
        }
        console.log(`Imported ${categories.length} categories.`);

        // 3. Create users: proposer, admins, and stake_test proposer
        const proposerId = "dummy-proposer-001";
        await User.findOneAndUpdate(
            { _id: proposerId },
            { $set: { name: "Test Proposer", lastLogin: now, updatedAt: now } },
            { upsert: true }
        );
        console.log("Proposer user ensured:", proposerId);

        for (let i = 0; i < ADMINS.length; i++) {
            await User.findOneAndUpdate(
                { _id: ADMINS[i] },
                { $set: { name: `Test Admin ${i + 1}`, lastLogin: now, updatedAt: now } },
                { upsert: true }
            );
            console.log("Admin user ensured:", ADMINS[i]);
        }

        const STAKE_TEST_PROPOSER_ID = "stake_test1uz22g9jd408t8zq8g3dw8p60qla49qjgvhh7z74kjpvuyrctlwf4m";
        await User.findOneAndUpdate(
            { _id: STAKE_TEST_PROPOSER_ID },
            { $set: { name: "Stake Test Proposer", lastLogin: now, updatedAt: now } },
            { upsert: true }
        );
        console.log("Stake test proposer user ensured:", STAKE_TEST_PROPOSER_ID);

        const COMMENTER_ID = "stake_test1urv58h0er3ara4sezax8hdff90q4mzj74tmahpthvxzhqnq2ethrx";
        await User.findOneAndUpdate(
            { _id: COMMENTER_ID },
            { $set: { name: "", lastLogin: now, updatedAt: now } },
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

        // 4. Create 10 live proposals (all proposer: STAKE_TEST_PROPOSER_ID), then one draft
        const categoryId = categories[0]._id;
        const COMMENT_TEST_PROPOSAL_TITLE = "Comment test proposal";

        const LIVE_PROPOSAL_TEMPLATES = [
            { title: COMMENT_TEST_PROPOSAL_TITLE, summary: "Proposal used to test comments (one per user + withdrawn).", totalBudget: 50000, legalName: "Comment Test Ltd", contactName: "Comment Test Proposer" },
            { title: "Community Website and Documentation Hub", summary: "Build a community website and documentation hub.", totalBudget: 150000, legalName: "Test Community Ltd", contactName: "Test Proposer" },
            { title: "Open-Source Tooling and Developer Experience", summary: "Improve developer experience and maintain open-source tooling.", totalBudget: 85000, legalName: "Stake Test Community", contactName: "Stake Test Proposer" },
            { title: "Governance Dashboard and Analytics", summary: "Deliver a governance dashboard with analytics and reporting.", totalBudget: 120000, legalName: "Gov Analytics Ltd", contactName: "Gov Lead" },
            { title: "Security Audits and Best Practices", summary: "Fund security audits and publish best-practice guides.", totalBudget: 95000, legalName: "Security First Ltd", contactName: "Security Lead" },
            { title: "Education and Onboarding Program", summary: "Create an education and onboarding program for new contributors.", totalBudget: 78000, legalName: "Edu Community CIC", contactName: "Education Lead" },
            { title: "Research and Standards Working Group", summary: "Run a research and standards working group with quarterly reports.", totalBudget: 110000, legalName: "Research Collective", contactName: "Research Lead" },
            { title: "Infrastructure and DevOps Support", summary: "Provide infrastructure and DevOps support for core projects.", totalBudget: 135000, legalName: "Infra Ops Ltd", contactName: "DevOps Lead" },
            { title: "Community Events and Meetups", summary: "Organise community events, meetups and hackathons over 12 months.", totalBudget: 65000, legalName: "Events Community", contactName: "Events Lead" },
            { title: "Multilingual Documentation and Localisation", summary: "Expand documentation and localise key resources.", totalBudget: 88000, legalName: "Localise Ltd", contactName: "Localisation Lead" },
        ];

        const liveProposals = [];
        for (let i = 0; i < LIVE_PROPOSAL_TEMPLATES.length; i++) {
            const t = LIVE_PROPOSAL_TEMPLATES[i];
            console.log(`Creating live proposal ${i + 1}/10: ${t.title}...`);
            const p = await Proposal.create({
                proposerId: STAKE_TEST_PROPOSER_ID,
                voteId: vote._id,
                title: t.title,
                summary: t.summary,
                status: "live",
                submittedAt: now,
                totalBudget: t.totalBudget,
                metaData: {
                    trackRecord: "Previous community projects delivered on time.",
                    contractingParty: {
                        legalEntityName: t.legalName,
                        legalEntityType: "company",
                        legalEntityRegistrationNumber: String(10000 + i),
                        legalEntityCountry: "GB",
                        legalEntityAddress: `${i + 1} Test Street`,
                    },
                    primaryContact: {
                        name: t.contactName,
                        title: "Lead",
                        email: `proposal-${i + 1}@example.com`,
                        socialMedia: `@proposal${i + 1}`,
                    },
                    signatoryContact: {
                        name: t.contactName,
                        title: "Lead",
                        email: `proposal-${i + 1}@example.com`,
                        authorization: true,
                    },
                    proposalType: "Technical (software/IT)",
                    kycInfo: { submitted: true, email: `proposal-${i + 1}@example.com` },
                    strategicFocusArea: categoryId,
                    keyPerformanceIndicators: [
                        { kpi: "Deliverables", contributionStrategy: "Monthly updates" },
                    ],
                    executionRoadmap: {
                        projectStartDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
                        projectEndDate: new Date(now.getTime() + (120 + i * 10) * 24 * 60 * 60 * 1000),
                        workPackages: [
                            {
                                title: `WP1 – ${t.title.slice(0, 30)}`,
                                scope: t.summary,
                                supportingDocuments: [{ title: "Design doc", url: "https://example.com/design.pdf" }],
                                estimatedDuration: `${3 + (i % 4)} months`,
                                coreObjectives: ["Deliver scope", "Report progress"],
                                expectedValue: "Value for community.",
                                metric: "On-time delivery.",
                                milestones: [
                                    { milestoneName: "M1 – Kickoff", deliverables: "Plan and approval", acceptanceCriteria: "Approved", duration: "2 weeks" },
                                ],
                                budgetBreakdown: [
                                    { costCategory: "Development", description: "Core work", quantity: 1, unitPrice: Math.floor(t.totalBudget * 0.6), total: Math.floor(t.totalBudget * 0.6) },
                                ],
                            },
                        ],
                    },
                    financialAndAdministrative: {
                        conversionRate: 0.4,
                        intersectAdministrator: true,
                        otherAdministrators: "",
                        initiativeType: "New Initiative",
                        priorFunding: "None",
                        treasuryRepayment: false,
                        treasuryRepaymentCondition: "",
                        treasuryDonationHash: "abc123def456",
                        thirdPartyAssurers: "",
                        supportingDocuments: [{ title: "Project plan", url: "https://example.com/plan.pdf" }],
                    },
                    legalDeclarations: LEGAL_TRUE,
                },
            });
            liveProposals.push(p);
            console.log(`  Created: ${p._id}`);
        }

        const commentTestProposal = liveProposals.find((p) => p.title === COMMENT_TEST_PROPOSAL_TITLE);

        console.log("Creating draft proposal...");
        const draftProposal = await Proposal.create({
            proposerId: STAKE_TEST_PROPOSER_ID,
            voteId: vote._id,
            title: "Draft proposal (in progress)",
            summary: "",
            status: "draft",
            metaData: {
                trackRecord: "",
                strategicFocusArea: null,
                keyPerformanceIndicators: [],
                executionRoadmap: {
                    projectStartDate: null,
                    projectEndDate: null,
                    workPackages: [
                        {
                            title: "",
                            scope: "",
                            supportingDocuments: [],
                            estimatedDuration: "",
                            coreObjectives: [],
                            expectedValue: "",
                            metric: "",
                            milestones: [],
                            budgetBreakdown: [
                                { costCategory: "Development", description: "", quantity: 1, unitPrice: 0, total: 0 },
                            ],
                        },
                    ],
                },
                financialAndAdministrative: {
                    conversionRate: 0,
                    intersectAdministrator: true,
                    otherAdministrators: "",
                    priorFunding: "",
                    treasuryRepayment: false,
                    treasuryRepaymentCondition: "",
                    treasuryDonationHash: "",
                    thirdPartyAssurers: "",
                    supportingDocuments: [],
                },
                contractingParty: {},
                primaryContact: {},
                signatoryContact: {},
                kycInfo: {},
            },
        });
        console.log(`Draft proposal created: ${draftProposal._id} (proposerId: ${STAKE_TEST_PROPOSER_ID})`);

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
            userId: STAKE_TEST_PROPOSER_ID,
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
        console.log(`  Live proposals: 10 (all proposerId: ${STAKE_TEST_PROPOSER_ID})`);
        liveProposals.forEach((p, i) => console.log(`    ${i + 1}. ${p.title}: ${p._id}`));
        console.log(`  Comment test proposal (has comments): ${commentTestProposal._id}`);
        console.log(`  Draft proposal: ${draftProposal._id} (proposerId: ${STAKE_TEST_PROPOSER_ID})`);
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
