import { Router } from "express";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { settingsSchema } from "../../validators/index.js";
import { requireAdmin } from "../../middleware/auth.js";
import { writeAudit } from "../../middleware/audit.js";
import { serializeSettings } from "../../utils/serializer.js";
import { AuthenticatedRequest } from "../../types.js";

const router = Router();

// GET /api/admin/settings
router.get(
  "/settings",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    let settings = await prisma.siteSetting.findFirst();
    if (!settings) {
      settings = await prisma.siteSetting.create({ data: {} });
    }
    res.json({ settings: serializeSettings(settings) });
  })
);

// PUT /api/admin/settings
router.put(
  "/settings",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = settingsSchema.parse(req.body);
    let settings = await prisma.siteSetting.findFirst();
    if (!settings) {
      settings = await prisma.siteSetting.create({ data: body });
    } else {
      settings = await prisma.siteSetting.update({ where: { id: settings.id }, data: body });
    }
    await writeAudit(req, {
      action: "SETTINGS_UPDATE",
      entity: "SiteSetting",
      entityId: settings.id,
    });
    res.json({ settings: serializeSettings(settings) });
  })
);

export default router;

