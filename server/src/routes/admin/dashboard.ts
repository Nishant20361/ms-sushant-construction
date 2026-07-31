import { Router } from "express";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAdmin } from "../../middleware/auth.js";

const router = Router();

// GET /api/admin/dashboard
router.get(
  "/dashboard",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const [totalProducts, activeProducts, totalOrders, pendingOrders, recentOrders, lowStock] =
      await Promise.all([
        prisma.product.count(),
        prisma.product.count({ where: { isActive: true } }),
        prisma.order.count(),
        prisma.order.count({ where: { status: "PENDING" } }),
        prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
        prisma.product.findMany({
          where: { stock: { lte: 10 }, isActive: true },
          orderBy: { stock: "asc" },
          take: 10,
          include: { category: true, images: { take: 1 } },
        }),
      ]);

    res.json({
      stats: {
        totalProducts,
        activeProducts,
        totalOrders,
        pendingOrders,
        lowStockCount: lowStock.length,
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        subtotal: o.subtotal,
        status: o.status,
        createdAt: o.createdAt,
      })),
      lowStockProducts: lowStock.map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        unit: p.unit,
        imageUrl: p.images?.[0]?.url ?? null,
      })),
    });
  })
);

export default router;

