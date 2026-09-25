import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { User } from "../schema/User.js";

const environment = process.env.NODE_ENV || "development";
const envPath = `.env.${environment}`;
dotenv.config({ path: envPath });

/**
 * Verifies JWT token from the httpOnly request cookie and checks sessionVersion.
 *
 * @param {Object} req - Express request object containing cookies
 * @returns {Promise<Object>} Status object with result of verification
 */
export async function verifyToken(req) {
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    console.error("JWT_SECRET is not defined in environment variables");
    return {
      status: "error",
      message: "Server configuration error",
      code: 500,
    };
  }

  const token = req.cookies?.token;

  if (!token) {
    return {
      status: "error",
      message: "No token provided",
      code: 401,
    };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });

    if (!decoded || !decoded.userId) {
      return {
        status: "error",
        message: "Invalid token format",
        code: 401,
      };
    }

    if (typeof decoded.sv !== "number") {
      return {
        status: "error",
        message: "Invalid token",
        code: 401,
      };
    }

    const user = await User.findById(decoded.userId).select("sessionVersion").lean();
    // Missing user must fail closed — do not treat absent docs as sessionVersion 0 (F-023).
    if (!user) {
      return {
        status: "error",
        message: "Invalid token",
        code: 401,
      };
    }
    if ((user.sessionVersion ?? 0) !== decoded.sv) {
      return {
        status: "error",
        message: "Invalid token",
        code: 401,
      };
    }

    return {
      status: "success",
      message: "Token is valid",
      userId: decoded.userId,
      signType: decoded.signType,
      exp: decoded.exp,
    };
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return {
        status: "error",
        message: "Token has expired",
        code: 401,
      };
    } else if (error.name === "JsonWebTokenError") {
      return {
        status: "error",
        message: "Invalid token",
        code: 401,
      };
    }

    console.error("Token verification error:", error.message);
    return {
      status: "error",
      message: "Token verification failed",
      code: 401,
    };
  }
}
