/**
 * Create dummy data: 1 vote, import categories for it, 1 live proposal, 1 draft proposal, 10 comments (including replies).
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
            admins: ["stake1ux7kxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxm4p1", "stake1ur9mxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxw6x3"],
            submissionStartDate: submissionStart,
            submissionEndDate: submissionEnd,
            feedbackStartDate: feedbackStart,
            feedbackEndDate: feedbackEnd,
            reviewStartDate: reviewStart,
            reviewEndDate: reviewEnd,
            validationScript: "budget2026/validationScript.js",
        });
        console.log(`Vote created: ${vote._id}`);

        // 2. Import categories for this vote
        console.log("Importing categories from categories.csv...");
        const categories = await importCategoriesForVote(vote._id);
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

        // 4. Create one live proposal and one draft proposal
        const categoryId = categories[0]._id;
        const DRAFT_PROPOSER_ID = "stake_test1uz22g9jd408t8zq8g3dw8p60qla49qjgvhh7z74kjpvuyrctlwf4m";

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
        const STAKE_TEST_PROPOSER_ID = "stake_test1uz22g9jd408t8zq8g3dw8p60qla49qjgvhh7z74kjpvuyrctlwf4m";
        await User.findOneAndUpdate(
            { _id: STAKE_TEST_PROPOSER_ID },
            { $set: { name: "Stake Test Proposer", lastLogin: now, updatedAt: now } },
            { upsert: true }
        );
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
            proposerId: DRAFT_PROPOSER_ID,
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
        console.log(`Draft proposal created: ${draftProposal._id} (proposerId: ${DRAFT_PROPOSER_ID})`);

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
        console.log(`  Vote: ${vote._id} (slug: ${vote.slug})`);
        console.log(`  Categories: ${categories.length}`);
        console.log(`  Live proposal: ${proposal._id}`);
        console.log(`  Live proposal (stake_test user): ${liveProposalStakeTest._id} (proposerId: ${STAKE_TEST_PROPOSER_ID})`);
        console.log(`  Draft proposal: ${draftProposal._id} (proposerId: ${DRAFT_PROPOSER_ID})`);
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
