// express router
import { Router } from "express";
const router = Router();

import { Region } from "../../../schema/Region.js";

/**
 * @route GET /api/v0/regions
 * @description List all regions. Sorted by name ascending.
 * @access Public
 */
router.get("/", async (req, res) => {
  try {
    const regions = await Region.find({}).sort({ name: 1 }).select("name _id").lean();

    return res.status(200).json({
      data: regions,
    });
  } catch (err) {
    console.error("GET /api/v0/regions error:", err.message);
    return res.status(500).json({
      status: "error",
      message: "Failed to list regions",
    });
  }
});

export default router;
