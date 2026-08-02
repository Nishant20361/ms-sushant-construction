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

// GET /api/admin/orders?search=&status=&from=&to=&page=&limit=
router.get(
  "/orders",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const {
      search,
      status,
      from,
      to,
      page = "1",
      limit = "20",
    } = req.query as Record<string, string>;
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerMobile: { contains: search } },
      ];
    }
    // Date range filter (from/to) — both optional; from is start-of-day,
    // to is end-of-day inclusive.
    if (from || to) {
      const dateFilter: any = {};
      if (from) {
        const d = new Date(from);
        if (!Number.isNaN(d.getTime())) dateFilter.gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (!Number.isNaN(d.getTime())) {
          d.setHours(23, 59, 59, 999);
          dateFilter.lte = d;
        }
      }
      if (Object.keys(dateFilter).length) where.createdAt = dateFilter;
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

// PATCH /api/admin/orders/:id/edit
router.patch(
  "/orders/:id/edit",
  requireAdmin,
  asyncHandler(async (req: any, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Invalid order id");
    const body = req.body;
    // Basic validation: items array
    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      throw new HttpError(400, "Invalid items");
    }
    const incomingMap = new Map<number, number>();
    for (const it of body.items) {
      const pid = Number(it.productId);
      const q = Number(it.quantity);
      if (!Number.isInteger(pid) || pid <= 0) throw new HttpError(400, "Invalid product id");
      if (Number.isNaN(q) || q <= 0) throw new HttpError(400, "Invalid quantity");
      incomingMap.set(pid, (incomingMap.get(pid) ?? 0) + q);
    }

    const order = await prisma.order.findUnique({ where: { id }, include: { items: true, bill: true } });
    if (!order) throw new HttpError(404, "Order not found");

    const productIds = Array.from(
      new Set([...order.items.map((i) => i.productId), ...Array.from(incomingMap.keys())])
    );

    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    if (products.length !== productIds.length) throw new HttpError(400, "One or more products are no longer available.");

    const newItems = new Map<number, { product: any; quantity: number }>();
    for (const [pid, qty] of incomingMap.entries()) {
      const prod = products.find((p) => p.id === pid);
      if (!prod) throw new HttpError(400, "Invalid product in items");
      if (!prod.isActive) throw new HttpError(400, `"${prod.name}" is not available.`);
      const unit = (prod.unit || "").toLowerCase();
      const requiresInteger = unit === "bag" || unit === "piece";
      if (requiresInteger && !Number.isInteger(qty)) {
        throw new HttpError(400, `Quantity for "${prod.name}" must be a whole number (${prod.unit}).`);
      }
      newItems.set(pid, { product: prod, quantity: qty });
    }

    const deltas: Array<{ productId: number; delta: number }> = [];
    for (const pid of productIds) {
      const oldItem = order.items.find((it) => it.productId === pid);
      const oldQty = oldItem ? Number(oldItem.quantity) : 0;
      const newQty = newItems.get(pid)?.quantity ?? 0;
      const delta = Math.round((newQty - oldQty) * 1000) / 1000;
      if (delta > 0) {
        const prod = products.find((p) => p.id === pid)!;
        if (prod.stock < delta) {
          throw new HttpError(400, `Only ${prod.stock} units available. Please reduce quantity.`);
        }
      }
      deltas.push({ productId: pid, delta });
    }

    let subtotal = 0;
    const createItems: any[] = [];
    for (const [pid, ni] of newItems.entries()) {
      if (ni.quantity <= 0) continue;
      const price = Number(ni.product.price);
      const total = Math.round(price * ni.quantity * 100) / 100;
      subtotal += total;
      createItems.push({
        productId: pid,
        productName: ni.product.name,
        unit: ni.product.unit,
        price,
        quantity: ni.quantity,
        total,
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;

    const result = await prisma.$transaction(
      async (tx) => {
        for (const d of deltas) {
          if (d.delta === 0) continue;
          if (d.delta > 0) {
            const updated = await tx.product.updateMany({
              where: { id: d.productId, stock: { gte: d.delta } },
              data: { stock: { decrement: d.delta } },
            });
            if (updated.count === 0) {
              const prod = products.find((p) => p.id === d.productId)!;
              throw new HttpError(400, `Only ${prod.stock} units available. Please reduce quantity.`);
            }
          } else {
            await tx.product.update({
              where: { id: d.productId },
              data: { stock: { increment: -d.delta } },
            });
          }
        }

        await tx.orderItem.deleteMany({ where: { orderId: id } });
        await tx.order.update({ where: { id }, data: { subtotal, items: { create: createItems } } });

        if (order.bill) {
          const newFinal = Math.max(0, Math.round((subtotal - order.bill.discount) * 100) / 100);
          await tx.bill.update({ where: { orderId: id }, data: { subtotal, finalAmount: newFinal } });
        }

        const updatedOrder = await tx.order.findUnique({ where: { id }, include: { items: true, bill: true } });
        if (!updatedOrder) throw new HttpError(404, "Order not found");
        return updatedOrder;
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );

    await writeAudit(req, {
      action: "ORDER_EDIT",
      entity: "Order",
      entityId: String(order.id),
      details: `Edited order ${order.orderNumber}`,
    });

    res.json({ order: serializeOrder(result) });
  })
);

export default router;

