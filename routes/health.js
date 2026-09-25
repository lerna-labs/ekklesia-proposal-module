// express router
import { Router } from "express";
const router = Router();

// helper
import { isDatabaseConnected } from "../helper/dbManager.js";
import { loadFrontendVersion } from "../helper/frontendVersion.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs/promises";

// Get application version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageServerPath = join(__dirname, "../package.json");

/**
 * @route   GET /api/v0/status
 * @desc    System status endpoint with comprehensive status information
 * @access  Public
 */
router.get("/", async (req, res) => {
  const currentTime = new Date();
  const uptime = process.uptime();

  // Get server version from package.json
  let serverVersion = "unknown";
  try {
    const packageData = await fs.readFile(packageServerPath, "utf8");
    const packageJson = JSON.parse(packageData);
    serverVersion = packageJson.version || "unknown";
  } catch (error) {
    console.error(`Failed to read package.json: ${error.message}`);
  }

  // get frontend version from public/version.json
  const frontendVersion = await loadFrontendVersion();

  // Format uptime in a human-readable way
  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  };

  return res.json({
    status: "operational",
    message: "System is operational",
    timestamp: currentTime.toISOString(),
    environment: process.env.NODE_ENV,
    network: process.env.NETWORK_NAME,
    networkId: parseInt(process.env.NETWORK_ID),

    server: {
      uptime: formatUptime(uptime),
      uptimeSeconds: uptime,
      version: serverVersion,
      nodeVersion: process.version,
      memoryUsage: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
      },
    },
    frontend: frontendVersion,
    database: {
      status: isDatabaseConnected() ? "connected" : "disconnected",
      message: isDatabaseConnected()
        ? "Database connection is healthy"
        : "Database connection is down, attempting to reconnect automatically",
    },
  });
});

/**
 * @route   GET /api/v0/status/health
 * @desc    Simple health check for load balancers and monitoring tools
 * @access  Public
 */
router.get("/health", (req, res) => {
  // This endpoint always returns 200 OK unless the server is completely down
  // Useful for load balancers and basic monitoring tools
  res.status(200).json({ status: "healthy" });
});

/**
 * @route   GET /api/v0/status/db
 * @desc    Database connection status endpoint
 * @access  Public
 */
router.get("/db", (req, res) => {
  res.json({
    status: isDatabaseConnected() ? "connected" : "disconnected",
    message: isDatabaseConnected()
      ? "Database connection is healthy"
      : "Database connection is down, attempting to reconnect automatically",
  });
});

export default router;
