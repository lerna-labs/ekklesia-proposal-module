/**
 * F-023 ratchet — missing-user identities must not authenticate via sessionVersion 0.
 *
 * verifyToken must reject when User.findById returns null (no ?? 0 fallback on
 * a missing document). Logout should still inspect update matchedCount.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const verifyTokenPath = path.resolve(__dirname, "../../helper/verifyToken.js");
const sessionPath = path.resolve(__dirname, "../../routes/api/v0/session.js");

const verifySource = await fs.readFile(verifyTokenPath, "utf8");
const sessionSource = await fs.readFile(sessionPath, "utf8");

const checks = [
  {
    ok: verifySource.includes("if (!user)") && verifySource.includes("Invalid token"),
    message: "verifyToken must reject when the user document is missing (F-023).",
  },
  {
    ok: !verifySource.includes("(user?.sessionVersion ?? 0)"),
    message:
      "verifyToken must not coerce a missing user to sessionVersion 0 via user?.sessionVersion ?? 0 (F-023).",
  },
  {
    ok: sessionSource.includes("matchedCount") || sessionSource.includes("modifiedCount"),
    message: "Logout must check update matched/modified count when bumping sessionVersion (F-023).",
  },
];

for (const check of checks) {
  if (!check.ok) {
    console.error(check.message);
    process.exit(1);
  }
}

console.log("Session missing-user guard check passed (F-023).");
