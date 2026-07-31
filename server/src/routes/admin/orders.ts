import { Router } from "express";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";
import { orderStatusSchema } from "../../validators/index.js";
import { requireAdmin } from "../../middleware/auth.js";
import { writeAudit } from "../../middleware/audit.js";
import { serializeOrder } from "../../utils/serializer.js";
import { AuthenticatedRequest } from "../../types.js";

const router = Router();

// GET /api/admin/orders?search=&status=&page=&limit=
router.get(
  "/orders",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { search, status, page = "1", limit = "20" } = req.query as Record<string, string>;
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerMobile: { contains: search } },
      ];
    }
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.order.count({ where }),
    ]);
    res.json({
      orders: orders.map(serializeOrder),
      total,
      page: Number(page),
      pages: Math.max(1, Math.ceil(total / Number(limit))),
    });
  })
);

// GET /api/admin/orders/:id
router.get(
  "/orders/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new HttpError(404, "Order not found");
    res.json({ order: serializeOrder(order) });
  })
);

// PATCH /api/admin/orders/:id/status
router.patch(
  "/orders/:id/status",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const body = orderStatusSchema.parse(req.body);
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Order not found");
    const order = await prisma.order.update({ where: { id }, data: { status: body.status } });
    await writeAudit(req, {
      action: "ORDER_STATUS",
      entity: "Order",
      entityId: order.id,
      details: `${order.orderNumber} -> ${order.status}`,
    });
    res.json({ order: serializeOrder(order) });
  })
);

export default router;

