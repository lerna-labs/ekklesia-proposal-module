import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import healthRouter from "../../routes/health.js";
import { setRoutesLoaded } from "../healthTiers.js";

// No database is connected in this suite, so the real connectivity check reports it down.
async function withServer(run) {
  const app = express();
  app.use("/health", healthRouter);
  // Stands in for the single-page app catch-all that follows the routes in server.js.
  app.get(/^(?!\/api).*/, (req, res) => res.status(200).send("<html></html>"));
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    return await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("the real health router answers 503 with only the network fields when no database is connected", async () => {
  process.env.NETWORK_NAME = "preprod";
  process.env.NETWORK_ID = "0";
  // Routes are loaded, so the 503 below can only come from the database check.
  setRoutesLoaded(true);
  await withServer(async (base) => {
    for (const path of ["/health", "/health/"]) {
      const res = await fetch(`${base}${path}`);
      assert.equal(res.status, 503, path);
      assert.deepEqual(await res.json(), {
        status: "unavailable",
        network: "preprod",
        networkId: 0,
      });
    }
    const live = await fetch(`${base}/health/live`);
    assert.equal(live.status, 200);
    assert.deepEqual(await live.json(), { status: "alive" });
  }).finally(() => setRoutesLoaded(false));
});

test("the former and unknown health paths answer 404 JSON, not the app shell", async () => {
  await withServer(async (base) => {
    for (const path of ["/health/health", "/health/db", "/health/other"]) {
      const res = await fetch(`${base}${path}`);
      assert.equal(res.status, 404, path);
      assert.deepEqual(await res.json(), { status: "error", message: "Not found" });
    }
  });
});
