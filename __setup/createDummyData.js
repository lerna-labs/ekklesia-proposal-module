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

// import schemas
import { Budget } from "../schema/Budget.js";
import { Category } from "../schema/Category.js";
import { Proposal } from "../schema/Proposal.js";

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

        // Create a category for the budget
        console.log("Creating category...");
        const category = await Category.create({
            budgetId: budget._id,
            title: "General Expenses",
            description: "General expenses category for proposals"
        });
        console.log(`Category created with ID: ${category._id}`);

        // Create 4 proposals with different statuses
        const proposals = [
            {
                userId: "user123",
                budgetId: budget._id,
                title: "Draft Proposal - Website Redesign",
                categoryId: category._id,
                proposerName: "John Doe",
                status: "draft",
                affiliatedDReps: ["drep1", "drep2"]
            },
            {
                userId: "user456",
                budgetId: budget._id,
                title: "Live Proposal - Community Garden",
                categoryId: category._id,
                proposerName: "Jane Smith",
                status: "live",
                affiliatedDReps: ["drep3"]
            },
            {
                userId: "user789",
                budgetId: budget._id,
                title: "Withdrawn by Proposer - Event Planning",
                categoryId: category._id,
                proposerName: "Bob Johnson",
                status: "withdrawnByProposer",
                withdrawalReason: {
                    category: "Other",
                    userId: budget._id, // Using budgetId as placeholder, should be actual user ObjectId
                    comment: "Changed my mind about this proposal",
                    date: new Date()
                }
            },
            {
                userId: "user012",
                budgetId: budget._id,
                title: "Withdrawn by Admin - Inappropriate Content",
                categoryId: category._id,
                proposerName: "Alice Williams",
                status: "withdrawnByAdmin",
                withdrawalReason: {
                    category: "Inappropriate content",
                    userId: budget._id, // Using budgetId as placeholder, should be actual admin ObjectId
                    comment: "Content violates community guidelines",
                    date: new Date()
                }
            }
        ];

        console.log("Creating proposals...");
        const createdProposals = await Proposal.insertMany(proposals);
        console.log(`Created ${createdProposals.length} proposals:`);
        createdProposals.forEach((proposal, index) => {
            console.log(`  ${index + 1}. ${proposal.title} - Status: ${proposal.status}`);
        });

        console.log("\n✅ Dummy data created successfully!");
        console.log(`Budget ID: ${budget._id}`);
        console.log(`Category ID: ${category._id}`);
        console.log(`Proposals created: ${createdProposals.length}`);

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
