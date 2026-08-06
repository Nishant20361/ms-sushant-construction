import { Router } from "express";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { parseIntegerParam } from "../../utils/request.js";
import { HttpError } from "../../utils/httpError.js";
import { billSchema } from "../../validators/index.js";
import { requireAdmin } from "../../middleware/auth.js";
import { writeAudit } from "../../middleware/audit.js";
import { serializeBill } from "../../utils/serializer.js";
import { buildBillText, buildBillHtml, buildBillPdf, BillData } from "../../utils/bill.js";
import { AuthenticatedRequest } from "../../types.js";

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

  const finalAmount = bill ? Number(bill.finalAmount) : Number(order.subtotal);
  const payments = order.payments ?? [];
  const cashPaid = payments
    .filter((p: any) => p.paymentMode === "CASH")
    .reduce((s: number, p: any) => s + Number(p.amount), 0);
  const onlinePaid = payments
    .filter((p: any) => p.paymentMode === "ONLINE")
    .reduce((s: number, p: any) => s + Number(p.amount), 0);
  const totalPaid = Math.round((cashPaid + onlinePaid) * 100) / 100;
  const due = Math.max(0, Math.round((finalAmount - totalPaid) * 100) / 100);
  const paymentStatus: "PAID" | "PARTIALLY_PAID" | "DUE" =
    totalPaid <= 0 ? "DUE" : due <= 0 ? "PAID" : "PARTIALLY_PAID";

  return {
    companyName: settings?.companyName || "M/S Sushant Construction",
    tagline: settings?.tagline || "Your trusted partner",
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerMobile: order.customerMobile,
    deliveryAddress: order.deliveryAddress || null,
    createdAt: order.createdAt,
    status: order.status,
    items: order.items.map((it: any) => ({
      productName: it.productName,
      quantity: it.quantity,
      unit: it.unit,
      price: Number(it.price),
      total: Number(it.total),
    })),
    subtotal: Number(order.subtotal),
    discount: bill ? Number(bill.discount) : 0,
    finalAmount,
    // Payment details
    cashPaid: Math.round(cashPaid * 100) / 100,
    onlinePaid: Math.round(onlinePaid * 100) / 100,
    totalPaid,
    due,
    paymentStatus,
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
// Create (or upsert) a bill for an order. If a bill already exists, the
// discount is updated. discount = 0 hides the discount line from the invoice.
router.post(
  "/orders/:id/bill",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = parseIntegerParam(req.params.id, "order id");
    const body = billSchema.parse(req.body);

    const order = await prisma.order.findUnique({ where: { id }, include: { items: true, bill: true } });
    if (!order) throw new HttpError(404, "Order not found");

    // Discount cannot exceed the order subtotal.
    if (body.discount > Number(order.subtotal)) {
      throw new HttpError(400, "Discount cannot be greater than the order subtotal.");
    }

    const discount = Math.round(body.discount * 100) / 100;
    const finalAmount = Math.round((Number(order.subtotal) - discount) * 100) / 100;

    const bill = await prisma.bill.upsert({
      where: { orderId: id },
      update: { discount, finalAmount },
      create: {
        orderId: id,
        subtotal: Number(order.subtotal),
        discount,
        finalAmount,
      },
    });

    await writeAudit(req, {
      action: "BILL_SAVE",
      entity: "Order",
      entityId: id,
      details: `${order.orderNumber} discount=${discount} final=${finalAmount}`,
    });

    res.status(201).json({ bill: serializeBill(bill) });
  })
);

// PUT /api/admin/orders/:id/bill
// Update the discount on an existing bill (admin can change anytime before final bill).
router.put(
  "/orders/:id/bill",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = parseIntegerParam(req.params.id, "order id");
    const body = billSchema.parse(req.body);

    const existing = await prisma.bill.findUnique({ where: { orderId: id } });
    if (!existing) throw new HttpError(404, "No bill exists for this order yet. Create one first.");

    if (body.discount > Number(existing.subtotal)) {
      throw new HttpError(400, "Discount cannot be greater than the order subtotal.");
    }

    const discount = Math.round(body.discount * 100) / 100;
    const finalAmount = Math.round((Number(existing.subtotal) - discount) * 100) / 100;

    const bill = await prisma.bill.update({
      where: { id: existing.id },
      data: { discount, finalAmount },
    });

    await writeAudit(req, {
      action: "BILL_UPDATE",
      entity: "Order",
      entityId: id,
      details: `discount=${discount} final=${finalAmount}`,
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

// GET /api/admin/orders/:id/bill/pdf
// Generates and returns a professional PDF invoice.
router.get(
  "/orders/:id/bill/pdf",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIntegerParam(req.params.id, "order id");
    const order = await loadOrderWithBill(id);
const pdf = await buildBillPdf(await toBillData(order, order.bill));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="bill-${order.orderNumber}.pdf"`
    );
    res.send(pdf);
  })
);

export default router;

