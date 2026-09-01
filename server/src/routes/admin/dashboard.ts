import { Router } from "express";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAdmin } from "../../middleware/auth.js";
import { AuthenticatedRequest } from "../../types.js";

import { computeOrderFinancials, roundCurrency } from "../../utils/financials.js";

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

    // Total due and daily metrics
    const dueOrders = await prisma.order.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { bill: true, payments: true },
    });

    // Indian Standard Time (IST, UTC+5:30) bounds
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(Date.now() + istOffsetMs);
    const y = istNow.getUTCFullYear();
    const m = istNow.getUTCMonth();
    const d = istNow.getUTCDate();
    const todayStart = new Date(Date.UTC(y, m, d) - istOffsetMs);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    let totalDue = 0;
    let todaySales = 0;
    let todayDue = 0;
    let todayOrdersCount = 0;

    for (const o of dueOrders) {
      const fin = computeOrderFinancials(o);
      totalDue = roundCurrency(totalDue + fin.due);

      const orderCreated = new Date(o.createdAt);
      if (orderCreated >= todayStart && orderCreated < todayEnd) {
        todaySales = roundCurrency(todaySales + fin.finalAmount);
        todayOrdersCount += 1;
        todayDue = roundCurrency(todayDue + fin.due);
      }
    }

    // Aggregate payments collected today in IST
    const todayPaymentsAgg = await prisma.orderPayment.aggregate({
      _sum: { amount: true },
      where: {
        paymentDate: { gte: todayStart, lt: todayEnd },
        order: { status: { not: "CANCELLED" } },
      },
    });
    const todayCollected = roundCurrency(Number(todayPaymentsAgg._sum.amount || 0));

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
        totalRevenue: roundCurrency(Number(revenueAgg._sum.subtotal || 0)),
        totalCollected: roundCurrency(Number(paymentsAgg._sum.amount || 0)),
        totalCashCollected: roundCurrency(Number(cashAgg._sum.amount || 0)),
        totalOnlineCollected: roundCurrency(Number(onlineAgg._sum.amount || 0)),
        totalDue,
        todaySales,
        todayCollected,
        todayDue,
        todayOrders: todayOrdersCount,
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
