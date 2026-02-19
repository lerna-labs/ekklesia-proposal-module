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
} from "../../../helper/verifySignature.js";
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
 * @description Request authentication nonce for standard (non-script) wallet. Creates a session with a random nonce that the voter must sign to prove identity. Script addresses are not allowed (use /multisig route instead).
 * @access Public
 *
 * @param {Object} req.body
 * @param {string} req.body.signerAddress - The address of the signer (validated by validateSessionRequest middleware, must be valid Bech32 address)
 * @param {string} req.body.signType - Type of signature: 'drep', 'stake', or 'pool' (validated by middleware)
 *
 * @returns {Object} 200 - Response object containing:
 *   - dataHex: Nonce string to sign (hex-encoded)
 *   - userId: Bech32 address of the user
 *   - userIdHex: Hex-encoded signer address
 *   - signerAddressHex: Hex-encoded signer address
 * @returns {Object} 400 - Error if:
 *   - Address is a script address (must use /multisig route)
 *   - Address validation fails
 * @returns {Object} 500 - Error if:
 *   - Database operation fails
 */
router.post("/", nonceRequestLimiter, validateSessionRequest, async (req, res) => {
  // Get validated address from middleware
  const { addressBech32, isScript } = req;

  // error for script address
  if (isScript) {
    console.error("Script address not allowed");
    return res.status(400).json({
      status: "error",
      message: "Script address not allowed. Please use the multisig route.",
    });
  }

  console.log("Login request", addressBech32);

  // create nonce
  const nonce = generateNonce("Sign in! ");

  // Store nonce in the database with error handling
  try {
    const login = new Session({
      userId: addressBech32,
      nonce,
    });
    await login.save();
  } catch (error) {
    console.error("Error saving session to database:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to create authentication session. Please try again.",
    });
  }

  // return nonce and voterId
  const response = {
    dataHex: nonce,
    userId: addressBech32,
    userIdHex: req.signerAddress,
    signerAddressHex: req.signerAddress,
  };

  return res.status(200).json(response);
});

/**
 * @route PUT /api/v0/session
 * @description Verify signature of nonce and issue JWT token for authentication. After successful verification, sets HTTP-only cookie with JWT token and clears nonce from session records. Also creates or updates the User record with the user's name (fetched from DRep registry or handle service).
 * @access Public
 *
 * @param {Object} req.body
 * @param {string} req.body.signerAddress - The address of the signer (validated by validateSessionRequest middleware)
 * @param {string} req.body.signType - Type of signature: 'drep', 'stake', or 'pool' (validated by middleware)
 * @param {Object} req.body.signature - Signature object containing the signed nonce (structure varies by signType)
 *
 * @returns {Object} 200 - Response object containing:
 *   - token: JWT token string (also set as HTTP-only cookie)
 *   - expiresIn: ISO 8601 timestamp when the token expires
 *   - userId: Bech32 address of the authenticated user
 * @returns {Object} 400 - Error if:
 *   - Address is a script address (must use /multisig route)
 *   - Nonce not found in database
 *   - Signature verification fails
 *   - Signature verification throws an exception
 */
router.put("/", sessionVerificationLimiter, validateSessionRequest, async (req, res) => {
  // Get signer address and signature from request body (already validated by middleware)
  const { signerAddress, signType, addressBech32, isScript } = req;
  const { signature } = req.body;

  if (isScript) {
    console.error("Script address not allowed");
    return res.status(400).json({
      status: "error",
      message: "Script address not allowed. Please use the multisig route.",
    });
  }

  // Use generic error message to prevent information leakage
  const AUTH_ERROR_MESSAGE = "Authentication failed. Please request a new nonce and try again.";

  // Check if nonce has expired (5 minutes TTL)
  const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  const nonceExpiryTime = new Date(Date.now() - NONCE_TTL_MS);

  // Atomically find and mark nonce as used to prevent race conditions
  // This ensures only one request can use a nonce
  let nonceData;
  try {
    nonceData = await Session.findOneAndUpdate(
      {
        userId: addressBech32,
        nonce: { $ne: null },
        createdAt: { $gte: nonceExpiryTime }, // Only get non-expired nonces
      },
      { $set: { nonce: null } }, // Mark as used immediately
      {
        sort: { createdAt: -1 },
        new: false, // Return the document before update
      }
    );
  } catch (error) {
    console.error("Error fetching nonce from database:", error);
    return res.status(500).json({
      status: "error",
      message: AUTH_ERROR_MESSAGE,
    });
  }

  if (!nonceData) {
    return res.status(400).json({
      status: "error",
      message: AUTH_ERROR_MESSAGE,
    });
  }

  // Validate signature object structure before verification
  if (!signature || typeof signature !== "object") {
    console.error("Invalid signature format", signerAddress);
    return res.status(400).json({
      status: "error",
      message: AUTH_ERROR_MESSAGE,
    });
  }

  // verify signature
  let signatureVerification;
  try {
    signatureVerification = await verifySignature(
      nonceData.nonce,
      signerAddress,
      signature
    );
  } catch (error) {
    console.error("Signature verification error", error);
    return res.status(400).json({
      status: "error",
      message: AUTH_ERROR_MESSAGE,
    });
  }

  if (signatureVerification.error || !signatureVerification) {
    console.error(
      "Signature verification failed",
      signerAddress,
      signatureVerification
    );
    return res.status(400).json({
      status: "error",
      message: AUTH_ERROR_MESSAGE,
    });
  }

  // create jwt token with validated JWT_MAX_AGE
  let token;
  try {
    token = jwt.sign(
      { userId: addressBech32, signType },
      process.env.JWT_SECRET,
      {
        expiresIn: JWT_MAX_AGE,
      }
    );
  } catch (error) {
    console.error("Error creating JWT token:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to create authentication token. Please try again.",
    });
  }

  // Calculate the actual expiration date for the frontend
  const expiresIn = JWT_MAX_AGE;
  let expiryDate;

  // Parse the expiration format (support formats like "1d", "3600s", or seconds as number)
  if (typeof expiresIn === "string") {
    if (expiresIn.endsWith("d")) {
      expiryDate = dayjs()
        .add(parseInt(expiresIn.slice(0, -1)), "day")
        .toDate();
    } else if (expiresIn.endsWith("h")) {
      expiryDate = dayjs()
        .add(parseInt(expiresIn.slice(0, -1)), "hour")
        .toDate();
    } else if (expiresIn.endsWith("m")) {
      expiryDate = dayjs()
        .add(parseInt(expiresIn.slice(0, -1)), "minute")
        .toDate();
    } else if (expiresIn.endsWith("s")) {
      expiryDate = dayjs()
        .add(parseInt(expiresIn.slice(0, -1)), "second")
        .toDate();
    } else {
      // Assume seconds if just a number
      expiryDate = dayjs().add(parseInt(expiresIn), "second").toDate();
    }
  } else {
    // Default to 1 hour if undefined or not a string
    expiryDate = dayjs().add(1, "hour").toDate();
  }

  // Clear any other nonces for this user (nonce already marked as used atomically above)
  try {
    await Session.updateMany(
      { userId: addressBech32, nonce: { $ne: null } },
      {
        $set: {
          nonce: null,
        },
      }
    );
  } catch (error) {
    // Log but don't fail - nonce already marked as used
    console.error("Error clearing other nonces:", error);
  }

  // Clean up old sessions with null nonces (older than 30 minutes) to prevent database bloat
  // The TTL index will handle sessions older than 1 hour, but we clean up more aggressively here
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    await Session.deleteMany({
      userId: addressBech32,
      nonce: null,
      createdAt: { $lt: thirtyMinutesAgo },
    });
  } catch (error) {
    // Log but don't fail - cleanup is non-critical
    console.error("Error cleaning up old sessions:", error);
  }

  // fetch DRep Name or Handle with error handling
  let userName;
  try {
    if (signType === "drep") {
      userName = await fetchDrepName(addressBech32);
      // fetchDrepName returns null/undefined on error, which is acceptable
    } else if (signType === "stake" || signType === "addr") {
      userName = await fetchHandle(addressBech32);
      // fetchHandle returns null on error, which is acceptable
    }
  } catch (error) {
    // Log but don't fail - userName can be undefined
    console.error("Error fetching user name:", error);
  }

  // upsert User to db and set last_login with error handling
  try {
    await User.findOneAndUpdate(
      { _id: addressBech32 },
      { $set: { name: userName, lastLogin: new Date() } },
      { upsert: true }
    );
  } catch (error) {
    // Log but don't fail - user creation is non-critical for authentication
    console.error("Error upserting user:", error);
  }

  // Log the successful login
  console.log("Login successful:", signerAddress);

  // Set the cookie on the response
  res.cookie("token", token, {
    expires: expiryDate,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Only use secure in production
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // More permissive in development
    path: "/",
  });

  // Return the response with token data and userId so the frontend can update UI without waiting for GET /session
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
