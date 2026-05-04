import { runNotificationDispatch } from "./notificationDispatch.js";

export async function runNotificationCron(now = new Date()) {
  return runNotificationDispatch(now);
}
