import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rateLimitersPath = path.resolve(__dirname, "../../helper/rateLimiters.js");
const notificationsPath = path.resolve(__dirname, "../../routes/api/v0/notifications.js");

const [rateLimiterSource, notificationsSource] = await Promise.all([
  fs.readFile(rateLimitersPath, "utf8"),
  fs.readFile(notificationsPath, "utf8"),
]);

const checks = [
  {
    ok:
      rateLimiterSource.includes("export const notificationsVerifyDispatchLimiter = rateLimit({") &&
      rateLimiterSource.includes("NOTIFICATION_VERIFY_DISPATCH_MAX_PER_HOUR"),
    message: "Missing notificationsVerifyDispatchLimiter definition.",
  },
  {
    ok: notificationsSource.includes("notificationsVerifyDispatchLimiter"),
    message: "Notifications route does not import/use verify dispatch limiter.",
  },
  {
    ok: notificationsSource.includes(
      "notificationsWriteLimiter,\n  notificationsVerifyDispatchLimiter,",
    ),
    message: "Verify dispatch limiter is not chained with notifications PUT middleware.",
  },
];

for (const check of checks) {
  if (!check.ok) {
    console.error(check.message);
    process.exit(1);
  }
}

console.log("Notifications verify dispatch limiter guard check passed.");
