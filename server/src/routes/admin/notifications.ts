import { Router } from "express";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAdmin } from "../../middleware/auth.js";
import { notificationReadSchema } from "../../validators/index.js";
import { AuthenticatedRequest } from "../../types.js";

const router = Router();

// Bell notifications are short-lived UI alerts. Business records (orders,
// payments, customers) are stored separately and are never removed here.
const NOTIFICATION_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;

async function removeExpiredNotifications(adminId: number): Promise<void> {
  const expiresBefore = new Date(Date.now() - NOTIFICATION_RETENTION_MS);
  await prisma.notification.deleteMany({
    where: { adminId, createdAt: { lt: expiresBefore } },
  });
}

function adminIdFrom(req: AuthenticatedRequest): number {
  return Number(req.admin?.sub ?? 0);
}

function serializeNotification(n: any) {
  return {
    id: n.id,
    orderId: n.orderId,
    orderNumber: n.orderNumber,
    customerName: n.customerName,
    status: n.status,
    read: n.read,
    createdAt: n.createdAt,
  };
}

// GET /api/admin/notifications?limit=20&unreadOnly=true
router.get(
  "/notifications",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const adminId = adminIdFrom(req);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
    const unreadOnly = req.query.unreadOnly === "true";

    // Cleanup runs whenever the bell is loaded, so expired alerts never show
    // up or contribute to the unread badge.
    await removeExpiredNotifications(adminId);

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { adminId, ...(unreadOnly ? { read: false } : {}) },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({ where: { adminId } }),
      prisma.notification.count({ where: { adminId, read: false } }),
    ]);

    res.json({
      notifications: items.map(serializeNotification),
      total,
      unreadCount,
    });
  })
);

// POST /api/admin/notifications/read   { ids?: number[], all?: boolean }
router.post(
  "/notifications/read",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const adminId = adminIdFrom(req);
    const body = notificationReadSchema.parse(req.body ?? {});
    await removeExpiredNotifications(adminId);
    if (body.all) {
      await prisma.notification.updateMany({
        where: { adminId, read: false },
        data: { read: true },
      });
    } else if (body.ids && body.ids.length) {
      await prisma.notification.updateMany({
        where: { id: { in: body.ids }, adminId },
        data: { read: true },
      });
    }
    const unreadCount = await prisma.notification.count({
      where: { adminId, read: false },
    });
    res.json({ ok: true, unreadCount });
  })
);

export default router;
