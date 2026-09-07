import crypto from "node:crypto";
import { Router } from "express";
import jwt from "jsonwebtoken";
import validator from "validator";
import { User } from "../../../schema/User.js";
import { EmailSendLedger } from "../../../schema/EmailSendLedger.js";
import { isAuthenticated } from "../../../helper/middleWare.js";
import {
  notificationsWriteLimiter,
  notificationsVerifyDispatchLimiter,
  notificationsResendLimiter,
  notificationsVerifyLimiter,
  notificationsUnsubscribeLimiter,
} from "../../../helper/rateLimiters.js";
import { renderTransactional } from "../../../mailer/render.js";
import { createTranslator } from "../../../mailer/i18n.js";
import { send as sendEmail } from "../../../mailer/transport.js";

const router = Router();
const SCHEDULE_VALUES = new Set(["never", "6h", "daily"]);
const MAGIC_LINK_TTL = "30m";
const MAGIC_LINK_CATEGORY = "magic-link";
const verifyRecipientCooldownRaw = Number.parseInt(
  process.env.NOTIFICATION_VERIFY_RECIPIENT_COOLDOWN_MS ?? "",
  10,
);
const NOTIFICATION_VERIFY_RECIPIENT_COOLDOWN_MS =
  Number.isFinite(verifyRecipientCooldownRaw) && verifyRecipientCooldownRaw > 0
    ? verifyRecipientCooldownRaw
    : 24 * 60 * 60 * 1000;

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not defined in environment variables");
  throw new Error("JWT_SECRET must be configured");
}

function getNotificationState(userDoc) {
  const notification = userDoc?.notification ?? {};
  return {
    email: notification.email ?? null,
    pendingEmail: notification.pendingEmail ?? null,
    schedule: notification.schedule ?? "daily",
    verifiedAt: notification.verifiedAt ?? null,
    locale: notification.locale ?? "en",
  };
}

function buildVerifyToken({ userId, email, jti }) {
  return jwt.sign(
    {
      purpose: "email-verify",
      userId,
      email,
      jti,
    },
    process.env.JWT_SECRET,
    { expiresIn: MAGIC_LINK_TTL },
  );
}

function buildVerifyUrl(token) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const base = frontendUrl.replace(/\/+$/, "");
  return `${base}/notifications/verify?token=${encodeURIComponent(token)}`;
}

async function sendVerificationEmail({ toEmail, verifyUrl }) {
  const t = await createTranslator("en");
  const { html, brand } = await renderTransactional({
    heading: "Confirm your email address",
    body: `Click the button below to verify ${toEmail} and enable notification emails.`,
    ctaLabel: "Verify email",
    ctaUrl: verifyUrl,
    note: "This link expires in 30 minutes.",
    brand: process.env.EMAIL_BRAND || "intersect",
    transactionalType: "verify_email",
    showUnsubscribe: false,
  });
  const subject = t.raw("subject.transactional.verify_email", {
    platformName: brand.platformName,
  });

  // Intentional: verification email is a transactional consent flow and bypasses suppressions.
  return sendEmail({
    from: {
      email: process.env.MAIL_FROM_EMAIL || "notifications@ekklesia.example",
      name: process.env.MAIL_FROM_NAME || "Ekklesia",
    },
    to: {
      email: toEmail,
    },
    subject,
    html,
    category: MAGIC_LINK_CATEGORY,
  });
}

function hashRecipientEmail(email) {
  return crypto.createHash("sha256").update(email).digest("hex");
}

router.get("/", isAuthenticated, async (req, res) => {
  try {
    const userDoc = await User.findById(req.userId).select("notification").lean();
    return res.status(200).json(getNotificationState(userDoc));
  } catch (error) {
    console.error("GET /api/v0/notifications error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch notification settings",
    });
  }
});

router.delete("/pending", isAuthenticated, notificationsWriteLimiter, async (req, res) => {
  try {
    const userId = String(req.userId);
    const userDoc = await User.findById(userId).select("notification").lean();
    if (!userDoc?.notification?.pendingEmail) {
      return res.status(400).json({
        status: "error",
        message: "No pending email address to cancel.",
      });
    }

    await User.updateOne(
      { _id: userId },
      {
        $unset: {
          "notification.pendingEmail": "",
          "notification.verificationIssuedAt": "",
        },
      },
    );

    const updatedUser = await User.findById(userId).select("notification").lean();
    return res.status(200).json(getNotificationState(updatedUser));
  } catch (error) {
    console.error("DELETE /api/v0/notifications/pending error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to cancel pending email.",
    });
  }
});

router.put(
  "/",
  isAuthenticated,
  notificationsWriteLimiter,
  notificationsVerifyDispatchLimiter,
  async (req, res) => {
    try {
      const userId = String(req.userId);
      const scheduleRaw = req.body?.schedule;
      const emailRaw = req.body?.email;
      const updates = {};
      const unsets = {};
      let emailSendFailed = false;
      let verifyUrl = null;

      if (scheduleRaw != null) {
        const schedule = String(scheduleRaw).trim().toLowerCase();
        if (!SCHEDULE_VALUES.has(schedule)) {
          return res.status(400).json({
            status: "error",
            message: "Invalid schedule. Must be one of: never, 6h, daily.",
          });
        }
        updates["notification.schedule"] = schedule;
      }

      let normalizedEmail = null;
      const emailProvided = typeof emailRaw === "string";
      const emailCleared = emailProvided && emailRaw.trim() === "";
      if (emailProvided && !emailCleared) {
        normalizedEmail = emailRaw.trim().toLowerCase();
        if (!validator.isEmail(normalizedEmail)) {
          return res.status(400).json({
            status: "error",
            message: "Invalid email address.",
          });
        }
      }

      const userDoc = await User.findById(userId).lean();
      if (!userDoc) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      const existing = getNotificationState(userDoc);
      const pendingNormalized = existing.pendingEmail
        ? String(existing.pendingEmail).toLowerCase()
        : null;
      if (pendingNormalized && normalizedEmail != null && normalizedEmail !== pendingNormalized) {
        return res.status(409).json({
          status: "error",
          code: "PENDING_EMAIL_EXISTS",
          message: `A confirmation is already pending for ${existing.pendingEmail}. Verify it, resend the link, or cancel the pending email before changing it.`,
        });
      }

      const emailChanged =
        normalizedEmail != null &&
        normalizedEmail !== (existing.email ? String(existing.email).toLowerCase() : null) &&
        normalizedEmail !== pendingNormalized;

      if (emailChanged) {
        const verificationIssuedAt = new Date();
        updates["notification.pendingEmail"] = normalizedEmail;
        updates["notification.verificationIssuedAt"] = verificationIssuedAt;

        const token = buildVerifyToken({
          userId,
          email: normalizedEmail,
          jti: verificationIssuedAt.getTime(),
        });
        verifyUrl = buildVerifyUrl(token);
      }

      if (emailCleared) {
        unsets["notification.email"] = "";
        unsets["notification.pendingEmail"] = "";
        unsets["notification.verifiedAt"] = "";
        unsets["notification.verificationIssuedAt"] = "";
      }

      if (Object.keys(updates).length > 0 || Object.keys(unsets).length > 0) {
        /** @type {{ $set?: Record<string, unknown>, $unset?: Record<string, string> }} */
        const updateDoc = {};
        if (Object.keys(updates).length > 0) updateDoc.$set = updates;
        if (Object.keys(unsets).length > 0) updateDoc.$unset = unsets;
        await User.updateOne({ _id: userId }, updateDoc);
      }

      if (verifyUrl && normalizedEmail) {
        try {
          const recipientHash = hashRecipientEmail(normalizedEmail);
          const sentAfter = new Date(Date.now() - NOTIFICATION_VERIFY_RECIPIENT_COOLDOWN_MS);
          const recentSend = await EmailSendLedger.findOne({
            recipientHash,
            category: MAGIC_LINK_CATEGORY,
            sentAt: { $gte: sentAfter },
          })
            .select("_id")
            .lean();

          if (!recentSend) {
            await sendVerificationEmail({ toEmail: normalizedEmail, verifyUrl });
            await EmailSendLedger.create({
              recipientHash,
              category: MAGIC_LINK_CATEGORY,
              sentAt: new Date(),
            });
          }
        } catch (error) {
          emailSendFailed = true;
          console.error("Failed to send notification verification email:", error);
        }
      }

      const updatedUser = await User.findById(userId).select("notification").lean();
      return res.status(200).json({
        ...getNotificationState(updatedUser),
        emailSendFailed,
      });
    } catch (error) {
      console.error("PUT /api/v0/notifications error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to update notification settings",
      });
    }
  },
);

router.post("/resend", isAuthenticated, notificationsResendLimiter, async (req, res) => {
  try {
    const userId = String(req.userId);
    const userDoc = await User.findById(userId).select("notification").lean();
    if (!userDoc?.notification?.pendingEmail) {
      return res.status(400).json({
        status: "error",
        message: "No pending email address to verify.",
      });
    }

    const pendingEmail = userDoc.notification.pendingEmail;
    const verificationIssuedAt = new Date();
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          "notification.verificationIssuedAt": verificationIssuedAt,
        },
      },
    );

    const token = buildVerifyToken({
      userId,
      email: pendingEmail,
      jti: verificationIssuedAt.getTime(),
    });
    const verifyUrl = buildVerifyUrl(token);

    let emailSendFailed = false;
    try {
      await sendVerificationEmail({ toEmail: pendingEmail, verifyUrl });
    } catch (error) {
      emailSendFailed = true;
      console.error("Failed to resend notification verification email:", error);
    }

    return res.status(200).json({
      status: "success",
      emailSendFailed,
    });
  } catch (error) {
    console.error("POST /api/v0/notifications/resend error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to resend verification email",
    });
  }
});

router.post("/verify", notificationsVerifyLimiter, async (req, res) => {
  try {
    const token = req.body?.token;
    if (!token || typeof token !== "string") {
      return res.status(400).json({
        status: "error",
        message: "Missing verification token.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        message: "Verification link is invalid or expired.",
      });
    }

    if (
      decoded?.purpose !== "email-verify" ||
      !decoded?.userId ||
      !decoded?.email ||
      !decoded?.jti
    ) {
      return res.status(400).json({
        status: "error",
        message: "Verification link is invalid.",
      });
    }

    const userDoc = await User.findById(decoded.userId).select("notification").lean();
    if (!userDoc) {
      return res.status(404).json({
        status: "error",
        message: "User not found.",
      });
    }

    const pendingEmail = userDoc?.notification?.pendingEmail ?? null;
    const verificationIssuedAt = userDoc?.notification?.verificationIssuedAt
      ? new Date(userDoc.notification.verificationIssuedAt).getTime()
      : null;

    if (
      !pendingEmail ||
      pendingEmail !== String(decoded.email).toLowerCase() ||
      verificationIssuedAt == null ||
      verificationIssuedAt !== Number(decoded.jti)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Verification link is no longer valid. Please request a new one.",
      });
    }

    await User.updateOne(
      { _id: decoded.userId },
      {
        $set: {
          "notification.email": pendingEmail,
          "notification.verifiedAt": new Date(),
          "notification.schedule": userDoc?.notification?.schedule ?? "daily",
          "notification.unsubscribeSecret": crypto.randomBytes(32).toString("hex"),
        },
        $unset: {
          "notification.pendingEmail": "",
        },
      },
    );

    const updatedUser = await User.findById(decoded.userId).select("notification").lean();
    return res.status(200).json({
      status: "success",
      notification: getNotificationState(updatedUser),
    });
  } catch (error) {
    console.error("POST /api/v0/notifications/verify error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to verify email.",
    });
  }
});

router.post("/unsubscribe", notificationsUnsubscribeLimiter, async (req, res) => {
  try {
    const token = req.body?.token;
    if (!token || typeof token !== "string") {
      return res.status(400).json({
        status: "error",
        message: "Missing unsubscribe token.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch {
      return res.status(400).json({
        status: "error",
        message: "Unsubscribe link is invalid or expired.",
      });
    }

    if (decoded?.purpose !== "notification-unsubscribe" || !decoded?.userId || !decoded?.v) {
      return res.status(400).json({
        status: "error",
        message: "Unsubscribe link is invalid.",
      });
    }

    const userDoc = await User.findById(decoded.userId)
      .select("notification.unsubscribeSecret")
      .lean();
    if (!userDoc || userDoc?.notification?.unsubscribeSecret !== decoded.v) {
      return res.status(400).json({
        status: "error",
        message:
          "This unsubscribe link is no longer valid. Use notification settings in your account.",
      });
    }

    await User.updateOne({ _id: decoded.userId }, { $set: { "notification.schedule": "never" } });

    const updatedUser = await User.findById(decoded.userId).select("notification").lean();
    return res.status(200).json({
      status: "success",
      notification: getNotificationState(updatedUser),
    });
  } catch (error) {
    console.error("POST /api/v0/notifications/unsubscribe error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to update notification settings.",
    });
  }
});

export default router;
