import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../../middleware/auth.js";
import { assistantLimiter } from "../../middleware/rateLimit.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import type { AuthenticatedRequest } from "../../types.js";
import { chat } from "../../admin_ai/service.js";

const router = Router();
const chatSchema = z
  .object({
    message: z.string().trim().min(1).max(2000),
    contextToken: z.string().max(24000).optional(),
    selection: z.string().min(1).max(100).optional(),
  })
  .strict();
router.post(
  "/assistant/chat",
  requireAdmin,
  assistantLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json(await chat(req, chatSchema.parse(req.body)));
  }),
);
export default router;
