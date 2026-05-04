/**
 * Quick Koios connectivity check (API_URL, API_TOKEN — same as helper/koios.js).
 * Loads `.env.production` from the repo root (via NODE_ENV=production).
 *
 * Usage (repo root):
 *   node __scripts/test-koios.js
 *   node __scripts/test-koios.js <txHashHex>   # also exercises POST /tx_info
 */

import { fileURLToPath } from "url";
import path from "path";
import { loadEnvironmentVariables } from "../helper/envLoader.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.NODE_ENV = "production";
loadEnvironmentVariables(path.join(__dirname, ".."));

const API_URL = (process.env.API_URL || "").trim().replace(/\/$/, "");
const API_TOKEN = (process.env.API_TOKEN || "").trim();

const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    authorization: `Bearer ${API_TOKEN}`,
};

async function readResponse(response) {
    const text = await response.text();
    let parsed = null;
    try {
        parsed = JSON.parse(text);
    } catch {
        /* leave parsed null */
    }
    return { text, parsed };
}

function printResult(label, response, { text, parsed }) {
    console.log(`\n--- ${label} ---`);
    console.log("Status:", response.status, response.statusText);
    console.log("Content-Type:", response.headers.get("content-type"));
    if (parsed !== null) {
        const s = JSON.stringify(parsed);
        console.log(
            "JSON:",
            s.length > 600 ? `${s.slice(0, 600)}… (${s.length} chars)` : s
        );
    } else {
        console.log("Not valid JSON. Body (first 500 chars):");
        console.log(text.slice(0, 500));
    }
}

async function main() {
    if (!API_URL || !API_TOKEN) {
        console.error("Set API_URL and API_TOKEN (e.g. in .env.development).");
        process.exit(1);
    }

    console.log("API_URL:", API_URL);

    let failed = false;

    const tipRes = await fetch(`${API_URL}/tip`, { headers });
    const tipBody = await readResponse(tipRes);
    printResult(`GET ${API_URL}/tip`, tipRes, tipBody);
    if (
        !tipRes.ok ||
        tipBody.parsed === null ||
        !Array.isArray(tipBody.parsed)
    ) {
        failed = true;
    }

    const txHash = process.argv[2];
    if (txHash) {
        const txRes = await fetch(`${API_URL}/tx_info`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                _tx_hashes: [txHash],
                _inputs: true,
                _metadata: false,
                _assets: false,
                _withdrawals: false,
                _certs: false,
                _scripts: false,
                _bytecode: false,
                _governance: false,
            }),
        });
        const txBody = await readResponse(txRes);
        printResult(`POST ${API_URL}/tx_info`, txRes, txBody);
        if (!txRes.ok || txBody.parsed === null || !Array.isArray(txBody.parsed)) {
            failed = true;
        } else if (txBody.parsed.length === 0) {
            console.log("\n(tx_info returned [] — hash not on chain or unknown to this instance.)");
        }
    }

    process.exit(failed ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
