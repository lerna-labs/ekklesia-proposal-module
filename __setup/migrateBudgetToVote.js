/**
 * One-time migration: rename budgetId → voteId in proposals and categories collections.
 * Run after deploying the Vote schema and API; keeps existing data.
 *
 * Usage (from project root): node __setup/migrateBudgetToVote.js
 * From __setup: node migrateBudgetToVote.js
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.development") });

import { loadEnvironmentVariables } from "../helper/envLoader.js";
loadEnvironmentVariables();

import { connectToDatabase, disconnectFromDatabase } from "../helper/dbManager.js";
import mongoose from "mongoose";

async function migrate() {
  await connectToDatabase();
  const db = mongoose.connection.db;

  const proposalsResult = await db
    .collection("proposals")
    .updateMany({ budgetId: { $exists: true } }, { $rename: { budgetId: "voteId" } });
  console.log(`Proposals: renamed budgetId → voteId for ${proposalsResult.modifiedCount} document(s).`);

  const categoriesResult = await db
    .collection("categories")
    .updateMany({ budgetId: { $exists: true } }, { $rename: { budgetId: "voteId" } });
  console.log(`Categories: renamed budgetId → voteId for ${categoriesResult.modifiedCount} document(s).`);

  await disconnectFromDatabase();
  console.log("Migration complete.");
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
