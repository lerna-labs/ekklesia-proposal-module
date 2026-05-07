/**
 * MAIL-DEPS-001 — Silent /api/v0/* blackout when mailer deps missing (HIGH)
 *
 * Observed during the 2026-05-06 Wraith run on commit 5b88e17:
 *
 *   - package.json declares `googleapis` and `google-auth-library`
 *   - node_modules did not contain either (developer had not run npm i
 *     after the v2 mailer rebase)
 *   - server.js's helper/loadRoutes.js wraps the WHOLE directory walk in
 *     a single try/catch. When `routes/api/v0/notifications.js` (which
 *     transitively imports `mailer/googleWorkspaceSend.js`) failed to
 *     resolve, the catch fired ONCE and the loop bailed before mounting
 *     any subsequent /api/v0/* route.
 *   - /health continued to respond 200 with `{status: "operational"}`
 *     because health.js was loaded first.
 *
 * Net effect: every /api/v0/* request returned 404 "API route not found",
 * but health checks said "operational". In production this is a silent
 * total API outage with green health probes.
 *
 * What this script demonstrates: a smoke probe across a known route
 * subset. If /health is green AND /api/v0/proposals returns 404, the
 * server is in the failure mode.
 *
 * Suggested fixes (not Wraith's job):
 *   1. Lazy/conditional import: only import googleWorkspaceSend.js when
 *      EMAIL_PROVIDER === "google" (or behind dynamic import inside send()).
 *   2. loadRoutes: catch per-file so one bad module doesn't drop the rest.
 *   3. Health check: surface route-mount status (e.g. count of mounted
 *      /api/v0 routes) so a green /health also implies API reachability.
 */
const API = process.env.API ?? "http://localhost:3001";

const probes = [
  { method: "GET", path: "/health", expect: 200 },
  { method: "GET", path: "/api/v0/proposals", expect: [200, 400] },
  { method: "GET", path: "/api/v0/regions", expect: 200 },
];

let healthOk = false;
let apiBlackout = true;
for (const p of probes) {
  const res = await fetch(`${API}${p.path}`, { method: p.method });
  const ok = Array.isArray(p.expect)
    ? p.expect.includes(res.status)
    : res.status === p.expect;
  console.log(`${p.method} ${p.path} -> ${res.status} (${ok ? "ok" : "unexpected"})`);
  if (p.path === "/health" && res.status === 200) healthOk = true;
  if (p.path.startsWith("/api/") && res.status !== 404) apiBlackout = false;
}

if (healthOk && apiBlackout) {
  console.log("\nSILENT BLACKOUT: /health green, /api/v0/* all 404");
  process.exit(0);
}
console.log("\nNo blackout detected.");
process.exit(1);
