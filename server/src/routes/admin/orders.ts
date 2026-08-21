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

async function paymentNotification(adminId:number,input:{amount:number;mode:string;orderId?:number;orderNumber?:string;customerName:string;key:string}){await createAdminNotification({adminId,type:"PAYMENT_RECEIVED",title:"Payment received",message:`₹${input.amount.toFixed(2)} · ${input.mode} · ${input.customerName}`,orderId:input.orderId,orderNumber:input.orderNumber,customerName:input.customerName,metadata:{amount:input.amount,mode:input.mode},dedupeKey:`PAYMENT_RECEIVED:${input.key}`})}

const router = Router();

// GET /api/admin/orders?search=&status=&paymentStatus=&from=&to=&page=&limit=
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
      page = "1",
      limit = "20",
    } = req.query as Record<string, string>;
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerMobile: { contains: search, mode: "insensitive" } },
      ];
    }
    // Payment status filter (foundation). The final status is derived from
    // payments + bill, so we fetch the summary and post-filter in JS when a
    // filter is requested. All orders are returned when no filter is passed.
    const filterPaymentStatus = ["PAID", "PARTIALLY_PAID", "DUE"].includes(paymentStatus ?? "")
      ? paymentStatus
      : undefined;
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
        include: { items: true, bill: true, payments: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.order.count({ where }),
    ]);
    // Payment status is derived (not stored), so post-filter when requested.
    let serialized = orders.map(serializeOrder);
    if (filterPaymentStatus) {
      serialized = serialized.filter((o: any) => o.paymentStatus === filterPaymentStatus);
    }
    res.json({
      orders: serialized,
      total,
      page: Number(page),
      pages: Math.max(1, Math.ceil(total / Number(limit))),
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

      const customer = byMobile.get(o.customerMobile);
      if (customer) {
        customer.totalOrders += 1;
        customer.totalPurchase += Math.round(finalAmount * 100) / 100;
        customer.totalPaid += paid;
        customer.totalDue += due;
        customer.orders.push(entry);
      } else {
        byMobile.set(o.customerMobile, {
          customerName: o.customerName,
          customerMobile: o.customerMobile,
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
    const mobile = req.params.mobile;
    if (!mobile) throw new HttpError(400, "Customer mobile is required");

    const orders = await prisma.order.findMany({
      where: { customerMobile: mobile, status: { not: "CANCELLED" } },
      include: { items: true, bill: true, payments: { orderBy: { paymentDate: "asc" } } },
      orderBy: { createdAt: "asc" },
    });

    if (orders.length === 0) {
      throw new HttpError(404, "Customer not found or has no orders");
    }

    const detailOrders = orders.map((o) => {
      const finalAmount = o.bill ? Number(o.bill.finalAmount) : Number(o.subtotal);
      const cash = (o.payments ?? [])
        .filter((p: any) => p.paymentMode === "CASH")
        .reduce((s: number, p: any) => s + Number(p.amount), 0);
      const online = (o.payments ?? [])
        .filter((p: any) => p.paymentMode === "ONLINE")
        .reduce((s: number, p: any) => s + Number(p.amount), 0);
      const paid = Math.round((cash + online) * 100) / 100;
      const due = Math.max(0, Math.round((finalAmount - paid) * 100) / 100);
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        finalAmount: Math.round(finalAmount * 100) / 100,
        cashPaid: Math.round(cash * 100) / 100,
        onlinePaid: Math.round(online * 100) / 100,
        paid,
        due,
        paymentStatus: paid <= 0 ? "DUE" : due <= 0 ? "PAID" : "PARTIALLY_PAID",
      };
    });

    // Build a running payment history across all the customer's orders,
    // preserving chronology. For each payment we track the previous due vs
    // remaining due (approximated by considering the customer's total balance
    // at that point in time, oldest-first).
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

    // Recompute the running total due by replaying payments chronologically.
    const orderDues = new Map<number, { final: number; paid: number }>();
    for (const o of orders) {
      const finalAmount = o.bill ? Number(o.bill.finalAmount) : Number(o.subtotal);
      orderDues.set(o.id, { final: finalAmount, paid: 0 });
    }
    let runningTotalDue = orderDues.size
      ? Array.from(orderDues.values()).reduce((s, v) => s + v.final, 0)
      : 0;
const history = allPayments.map((p: any) => {
      const prevDue = Math.round(runningTotalDue * 100) / 100;
      const od = orderDues.get(p.orderId)!;
      od.paid += Number(p.amount);
      // Recompute the running total due after applying this payment.
      runningTotalDue = Array.from(orderDues.values()).reduce(
        (s, v) => s + Math.max(0, v.final - v.paid),
        0
      );
      return {
        id: p.id,
        orderNumber: p.orderNumber,
        amount: Number(p.amount),
        paymentMode: p.paymentMode,
        paymentDate: p.paymentDate,
        notes: p.notes ?? null,
        previousDue: prevDue,
        remainingDue: Math.round(runningTotalDue * 100) / 100,
      };
    });
    history.reverse(); // newest first for display

    const totalPurchase = detailOrders.reduce((s, o) => s + o.finalAmount, 0);
    const totalPaid = detailOrders.reduce((s, o) => s + o.paid, 0);
    const totalDue = detailOrders.reduce((s, o) => s + o.due, 0);

    res.json({
      customer: {
        customerName: orders[0].customerName,
        customerMobile: orders[0].customerMobile,
        totalOrders: orders.length,
        totalPurchase: Math.round(totalPurchase * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalDue: Math.round(totalDue * 100) / 100,
      },
      orders: detailOrders,
      paymentHistory: history,
    });
  })
);

// POST /api/admin/orders/customer/:mobile/payments
// Receive a payment against a CUSTOMER's outstanding balance. The amount is
// allocated to the customer's due orders oldest-first (FIFO). Each allocation
// creates a fresh OrderPayment record — old records are NEVER modified.
// MUST be declared before /orders/:id.
router.post(
  "/orders/customer/:mobile/payments",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const mobile = req.params.mobile;
    if (!mobile) throw new HttpError(400, "Customer mobile is required");
    const body = receiveCustomerPaymentSchema.parse(req.body);

    const orders = await prisma.order.findMany({
      where: { customerMobile: mobile, status: { not: "CANCELLED" } },
      include: { bill: true, payments: true },
      orderBy: { createdAt: "asc" },
    });
    if (orders.length === 0) {
      throw new HttpError(404, "Customer not found or has no orders");
    }

    // Compute each order's remaining due.
    const dues = orders.map((o) => {
      const finalAmount = o.bill ? Number(o.bill.finalAmount) : Number(o.subtotal);
      const paid = (o.payments ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);
      return {
        orderId: o.id,
        orderNumber: o.orderNumber,
        due: Math.max(0, Math.round((finalAmount - paid) * 100) / 100),
      };
    });
    const totalDue = Math.round(dues.reduce((s, d) => s + d.due, 0) * 100) / 100;

    if (Math.round(body.amount * 100) / 100 > totalDue + 0.001) {
      throw new HttpError(
        400,
        `Payment of ₹${body.amount} exceeds the customer's total outstanding due of ₹${totalDue}.`
      );
    }

    const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
    const paymentMode = body.paymentMode;
    const notes = body.notes?.trim() || null;

    // FIFO allocation: fill the oldest due order first, carry the remainder
    // to the next. Each allocation becomes its own OrderPayment record.
    let remaining = Math.round(body.amount * 100) / 100;
    const createdPayments: any[] = [];
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const d of dues) {
        if (remaining <= 0) break;
        if (d.due <= 0) continue;
        const alloc = Math.min(d.due, remaining);
        const payment = await tx.orderPayment.create({
          data: {
            orderId: d.orderId,
            amount: alloc,
            paymentMode,
            paymentDate,
            notes,
          },
        });
        createdPayments.push(payment);
        remaining = Math.round((remaining - alloc) * 100) / 100;
      }
    });

    await writeAudit(req, {
      action: "CUSTOMER_PAYMENT",
      entity: "Customer",
      entityId: mobile,
      details: `Received ${paymentMode} ₹${body.amount} for customer ${mobile} across ${createdPayments.length} order(s)`,
    });
    await paymentNotification(Number(req.admin?.sub),{amount:body.amount,mode:paymentMode,customerName:orders[0].customerName,key:`CUSTOMER:${mobile}:${createdPayments.map(p=>p.id).join("-")}`}).catch(e=>console.error("[push] Customer payment notification failed",e instanceof Error?e.message:e));

    // Re-fetch the customer's updated detail.
    const updatedOrders = await prisma.order.findMany({
      where: { customerMobile: mobile, status: { not: "CANCELLED" } },
      include: { items: true, bill: true, payments: true },
      orderBy: { createdAt: "asc" },
    });
    const detailOrders = updatedOrders.map((o) => {
      const finalAmount = o.bill ? Number(o.bill.finalAmount) : Number(o.subtotal);
      const cash = (o.payments ?? [])
        .filter((p: any) => p.paymentMode === "CASH")
        .reduce((s: number, p: any) => s + Number(p.amount), 0);
      const online = (o.payments ?? [])
        .filter((p: any) => p.paymentMode === "ONLINE")
        .reduce((s: number, p: any) => s + Number(p.amount), 0);
      const paid = Math.round((cash + online) * 100) / 100;
      const due = Math.max(0, Math.round((finalAmount - paid) * 100) / 100);
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        finalAmount: Math.round(finalAmount * 100) / 100,
        cashPaid: Math.round(cash * 100) / 100,
        onlinePaid: Math.round(online * 100) / 100,
        paid,
        due,
        paymentStatus: paid <= 0 ? "DUE" : due <= 0 ? "PAID" : "PARTIALLY_PAID",
      };
    });
const totalPurchase = detailOrders.reduce((s, o) => s + o.finalAmount, 0);
    const totalPaid = detailOrders.reduce((s, o) => s + o.paid, 0);
    const newTotalDue = detailOrders.reduce((s, o) => s + o.due, 0);

    res.status(201).json({
      message: "Payment recorded successfully",
      payments: createdPayments.map((p) => serializeOrderPayment(p)),
      customer: {
        customerName: updatedOrders[0].customerName,
        customerMobile: updatedOrders[0].customerMobile,
        totalOrders: updatedOrders.length,
        totalPurchase: Math.round(totalPurchase * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalDue: Math.round(newTotalDue * 100) / 100,
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
// TEMPORARY admin-only cleanup helper. This is NOT part of the order status /
// cancellation flow (which is intentionally left untouched). It permanently
// deletes an order and all of its dependent records so admins can clean up
// test data. It may be removed in a future release.
//
// Deletion is wrapped in a transaction and deletes child records first
// (OrderItem -> Bill -> Order) to satisfy the FK constraints. Any failure is
// surfaced as a clean error — never a Prisma/DB stack trace.
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
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1) Delete related order items first (OrderItem.order has no cascade).
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        // 2) Delete the related bill if one exists.
        if (existing.bill) {
          await tx.bill.deleteMany({ where: { orderId: id } });
        }
        // 3) Delete related payments (OrderPayment cascades on order delete,
        //    but we delete them explicitly for clarity and test determinism).
        await tx.orderPayment.deleteMany({ where: { orderId: id } });
        // 4) Finally delete the order itself.
        await tx.order.delete({ where: { id } });
      });
    } catch {
      // Never leak a raw Prisma/DB error to the frontend.
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
// Changes the order status. Cancelling an order restores the stock that was
// reserved when the order was placed (or re-decrements it when an order that
// was cancelled is re-activated). Stock changes are transactional so the
// inventory always stays in sync with order state.
router.patch(
  "/orders/:id/status",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = parseIntegerParam(req.params.id, "order id");
    const body = orderStatusSchema.parse(req.body);
    const existing = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) throw new HttpError(404, "Order not found");
    const wasCancelled = existing.status === "CANCELLED";
    const nowCancelled = body.status === "CANCELLED";
    const beforeProducts=await prisma.product.findMany({where:{id:{in:existing.items.map(i=>i.productId)}},select:{id:true,name:true,stock:true}});

    const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.order.update({
        where: { id },
        data: { status: body.status },
      });

      if (wasCancelled !== nowCancelled) {
        // Either cancelling (return stock) or re-activating (re-reserve).
        const delta = nowCancelled ? 1 : -1; // +1 restores, -1 re-decrements
        for (const item of existing.items) {
          const qty = Number(item.quantity);
          if (!qty || qty <= 0) continue;
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          if (!prod) continue;
          if (delta < 0 && Number(prod.stock) < qty) {
            throw new HttpError(
              400,
              `Only ${prod.stock} units of "${item.productName}" in stock. Cannot re-activate this order.`
            );
          }
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: delta * qty } },
          });
        }
      }

      return tx.order.findUniqueOrThrow({ where: { id } });
    });

    await writeAudit(req, {
      action: "ORDER_STATUS",
      entity: "Order",
      entityId: order.id,
      details: `${order.orderNumber} -> ${order.status}`,
    });
    if(wasCancelled&&!nowCancelled){const after=await prisma.product.findMany({where:{id:{in:beforeProducts.map(p=>p.id)}},select:{id:true,name:true,stock:true}});await notifyStockTransitions(after.map(p=>({productId:p.id,name:p.name,previous:Number(beforeProducts.find(x=>x.id===p.id)?.stock??p.stock),next:Number(p.stock)})),`ORDER_REACTIVATE:${order.id}:${order.updatedAt.toISOString()}`).catch(e=>console.error("[push] Reactivation stock notification failed",e instanceof Error?e.message:e))}
    res.json({ order: serializeOrder(order) });
  })
);

// POST /api/admin/orders/:id/payments
// Admin receives a pending payment from the customer for an existing order.
// A new OrderPayment record is created (history is NEVER deleted). The due
// amount is reduced automatically because it is always derived from the sum
// of payments vs the order's final payable amount.
router.post(
  "/orders/:id/payments",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = parseIntegerParam(req.params.id, "order id");
    const body = receivePaymentSchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { id },
      include: { bill: true, payments: true },
    });
    if (!order) throw new HttpError(404, "Order not found");

    const finalAmount = order.bill ? Number(order.bill.finalAmount) : Number(order.subtotal);
    const paidSoFar = order.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const due = Math.max(0, Math.round((finalAmount - paidSoFar) * 100) / 100);

    if (body.amount > due + 0.001) {
      throw new HttpError(
        400,
        `Payment of ₹${body.amount} exceeds the remaining due of ₹${due} for this order.`
      );
    }

const payment = await prisma.orderPayment.create({
      data: {
        orderId: id,
        amount: Math.round(body.amount * 100) / 100,
        paymentMode: body.paymentMode,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
        notes: body.notes?.trim() || null,
      },
    });

    await writeAudit(req, {
      action: "ORDER_PAYMENT",
      entity: "Order",
      entityId: id,
      details: `${order.orderNumber} received ${body.paymentMode} ₹${body.amount}`,
    });
    await paymentNotification(Number(req.admin?.sub),{amount:Number(payment.amount),mode:payment.paymentMode,orderId:order.id,orderNumber:order.orderNumber,customerName:order.customerName,key:`ORDER_PAYMENT:${payment.id}`}).catch(e=>console.error("[push] Order payment notification failed",e instanceof Error?e.message:e));

    const updated = await prisma.order.findUnique({
      where: { id },
      include: { items: true, bill: true, payments: true },
    });
    res.status(201).json({
      message: "Payment recorded successfully",
      payment: serializeOrderPayment(payment),
      order: serializeOrder(updated),
    });
  })
);

// PATCH /api/admin/orders/:id/edit
router.patch(
  "/orders/:id/edit",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = parseIntegerParam(req.params.id, "order id");
    const body = req.body as { items: { productId: number; quantity: number }[] };
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
      new Set([...order.items.map((i: { productId: number }) => i.productId), ...Array.from(incomingMap.keys())])
    );

    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    if (products.length !== productIds.length) throw new HttpError(400, "One or more products are no longer available.");

    const newItems = new Map<number, { product: any; quantity: number }>();
    for (const [pid, qty] of incomingMap.entries()) {
      const prod = products.find((p: { id: number }) => p.id === pid);
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
      const oldItem = order.items.find((it: { productId: number }) => it.productId === pid);
      const oldQty = oldItem ? Number(oldItem.quantity) : 0;
      const newQty = newItems.get(pid)?.quantity ?? 0;
      const delta = Math.round((newQty - oldQty) * 1000) / 1000;
      if (delta > 0) {
        const prod = products.find((p: { id: number }) => p.id === pid)!;
        if (prod.stock < delta) {
          throw new HttpError(400, `Only ${prod.stock} units in stock. Please reduce quantity.`);
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
      async (tx: Prisma.TransactionClient) => {
        for (const d of deltas) {
          if (d.delta === 0) continue;
          if (d.delta > 0) {
            const updated = await tx.product.updateMany({
              where: { id: d.productId, stock: { gte: d.delta } },
              data: { stock: { decrement: d.delta } },
            });
            if (updated.count === 0) {
              const prod = products.find((p: { id: number }) => p.id === d.productId)!;
              throw new HttpError(400, `Only ${prod.stock} units in stock. Please reduce quantity.`);
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
    const changed=await prisma.product.findMany({where:{id:{in:productIds}},select:{id:true,name:true,stock:true}});await notifyStockTransitions(changed.map(p=>({productId:p.id,name:p.name,previous:Number(products.find(x=>x.id===p.id)?.stock??p.stock),next:Number(p.stock)})),`ORDER_EDIT:${order.id}:${result.updatedAt.toISOString()}`).catch(e=>console.error("[push] Order edit stock notification failed",e instanceof Error?e.message:e));

    res.json({ order: serializeOrder(result) });
  })
);

export default router;
