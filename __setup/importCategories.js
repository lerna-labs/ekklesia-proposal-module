// load env from .env.development
import dotenv from "dotenv";
dotenv.config({ path: ".env.development" });

// use dbManager for database connection
import { connectToDatabase } from "../helper/dbManager.js";

// connect to database
await connectToDatabase();

// import categories schema
import { Category } from "../schema/Category.js";

// set budgetId manually
const budgetId = "";
// import categories data from categories.json
const categories = JSON.parse(fs.readFileSync("categories.json", "utf8"));

// create categories
for (const category of categories) {
    await Category.create({
        budgetId,
        title: category.title,
        description: category.description,
    });
}

console.log("Categories imported successfully");