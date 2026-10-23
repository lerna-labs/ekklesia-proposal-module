/**
 * Build identity of the running service: version, short commit sha and build
 * time.
 *
 * Resolution order: a `build-info.json` carried at the root of the release
 * package; then, only when that file does not exist, the `GIT_SHA`,
 * `BUILD_TIME` and `APP_VERSION` environment variables (a checkout mounted
 * for development has no file); then null. A file always wins over the
 * environment, so a long-lived shell or env file cannot make a release report
 * a different commit.
 *
 * Read once per process and cached.
 */
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

const SHA_PATTERN = /^[0-9a-f]{7,40}$/;
const TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z.+-]{0,63}$/;

/** 7 to 40 lowercase hex characters, shortened to 7; anything else is null. */
export function normalizeSha(value) {
  if (typeof value !== "string" || !SHA_PATTERN.test(value)) return null;
  return value.slice(0, 7);
}

/** ISO 8601 UTC timestamp, or null. */
export function normalizeBuildTime(value) {
  if (typeof value !== "string" || !TIME_PATTERN.test(value)) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

function normalizeVersion(value) {
  return typeof value === "string" && VERSION_PATTERN.test(value) ? value : null;
}

function readPackageVersion(baseDir, readFileSync) {
  try {
    return normalizeVersion(
      JSON.parse(readFileSync(join(baseDir, "package.json"), "utf8")).version,
    );
  } catch {
    return null;
  }
}

/**
 * Resolve the build identity without caching. The reader, environment, root
 * directory and logger are injectable for tests.
 */
export function resolveBuildInfo({
  baseDir = rootDir,
  env = process.env,
  readFileSync = fs.readFileSync,
  log = console.warn,
} = {}) {
  const packageVersion = readPackageVersion(baseDir, readFileSync);

  const fromEnv = {
    gitSha: normalizeSha(env.GIT_SHA),
    buildTime: normalizeBuildTime(env.BUILD_TIME),
    version: normalizeVersion(env.APP_VERSION),
  };
  const envPresent = Boolean(env.GIT_SHA || env.BUILD_TIME || env.APP_VERSION);

  let file = null;
  try {
    const parsed = JSON.parse(readFileSync(join(baseDir, "build-info.json"), "utf8"));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    file = {
      gitSha: normalizeSha(parsed.gitSha),
      buildTime: normalizeBuildTime(parsed.buildTime),
      version: normalizeVersion(parsed.version),
    };
  } catch (error) {
    if (error?.code !== "ENOENT") {
      log(
        "build-info.json is present but unreadable or malformed; falling back to the environment",
      );
    }
  }

  if (file) {
    if (
      envPresent &&
      (fromEnv.gitSha !== file.gitSha ||
        fromEnv.buildTime !== file.buildTime ||
        (fromEnv.version !== null && fromEnv.version !== (file.version ?? packageVersion)))
    ) {
      log(
        "Build information in build-info.json differs from the environment; using build-info.json",
      );
    }
    return {
      gitSha: file.gitSha,
      buildTime: file.buildTime,
      version: file.version ?? packageVersion ?? "unknown",
      buildSource: "file",
    };
  }

  if (envPresent) {
    return {
      gitSha: fromEnv.gitSha,
      buildTime: fromEnv.buildTime,
      version: fromEnv.version ?? packageVersion ?? "unknown",
      buildSource: "env",
    };
  }

  return {
    gitSha: null,
    buildTime: null,
    version: packageVersion ?? "unknown",
    buildSource: "none",
  };
}

let cache = null;

export function getBuildInfo() {
  if (cache === null) cache = resolveBuildInfo();
  return cache;
}

export function _resetBuildInfoCache() {
  cache = null;
}
