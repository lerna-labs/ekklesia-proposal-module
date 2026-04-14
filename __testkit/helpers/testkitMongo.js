/**
 * Mongo connection helpers for __testkit (seed + integration tests).
 */
import { createRequire } from "module";

const require = createRequire(new URL("../../package.json", import.meta.url));
const mongoose = require("mongoose");

export function buildMongoUri() {
  if (process.env.MONGO_URI) return process.env.MONGO_URI;
  const host = process.env.MONGODB_HOST || "localhost";
  const port = process.env.MONGODB_PORT || "27017";
  const database = process.env.MONGODB_DATABASE;
  const username = process.env.MONGODB_USERNAME;
  const password = process.env.MONGODB_PASSWORD;
  const authSource = process.env.MONGODB_AUTH_SOURCE || "admin";
  if (!database) throw new Error("MONGODB_DATABASE or MONGO_URI must be set");
  let uri = "mongodb://";
  if (username && password) {
    uri += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
  }
  uri += `${host}:${port}/${database}`;
  if (username && password) uri += `?authSource=${authSource}`;
  return uri;
}

export async function connect() {
  const uri = buildMongoUri();
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
}

export async function disconnect() {
  await mongoose.disconnect();
}
