import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { loadEnvironmentVariables } from "../helper/envLoader.js";
import { connectToDatabase, disconnectFromDatabase } from "../helper/dbManager.js";
import { runNotificationCron } from "../mailer/cronRunner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  try {
    loadEnvironmentVariables(__dirname);
    await connectToDatabase();
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
