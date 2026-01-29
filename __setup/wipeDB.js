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

// connect to database
await connectToDatabase();

// import schemas
import { Budget } from "../schema/Budget.js";
import { Category } from "../schema/Category.js";
import { Proposal } from "../schema/Proposal.js";

// wipe database
await Budget.deleteMany({});
await Category.deleteMany({});
await Proposal.deleteMany({});

// disconnect from database
await disconnectFromDatabase();

console.log("Database wiped successfully");