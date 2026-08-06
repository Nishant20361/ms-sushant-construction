import { Router } from "express";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAdmin } from "../../middleware/auth.js";
import { AuthenticatedRequest } from "../../types.js";

const router = Router();

// GET /api/admin/dashboard
router.get(
  "/dashboard",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const adminId = req.admin?.sub ? Number(req.admin.sub) : undefined;
    const profile = adminId
      ? await prisma.adminProfile.findUnique({ where: { adminId } })
      : null;
    const threshold = profile?.lowStockThreshold ?? 10;

    const [
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      outForDeliveryOrders,
      deliveredOrders,
      cancelledOrders,
revenueAgg,
      paymentsAgg,
      cashAgg,
      onlineAgg,
      recentOrders,
      lowStock,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "CONFIRMED" } }),
      prisma.order.count({ where: { status: "PROCESSING" } }),
      prisma.order.count({ where: { status: "OUT_FOR_DELIVERY" } }),
      prisma.order.count({ where: { status: "DELIVERED" } }),
      prisma.order.count({ where: { status: "CANCELLED" } }),
      prisma.order.aggregate({
        _sum: { subtotal: true },
        where: { status: { not: "CANCELLED" } },
      }),
// Total collected = sum of all payments across non-cancelled orders,
      // split by cash vs online.
      prisma.orderPayment.aggregate({
        _sum: { amount: true },
        where: { order: { status: { not: "CANCELLED" } } },
      }),
      prisma.orderPayment.aggregate({
        _sum: { amount: true },
        where: { paymentMode: "CASH", order: { status: { not: "CANCELLED" } } },
      }),
      prisma.orderPayment.aggregate({
        _sum: { amount: true },
        where: { paymentMode: "ONLINE", order: { status: { not: "CANCELLED" } } },
      }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.product.findMany({
        where: { stock: { lte: threshold }, isActive: true },
        orderBy: { stock: "asc" },
        take: 10,
        include: { category: true, images: { take: 1 } },
      }),
    ]);

    // Total due = sum of (final payable - collected) across all non-cancelled
    // orders. This is a lightweight foundation for customer due management.
    const dueOrders = await prisma.order.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { bill: true, payments: true },
    });
    let totalDue = 0;
    for (const o of dueOrders) {
      const final = o.bill ? Number(o.bill.finalAmount) : Number(o.subtotal);
      const paid = (o.payments ?? []).reduce(
        (s: number, p: any) => s + Number(p.amount),
        0
      );
      totalDue += Math.max(0, Math.round((final - paid) * 100) / 100);
    }
    totalDue = Math.round(totalDue * 100) / 100;

    res.json({
      stats: {
        totalProducts,
        activeProducts,
        totalOrders,
        pendingOrders,
        confirmedOrders,
        processingOrders,
        outForDeliveryOrders,
        deliveredOrders,
        cancelledOrders,
totalRevenue: revenueAgg._sum.subtotal ?? 0,
        totalCollected: paymentsAgg._sum.amount ?? 0,
        totalCashCollected: cashAgg._sum.amount ?? 0,
        totalOnlineCollected: onlineAgg._sum.amount ?? 0,
        totalDue,
        lowStockCount: lowStock.length,
        lowStockThreshold: threshold,
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
        stock: Number(p.stock),
        unit: p.unit,
        imageUrl: p.images?.[0]?.url ?? null,
      })),
    });
  })
);

export default router;
