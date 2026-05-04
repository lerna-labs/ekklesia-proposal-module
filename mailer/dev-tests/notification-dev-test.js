/**
 * Smoke test for a single payload. Full mailer coverage: `node mailer/dev-tests/email-events.test.js`.
 */
import assert from "node:assert/strict";
import { renderDigestFromPayload, renderInstantDigestFromPayload } from "../render.js";

async function main() {
  const payload = {
    period: "24h",
    votes: [
      {
        name: "Budget Vote",
        url: "https://example.com/votes/budget",
        proposals: [
          {
            title: "Proposal A",
            url: "https://example.com/votes/budget/abc123",
            events: [
              {
                type: "proposal_withdrawn",
                reason: "Policy violation",
                comment: "Administrative withdrawal comment",
                timestamp: "2026-05-04 18:00 UTC",
              },
            ],
          },
        ],
      },
    ],
  };

  const digest = await renderDigestFromPayload(payload);
  const instant = await renderInstantDigestFromPayload(payload);

  assert.ok(digest.html.includes("Administrative withdrawal comment"));
  assert.ok(instant.subject.includes("Proposal withdrawn"));
  assert.ok(digest.subject.length > 0);

  console.log("notification-dev-test passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
