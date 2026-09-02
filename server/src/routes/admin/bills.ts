import { Router } from "express";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { parseIntegerParam } from "../../utils/request.js";
import { HttpError } from "../../utils/httpError.js";
import { billSchema } from "../../validators/index.js";
import { requireAdmin } from "../../middleware/auth.js";
import { writeAudit } from "../../middleware/audit.js";
import { serializeBill } from "../../utils/serializer.js";
import { buildBillText, buildBillHtml, BillData } from "../../utils/bill.js";
import { AuthenticatedRequest } from "../../types.js";
import { computeOrderFinancials, roundCurrency, toPrismaDecimal } from "../../utils/financials.js";

const router = Router();

/** Load an order with items + bill + payments (404 if missing). */
async function loadOrderWithBill(id: number) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, bill: true, payments: true },
  });
  if (!order) throw new HttpError(404, "Order not found");
  return order;
}

/** Convert a prisma order + bill into BillData for formatting. */
async function toBillData(order: any, bill: any): Promise<BillData> {
  // Load business settings from the database
  const settings = await prisma.siteSetting.findFirst();
  const biz = (settings ?? {}) as any;

  const fin = computeOrderFinancials({
    subtotal: order.subtotal,
    bill: bill ?? order.bill,
    payments: order.payments,
  });

  // Check if there are linked payments allocated to previous dues from this order
  const linkedPayments = await prisma.orderPayment.findMany({
    where: {
      notes: { contains: `from order #${order.orderNumber}` },
    },
  });

  const linkedPreviousDuesPaid = roundCurrency(
    linkedPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  );

  const directExcess = Math.max(0, roundCurrency(fin.paidTotal - fin.finalAmount));
  const previousDuesPaid = roundCurrency(linkedPreviousDuesPaid + directExcess);
  const totalPaid = roundCurrency(fin.paidTotal + linkedPreviousDuesPaid);

  let cashPaid = fin.cashTotal;
  let onlinePaid = fin.onlineTotal;
  for (const lp of linkedPayments) {
    if (lp.paymentMode === "CASH") cashPaid = roundCurrency(cashPaid + Number(lp.amount));
    else if (lp.paymentMode === "ONLINE") onlinePaid = roundCurrency(onlinePaid + Number(lp.amount));
  }

  return {
    companyName: settings?.companyName || "M/S Sushant Construction",
    tagline: settings?.tagline || "Your trusted partner",
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerMobile: order.customerMobile,
    deliveryAddress: order.deliveryAddress || null,
    createdAt: order.createdAt,
    status: order.status,
    items: (order.items ?? []).map((it: any) => ({
      productName: it.productName,
      quantity: it.quantity,
      unit: it.unit,
      price: Number(it.price),
      total: Number(it.total),
    })),
    subtotal: fin.subtotal,
    discount: fin.discount,
    finalAmount: fin.finalAmount,
    // Payment details
    cashPaid,
    onlinePaid,
    totalPaid,
    due: fin.due,
    paymentStatus: fin.paymentStatus,
    previousDuesPaid,
    // Business invoice details from settings
    businessName: biz.businessName || "",
    businessAddress: biz.businessAddress || "",
    gstNumber: biz.gstNumber || "",
    businessMobile: biz.businessMobile || "",
    businessEmail: biz.businessEmail || "",
    businessLogoUrl: biz.businessLogoUrl || "",
  };
}

// GET /api/admin/orders/:id/bill
// Returns the existing bill for an order, or null if none exists yet.
router.get(
  "/orders/:id/bill",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIntegerParam(req.params.id, "order id");
    const order = await prisma.order.findUnique({
      where: { id },
      include: { bill: true },
    });
    if (!order) throw new HttpError(404, "Order not found");
    res.json({ bill: serializeBill(order.bill) });
  })
);

// POST /api/admin/orders/:id/bill
// Create (or upsert) a bill for an order.
router.post(
  "/orders/:id/bill",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = parseIntegerParam(req.params.id, "order id");
    const body = billSchema.parse(req.body);

    const bill = await prisma.$transaction(async (tx) => {
      // Lock the order row
      const [locked] = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE
      `;
      if (!locked) throw new HttpError(404, "Order not found");

      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true, bill: true, payments: true },
      });
      if (!order) throw new HttpError(404, "Order not found");

      const subtotal = roundCurrency(order.subtotal);
      const discount = roundCurrency(body.discount);

      // Discount cannot exceed order subtotal
      if (discount > subtotal) {
        throw new HttpError(400, "Discount cannot be greater than the order subtotal.");
      }

      const finalAmount = Math.max(0, roundCurrency(subtotal - discount));
      const fin = computeOrderFinancials(order);

      // Invariant: discount cannot reduce finalAmount below already paidTotal
      if (finalAmount < fin.paidTotal) {
        throw new HttpError(
          400,
          `Discount of ₹${discount.toFixed(2)} would reduce the final bill to ₹${finalAmount.toFixed(2)}, which is less than the ₹${fin.paidTotal.toFixed(2)} already paid.`
        );
      }

      const updatedBill = await tx.bill.upsert({
        where: { orderId: id },
        update: {
          discount: toPrismaDecimal(discount),
          finalAmount: toPrismaDecimal(finalAmount),
        },
        create: {
          orderId: id,
          subtotal: toPrismaDecimal(subtotal),
          discount: toPrismaDecimal(discount),
          finalAmount: toPrismaDecimal(finalAmount),
        },
      });

      return updatedBill;
    });

    await writeAudit(req, {
      action: "BILL_SAVE",
      entity: "Order",
      entityId: id,
      details: `discount=${roundCurrency(body.discount)} final=${roundCurrency(bill.finalAmount)}`,
    });

    res.status(201).json({ bill: serializeBill(bill) });
  })
);

// PUT /api/admin/orders/:id/bill
// Update the discount on an existing bill.
router.put(
  "/orders/:id/bill",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = parseIntegerParam(req.params.id, "order id");
    const body = billSchema.parse(req.body);

    const bill = await prisma.$transaction(async (tx) => {
      // Lock the order row
      const [locked] = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE
      `;
      if (!locked) throw new HttpError(404, "Order not found");

      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true, bill: true, payments: true },
      });
      if (!order) throw new HttpError(404, "Order not found");
      if (!order.bill) {
        throw new HttpError(404, "No bill exists for this order yet. Create one first.");
      }

      const subtotal = roundCurrency(order.bill.subtotal);
      const discount = roundCurrency(body.discount);

      if (discount > subtotal) {
        throw new HttpError(400, "Discount cannot be greater than the order subtotal.");
      }

      const finalAmount = Math.max(0, roundCurrency(subtotal - discount));
      const fin = computeOrderFinancials(order);

      // Invariant: discount cannot reduce finalAmount below already paidTotal
      if (finalAmount < fin.paidTotal) {
        throw new HttpError(
          400,
          `Discount of ₹${discount.toFixed(2)} would reduce the final bill to ₹${finalAmount.toFixed(2)}, which is less than the ₹${fin.paidTotal.toFixed(2)} already paid.`
        );
      }

      const updatedBill = await tx.bill.update({
        where: { id: order.bill.id },
        data: {
          discount: toPrismaDecimal(discount),
          finalAmount: toPrismaDecimal(finalAmount),
        },
      });

      return updatedBill;
    });

    await writeAudit(req, {
      action: "BILL_UPDATE",
      entity: "Order",
      entityId: id,
      details: `discount=${roundCurrency(body.discount)} final=${roundCurrency(bill.finalAmount)}`,
    });

    res.json({ bill: serializeBill(bill) });
  })
);

// GET /api/admin/orders/:id/bill/text
// Returns the WhatsApp-friendly bill text.
router.get(
  "/orders/:id/bill/text",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIntegerParam(req.params.id, "order id");
    const order = await loadOrderWithBill(id);
const text = buildBillText(await toBillData(order, order.bill));
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="bill-${order.orderNumber}.txt"`);
    res.send(text);
  })
);

// GET /api/admin/orders/:id/bill/html
// Returns a printable HTML invoice (for print / save-as-PDF in the browser).
router.get(
  "/orders/:id/bill/html",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIntegerParam(req.params.id, "order id");
    const order = await loadOrderWithBill(id);
const html = buildBillHtml(await toBillData(order, order.bill));
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  })
);

export default router;

