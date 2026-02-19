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
import { Vote } from "../schema/Vote.js";
import { Category } from "../schema/Category.js";
import { Proposal } from "../schema/Proposal.js";
import { Comment } from "../schema/Comment.js";

// wipe database
await Vote.deleteMany({});
// await Category.deleteMany({});
await Proposal.deleteMany({});
await Comment.deleteMany({});

// disconnect from database
await disconnectFromDatabase();

console.log("Database wiped successfully");