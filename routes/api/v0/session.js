// express router
import { Router } from "express";
import rateLimit from "express-rate-limit";
const router = Router();

// schema import
import { Session } from "../../../schema/Session.js";
import { User } from "../../../schema/User.js";
import { Vote } from "../../../schema/Vote.js";

// helper
import jwt from "jsonwebtoken";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import { generateNonce } from "@meshsdk/core";
import {
  verifySignature,
  isPartyToScript,
} from "../../../helper/verifySignature.js";
import { validateAddress } from "../../../helper/validateAddress.js";
import { fetchDrepName, fetchHandle } from "../../../helper/koios.js";

// enable dayjs duration plugin
dayjs.extend(duration);

// middleware
import { isAuthenticated } from "../../../helper/middleWare.js";
import { validateSessionRequest } from "../../../helper/middleWare.js";

// Validate JWT configuration at module load
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not defined in environment variables");
  throw new Error("JWT_SECRET must be configured");
}

// Validate and set default for JWT_MAX_AGE
let JWT_MAX_AGE = process.env.JWT_MAX_AGE || "1d";
if (!JWT_MAX_AGE.match(/^\d+[smhd]$/) && !JWT_MAX_AGE.match(/^\d+$/)) {
  console.warn(`Invalid JWT_MAX_AGE format: ${JWT_MAX_AGE}, defaulting to 1d`);
  JWT_MAX_AGE = "1d";
  process.env.JWT_MAX_AGE = "1d";
}

// Rate limiters for authentication endpoints
const nonceRequestLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute per IP
  message: {
    status: "error",
    message: "Too many nonce requests. Please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const sessionVerificationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: {
    status: "error",
    message: "Too many authentication attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function computeExpiryDate(expiresIn) {
  if (typeof expiresIn === "string") {
    if (expiresIn.endsWith("d")) {
      return dayjs().add(parseInt(expiresIn.slice(0, -1)), "day").toDate();
    }
    if (expiresIn.endsWith("h")) {
      return dayjs().add(parseInt(expiresIn.slice(0, -1)), "hour").toDate();
    }
    if (expiresIn.endsWith("m")) {
      return dayjs().add(parseInt(expiresIn.slice(0, -1)), "minute").toDate();
    }
    if (expiresIn.endsWith("s")) {
      return dayjs().add(parseInt(expiresIn.slice(0, -1)), "second").toDate();
    }
    return dayjs().add(parseInt(expiresIn), "second").toDate();
  }
  return dayjs().add(1, "hour").toDate();
}

function setAuthCookie(res, token, expiryDate) {
  res.cookie("token", token, {
    expires: expiryDate,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/",
  });
}

async function consumeNonce(userId, nonceExpiryTime) {
  const nonceData = await Session.findOneAndUpdate(
    {
      userId,
      nonce: { $ne: null },
      createdAt: { $gte: nonceExpiryTime },
    },
    { $set: { nonce: null } },
    { sort: { createdAt: -1 }, returnDocument: "before" }
  );
  return nonceData;
}

async function clearNoncesForUser(userId) {
  await Session.updateMany(
    { userId, nonce: { $ne: null } },
    { $set: { nonce: null } }
  );
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  await Session.deleteMany({
    userId,
    nonce: null,
    createdAt: { $lt: thirtyMinutesAgo },
  });
}

/**
 * Validate scriptAddress from body for multisig. Returns { validatedScriptAddress } or { error }.
 */
function validateScriptAddress(scriptAddress) {
  if (!scriptAddress || typeof scriptAddress !== "string") {
    return { error: "MultiSig address not provided" };
  }
  const trimmed = scriptAddress.trim();
  const validated = validateAddress(trimmed, "drep");
  if (validated.error) return { error: validated.error };
  if (!validated.isScript) return { error: "Given address is not a script address" };
  if (!validated.cip129) return { error: "Script address is not a CIP129 address" };
  return { validatedScriptAddress: validated.cip129 };
}

/**
 * @route GET /api/v0/session
 * @description Validate JWT token and return user ID and name. Used to check if user is authenticated and get their user ID and display name.
 * @access Private (requires authentication)
 *
 * @returns {Object} 200 - Object containing:
 *   - userId: The user ID from the validated JWT token
 *   - name: The user's display name (from User record, if set)
 *   - adminVoteIds: Array of vote _id strings where the authenticated user is an admin (only present if non-empty)
 * @returns {Object} 401 - Unauthorized if token is invalid or missing (handled by isAuthenticated middleware)
 */
router.get("/", isAuthenticated, async (req, res) => {
  const { userId } = req;

  let name = null;
  try {
    const userDoc = await User.findById(userId).select("name").lean();
    if (userDoc?.name) name = userDoc.name;
  } catch (err) {
    console.error("Error fetching user name for session:", err);
  }

  let adminVoteIds = [];
  try {
    const userIdStr = String(userId).trim();
    const voteDocs = await Vote.find({ admins: userIdStr })
      .select("_id")
      .lean();
    adminVoteIds = voteDocs.map((v) => String(v._id));
  } catch (err) {
    console.error("Error fetching admin votes for session:", err);
  }

  const payload = {
    userId,
    name: name ?? undefined,
  };
  if (adminVoteIds.length > 0) {
    payload.adminVoteIds = adminVoteIds;
  }

  return res.status(200).json(payload);
});

/**
 * @route POST /api/v0/session
 * @description Request authentication nonce. For standard wallet: signer address as identity. For multisig: include scriptAddress in body; script address is identity. Creates a session with a random nonce that the signer must sign.
 * @access Public
 *
 * @param {Object} req.body
 * @param {string} req.body.signerAddress - The address of the signer (validated by validateSessionRequest middleware)
 * @param {string} req.body.signType - Type of signature: 'drep', 'stake', or 'pool' (validated by middleware)
 * @param {string} [req.body.scriptAddress] - For multisig: CIP129 script address (required when signer is script or multisig flow desired)
 *
 * @returns {Object} 200 - dataHex, userId, userIdHex, signerAddressHex; multisig also returns scriptAddress
 * @returns {Object} 400 - Validation/script/CIP129 errors
 * @returns {Object} 500 - Database error
 */
router.post("/", nonceRequestLimiter, validateSessionRequest, async (req, res) => {
  const { addressBech32, isScript } = req;
  const scriptAddressBody = req.body?.scriptAddress;

  // Multisig branch: scriptAddress present in body
  if (scriptAddressBody) {
    const scriptValidation = validateScriptAddress(scriptAddressBody);
    console.log("scriptValidation", scriptValidation);
    if (scriptValidation.error) {
      return res.status(400).json({
        status: "error",
        message: scriptValidation.error,
      });
    }
    const { validatedScriptAddress } = scriptValidation;
    console.log("Login request (multisig)", addressBech32, validatedScriptAddress);

    const nonce = generateNonce("Sign in! ");
    try {
      const login = new Session({ userId: validatedScriptAddress, nonce });
      await login.save();
    } catch (error) {
      console.error("Error saving session to database:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to create authentication session. Please try again.",
      });
    }
    return res.status(200).json({
      dataHex: nonce,
      userId: validatedScriptAddress,
      signerAddress: addressBech32,
      userIdHex: req.signerAddress,
      signerAddressHex: req.signerAddress,
      scriptAddress: validatedScriptAddress,
    });
  }

  // Standard branch: no scriptAddress in body
  if (isScript) {
    return res.status(400).json({
      status: "error",
      message: "For MultiSig addresses please switch to MultiSig Mode",
    });
  }

  console.log("Login request", addressBech32);
  const nonce = generateNonce("Sign in! ");
  try {
    const login = new Session({ userId: addressBech32, nonce });
    await login.save();
  } catch (error) {
    console.error("Error saving session to database:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to create authentication session. Please try again.",
    });
  }
  return res.status(200).json({
    dataHex: nonce,
    userId: addressBech32,
    userIdHex: req.signerAddress,
    signerAddressHex: req.signerAddress,
  });
});

const AUTH_ERROR_MESSAGE =
  "Authentication failed. Please request a new nonce and try again.";

/**
 * @route PUT /api/v0/session
 * @description Verify signature and issue JWT. For multisig: include scriptAddress in body; verifies signer is party to script. For standard: verifies signature and upserts User with name.
 * @access Public
 *
 * @param {Object} req.body - signerAddress, signType, signature; optional scriptAddress for multisig
 * @returns {Object} 200 - token, expiresIn, userId
 * @returns {Object} 400 - Nonce/signature/script validation errors
 * @returns {Object} 500 - JWT/database error
 */
router.put("/", sessionVerificationLimiter, validateSessionRequest, async (req, res) => {
  const { signerAddress, signType, addressBech32, isScript } = req;
  const { signature, scriptAddress: scriptAddressBody } = req.body;

  const nonceExpiryTime = new Date(Date.now() - NONCE_TTL_MS);

  // Multisig branch: scriptAddress present in body
  if (scriptAddressBody) {
    const scriptValidation = validateScriptAddress(scriptAddressBody);
    if (scriptValidation.error) {
      return res.status(400).json({
        status: "error",
        message: scriptValidation.error,
      });
    }
    const { validatedScriptAddress } = scriptValidation;

    if (!signature || typeof signature !== "object") {
      return res.status(400).json({ status: "error", message: AUTH_ERROR_MESSAGE });
    }

    let nonceData;
    try {
      nonceData = await consumeNonce(validatedScriptAddress, nonceExpiryTime);
    } catch (error) {
      console.error("Error consuming nonce:", error);
      return res.status(500).json({ status: "error", message: AUTH_ERROR_MESSAGE });
    }
    if (!nonceData) {
      return res.status(400).json({ status: "error", message: AUTH_ERROR_MESSAGE });
    }

    const isParty = await isPartyToScript(
      nonceData.nonce,
      validatedScriptAddress,
      signature
    );
    if (!isParty || isParty.error) {
      console.error("MS: isPartyToScript failed", signerAddress, validatedScriptAddress);
      return res.status(400).json({
        status: "error",
        message: "Address does not belong to the MultiSig",
      });
    }

    let token;
    try {
      token = jwt.sign(
        { userId: validatedScriptAddress, signType, multiSig: true },
        process.env.JWT_SECRET,
        { expiresIn: JWT_MAX_AGE }
      );
    } catch (error) {
      console.error("Error creating JWT token:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to create authentication token. Please try again.",
      });
    }

    const expiryDate = computeExpiryDate(JWT_MAX_AGE);
    try {
      await clearNoncesForUser(validatedScriptAddress);
    } catch (error) {
      console.error("Error clearing nonces:", error);
    }
    setAuthCookie(res, token, expiryDate);
    console.log("MS: Login successful:", signerAddress, validatedScriptAddress);
    return res.status(200).json({
      token,
      expiresIn: expiryDate,
      userId: validatedScriptAddress,
    });
  }

  // Standard branch: no scriptAddress in body
  if (isScript) {
    return res.status(400).json({
      status: "error",
      message: "For script addresses include scriptAddress in the request body.",
    });
  }

  if (!signature || typeof signature !== "object") {
    return res.status(400).json({ status: "error", message: AUTH_ERROR_MESSAGE });
  }

  let nonceData;
  try {
    nonceData = await consumeNonce(addressBech32, nonceExpiryTime);
  } catch (error) {
    console.error("Error consuming nonce:", error);
    return res.status(500).json({ status: "error", message: AUTH_ERROR_MESSAGE });
  }
  if (!nonceData) {
    return res.status(400).json({ status: "error", message: AUTH_ERROR_MESSAGE });
  }

  let signatureVerification;
  try {
    signatureVerification = await verifySignature(
      nonceData.nonce,
      signerAddress,
      signature
    );
  } catch (error) {
    console.error("Signature verification error", error);
    return res.status(400).json({ status: "error", message: AUTH_ERROR_MESSAGE });
  }
  if (signatureVerification?.error || !signatureVerification) {
    return res.status(400).json({ status: "error", message: AUTH_ERROR_MESSAGE });
  }

  let token;
  try {
    token = jwt.sign(
      { userId: addressBech32, signType },
      process.env.JWT_SECRET,
      { expiresIn: JWT_MAX_AGE }
    );
  } catch (error) {
    console.error("Error creating JWT token:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to create authentication token. Please try again.",
    });
  }

  const expiryDate = computeExpiryDate(JWT_MAX_AGE);
  try {
    await clearNoncesForUser(addressBech32);
  } catch (error) {
    console.error("Error clearing nonces:", error);
  }

  let userName;
  try {
    if (signType === "drep") userName = await fetchDrepName(addressBech32);
    else if (signType === "stake" || signType === "addr") userName = await fetchHandle(addressBech32);
  } catch (error) {
    console.error("Error fetching user name:", error);
  }
  try {
    await User.findOneAndUpdate(
      { _id: addressBech32 },
      { $set: { name: userName, lastLogin: new Date() } },
      { upsert: true }
    );
  } catch (error) {
    console.error("Error upserting user:", error);
  }

  console.log("Login successful:", signerAddress);
  setAuthCookie(res, token, expiryDate);
  return res.status(200).json({
    token,
    expiresIn: expiryDate,
    userId: addressBech32,
  });
});

/**
 * @route DELETE /api/v0/session
 * @description Logout by clearing the authentication cookie. The cookie is cleared with the same options used when it was set (httpOnly, secure, sameSite, path).
 * @access Private (requires authentication)
 *
 * @returns {Object} 200 - Success response containing:
 *   - status: "success"
 *   - message: "Logged out successfully"
 * @returns {Object} 401 - Unauthorized if not authenticated (handled by isAuthenticated middleware)
 */
router.delete("/", isAuthenticated, async (req, res) => {
  const { userId } = req;

  // Clear the cookie with matching options from when it was set
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/",
  });

  console.log("Logout success", userId);

  return res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
});

export default router;
