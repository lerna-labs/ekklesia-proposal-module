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

        console.log("\n✅ Dummy data created successfully!");
        console.log(`Budget ID: ${budget._id}`);
        console.log(`Categories linked: ${categories.length}`);
        categories.forEach((cat, index) => {
            console.log(`  Category ${index + 1} ID: ${cat._id} - ${cat.title}`);
        });
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
