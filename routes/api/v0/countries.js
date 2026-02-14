// express router
import { Router } from "express";
const router = Router();

import { Country } from "../../../schema/Country.js";

/**
 * @route GET /api/v0/countries
 * @description List all countries (English name + ISO 3166-1 alpha-2 code). Sorted by name.
 * @access Public
 */
router.get("/", async (req, res) => {
  try {
    const countries = await Country.find({})
      .sort({ name: 1 })
      .select("name code _id")
      .lean();

    return res.status(200).json({
      data: countries,
    });
  } catch (err) {
    console.error("GET /api/v0/countries error:", err.message);
    return res.status(500).json({
      status: "error",
      message: "Failed to list countries",
    });
  }
});

export default router;
