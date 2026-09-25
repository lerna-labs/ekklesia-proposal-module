import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const transportPath = path.resolve(__dirname, "../../mailer/transport.js");
const source = await fs.readFile(transportPath, "utf8");

const hasStaticGoogleImport =
  /import\s+\{\s*sendViaGoogleWorkspace\s*\}\s+from\s+["']\.\/googleWorkspaceSend\.js["']/.test(
    source,
  );
const hasDynamicGoogleImport = /await\s+import\(["']\.\/googleWorkspaceSend\.js["']\)/.test(source);

if (hasStaticGoogleImport) {
  console.error("transport.js still eagerly imports googleWorkspaceSend.js at module load.");
  process.exit(1);
}

if (!hasDynamicGoogleImport) {
  console.error("transport.js is missing lazy dynamic import for google provider.");
  process.exit(1);
}

console.log("Mail transport lazy Google import check passed.");
