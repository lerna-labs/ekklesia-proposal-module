import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const notificationsPath = path.resolve(__dirname, "../../routes/api/v0/notifications.js");
const source = await fs.readFile(notificationsPath, "utf8");

const putAnchor = "router.put(";
const verifyAnchor = 'router.post("/verify"';

const putStart = source.indexOf(putAnchor);
const verifyStart = source.indexOf(verifyAnchor);

if (putStart === -1 || verifyStart === -1) {
  console.error("Unable to locate notifications PUT or verify handlers.");
  process.exit(1);
}

const putSection = source.slice(putStart, verifyStart);
const verifySection = source.slice(verifyStart);

if (putSection.includes("notification.unsubscribeSecret")) {
  console.error("unsubscribeSecret should not be rotated in PUT /api/v0/notifications.");
  process.exit(1);
}

if (!verifySection.includes("notification.unsubscribeSecret")) {
  console.error("unsubscribeSecret must rotate on successful POST /api/v0/notifications/verify.");
  process.exit(1);
}

if (!verifySection.includes('crypto.randomBytes(32).toString("hex")')) {
  console.error("verify handler is missing cryptographic unsubscribeSecret rotation.");
  process.exit(1);
}

console.log("Unsubscribe rotation timing guard check passed.");
