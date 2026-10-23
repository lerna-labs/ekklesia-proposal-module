import test, { mock } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { setRoutesLoaded } from "../healthTiers.js";

// Run with --experimental-test-module-mocks (see the test:helper script).
let dbUp = true;
mock.module("../dbManager.js", {
  namedExports: {
    checkDatabaseConnection: async () => dbUp,
  },
});
// A fresh import per test gives each router its own database-check cache.
let imports = 0;
const loadRouter = async () => (await import(`../../routes/health.js?n=${imports++}`)).default;

async function withServer(run) {
  const healthRouter = await loadRouter();
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

test("the real health router reports ready and unavailable from the database and load state", async () => {
  process.env.NETWORK_NAME = "preprod";
  process.env.NETWORK_ID = "0";
  await withServer(async (base) => {
    setRoutesLoaded(false);
    dbUp = true;
    assert.equal((await fetch(`${base}/health`)).status, 503);
    assert.equal((await fetch(`${base}/health/live`)).status, 200);

    setRoutesLoaded(true);
    const ready = await fetch(`${base}/health`);
    assert.equal(ready.status, 200);
    assert.deepEqual(await ready.json(), { status: "ready", network: "preprod", networkId: 0 });
    assert.equal((await fetch(`${base}/health/`)).status, 200);

    setRoutesLoaded(false);
  });
});

test("the real health router answers 503 when the database check fails, liveness stays 200", async () => {
  await withServer(async (base) => {
    setRoutesLoaded(true);
    dbUp = false;
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 503);
    assert.equal((await res.json()).status, "unavailable");
    assert.equal((await fetch(`${base}/health/live`)).status, 200);
    setRoutesLoaded(false);
  });
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
