// express router
import { Router } from "express";
import { getBuildInfo } from "../helper/buildInfo.js";

const router = Router();

/**
 * @route   GET /version
 * @desc    Running build identity. Mounted outside /api so it does not depend on the database.
 * @access  Public
 */
router.get("/", (req, res) => {
  const { version, gitSha, buildTime } = getBuildInfo();
  res.set("Cache-Control", "public, max-age=60");
  res.json({ name: "ekklesia-proposal-module", version, gitSha, buildTime });
});

export default router;
