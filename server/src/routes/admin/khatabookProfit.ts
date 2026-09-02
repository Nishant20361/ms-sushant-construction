import { Router } from "express";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAdmin } from "../../middleware/auth.js";
import { getProfitAnalytics } from "../../utils/inventoryFifo.js";

const router = Router();

/**
 * GET /api/admin/khatabook/profit
 * Returns real-time Daily Profit, Monthly Profit, All-time Profit,
 * Product-wise profit margins, Current stock valuation, and recent purchase batches.
 */
router.get(
  "/khatabook/profit",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const analytics = await getProfitAnalytics(prisma);
    res.json(analytics);
  })
);

export default router;
