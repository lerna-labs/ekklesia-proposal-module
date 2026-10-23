import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveBuildInfo } from "../buildInfo.js";

const FULL = "0123456789abcdef0123456789abcdef01234567";
const TIME = "2026-01-02T03:04:05Z";

function withDir(files, run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "build-info-test-"));
  try {
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(dir, name), content);
    }
    const logs = [];
    return run({ baseDir: dir, log: (line) => logs.push(line) }, logs);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const pkg = JSON.stringify({ version: "1.6.3" });

test("reports null sha and time, package version and source none without logging", () => {
  withDir({ "package.json": pkg }, (opts, logs) => {
    const info = resolveBuildInfo({ ...opts, env: {} });
    assert.deepEqual(info, {
      gitSha: null,
      buildTime: null,
      version: "1.6.3",
      buildSource: "none",
    });
    assert.deepEqual(logs, []);
  });
});

test("reads the environment when no file exists", () => {
  withDir({ "package.json": pkg }, (opts, logs) => {
    const info = resolveBuildInfo({
      ...opts,
      env: { GIT_SHA: "abc1234", BUILD_TIME: TIME, APP_VERSION: "1.7.0" },
    });
    assert.deepEqual(info, {
      gitSha: "abc1234",
      buildTime: TIME,
      version: "1.7.0",
      buildSource: "env",
    });
    assert.deepEqual(logs, []);
  });
});

test("the file wins over the environment and one line names only the sources", () => {
  const file = JSON.stringify({ gitSha: "1111111", buildTime: TIME });
  withDir({ "package.json": pkg, "build-info.json": file }, (opts, logs) => {
    const info = resolveBuildInfo({
      ...opts,
      env: { GIT_SHA: "2222222", BUILD_TIME: "2020-01-01T00:00:00Z" },
    });
    assert.equal(info.gitSha, "1111111");
    assert.equal(info.buildTime, TIME);
    assert.equal(info.buildSource, "file");
    assert.equal(logs.length, 1);
    assert.ok(!logs[0].includes("2222222") && !logs[0].includes("1111111"));
  });
});

test("does not log when the file and the environment agree", () => {
  const file = JSON.stringify({ gitSha: "1111111", buildTime: TIME });
  withDir({ "package.json": pkg, "build-info.json": file }, (opts, logs) => {
    resolveBuildInfo({
      ...opts,
      env: { GIT_SHA: FULL.replace(/^.{7}/, "1111111"), BUILD_TIME: TIME },
    });
    assert.deepEqual(logs, []);
  });
});

test("a file without a sha does not fall back to the environment sha", () => {
  withDir(
    { "package.json": pkg, "build-info.json": JSON.stringify({ buildTime: TIME }) },
    (opts) => {
      const info = resolveBuildInfo({ ...opts, env: { GIT_SHA: "2222222" } });
      assert.equal(info.gitSha, null);
      assert.equal(info.buildSource, "file");
    },
  );
});

test("a version in the file replaces the package version", () => {
  const file = JSON.stringify({ gitSha: "1111111", buildTime: TIME, version: "1.7.0-rc.0" });
  withDir({ "package.json": pkg, "build-info.json": file }, (opts) => {
    assert.equal(resolveBuildInfo({ ...opts, env: {} }).version, "1.7.0-rc.0");
  });
});

test("shortens a long sha and nulls anything that is not 7 to 40 lowercase hex", () => {
  withDir({ "package.json": pkg }, (opts) => {
    assert.equal(resolveBuildInfo({ ...opts, env: { GIT_SHA: FULL } }).gitSha, "0123456");
    for (const bad of [
      "abc123",
      "ABCDEF1",
      FULL + "0",
      "../../etc",
      "<b>abcdef1</b>",
      "gggggggg",
    ]) {
      assert.equal(resolveBuildInfo({ ...opts, env: { GIT_SHA: bad } }).gitSha, null, bad);
    }
  });
});

test("nulls a build time that is not ISO 8601 UTC", () => {
  withDir({ "package.json": pkg }, (opts) => {
    for (const bad of [
      "yesterday",
      "2026-01-02",
      "2026-01-02T03:04:05+02:00",
      "2026-13-45T03:04:05Z",
    ]) {
      assert.equal(resolveBuildInfo({ ...opts, env: { BUILD_TIME: bad } }).buildTime, null, bad);
    }
  });
});

test("a malformed file logs once and falls back to the environment, then null", () => {
  withDir({ "package.json": pkg, "build-info.json": "{not json" }, (opts, logs) => {
    const info = resolveBuildInfo({ ...opts, env: { GIT_SHA: "2222222" } });
    assert.equal(info.gitSha, "2222222");
    assert.equal(info.buildSource, "env");
    assert.equal(logs.length, 1);
    const none = resolveBuildInfo({ ...opts, env: {} });
    assert.equal(none.buildSource, "none");
    assert.equal(none.gitSha, null);
  });
});

test("falls back to 'unknown' when package.json is unreadable", () => {
  withDir({}, (opts) => {
    assert.equal(resolveBuildInfo({ ...opts, env: {} }).version, "unknown");
  });
});

test("locates the file from the module path, not the working directory", () => {
  const original = process.cwd();
  process.chdir(os.tmpdir());
  try {
    assert.equal(typeof resolveBuildInfo({ env: {} }).version, "string");
    assert.notEqual(resolveBuildInfo({ env: {} }).version, "unknown");
  } finally {
    process.chdir(original);
  }
});
