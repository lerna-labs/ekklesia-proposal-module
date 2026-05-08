import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadEnvironmentVariables } from "../helper/envLoader.js";
import { connectToDatabase, disconnectFromDatabase } from "../helper/dbManager.js";
import { runNotificationCron } from "../mailer/cronRunner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  try {
    // Load env from repository root (not cron/), so .env(.development) is found.
    loadEnvironmentVariables(resolve(__dirname, ".."));
    const connection = await connectToDatabase();
    if (!connection) {
      throw new Error("Database connection was not established");
    }
    const result = await runNotificationCron(new Date());
    console.log("Notification cron completed:", result);
  } catch (error) {
    console.error("Notification cron failed:", error);
    process.exitCode = 1;
  } finally {
    await disconnectFromDatabase();
  }
}

main();
