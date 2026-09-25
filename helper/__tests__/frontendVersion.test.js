import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { _resetFrontendVersionCache, loadFrontendVersion } from "../frontendVersion.js";

// Every fixture file lives under a fresh os.tmpdir() mkdtemp directory, never
// under the repo's own public/ (gitignored build output a developer may have
// populated locally). Each temp dir is removed after its test.

async function withTempVersionFile(run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "frontend-version-test-"));
  try {
    await run(path.join(tempDir, "version.json"));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test.beforeEach(() => {
  _resetFrontendVersionCache();
});

test.afterEach(() => {
  _resetFrontendVersionCache();
});

test("reports 'unknown' without logging an error when version.json is absent", async () => {
  await withTempVersionFile(async (versionFile) => {
    const originalError = console.error;
    let errorCalls = 0;
    console.error = () => {
      errorCalls += 1;
    };
    try {
      const result = await loadFrontendVersion(versionFile);
      assert.equal(result, "unknown");
      assert.equal(errorCalls, 0);
    } finally {
      console.error = originalError;
    }
  });
});

test("returns the parsed contents when version.json is present and valid", async () => {
  await withTempVersionFile(async (versionFile) => {
    await fs.writeFile(versionFile, JSON.stringify({ version: "1.2.3" }));

    const result = await loadFrontendVersion(versionFile);

    assert.deepEqual(result, { version: "1.2.3" });
  });
});

test("reports 'unknown' and logs an error when version.json is present but malformed", async () => {
  await withTempVersionFile(async (versionFile) => {
    await fs.writeFile(versionFile, "{ not valid json");

    const originalError = console.error;
    let errorCalls = 0;
    console.error = () => {
      errorCalls += 1;
    };
    try {
      const result = await loadFrontendVersion(versionFile);
      assert.equal(result, "unknown");
      assert.equal(errorCalls, 1);
    } finally {
      console.error = originalError;
    }
  });
});

test("reads the file only once per process, caching the result", async () => {
  await withTempVersionFile(async (versionFile) => {
    await fs.writeFile(versionFile, JSON.stringify({ version: "1.2.3" }));

    const originalReadFile = fs.readFile;
    let readCalls = 0;
    fs.readFile = (...args) => {
      readCalls += 1;
      return originalReadFile(...args);
    };
    try {
      await loadFrontendVersion(versionFile);
      await loadFrontendVersion(versionFile);
      await loadFrontendVersion(versionFile);

      assert.equal(readCalls, 1);
    } finally {
      fs.readFile = originalReadFile;
    }
  });
});
