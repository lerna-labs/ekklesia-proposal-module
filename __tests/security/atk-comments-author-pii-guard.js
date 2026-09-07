import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commentsPath = path.resolve(__dirname, "../../routes/api/v0/comments.js");
const source = await fs.readFile(commentsPath, "utf8");

const formatCommentStart = source.indexOf("async function formatComment(");
const formatCommentEnd = source.indexOf("\n}\n", formatCommentStart);

if (formatCommentStart === -1 || formatCommentEnd === -1) {
  console.error("Unable to locate formatComment() in routes/api/v0/comments.js.");
  process.exit(1);
}

const formatCommentSection = source.slice(formatCommentStart, formatCommentEnd);

if (formatCommentSection.includes("{ ...userDoc")) {
  console.error("formatComment must not spread userDoc into author (PII leak risk).");
  process.exit(1);
}

if (!formatCommentSection.includes('.select("_id name")')) {
  console.error('formatComment must select only public author fields: .select("_id name").');
  process.exit(1);
}

if (formatCommentSection.includes('select("-lastLogin')) {
  console.error(
    "formatComment must not use exclusion-only user select (allows notification leak).",
  );
  process.exit(1);
}

if (
  formatCommentSection.includes("notification") ||
  formatCommentSection.includes("unsubscribeSecret")
) {
  console.error("formatComment author assembly must not reference notification fields.");
  process.exit(1);
}

if (!formatCommentSection.includes("_id: userDoc._id")) {
  console.error("formatComment must build author with explicit _id field.");
  process.exit(1);
}

if (!formatCommentSection.includes("name: userDoc.name")) {
  console.error("formatComment must build author with explicit name field.");
  process.exit(1);
}

console.log("Comments author PII guard check passed.");
