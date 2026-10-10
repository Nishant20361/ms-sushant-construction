import { Router } from "express";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAdmin } from "../../middleware/auth.js";
import { getProfitAnalytics } from "../../utils/inventoryFifo.js";
import { parseProfitDateRange } from "../../utils/profitDateRange.js";

import { requireKhatabook } from "../../middleware/khatabook.js";

const router = Router();

/**
 * GET /api/admin/khatabook/profit
 * Returns real-time Daily Profit, Monthly Profit, All-time Profit,
 * Product-wise profit margins, Current stock valuation, and recent purchase batches.
 */
router.get(
  "/khatabook/profit",
  requireAdmin,
  requireKhatabook,
  asyncHandler(async (req, res) => {
    const range = parseProfitDateRange(req.query.from, req.query.to);
    const analytics = await getProfitAnalytics(prisma, range);
    res.json(analytics);
  })
);

export default router;
