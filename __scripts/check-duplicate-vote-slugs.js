/**
 * Pre-release check: report duplicate Vote.slug values that would block the unique index.
 *
 * Usage (from project root):
 *   node __scripts/check-duplicate-vote-slugs.js
 *
 * Exit 0 if every slug is unique (or no votes exist).
 * Exit 1 if duplicates are found (prints slug, count, and document ids).
 */
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.development") });

import { loadEnvironmentVariables } from "../helper/envLoader.js";
loadEnvironmentVariables();

import { connectToDatabase, disconnectFromDatabase } from "../helper/dbManager.js";
import { Vote } from "../schema/Vote.js";

async function main() {
  let exitCode = 0;
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      throw new Error("Could not connect to MongoDB. Check MONGODB_* in .env");
    }

    const duplicates = await Vote.aggregate([
      { $group: { _id: "$slug", count: { $sum: 1 }, ids: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]);

    if (duplicates.length > 0) {
      exitCode = 1;
      console.error(`Found ${duplicates.length} duplicate Vote.slug value(s):\n`);
      for (const row of duplicates) {
        const ids = row.ids.map((id) => id.toString()).join(", ");
        console.error(`  slug="${row._id}" count=${row.count} ids=[${ids}]`);
      }
      console.error(
        "\nResolve duplicates before deploying: Vote.slug has a unique index and createIndexes will fail otherwise."
      );
      return;
    }

    console.log("OK: no duplicate Vote.slug values.");
    await Vote.createIndexes();
    console.log("OK: Vote indexes ensured (including unique slug).");
  } catch (err) {
    console.error(err);
    exitCode = 1;
  } finally {
    await disconnectFromDatabase();
    process.exit(exitCode);
  }
}

main();
