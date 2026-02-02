// load env from .env.development
import dotenv from "dotenv";
dotenv.config({
    path: "../.env.development"
});

// load environment variables
import { loadEnvironmentVariables } from "../helper/envLoader.js";
loadEnvironmentVariables();

// use dbManager for database connection
import { connectToDatabase, disconnectFromDatabase } from "../helper/dbManager.js";

// import mongoose for ObjectId generation
import mongoose from "mongoose";

// import schemas
import { Budget } from "../schema/Budget.js";
import { Category } from "../schema/Category.js";
import { Proposal } from "../schema/Proposal.js";
import { Comment } from "../schema/Comment.js";

async function createDummyData() {
    try {
        // Connect to database
        console.log("Connecting to database...");
        await connectToDatabase();

        // Create a budget
        console.log("Creating budget...");
        const budget = await Budget.create({
            title: "Test Budget 2026",
            description: "A test budget for demonstration purposes with various proposal statuses",
            slug: "test-budget-2026",
            admins: ["admin1", "admin2"]
        });
        console.log(`Budget created with ID: ${budget._id}`);

        // Set budgetId for all categories in the database to this budget
        const { modifiedCount } = await Category.updateMany({}, { budgetId: budget._id });
        const categories = await Category.find({ budgetId: budget._id });
        if (categories.length === 0) {
            throw new Error("No categories in the database. Run importCategories.js first (with a budget ID), or create categories before running this script.");
        }
        console.log(`Set budgetId for ${categories.length} categories (${modifiedCount} updated)`);

        // Create 22 proposals with different statuses
        const proposalTemplates = [
            { title: "Live - Website Redesign", proposerName: "John Doe", status: "live", affiliatedDReps: ["drep1", "drep2"] },
            { title: "Live Proposal - Community Garden", proposerName: "Jane Smith", status: "live", affiliatedDReps: ["drep3"] },
            { title: "Withdrawn by Proposer - Event Planning", proposerName: "Bob Johnson", status: "withdrawnByProposer", withdrawalReason: { category: "Other", userId: budget._id, comment: "Changed my mind about this proposal", date: new Date() } },
            { title: "Withdrawn by Admin - Inappropriate Content", proposerName: "Alice Williams", status: "withdrawnByAdmin", withdrawalReason: { category: "Inappropriate content", userId: budget._id, comment: "Content violates community guidelines", date: new Date() } },
            { title: "Live - Infrastructure Upgrade", proposerName: "Chris Lee", status: "live", affiliatedDReps: ["drep4"] },
            { title: "Live - Youth Program Funding", proposerName: "Diana Ross", status: "live", affiliatedDReps: ["drep5", "drep6"] },
            { title: "Live - Outreach Campaign", proposerName: "Evan Davis", status: "live", affiliatedDReps: [] },
            { title: "Live - Equipment Purchase", proposerName: "Fiona Green", status: "live", affiliatedDReps: ["drep7"] },
            { title: "Live - Training Workshop", proposerName: "George Hill", status: "live", affiliatedDReps: ["drep8"] },
            { title: "Live - Maintenance Reserve", proposerName: "Helen Park", status: "live", affiliatedDReps: ["drep9", "drep10"] },
            { title: "Live - Research Initiative", proposerName: "Ian Scott", status: "live", affiliatedDReps: ["drep11"] },
            { title: "Live - Scholarship Fund", proposerName: "Julia White", status: "live", affiliatedDReps: [] },
            { title: "Live - Marketing Materials", proposerName: "Kevin Brown", status: "live", affiliatedDReps: ["drep12"] },
            { title: "Live - Facility Rental", proposerName: "Laura Clark", status: "live", affiliatedDReps: ["drep13"] },
            { title: "Live - Volunteer Program", proposerName: "Mike Adams", status: "live", affiliatedDReps: ["drep14", "drep15"] },
            { title: "Live - Software Licenses", proposerName: "Nancy Bell", status: "live", affiliatedDReps: ["drep16"] },
            { title: "Draft - Safety Equipment", proposerName: "Oscar Wright", status: "draft", affiliatedDReps: [] },
            { title: "Live - Travel Grants", proposerName: "Paula King", status: "live", affiliatedDReps: ["drep17"] },
            { title: "Draft - Newsletter Production", proposerName: "Quinn Taylor", status: "draft", affiliatedDReps: ["drep18"] },
            { title: "Live - Catering Services", proposerName: "Rachel Moore", status: "live", affiliatedDReps: ["drep19", "drep20"] },
            { title: "Draft - Legal Consultation", proposerName: "Steve Young", status: "draft", affiliatedDReps: ["drep21"] },
            { title: "Live - Insurance Premium", proposerName: "Tina Hall", status: "live", affiliatedDReps: ["drep22"] }
        ];

        const randomAda = (min, max) => Math.floor(min + Math.random() * (max - min + 1));
        const randomCategory = () => categories[Math.floor(Math.random() * categories.length)];
        const proposals = proposalTemplates.map((t, i) => {
            const base = {
                userId: `user${String(i + 1).padStart(3, "0")}`,
                budgetId: budget._id,
                title: t.title,
                categoryId: randomCategory()._id,
                proposerName: t.proposerName,
                status: t.status,
                affiliatedDReps: t.affiliatedDReps || [],
                totalBudget: randomAda(100000, 3000000),
                conversionRate: 0.3 + Math.random() * 0.4
            };
            if (t.withdrawalReason) base.withdrawalReason = t.withdrawalReason;
            return base;
        });

        console.log("Creating proposals...");
        const createdProposals = await Proposal.insertMany(proposals);
        console.log(`Created ${createdProposals.length} proposals:`);
        createdProposals.forEach((proposal, index) => {
            console.log(`  ${index + 1}. ${proposal.title} - Status: ${proposal.status}`);
        });

        // Create random comments and replies
        console.log("\nCreating comments and replies...");
        const commentTemplates = [
            "This looks like a great proposal! I fully support this initiative.",
            "I have some concerns about the budget allocation. Can we discuss this further?",
            "Excellent work on putting this together. The community will benefit greatly.",
            "I think we need more details on the implementation timeline.",
            "This aligns perfectly with our long-term goals. Count me in!",
            "Have we considered the potential risks? I'd like to see a risk assessment.",
            "The budget seems reasonable for what's being proposed.",
            "I'm not sure this is the right time for this proposal. Can we revisit next quarter?",
            "This is exactly what we need! Thank you for proposing this.",
            "I have a few questions about the milestones. Can someone clarify?",
            "Great proposal! I'd like to suggest a small modification to the timeline.",
            "I support this but think we should increase the budget slightly.",
            "This is a well-thought-out proposal. I appreciate the detail.",
            "Can we get more information on the expected outcomes?",
            "I'm concerned about the sustainability of this project.",
            "This proposal addresses a real need in our community.",
            "I think we should wait for more community feedback before proceeding.",
            "Excellent initiative! How can I help support this?",
            "The conversion rate seems optimistic. Can we review the assumptions?",
            "I love this idea! When can we expect to see results?"
        ];

        const replyTemplates = [
            "Thanks for your feedback! I'll address your concerns in the next update.",
            "Great point! I've added more details to address this.",
            "I appreciate your support. Let me clarify that for you.",
            "That's a valid concern. Here's what I'm thinking...",
            "Thanks for the suggestion! I'll consider incorporating that.",
            "I understand your point. Let me provide more context.",
            "Good question! I've updated the proposal with that information.",
            "I see where you're coming from. Here's my response...",
            "Thank you! I'm glad you see the value in this proposal.",
            "I'll make sure to include that in the next revision."
        ];

        const authorTypes = ["user", "proposer", "admin"];
        const statuses = ["live", "live", "live", "live", "draft"]; // Mostly live, some draft

        const comments = [];
        const createdComments = [];

        // Create top-level comments (not replies)
        for (let i = 0; i < createdProposals.length; i++) {
            const proposal = createdProposals[i];
            // Each proposal gets 1-4 random comments
            const numComments = Math.floor(Math.random() * 4) + 1;
            
            for (let j = 0; j < numComments; j++) {
                const randomUserId = new mongoose.Types.ObjectId();
                const randomAuthorType = authorTypes[Math.floor(Math.random() * authorTypes.length)];
                const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
                const randomComment = commentTemplates[Math.floor(Math.random() * commentTemplates.length)];

                comments.push({
                    userId: randomUserId,
                    proposalId: proposal._id,
                    content: randomComment,
                    replyTo: null,
                    authorType: randomAuthorType,
                    status: randomStatus
                });
            }
        }

        // Insert top-level comments
        const insertedComments = await Comment.insertMany(comments);
        createdComments.push(...insertedComments);
        console.log(`Created ${insertedComments.length} top-level comments`);

        // Create replies to some comments
        const numReplies = Math.floor(createdComments.length * 0.4); // 40% of comments get replies
        const replies = [];

        for (let i = 0; i < numReplies; i++) {
            const parentComment = createdComments[Math.floor(Math.random() * createdComments.length)];
            const randomUserId = new mongoose.Types.ObjectId();
            const randomAuthorType = authorTypes[Math.floor(Math.random() * authorTypes.length)];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            const randomReply = replyTemplates[Math.floor(Math.random() * replyTemplates.length)];

            replies.push({
                userId: randomUserId,
                proposalId: parentComment.proposalId,
                content: randomReply,
                replyTo: parentComment._id,
                authorType: randomAuthorType,
                status: randomStatus
            });
        }

        // Insert replies
        if (replies.length > 0) {
            const insertedReplies = await Comment.insertMany(replies);
            createdComments.push(...insertedReplies);
            console.log(`Created ${insertedReplies.length} replies`);
        }

        // Create some nested replies (replies to replies)
        const numNestedReplies = Math.floor(replies.length * 0.3); // 30% of replies get nested replies
        const nestedReplies = [];
        const replyComments = createdComments.filter(c => c.replyTo); // Get all reply comments

        for (let i = 0; i < numNestedReplies && replyComments.length > 0; i++) {
            const parentReply = replyComments[Math.floor(Math.random() * replyComments.length)];
            
            const randomUserId = new mongoose.Types.ObjectId();
            const randomAuthorType = authorTypes[Math.floor(Math.random() * authorTypes.length)];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            const randomReply = replyTemplates[Math.floor(Math.random() * replyTemplates.length)];

            nestedReplies.push({
                userId: randomUserId,
                proposalId: parentReply.proposalId,
                content: randomReply,
                replyTo: parentReply._id,
                authorType: randomAuthorType,
                status: randomStatus
            });
        }

        // Insert nested replies
        if (nestedReplies.length > 0) {
            const insertedNestedReplies = await Comment.insertMany(nestedReplies);
            createdComments.push(...insertedNestedReplies);
            console.log(`Created ${insertedNestedReplies.length} nested replies`);
        }

        console.log(`\nTotal comments created: ${createdComments.length} (${insertedComments.length} top-level, ${replies.length} replies, ${nestedReplies.length} nested)`);

        console.log("\n✅ Dummy data created successfully!");
        console.log(`Budget ID: ${budget._id}`);
        console.log(`Categories linked: ${categories.length}`);
        categories.forEach((cat, index) => {
            console.log(`  Category ${index + 1} ID: ${cat._id} - ${cat.title}`);
        });
        console.log(`Proposals created: ${createdProposals.length}`);
        console.log(`Comments created: ${createdComments.length}`);

    } catch (error) {
        console.error("Error creating dummy data:", error);
        throw error;
    } finally {
        // Disconnect from database
        console.log("\nDisconnecting from database...");
        await disconnectFromDatabase();
        process.exit(0);
    }
}


// Run the script
createDummyData();
