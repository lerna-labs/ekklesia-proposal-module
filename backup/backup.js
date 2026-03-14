/**
 * MongoDB backup script: load .env, run mongodump to backup/data (timestamped dir),
 * tar+gzip the dir to a .tar.gz, remove raw dir, prune archives older than 30 days,
 * optionally run daily rsync to BACKUP_RSYNC_DEST. Logs to stdout with [backup] prefix.
 * Run via PM2 (cron every 6h) or npm run backup.
 */
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");
const BACKUP_DATA_DIR = path.join(ROOT_DIR, "backup", "data");
const RSYNC_MARKER_FILE = path.join(BACKUP_DATA_DIR, ".last_rsync_date");
const RETENTION_DAYS = 30;

function log(message, level = "info") {
  const ts = new Date().toISOString();
  const prefix = level === "error" ? "[backup] ERROR" : "[backup]";
  console.log(`${prefix} ${ts} ${message}`);
}

function buildMongoUri() {
  if (process.env.MONGO_URI) {
    return process.env.MONGO_URI;
  }
  const host = process.env.MONGODB_HOST || "localhost";
  const port = process.env.MONGODB_PORT || "27017";
  const database = process.env.MONGODB_DATABASE;
  const username = process.env.MONGODB_USERNAME;
  const password = process.env.MONGODB_PASSWORD;
  const authSource = process.env.MONGODB_AUTH_SOURCE || "admin";

  if (!database) {
    throw new Error("MONGODB_DATABASE environment variable is not defined");
  }

  let mongoUri = "mongodb://";
  if (username && password) {
    mongoUri += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
  }
  mongoUri += `${host}:${port}/${database}`;
  if (username && password) {
    mongoUri += `?authSource=${authSource}`;
  }
  return mongoUri;
}

function loadEnv() {
  const envPath = path.join(ROOT_DIR, ".env");
  const envPathEnv = path.join(ROOT_DIR, `.env.${process.env.NODE_ENV || "development"}`);
  const loaded = dotenv.config({ path: envPathEnv, quiet: true });
  if (loaded.error) {
    dotenv.config({ path: envPath, quiet: true });
  }
}

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DATA_DIR)) {
    fs.mkdirSync(BACKUP_DATA_DIR, { recursive: true });
    log(`Created ${BACKUP_DATA_DIR}`);
  }
}

function runMongodump(mongoUri, outDir) {
  log("mongodump started");
  const result = spawnSync("mongodump", ["--uri", mongoUri, "--out", outDir], {
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`mongodump exited with code ${result.status}`);
  }
  log("mongodump finished");
}

function compressDump(dirPath, archivePath) {
  log("tar+gzip started");
  const parentDir = path.dirname(dirPath);
  const dirName = path.basename(dirPath);
  const result = spawnSync("tar", ["-czf", archivePath, "-C", parentDir, dirName], {
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`tar exited with code ${result.status}`);
  }
  fs.rmSync(dirPath, { recursive: true });
  log("tar+gzip finished");
}

function pruneOldDumps() {
  const entries = fs.readdirSync(BACKUP_DATA_DIR, { withFileTypes: true });
  const now = Date.now();
  const maxAgeMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let pruned = 0;

  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.endsWith(".tar.gz") || ent.name.startsWith(".")) continue;
    const base = ent.name.slice(0, -7);
    const s = base;
    const tIdx = s.indexOf("T");
    const iso = tIdx >= 0 ? s.slice(0, tIdx + 1) + s.slice(tIdx + 1).replace(/-/g, ":") : s;
    const date = Date.parse(iso);
    if (Number.isNaN(date)) continue;
    if (now - date > maxAgeMs) {
      fs.rmSync(path.join(BACKUP_DATA_DIR, ent.name));
      pruned++;
      log(`Pruned old dump: ${ent.name}`);
    }
  }

  log(`Pruned ${pruned} old dump(s) (older than ${RETENTION_DAYS} days)`);
}

function shouldRunRsyncToday() {
  try {
    const last = fs.readFileSync(RSYNC_MARKER_FILE, "utf8").trim();
    const today = new Date().toISOString().slice(0, 10);
    return last !== today;
  } catch {
    return true;
  }
}

function runRsync(dest) {
  log("rsync started");
  const result = spawnSync("rsync", ["-avz", path.join(BACKUP_DATA_DIR, "/"), `${dest}/`], {
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`rsync exited with code ${result.status}`);
  }
  const today = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(RSYNC_MARKER_FILE, today, "utf8");
  log("rsync finished");
}

function main() {
  try {
    log("Loading env...");
    loadEnv();

    const mongoUri = buildMongoUri();
    log("Mongo URI configured");

    ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");
    const outDir = path.join(BACKUP_DATA_DIR, timestamp);
    const archivePath = path.join(BACKUP_DATA_DIR, `${timestamp}.tar.gz`);
    runMongodump(mongoUri, outDir);
    compressDump(outDir, archivePath);

    pruneOldDumps();

    const rsyncDest = process.env.BACKUP_RSYNC_DEST?.trim();
    if (rsyncDest) {
      if (shouldRunRsyncToday()) {
        runRsync(rsyncDest);
      } else {
        log("rsync skipped (already ran today)");
      }
    } else {
      log("rsync skipped (BACKUP_RSYNC_DEST not set)");
    }

    log("Backup completed successfully");
    process.exit(0);
  } catch (err) {
    log(err.message || String(err), "error");
    process.exit(1);
  }
}

main();
