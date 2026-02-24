/**
 * Create dummy data: 1 vote, import categories for it, 2 live proposals, 1 draft proposal.
 * Each live proposal gets one comment per COMMENT_USERS user, plus one withdrawn comment.
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
    "stake_test1uqvx67glm2hdjcfp9pg0d59x0595n372k8sh437vk3hda0gukg9fa" // ADAM - Hydra Voter DRep #0
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

        // 4. Create one live proposal and one draft proposal
        const categoryId = categories[0]._id;

        console.log("Creating live proposal...");
        const proposal = await Proposal.create({
            proposerId,
            voteId: vote._id,
            title: "Community Website and Documentation Hub",
            summary: "A single proposal to build a community website and documentation hub.",
            status: "live",
            submittedAt: now,
            totalBudget: 150000,
            metaData: {
                trackRecord: "Previous community projects delivered on time.",
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
                    socialMedia: "@testproposer",
                },
                signatoryContact: {
                    name: "Test Proposer",
                    title: "Lead",
                    email: "test@example.com",
                    authorization: true,
                },
                proposalType: "Technical (software/IT)",
                kycInfo: { submitted: true, email: "test@example.com" },
                strategicFocusArea: categoryId,
                keyPerformanceIndicators: [
                    { kpi: "Documentation pages", contributionStrategy: "Monthly updates" },
                ],
                executionRoadmap: {
                    projectStartDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
                    projectEndDate: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
                    workPackages: [
                        {
                            title: "WP1 Website and Docs",
                            scope: "Build community site and documentation.",
                            supportingDocuments: [{ title: "Design doc", url: "https://example.com/design.pdf" }],
                            estimatedDuration: "3 months",
                            coreObjectives: ["Launch community site", "Publish initial docs"],
                            expectedValue: "Central hub for community and developers.",
                            metric: "Site live, 50+ doc pages.",
                            milestones: [
                                {
                                    milestoneName: "M1 – Design approval",
                                    deliverables: "Design doc and mockups",
                                    acceptanceCriteria: "Approved by stakeholder",
                                    duration: "2 weeks",
                                },
                            ],
                            budgetBreakdown: [
                                { costCategory: "Development", description: "Backend and frontend", quantity: 1, unitPrice: 50000, total: 50000 },
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
        console.log(`Live proposal created: ${proposal._id}`);

        // 4b. Create one live proposal for stake_test1... user (all required data)
        console.log("Creating live proposal for stake_test user...");
        const liveProposalStakeTest = await Proposal.create({
            proposerId: STAKE_TEST_PROPOSER_ID,
            voteId: vote._id,
            title: "Open-Source Tooling and Developer Experience",
            summary: "Improve developer experience and maintain open-source tooling for the ecosystem.",
            status: "live",
            submittedAt: now,
            totalBudget: 85000,
            metaData: {
                trackRecord: "Maintained open-source libraries and CLI tools for 2+ years.",
                contractingParty: {
                    legalEntityName: "Stake Test Community",
                    legalEntityType: "company",
                    legalEntityRegistrationNumber: "67890",
                    legalEntityCountry: "GB",
                    legalEntityAddress: "2 Dev Lane",
                },
                primaryContact: {
                    name: "Stake Test Proposer",
                    title: "Maintainer",
                    email: "stake-test@example.com",
                    socialMedia: "@staketest",
                },
                signatoryContact: {
                    name: "Stake Test Proposer",
                    title: "Maintainer",
                    email: "stake-test@example.com",
                    authorization: true,
                },
                proposalType: "Technical (software/IT)",
                kycInfo: { submitted: true, email: "stake-test@example.com" },
                strategicFocusArea: categoryId,
                keyPerformanceIndicators: [
                    { kpi: "CLI downloads", contributionStrategy: "Monthly releases" },
                    { kpi: "Documentation coverage", contributionStrategy: "Keep docs in sync" },
                ],
                executionRoadmap: {
                    projectStartDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
                    projectEndDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000),
                    workPackages: [
                        {
                            title: "WP1 Tooling",
                            scope: "Maintain and improve CLI and SDK.",
                            supportingDocuments: [{ title: "Roadmap", url: "https://example.com/roadmap.pdf" }],
                            estimatedDuration: "4 months",
                            coreObjectives: ["Stable releases", "Documentation"],
                            expectedValue: "Better DX for developers.",
                            metric: "10k+ monthly downloads.",
                            milestones: [
                                {
                                    milestoneName: "M1 – Beta",
                                    deliverables: "Beta release",
                                    acceptanceCriteria: "Feature-complete",
                                    duration: "4 weeks",
                                },
                            ],
                            budgetBreakdown: [
                                { costCategory: "Development", description: "Tooling", quantity: 1, unitPrice: 45000, total: 45000 },
                                { costCategory: "Documentation", description: "Docs site", quantity: 1, unitPrice: 40000, total: 40000 },
                            ],
                        },
                    ],
                },
                financialAndAdministrative: {
                    conversionRate: 0.45,
                    intersectAdministrator: true,
                    otherAdministrators: "",
                    initiativeType: "Maintenance",
                    priorFunding: "Prior round 2025",
                    treasuryRepayment: false,
                    treasuryRepaymentCondition: "",
                    treasuryDonationHash: "hash789",
                    thirdPartyAssurers: "",
                    supportingDocuments: [{ title: "Budget breakdown", url: "https://example.com/budget.pdf" }],
                },
                legalDeclarations: LEGAL_TRUE,
            },
        });
        console.log(`Live proposal (stake_test user) created: ${liveProposalStakeTest._id}`);

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

        // 5. Create comments: one from each COMMENT_USERS user per live proposal, plus one withdrawn comment
        const commentBodies = [
            "This looks like a great proposal! I fully support this initiative.",
            "I have some concerns about the budget allocation. Can we discuss?",
            "Excellent work. The community will benefit greatly.",
            "I think we need more details on the implementation timeline.",
            "This aligns perfectly with our long-term goals.",
        ];
        const liveProposals = [proposal, liveProposalStakeTest];
        const createdComments = [];

        for (const liveProposal of liveProposals) {
            for (let i = 0; i < COMMENT_USERS.length; i++) {
                const c = await Comment.create({
                    proposalId: liveProposal._id,
                    parentId: null,
                    userId: COMMENT_USERS[i],
                    content: commentBodies[i % commentBodies.length],
                    status: "live",
                });
                createdComments.push(c);
            }
        }

        // One withdrawn comment (on first live proposal), from stake_test user, withdrawn by admin
        const withdrawnComment = await Comment.create({
            proposalId: proposal._id,
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

        console.log(`Created ${createdComments.length} comments (${COMMENT_USERS.length} per live proposal × ${liveProposals.length} proposals + 1 withdrawn).`);

        console.log("\n✅ Dummy data created successfully.");
        console.log(`  Vote: ${vote._id} (slug: ${vote.slug})`);
        console.log(`  Categories: ${categories.length}`);
        console.log(`  Live proposal: ${proposal._id}`);
        console.log(`  Live proposal (stake_test user): ${liveProposalStakeTest._id} (proposerId: ${STAKE_TEST_PROPOSER_ID})`);
        console.log(`  Draft proposal: ${draftProposal._id} (proposerId: ${STAKE_TEST_PROPOSER_ID})`);
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
