import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const notificationsPath = path.resolve(__dirname, "../../routes/api/v0/notifications.js");
const source = await fs.readFile(notificationsPath, "utf8");

const checks = [
  {
    ok: source.includes('import { EmailSendLedger } from "../../../schema/EmailSendLedger.js";'),
    message: "Missing EmailSendLedger import in notifications route.",
  },
  {
    ok: source.includes('crypto.createHash("sha256").update(email).digest("hex")'),
    message: "Missing deterministic SHA-256 recipient hashing.",
  },
  {
    ok: source.includes("EmailSendLedger.findOne({"),
    message: "Missing recipient cooldown lookup in notifications route.",
  },
  {
    ok:
      source.includes("category: MAGIC_LINK_CATEGORY") &&
      source.includes("sentAt: { $gte: sentAfter }"),
    message: "Missing cooldown query constraints for category and time window.",
  },
];

for (const check of checks) {
  if (!check.ok) {
    console.error(check.message);
    process.exit(1);
  }
}

console.log("Notifications recipient cooldown guard check passed.");
