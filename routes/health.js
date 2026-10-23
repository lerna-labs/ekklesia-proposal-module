// express router
import { Router } from "express";
const router = Router();

// helper
import { isDatabaseConnected } from "../helper/dbManager.js";
import { areRoutesLoaded, createReadinessHandler, liveHandler } from "../helper/healthTiers.js";

/**
 * @route   GET /health/live
 * @desc    Liveness: the process is up. Does not depend on the database.
 * @access  Public
 */
router.get("/live", liveHandler);

/**
 * @route   GET /health
 * @desc    Readiness: 200 when the database is connected and every route has loaded, 503 otherwise.
 *          The body carries only the status and the network.
 * @access  Public
 */
router.get("/", createReadinessHandler({ isDatabaseConnected, routesLoaded: areRoutesLoaded }));

export default router;
