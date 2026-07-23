// imports
import validator from "validator";

// schema imports
import {Proposal} from "../schema/Proposal.js";

// helper imports
import {verifyToken} from "../helper/verifyToken.js";
import { validateAddress } from "@lerna-labs/ekklesia-helpers/validation";
import {PublicKey} from "@emurgo/cardano-serialization-lib-nodejs";

/**
 * Middleware to verify user authentication token
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Calls next() if authenticated or returns error response
 *
 * @description
 * This middleware:
 * 1. Extracts and verifies the authentication token from the request
 * 2. If valid, adds voter information (voterId, signType, multiSig) to the request object
 * 3. If invalid, returns an appropriate error response
 *
 * On success, adds the following properties to the request:
 * - req.userId: The authenticated user's ID
 * - req.signType: The type of signature used ('drep', etc.)
 * - req.exp: JWT expiration timestamp (seconds since epoch)
 */
/**
 * Middleware factory that rejects requests containing duplicate (array) query parameters.
 * Express parses repeated params (e.g. ?page=1&page=2) as arrays — this middleware
 * returns 400 for any listed param that arrives as an array.
 *
 * @param {...string} paramNames - Query parameter names that must not be duplicated
 * @returns {Function} Express middleware
 */
export function rejectDuplicateParams(...paramNames) {
  return (req, res, next) => {
    for (const name of paramNames) {
      if (Array.isArray(req.query[name])) {
        return res.status(400).json({
          status: "error",
          message: `Duplicate ${name} parameter.`,
        });
      }
    }
    next();
  };
}

/**
 * Middleware that validates and parses pagination query parameters (page, limit).
 * Rejects duplicate params, applies defaults (page=1, limit=10), validates ranges,
 * and sets req.pagination = { page, limit } for downstream handlers.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export function parsePagination(req, res, next) {
  const { page: rawPage, limit: rawLimit } = req.query;

  if (Array.isArray(rawPage) || Array.isArray(rawLimit)) {
    return res.status(400).json({
      status: "error",
      message: `Duplicate ${Array.isArray(rawPage) ? "page" : "limit"} parameter.`,
    });
  }

  const page = rawPage === undefined ? 1 : parseInt(rawPage, 10);
  const limit = rawLimit === undefined ? 10 : parseInt(rawLimit, 10);

  if (isNaN(page) || page < 1) {
    return res.status(400).json({
      status: "error",
      message: "Invalid page parameter. Must be a positive integer.",
    });
  }

  if (isNaN(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({
      status: "error",
      message:
        "Invalid limit parameter. Must be a positive integer between 1 and 100.",
    });
  }

  req.pagination = { page, limit };
  next();
}

export function isAuthenticated(req, res, next) {
  try {
    const userToken = verifyToken(req);
    if (userToken.status === "error") {
      return res.status(userToken.code).json({
        status: "error",
        message: userToken.message,
      });
    } else {
      req.userId = userToken.userId;
      req.signType = userToken.signType;
      req.exp = userToken.exp;
      next();  // add this

    }
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
}

/**
 * Middleware to validate and retrieve a proposal by ID
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Calls next() if proposal is found or returns error response
 *
 * @description
 * This middleware:
 * 1. Extracts and validates the proposal ID from request parameters
 * 2. Verifies the proposal ID format is valid (alphanumeric and correct length)
 * 3. Retrieves the proposal from the database
 * 4. Adds proposal data to the request object
 *
 * On success, adds the following properties to the request:
 * - req.proposal: The proposal document as a plain JavaScript object
 * - req.proposalId: The validated proposal ID
 */
export async function getProposal(req, res, next) {
  const { proposalId } = req.params;
  // Check if proposalId is provided
  if (!proposalId) {
    return res.status(400).json({
      status: "error",
      message: "Proposal ID is required",
    });
  }
  // Validate the proposalId format
  if (!validator.isAlphanumeric(proposalId)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid proposal ID format",
    });
  }

  // check length of proposalId
  if (proposalId.length !== 24) {
    return res.status(400).json({
      status: "error",
      message: "Invalid proposal ID length",
    });
  }

  // get proposalData from the database
  const proposalData = await Proposal.findOne({ _id: proposalId });
  if (!proposalData) {
    return res.status(404).json({
      status: "error",
      message: "Proposal not found",
    });
  }
  // Check if the proposalId is a valid ObjectId

  // store the proposalId in the request object for later use
  req.proposal = proposalData.toObject();
  req.proposalId = proposalData._id;

  next();
}

/**
 * Middleware to validate session request parameters
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Calls next() if parameters are valid or returns error response
 *
 * @description
 * This middleware validates:
 * 1. Signer address (presence and format)
 * 2. Sign type (presence)
 * 3. For DRep addresses, ensures CIP129 compliance
 * 4. Handles conversions for different address formats
 *
 * On success, adds the following properties to the request:
 * - req.addressBech32: The validated Bech32-encoded address
 * - req.signerAddress: The validated signer address (possibly transformed)
 * - req.signType: The validated sign type
 * - req.isScript: Boolean indicating if the address is a script address
 */
export function validateSessionRequest(req, res, next) {
  let { signerAddress, signType } = req.body || {};

  // Check if signerAddress exists in the request
  if (!signerAddress) {
    return res.status(400).json({
      status: "error",
      message: "Missing signerAddress in request body",
    });
  }

  // Check if signType exists in the request
  if (!signType) {
    return res.status(400).json({
      status: "error",
      message: "Missing signType in request body",
    });
  }

  // Check if signerAddress is a string
  if (typeof signerAddress !== "string") {
    return res.status(400).json({
      status: "error",
      message: "Invalid address format",
    });
  }

  // Check if signType is a string
  if (typeof signType !== "string") {
    return res.status(400).json({
      status: "error",
      message: "Invalid signType format",
    });
  }

  // Validate address format
  let addressBech32 = validateAddress(signerAddress.trim(), signType);
  // console.log("Address validation in validateSessionRequest MW", addressBech32);
  if (addressBech32.error) {
    return res.status(400).json({
      status: "error",
      message: addressBech32.error,
    });
  }

  // check if address is drep id and if not cip129, throw error
  if (
    signerAddress.startsWith("drep") &&
    addressBech32.cip129 &&
    addressBech32.cip129 != signerAddress.trim()
  ) {
    console.log("MW: Not a CIP129 Address", addressBech32);
    return res.status(400).json({
      status: "error",
      message: "Please use a CIP129 address",
    });
  }

  // account for drep 105/129 addresses
  if (addressBech32.cip129) {
    req.isScript = addressBech32.isScript;
    addressBech32 = addressBech32.cip129;
  }

  // converting drep PubKey to hex or whatever
  if (signerAddress.length === 64 && signType === "drep") {
    const pubkey = PublicKey.from_hex(signerAddress);
    let keyhash = pubkey.hash();
    signerAddress = Buffer.from(keyhash.to_bytes()).toString("hex");
  }

  // Store validated address for use in the handler
  req.addressBech32 = addressBech32;
  req.signerAddress = signerAddress;
  req.signType = signType;
  next();
}
