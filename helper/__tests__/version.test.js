import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import express from "express";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { _resetBuildInfoCache } from "../buildInfo.js";
import versionRouter from "../../routes/version.js";

const schema = JSON.parse(
  fs.readFileSync(new URL("./schemas/version.schema.json", import.meta.url), "utf8"),
);

async function withServer(run) {
  const app = express();
  // Stands in for the database gate that refuses every /api request while the database is down.
  app.use("/api", (req, res) => res.status(503).json({ status: "error" }));
  app.use("/version", versionRouter);
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    return await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function withEnv(values, run) {
  const keys = ["GIT_SHA", "BUILD_TIME", "APP_VERSION"];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  for (const k of keys) delete process.env[k];
  Object.assign(process.env, values);
  _resetBuildInfoCache();
  return Promise.resolve(run()).finally(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    _resetBuildInfoCache();
  });
}

test("GET /version returns exactly the four keys, validates, and is cacheable", async () => {
  await withEnv({ GIT_SHA: "0123456789abcdef0123", BUILD_TIME: "2026-01-02T03:04:05Z" }, () =>
    withServer(async (base) => {
      const res = await fetch(`${base}/version`);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("cache-control"), "public, max-age=60");
      const body = await res.json();
      assert.deepEqual(Object.keys(body).sort(), ["buildTime", "gitSha", "name", "version"]);
      assert.equal(body.name, "ekklesia-proposal-module");
      assert.equal(body.gitSha, "0123456");
      const ajv = new Ajv({ strict: false });
      addFormats(ajv);
      assert.equal(ajv.validate(schema, body), true, JSON.stringify(ajv.errors));
    }),
  );
});

test("GET /version reports null sha and time when no build information exists", async () => {
  await withEnv({}, () =>
    withServer(async (base) => {
      const body = await (await fetch(`${base}/version`)).json();
      assert.equal(body.gitSha, null);
      assert.equal(body.buildTime, null);
    }),
  );
});

test("GET /version answers while the database gate refuses /api", async () => {
  await withEnv({}, () =>
    withServer(async (base) => {
      assert.equal((await fetch(`${base}/api/v0/status`)).status, 503);
      assert.equal((await fetch(`${base}/version`)).status, 200);
    }),
  );
});
