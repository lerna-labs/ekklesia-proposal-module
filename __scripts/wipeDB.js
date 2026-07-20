// load env from .env.development
import dotenv from "dotenv";
dotenv.config({
    path: "../.env.development"
});

// load environment variables
import { loadEnvironmentVariables } from "../helper/envLoader.js";
loadEnvironmentVariables();

/** Local/dev database names only — refuse to wipe anything else. */
const WIPE_ALLOWED_DATABASES = ["bugdet-module"];

function assertSafeToWipe() {
    const environment = process.env.NODE_ENV || "development";
    if (environment === "production") {
        console.error("Refusing to wipe database: NODE_ENV is production.");
        process.exit(1);
    }

    const database = process.env.MONGODB_DATABASE;
    if (!database || !WIPE_ALLOWED_DATABASES.includes(database)) {
        console.error(
            `Refusing to wipe database: MONGODB_DATABASE must be one of ${WIPE_ALLOWED_DATABASES.join(", ")} (got ${database ?? "unset"}).`,
        );
        process.exit(1);
    }
}

assertSafeToWipe();

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