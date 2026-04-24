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
import { Proposal } from "../schema/Proposal.js";
import { Comment } from "../schema/Comment.js";
import { User } from "../schema/User.js";
import { Country } from "../schema/Country.js";
import { Session } from "../schema/Session.js";
import { CommentLike } from "../schema/CommentLike.js";

// wipe database
await Vote.deleteMany({});
await Proposal.deleteMany({});
await Comment.deleteMany({});
await User.deleteMany({});
await Country.deleteMany({});
await Session.deleteMany({});
await CommentLike.deleteMany({});

// disconnect from database
await disconnectFromDatabase();

console.log("Database wiped successfully");