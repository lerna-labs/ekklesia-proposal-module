// express router
import { Router } from "express";
const router = Router();

// helper
import { checkDatabaseConnection, isDatabaseConnected } from "../helper/dbManager.js";
import {
  areRoutesLoaded,
  createBoundedCheck,
  createReadinessHandler,
  liveHandler,
} from "../helper/healthTiers.js";

/**
 * @route   GET /health/live
 * @desc    Liveness: the process is up. Does not depend on the database.
 * @access  Public
 */
router.get("/live", liveHandler);

/**
 * @route   GET /health
 * @desc    Readiness: 200 when the database answers the same ping the API gate uses and every route
 *          has loaded, 503 otherwise. The body carries only the status and the network.
 * @access  Public
 */
router.get(
  "/",
  createReadinessHandler({
    checkDatabase: createBoundedCheck(checkDatabaseConnection, { precheck: isDatabaseConnected }),
    routesLoaded: areRoutesLoaded,
  }),
);

/**
 * Any other path under /health, including the former /health/health and /health/db, answers 404
 * instead of falling through to the single-page app.
 */
router.use((req, res) => {
  res.status(404).json({ status: "error", message: "Not found" });
});

export default router;
