import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import {
  areRoutesLoaded,
  createBoundedCheck,
  createReadinessHandler,
  liveHandler,
  setRoutesLoaded,
} from "../healthTiers.js";

async function withServer(readiness, run) {
  const app = express();
  app.get("/health/live", liveHandler);
  app.get("/health", readiness);
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    return await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function withNetwork(run) {
  const saved = { name: process.env.NETWORK_NAME, id: process.env.NETWORK_ID };
  process.env.NETWORK_NAME = "preprod";
  process.env.NETWORK_ID = "0";
  return Promise.resolve(run()).finally(() => {
    if (saved.name === undefined) delete process.env.NETWORK_NAME;
    else process.env.NETWORK_NAME = saved.name;
    if (saved.id === undefined) delete process.env.NETWORK_ID;
    else process.env.NETWORK_ID = saved.id;
  });
}

const ready = (db, loaded) =>
  createReadinessHandler({ checkDatabase: () => db, routesLoaded: () => loaded });

test("database connected and routes loaded: both answer 200, readiness has only the network fields", async () => {
  await withNetwork(() =>
    withServer(ready(true, true), async (base) => {
      const live = await fetch(`${base}/health/live`);
      assert.equal(live.status, 200);
      assert.deepEqual(await live.json(), { status: "alive" });

      const res = await fetch(`${base}/health`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.deepEqual(Object.keys(body).sort(), ["network", "networkId", "status"]);
      assert.deepEqual(body, { status: "ready", network: "preprod", networkId: 0 });
    }),
  );
});

test("database disconnected: liveness 200, readiness 503 with no database detail", async () => {
  await withNetwork(() =>
    withServer(ready(false, true), async (base) => {
      assert.equal((await fetch(`${base}/health/live`)).status, 200);
      const res = await fetch(`${base}/health`);
      assert.equal(res.status, 503);
      assert.deepEqual(await res.json(), {
        status: "unavailable",
        network: "preprod",
        networkId: 0,
      });
    }),
  );
});

test("routes not yet loaded: liveness 200, readiness 503", async () => {
  await withNetwork(() =>
    withServer(ready(true, false), async (base) => {
      assert.equal((await fetch(`${base}/health/live`)).status, 200);
      assert.equal((await fetch(`${base}/health`)).status, 503);
    }),
  );
});

test("a throwing connectivity check answers 503 with the same body shape", async () => {
  const handler = createReadinessHandler({
    checkDatabase: () => {
      throw new Error("mongodb://user:secret@host/db refused");
    },
    routesLoaded: () => true,
  });
  await withNetwork(() =>
    withServer(handler, async (base) => {
      const res = await fetch(`${base}/health`);
      assert.equal(res.status, 503);
      const text = await res.text();
      assert.doesNotMatch(text, /secret|mongodb/);
      assert.deepEqual(Object.keys(JSON.parse(text)).sort(), ["network", "networkId", "status"]);
    }),
  );
});

test("the load flag starts false and follows setRoutesLoaded", () => {
  assert.equal(areRoutesLoaded(), false);
  setRoutesLoaded(true);
  assert.equal(areRoutesLoaded(), true);
  setRoutesLoaded(false);
  assert.equal(areRoutesLoaded(), false);
});

test("network is null, not absent, when NETWORK_NAME is unset", async () => {
  const saved = process.env.NETWORK_NAME;
  delete process.env.NETWORK_NAME;
  try {
    await withServer(ready(true, true), async (base) => {
      const body = await (await fetch(`${base}/health`)).json();
      assert.deepEqual(Object.keys(body).sort(), ["network", "networkId", "status"]);
      assert.equal(body.network, null);
    });
  } finally {
    if (saved !== undefined) process.env.NETWORK_NAME = saved;
  }
});

test("a frozen database check times out as failed and is reused within the ttl", async () => {
  let calls = 0;
  let clock = 0;
  const check = createBoundedCheck(
    () => {
      calls += 1;
      return new Promise(() => {});
    },
    { ttlMs: 3000, timeoutMs: 20, now: () => clock },
  );
  const [a, b] = await Promise.all([check(), check()]);
  assert.equal(a, false);
  assert.equal(b, false);
  assert.equal(calls, 1);
  clock = 2999;
  assert.equal(await check(), false);
  assert.equal(calls, 1);
  clock = 3000;
  assert.equal(await check(), false);
  assert.equal(calls, 2);
});

test("a rejecting database check is a failed check", async () => {
  const check = createBoundedCheck(() => Promise.reject(new Error("boom")), { timeoutMs: 20 });
  assert.equal(await check(), false);
});

test("a passing database check is true and cached", async () => {
  let calls = 0;
  const check = createBoundedCheck(async () => {
    calls += 1;
    return true;
  });
  assert.equal(await check(), true);
  assert.equal(await check(), true);
  assert.equal(calls, 1);
});
