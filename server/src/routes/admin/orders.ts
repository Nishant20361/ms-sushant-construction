import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { parseIntegerParam } from "../../utils/request.js";
import { HttpError } from "../../utils/httpError.js";
import { orderStatusSchema, receivePaymentSchema, receiveCustomerPaymentSchema } from "../../validators/index.js";
import { requireAdmin } from "../../middleware/auth.js";
import { writeAudit } from "../../middleware/audit.js";
import { serializeBill, serializeOrder, serializeOrderPayment } from "../../utils/serializer.js";
import { AuthenticatedRequest } from "../../types.js";
import { createAdminNotification, notifyStockTransitions } from "../../services/push.service.js";
import {
  computeOrderFinancials,
  allocateCustomerPaymentFIFO,
  roundCurrency,
  toPrismaDecimal,
} from "../../utils/financials.js";
import { normalizeIndianMobile } from "../../utils/validatePhone.js";

async function paymentNotification(
  adminId: number,
  input: { amount: number; mode: string; orderId?: number; orderNumber?: string; customerName: string; key: string }
) {
  await createAdminNotification({
    adminId,
    type: "PAYMENT_RECEIVED",
    title: "Payment received",
    message: `₹${input.amount.toFixed(2)} · ${input.mode} · ${input.customerName}`,
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    customerName: input.customerName,
    metadata: { amount: input.amount, mode: input.mode },
    dedupeKey: `PAYMENT_RECEIVED:${input.key}`,
  });
}

const router = Router();

// GET /api/admin/orders?search=&status=&paymentStatus=&payment=&from=&to=&page=&limit=
router.get(
  "/orders",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const {
      search,
      status,
      from,
      to,
      paymentStatus,
      payment,
      page = "1",
      limit = "20",
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Support both 'paymentStatus' and 'payment' parameter names
    const rawPayment = (paymentStatus || payment || "").trim().toUpperCase();
    const filterPaymentStatus = ["PAID", "PARTIALLY_PAID", "DUE"].includes(rawPayment)
      ? rawPayment
      : undefined;

    // Date range filter
    let fromDate: Date | null = null;
    let toDate: Date | null = null;
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) fromDate = d;
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        toDate = d;
      }
    }

    if (filterPaymentStatus) {
      // Direct SQL-level filtering for exact pagination without empty pages
      const searchPattern = search?.trim() ? `%${search.trim()}%` : null;

      const results = await prisma.$queryRaw<
        Array<{ id: number | null; total_count: bigint }>
      >`
        WITH order_financials AS (
          SELECT
            o.id,
            o."createdAt",
            CASE
              WHEN COALESCE(pm.paid_total, 0) = 0
                   AND (COALESCE(b."finalAmount", o.subtotal) - COALESCE(pm.paid_total, 0)) > 0
                THEN 'DUE'
              WHEN COALESCE(pm.paid_total, 0) > 0
                   AND (COALESCE(b."finalAmount", o.subtotal) - COALESCE(pm.paid_total, 0)) > 0
                THEN 'PARTIALLY_PAID'
              ELSE 'PAID'
            END AS derived_status
          FROM "Order" o
          LEFT JOIN "Bill" b ON b."orderId" = o.id
          LEFT JOIN (
            SELECT "orderId", SUM(amount) AS paid_total
            FROM "OrderPayment"
            GROUP BY "orderId"
          ) pm ON pm."orderId" = o.id
          WHERE 1=1
            ${status ? Prisma.sql`AND o.status = ${status}` : Prisma.empty}
            ${searchPattern ? Prisma.sql`AND (
              o."orderNumber" ILIKE ${searchPattern}
              OR o."customerName" ILIKE ${searchPattern}
              OR o."customerMobile" ILIKE ${searchPattern}
            )` : Prisma.empty}
            ${fromDate ? Prisma.sql`AND o."createdAt" >= ${fromDate}` : Prisma.empty}
            ${toDate ? Prisma.sql`AND o."createdAt" <= ${toDate}` : Prisma.empty}
        ),
        filtered AS (
          SELECT id, "createdAt"
          FROM order_financials
          WHERE derived_status = ${filterPaymentStatus}
        ),
        counted AS (
          SELECT COUNT(*)::bigint AS total_count FROM filtered
        ),
        paged AS (
          SELECT id, "createdAt"
          FROM filtered
          ORDER BY "createdAt" DESC
          OFFSET ${skip}
          LIMIT ${limitNum}
        )
        SELECT p.id, c.total_count
        FROM counted c
        LEFT JOIN paged p ON TRUE
        ORDER BY p."createdAt" DESC
      `;

      const total = Number(results[0]?.total_count ?? 0);
      const orderIds = results.flatMap((r) => (r.id == null ? [] : [r.id]));

      let orders: any[] = [];
      if (orderIds.length > 0) {
        const rawOrders = await prisma.order.findMany({
          where: { id: { in: orderIds } },
          include: { items: true, bill: true, payments: true },
        });
        // Preserve SQL sort order
        const orderMap = new Map(rawOrders.map((o) => [o.id, o]));
        orders = orderIds.map((id) => orderMap.get(id)!).filter(Boolean);
      }

      res.json({
        orders: orders.map(serializeOrder),
        total,
        page: pageNum,
        pages: Math.max(1, Math.ceil(total / limitNum)),
      });
      return;
    }

    // Default fast Prisma path when no derived payment status filter is needed
    const where: any = {};
    if (status) where.status = status;
    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { orderNumber: { contains: term, mode: "insensitive" } },
        { customerName: { contains: term, mode: "insensitive" } },
        { customerMobile: { contains: term, mode: "insensitive" } },
      ];
    }
    if (fromDate || toDate) {
      const dateFilter: any = {};
      if (fromDate) dateFilter.gte = fromDate;
      if (toDate) dateFilter.lte = toDate;
      where.createdAt = dateFilter;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true, bill: true, payments: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders: orders.map(serializeOrder),
      total,
      page: pageNum,
      pages: Math.max(1, Math.ceil(total / limitNum)),
    });
  })
);

// GET /api/admin/orders/due-snapshot?search=&from=&to=&dateRange=&paymentStatus=
// Customer due summary. Groups all non-cancelled orders by customer mobile and
// returns each customer's totals (orders, purchase, paid, due) plus their
// individually due orders. Supports search by name/mobile/order number, date
// range filters (today/week/month/custom), and payment status filter.
// MUST be declared before /orders/:id so it is not shadowed by the
// parameterised route.
router.get(
  "/orders/due-snapshot",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { search, from, to, dateRange, paymentStatus } = req.query as Record<string, string>;

    const where: any = { status: { not: "CANCELLED" } };

    // Search by customer name, mobile, or order number.
    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { customerName: { contains: term, mode: "insensitive" } },
        { customerMobile: { contains: term, mode: "insensitive" } },
        { orderNumber: { contains: term, mode: "insensitive" } },
      ];
    }

    // Date filter: today / week / month (dateRange) OR a custom from/to range.
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    if (dateRange) {
      if (dateRange === "today") {
        where.createdAt = { gte: startOfToday, lte: endOfToday };
      } else if (dateRange === "week") {
        where.createdAt = { gte: new Date(startOfToday.getTime() - 6 * 86400000), lte: endOfToday };
      } else if (dateRange === "month") {
        where.createdAt = { gte: new Date(now.getFullYear(), now.getMonth(), 1), lte: endOfToday };
      }
    } else if (from || to) {
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

    const orders = await prisma.order.findMany({
      where,
      include: { bill: true, payments: true },
      orderBy: { createdAt: "asc" },
    });

    const byMobile = new Map<string, any>();
    for (const o of orders) {
      const finalAmount = o.bill ? Number(o.bill.finalAmount) : Number(o.subtotal);
      const cash = (o.payments ?? [])
        .filter((p: any) => p.paymentMode === "CASH")
        .reduce((s: number, p: any) => s + Number(p.amount), 0);
      const online = (o.payments ?? [])
        .filter((p: any) => p.paymentMode === "ONLINE")
        .reduce((s: number, p: any) => s + Number(p.amount), 0);
      const paid = Math.round((cash + online) * 100) / 100;
      const due = Math.max(0, Math.round((finalAmount - paid) * 100) / 100);
      const orderPaymentStatus = paid <= 0 ? "DUE" : due <= 0 ? "PAID" : "PARTIALLY_PAID";

      // Apply the payment status filter at the order level.
      if (
        paymentStatus &&
        ["PAID", "PARTIALLY_PAID", "DUE"].includes(paymentStatus) &&
        orderPaymentStatus !== paymentStatus
      ) {
        continue;
      }

      const entry = {
        id: o.id,
        orderNumber: o.orderNumber,
        finalAmount: Math.round(finalAmount * 100) / 100,
        paid,
        due,
        paymentStatus: orderPaymentStatus,
        createdAt: o.createdAt,
      };

      const cleanM = (o.customerMobile || "").replace(/\D/g, "");
      const key = cleanM.length >= 10 ? cleanM.slice(-10) : (o.customerMobile || "unknown");

      const customer = byMobile.get(key);
      if (customer) {
        if (o.customerName && o.customerName.trim()) {
          customer.customerName = o.customerName.trim();
        }
        customer.totalOrders += 1;
        customer.totalPurchase += Math.round(finalAmount * 100) / 100;
        customer.totalPaid += paid;
        customer.totalDue += due;
        customer.orders.push(entry);
      } else {
        byMobile.set(key, {
          customerName: o.customerName || "Customer",
          customerMobile: key,
          totalOrders: 1,
          totalPurchase: Math.round(finalAmount * 100) / 100,
          totalPaid: paid,
          totalDue: due,
          orders: [entry],
        });
      }
    }

    const customers = Array.from(byMobile.values()).map((c) => ({
      customerName: c.customerName,
      customerMobile: c.customerMobile,
      totalOrders: c.totalOrders,
      totalPurchase: Math.round(c.totalPurchase * 100) / 100,
      totalPaid: Math.round(c.totalPaid * 100) / 100,
      totalDue: Math.round(c.totalDue * 100) / 100,
      orders: c.orders,
    }));

    // When a payment status filter is applied, only keep customers with
    // matching outstanding balances (remove fully-paid customers for DUE/partial).
    let filtered = customers;
    if (paymentStatus === "DUE") {
      filtered = customers.filter((c) => c.totalDue > 0);
    }
    filtered = filtered.sort((a, b) => b.totalDue - a.totalDue);

    res.json({ customers: filtered });
  })
);

// GET /api/admin/orders/customer/:mobile
// Customer due detail: all non-cancelled orders for a customer with cash/online
// breakdown + full payment history (with previous due / remaining due running
// balance). MUST be declared before /orders/:id so it is not shadowed.
router.get(
  "/orders/customer/:mobile",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const rawMobile = req.params.mobile;
    if (!rawMobile) throw new HttpError(400, "Customer mobile is required");
    const last10 = normalizeIndianMobile(rawMobile);
    if (!last10) throw new HttpError(400, "A valid Indian mobile number is required");
    const variants = [last10, `+91${last10}`, `91${last10}`, `0${last10}`, rawMobile.trim()];

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { customerMobile: { in: variants } },
          { customerMobile: { endsWith: last10 } },
        ],
        status: { not: "CANCELLED" },
      },
      include: { items: true, bill: true, payments: { orderBy: { paymentDate: "asc" } } },
      orderBy: { createdAt: "asc" },
    });

    if (orders.length === 0) {
      throw new HttpError(404, "Customer not found or has no orders");
    }

    const detailOrders = orders.map((o) => {
      const fin = computeOrderFinancials(o);
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        deliveryAddress: o.deliveryAddress,
        createdAt: o.createdAt,
        finalAmount: fin.finalAmount,
        cashPaid: fin.cashTotal,
        onlinePaid: fin.onlineTotal,
        paid: fin.paidTotal,
        due: fin.due,
        paymentStatus: fin.paymentStatus,
      };
    });

    // Build chronological payment history
    const allPayments = orders.flatMap((o) =>
      (o.payments ?? []).map((p: any) => ({
        ...p,
        orderNumber: o.orderNumber,
        orderId: o.id,
      }))
    );
    allPayments.sort((a: any, b: any) => {
      const d = new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime();
      if (d !== 0) return d;
      return a.id - b.id;
    });

    const orderDues = new Map<number, { final: number; paid: number }>();
    for (const o of orders) {
      const fin = computeOrderFinancials(o);
      orderDues.set(o.id, { final: fin.finalAmount, paid: 0 });
    }
    let runningTotalDue = orderDues.size
      ? Array.from(orderDues.values()).reduce((s, v) => s + v.final, 0)
      : 0;

    const history = allPayments.map((p: any) => {
      const prevDue = roundCurrency(runningTotalDue);
      const od = orderDues.get(p.orderId)!;
      od.paid = roundCurrency(od.paid + Number(p.amount));
      runningTotalDue = Array.from(orderDues.values()).reduce(
        (s, v) => s + Math.max(0, roundCurrency(v.final - v.paid)),
        0
      );
      return {
        id: p.id,
        orderNumber: p.orderNumber,
        amount: roundCurrency(p.amount),
        paymentMode: p.paymentMode,
        paymentDate: p.paymentDate,
        notes: p.notes ?? null,
        previousDue: prevDue,
        remainingDue: roundCurrency(runningTotalDue),
      };
    });
    history.reverse(); // newest first for display

    const totalPurchase = roundCurrency(detailOrders.reduce((s, o) => s + o.finalAmount, 0));
    const totalPaid = roundCurrency(detailOrders.reduce((s, o) => s + o.paid, 0));
    const totalDue = roundCurrency(detailOrders.reduce((s, o) => s + o.due, 0));

    const orderWithAddress = orders.find((o) => o.deliveryAddress && o.deliveryAddress.trim().length > 0);
    const customerAddress = orderWithAddress?.deliveryAddress || orders[0].deliveryAddress || "";

    res.json({
      customer: {
        customerName: orders[0].customerName,
        customerMobile: orders[0].customerMobile,
        customerAddress,
        totalOrders: orders.length,
        totalPurchase,
        totalPaid,
        totalDue,
      },
      orders: detailOrders,
      paymentHistory: history,
    });
  })
);

// POST /api/admin/orders/customer/:mobile/payments
// Concurrency-safe FIFO customer payment. Locks matching order rows in deterministic
// order (ORDER BY id ASC FOR UPDATE) within an atomic transaction.
router.post(
  "/orders/customer/:mobile/payments",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const rawMobile = req.params.mobile;
    if (!rawMobile) throw new HttpError(400, "Customer mobile is required");
    const last10 = normalizeIndianMobile(rawMobile);
    if (!last10) throw new HttpError(400, "A valid Indian mobile number is required");
    const mobile = last10;
    const variants = [last10, `+91${last10}`, `91${last10}`, `0${last10}`, mobile];
    const body = receiveCustomerPaymentSchema.parse(req.body);
    const paymentAmount = roundCurrency(body.amount);

    if (paymentAmount <= 0) {
      throw new HttpError(400, "Payment amount must be greater than zero");
    }

    const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
    const paymentMode = body.paymentMode;
    const notes = body.notes?.trim() || null;

    const { createdPayments, updatedOrders } = await prisma.$transaction(async (tx) => {
      // 1. Concurrency Lock: Lock all customer order rows deterministically in the first SQL query
      const lockedRows = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "Order"
        WHERE ("customerMobile" IN (${Prisma.join(variants)}) OR "customerMobile" LIKE ${"%" + last10})
          AND status != 'CANCELLED'
        ORDER BY id ASC
        FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new HttpError(404, "Customer not found or has no active orders");
      }

      const orderIds = lockedRows.map((o) => o.id);

      // 3. Re-read fresh order records with bills and payments inside transaction
      const orders = await tx.order.findMany({
        where: { id: { in: orderIds } },
        include: { items: true, bill: true, payments: true },
        orderBy: { createdAt: "asc" },
      });

      // 4. Compute current dues using authoritative financial module
      const dueOrders = orders.map((o) => {
        const fin = computeOrderFinancials(o);
        return {
          id: o.id,
          finalAmount: fin.finalAmount,
          paidTotal: fin.paidTotal,
          due: fin.due,
        };
      });

      const totalDue = roundCurrency(dueOrders.reduce((s, o) => s + o.due, 0));

      if (paymentAmount > totalDue) {
        throw new HttpError(
          400,
          `Payment of ₹${paymentAmount.toFixed(2)} exceeds the customer's total outstanding due of ₹${totalDue.toFixed(2)}.`
        );
      }

      // 5. Allocate FIFO
      const { allocations } = allocateCustomerPaymentFIFO(dueOrders, paymentAmount);

      const paymentsList: any[] = [];
      for (const alloc of allocations) {
        if (alloc.allocatedAmount <= 0) continue;
        const p = await tx.orderPayment.create({
          data: {
            orderId: alloc.orderId,
            amount: toPrismaDecimal(alloc.allocatedAmount),
            paymentMode,
            paymentDate,
            notes,
          },
        });
        paymentsList.push(p);
      }

      // 6. Fetch final updated customer orders
      const refreshed = await tx.order.findMany({
        where: { id: { in: orderIds } },
        include: { items: true, bill: true, payments: true },
        orderBy: { createdAt: "asc" },
      });

      return { createdPayments: paymentsList, updatedOrders: refreshed };
    }, {
      timeout: 15000,
    });

    await writeAudit(req, {
      action: "CUSTOMER_PAYMENT",
      entity: "Customer",
      entityId: mobile,
      details: `Received ${paymentMode} ₹${paymentAmount.toFixed(2)} for customer ${mobile} across ${createdPayments.length} order(s)`,
    });

    await paymentNotification(Number(req.admin?.sub), {
      amount: paymentAmount,
      mode: paymentMode,
      customerName: updatedOrders[0].customerName,
      key: `CUSTOMER:${mobile}:${createdPayments.map((p: any) => p.id).join("-")}`,
    }).catch((e) =>
      console.error("[push] Customer payment notification failed", e instanceof Error ? e.message : e)
    );

    const detailOrders = updatedOrders.map((o) => {
      const fin = computeOrderFinancials(o);
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        finalAmount: fin.finalAmount,
        cashPaid: fin.cashTotal,
        onlinePaid: fin.onlineTotal,
        paid: fin.paidTotal,
        due: fin.due,
        paymentStatus: fin.paymentStatus,
      };
    });

    const totalPurchase = roundCurrency(detailOrders.reduce((s, o) => s + o.finalAmount, 0));
    const totalPaid = roundCurrency(detailOrders.reduce((s, o) => s + o.paid, 0));
    const newTotalDue = roundCurrency(detailOrders.reduce((s, o) => s + o.due, 0));

    res.status(201).json({
      message: "Payment recorded successfully",
      payments: createdPayments.map((p: any) => serializeOrderPayment(p)),
      customer: {
        customerName: updatedOrders[0].customerName,
        customerMobile: updatedOrders[0].customerMobile,
        totalOrders: updatedOrders.length,
        totalPurchase,
        totalPaid,
        totalDue: newTotalDue,
      },
      orders: detailOrders,
    });
  })
);

// GET /api/admin/orders/:id
router.get(
  "/orders/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIntegerParam(req.params.id, "order id");
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, bill: true, payments: true },
    });
    if (!order) throw new HttpError(404, "Order not found");
    res.json({ order: serializeOrder(order), bill: serializeBill(order.bill) });
  })
);

// DELETE /api/admin/orders/:id
router.delete(
  "/orders/:id",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = parseIntegerParam(req.params.id, "order id");
    const existing = await prisma.order.findUnique({
      where: { id },
      include: { bill: true },
    });
    if (!existing) throw new HttpError(404, "Order not found");

    try {
      await prisma.$transaction(async (tx) => {
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        if (existing.bill) {
          await tx.bill.deleteMany({ where: { orderId: id } });
        }
        await tx.orderPayment.deleteMany({ where: { orderId: id } });
        await tx.order.delete({ where: { id } });
      });
    } catch {
      throw new HttpError(400, "Unable to delete order");
    }

    await writeAudit(req, {
      action: "ORDER_DELETE",
      entity: "Order",
      entityId: id,
      details: `${existing.orderNumber} permanently deleted`,
    });
    res.json({ success: true, message: "Order deleted" });
  })
);

// PATCH /api/admin/orders/:id/status
// Changes order status with transactional inventory update and idempotency protection.
router.patch(
  "/orders/:id/status",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = parseIntegerParam(req.params.id, "order id");
    const body = orderStatusSchema.parse(req.body);

    const { order, wasCancelled, nowCancelled, beforeProducts } = await prisma.$transaction(async (tx) => {
      // Row lock on Order
      const [locked] = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE
      `;
      if (!locked) throw new HttpError(404, "Order not found");

      const existing = await tx.order.findUnique({
        where: { id },
        include: { items: true, payments: true },
      });
      if (!existing) throw new HttpError(404, "Order not found");

      const isCancelling = existing.status !== "CANCELLED" && body.status === "CANCELLED";
      const isReactivating = existing.status === "CANCELLED" && body.status !== "CANCELLED";

      const productIds = existing.items.map((i) => i.productId);
      let productsBefore: any[] = [];
      if (productIds.length > 0) {
        productsBefore = await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, stock: true },
        });
      }

      await tx.order.update({
        where: { id },
        data: { status: body.status },
      });

      if (isCancelling) {
        // Return stock for cancelled order items
        for (const item of existing.items) {
          const qty = Number(item.quantity);
          if (qty > 0) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: qty } },
            });
          }
        }
      } else if (isReactivating) {
        // Re-decrement stock with availability check
        for (const item of existing.items) {
          const qty = Number(item.quantity);
          if (qty <= 0) continue;
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          if (!prod) continue;
          if (Number(prod.stock) < qty) {
            throw new HttpError(
              400,
              `Only ${prod.stock} units of "${item.productName}" in stock. Cannot re-activate this order.`
            );
          }
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: qty } },
          });
        }
      }

      const updated = await tx.order.findUniqueOrThrow({
        where: { id },
        include: { items: true, bill: true, payments: true },
      });

      return {
        order: updated,
        wasCancelled: existing.status === "CANCELLED",
        nowCancelled: body.status === "CANCELLED",
        beforeProducts: productsBefore,
      };
    });

    await writeAudit(req, {
      action: "ORDER_STATUS",
      entity: "Order",
      entityId: order.id,
      details: `${order.orderNumber} -> ${order.status}`,
    });

    if (wasCancelled && !nowCancelled) {
      const after = await prisma.product.findMany({
        where: { id: { in: beforeProducts.map((p) => p.id) } },
        select: { id: true, name: true, stock: true },
      });
      await notifyStockTransitions(
        after.map((p) => ({
          productId: p.id,
          name: p.name,
          previous: Number(beforeProducts.find((x) => x.id === p.id)?.stock ?? p.stock),
          next: Number(p.stock),
        })),
        `ORDER_REACTIVATE:${order.id}:${order.updatedAt.toISOString()}`
      ).catch((e) =>
        console.error("[push] Reactivation stock notification failed", e instanceof Error ? e.message : e)
      );
    }

    res.json({ order: serializeOrder(order) });
  })
);

// POST /api/admin/orders/:id/payments
// Concurrency-safe single order payment using PostgreSQL row-level lock.
router.post(
  "/orders/:id/payments",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = parseIntegerParam(req.params.id, "order id");
    const body = receivePaymentSchema.parse(req.body);
    const paymentAmount = roundCurrency(body.amount);

    if (paymentAmount <= 0) {
      throw new HttpError(400, "Payment amount must be greater than zero");
    }

    const { payment, updatedOrder } = await prisma.$transaction(async (tx) => {
      // 1. Lock Order row
      const [locked] = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE
      `;
      if (!locked) throw new HttpError(404, "Order not found");

      const order = await tx.order.findUnique({
        where: { id },
        include: { bill: true, payments: true },
      });
      if (!order) throw new HttpError(404, "Order not found");

      if (order.status === "CANCELLED") {
        throw new HttpError(400, "Cannot record payment on a cancelled order");
      }

      const fin = computeOrderFinancials(order);

      if (paymentAmount > fin.due) {
        throw new HttpError(
          400,
          `Payment of ₹${paymentAmount.toFixed(2)} exceeds the remaining due of ₹${fin.due.toFixed(2)} for this order.`
        );
      }

      const createdPayment = await tx.orderPayment.create({
        data: {
          orderId: id,
          amount: toPrismaDecimal(paymentAmount),
          paymentMode: body.paymentMode,
          paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
          notes: body.notes?.trim() || null,
        },
      });

      const updated = await tx.order.findUniqueOrThrow({
        where: { id },
        include: { items: true, bill: true, payments: true },
      });

      return { payment: createdPayment, updatedOrder: updated };
    });

    await writeAudit(req, {
      action: "ORDER_PAYMENT",
      entity: "Order",
      entityId: id,
      details: `${updatedOrder.orderNumber} received ${body.paymentMode} ₹${paymentAmount.toFixed(2)}`,
    });

    await paymentNotification(Number(req.admin?.sub), {
      amount: paymentAmount,
      mode: payment.paymentMode,
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      customerName: updatedOrder.customerName,
      key: `ORDER_PAYMENT:${payment.id}`,
    }).catch((e) =>
      console.error("[push] Order payment notification failed", e instanceof Error ? e.message : e)
    );

    res.status(201).json({
      message: "Payment recorded successfully",
      payment: serializeOrderPayment(payment),
      order: serializeOrder(updatedOrder),
    });
  })
);

// PATCH /api/admin/orders/:id/edit
// Concurrency-safe order item editing with stock delta check and payment invariant verification.
router.patch(
  "/orders/:id/edit",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = parseIntegerParam(req.params.id, "order id");
    const body = req.body as { items: { productId: number; quantity: number }[] };

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

    const result = await prisma.$transaction(
      async (tx) => {
        // Lock the Order row
        const [lockedOrder] = await tx.$queryRaw<Array<{ id: number }>>`
          SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE
        `;
        if (!lockedOrder) throw new HttpError(404, "Order not found");

        const order = await tx.order.findUnique({
          where: { id },
          include: { items: true, bill: true, payments: true },
        });
        if (!order) throw new HttpError(404, "Order not found");

        if (order.status === "CANCELLED") {
          throw new HttpError(400, "Cannot edit items on a cancelled order");
        }

        const productIds = Array.from(
          new Set([...order.items.map((i) => i.productId), ...Array.from(incomingMap.keys())])
        ).sort((a, b) => a - b);

        // Lock product rows deterministically
        await tx.$queryRaw`
          SELECT id FROM "Product"
          WHERE id IN (${Prisma.join(productIds)})
          ORDER BY id ASC
          FOR UPDATE
        `;

        const products = await tx.product.findMany({ where: { id: { in: productIds } } });
        if (products.length !== productIds.length) {
          throw new HttpError(400, "One or more products are no longer available.");
        }

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
              throw new HttpError(400, `Only ${prod.stock} units of "${prod.name}" in stock. Please reduce quantity.`);
            }
          }
          deltas.push({ productId: pid, delta });
        }

        let subtotal = 0;
        const createItems: any[] = [];
        for (const [pid, ni] of newItems.entries()) {
          if (ni.quantity <= 0) continue;
          const price = roundCurrency(ni.product.price);
          const total = roundCurrency(price * ni.quantity);
          subtotal = roundCurrency(subtotal + total);
          createItems.push({
            productId: pid,
            productName: ni.product.name,
            unit: ni.product.unit,
            price: toPrismaDecimal(price),
            quantity: ni.quantity,
            total: toPrismaDecimal(total),
          });
        }

        // Check invariant: new final bill cannot be less than already recorded paidTotal
        const existingDiscount = order.bill ? roundCurrency(order.bill.discount) : 0;
        if (existingDiscount > subtotal) {
          throw new HttpError(400, `Existing discount of ₹${existingDiscount} cannot exceed new subtotal of ₹${subtotal}`);
        }
        const newFinal = Math.max(0, roundCurrency(subtotal - existingDiscount));
        const fin = computeOrderFinancials(order);

        if (newFinal < fin.paidTotal) {
          throw new HttpError(
            400,
            `Editing items would reduce the final bill to ₹${newFinal.toFixed(2)}, which is less than the ₹${fin.paidTotal.toFixed(2)} already paid.`
          );
        }

        // Apply stock deltas
        for (const d of deltas) {
          if (d.delta === 0) continue;
          if (d.delta > 0) {
            await tx.product.update({
              where: { id: d.productId },
              data: { stock: { decrement: d.delta } },
            });
          } else {
            await tx.product.update({
              where: { id: d.productId },
              data: { stock: { increment: -d.delta } },
            });
          }
        }

        await tx.orderItem.deleteMany({ where: { orderId: id } });
        await tx.order.update({
          where: { id },
          data: {
            subtotal: toPrismaDecimal(subtotal),
            items: { create: createItems },
          },
        });

        if (order.bill) {
          await tx.bill.update({
            where: { orderId: id },
            data: {
              subtotal: toPrismaDecimal(subtotal),
              finalAmount: toPrismaDecimal(newFinal),
            },
          });
        }

        const updatedOrder = await tx.order.findUniqueOrThrow({
          where: { id },
          include: { items: true, bill: true, payments: true },
        });

        return { updatedOrder, productIds };
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );

    await writeAudit(req, {
      action: "ORDER_EDIT",
      entity: "Order",
      entityId: String(result.updatedOrder.id),
      details: `Edited order ${result.updatedOrder.orderNumber}`,
    });

    res.json({ order: serializeOrder(result.updatedOrder) });
  })
);

export default router;
