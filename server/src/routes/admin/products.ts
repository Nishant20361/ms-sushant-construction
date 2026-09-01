import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { parseIntegerParam } from "../../utils/request.js";
import { productSchema } from "../../validators/index.js";
import { requireAdmin } from "../../middleware/auth.js";
import { writeAudit } from "../../middleware/audit.js";
import { serializeProduct } from "../../utils/serializer.js";
import { HttpError } from "../../utils/httpError.js";
import { AuthenticatedRequest } from "../../types.js";
import { notifyStockTransitions } from "../../services/push.service.js";

const stockAdjustmentSchema = z
  .object({
    action: z.enum(["ADD", "SET", "DEDUCT"]),
    quantity: z.number().positive(),
    reason: z.string().max(200).optional(),
    purchaseRate: z.number().nonnegative().optional(),
    supplier: z.string().max(200).optional(),
    note: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.action === "DEDUCT") {
        return typeof data.reason === "string" && data.reason.trim().length > 0;
      }
      return true;
    },
    { message: "Reason is required for manual stock reduction (DEDUCT).", path: ["reason"] }
  );

/**
 * Round to a fixed number of decimal places.
 *
 * A naive `Math.round(n * factor) / factor` can produce artifacts such as
 * `Math.round(212.49999999999997 * 100)` -> `21249` -> `212.49` instead of
 * `212.50`. Adding `Number.EPSILON` before rounding absorbs tiny binary
 * floating-point noise so construction prices like `85 × 2.5 = ₹212.50`
 * display correctly.
 */
function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function normalizeCurrency(value: number) {
  return roundTo(value, 2);
}

function normalizeStock(value: number) {
  return roundTo(value, 3);
}

const router = Router();

// GET /api/admin/products?search=&categoryId=&active=&page=&limit=
router.get(
  "/products",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { search, categoryId, active, page = "1", limit = "20" } = req.query as Record<string, string>;
    const where: any = {};
    if (search) where.name = { contains: search, mode: "insensitive" };
    if (categoryId) where.categoryId = Number(categoryId);
    if (active === "true") where.isActive = true;
    if (active === "false") where.isActive = false;

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, images: { orderBy: { isPrimary: "desc" } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.product.count({ where }),
    ]);
    res.json({
      products: products.map(serializeProduct),
      total,
      page: Number(page),
      pages: Math.max(1, Math.ceil(total / Number(limit))),
    });
  })
);

// GET /api/admin/products/:id
router.get(
  "/products/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIntegerParam(req.params.id, "product id");
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, images: { orderBy: { isPrimary: "desc" } } },
    });
    if (!product) throw new HttpError(404, "Product not found");
    res.json({ product: serializeProduct(product) });
  })
);

// POST /api/admin/products
router.post(
  "/products",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = productSchema.parse(req.body);
    const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
    if (!category) throw new HttpError(400, "Category not found");

    const price = normalizeCurrency(body.price);
    const mrp = normalizeCurrency(body.mrp);
    const stock = normalizeStock(body.stock);

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: body.name,
          description: body.description || null,
          unit: body.unit,
          price,
          mrp,
          stock,
          isActive: body.isActive,
          categoryId: body.categoryId,
        },
        include: { category: true, images: true },
      });
      if (body.imageUrl) {
        await tx.productImage.create({
          data: { productId: created.id, url: body.imageUrl, isPrimary: true },
        });
      }
      return tx.product.findUniqueOrThrow({
        where: { id: created.id },
        include: { category: true, images: true },
      });
    });

    await writeAudit(req, {
      action: "PRODUCT_CREATE",
      entity: "Product",
      entityId: product.id,
      details: product.name,
    });
    res.status(201).json({ product: serializeProduct(product) });
  })
);

// PUT /api/admin/products/:id
router.put(
  "/products/:id",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = parseIntegerParam(req.params.id, "product id");
    const body = productSchema.parse(req.body);
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Product not found");

    const price = normalizeCurrency(body.price);
    const mrp = normalizeCurrency(body.mrp);
    const stock = normalizeStock(body.stock);

    const product = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name: body.name,
          description: body.description || null,
          unit: body.unit,
          price,
          mrp,
          stock,
          isActive: body.isActive,
          categoryId: body.categoryId,
        },
      });
      // Manage primary image
      if (body.imageUrl) {
        const primary = await tx.productImage.findFirst({
          where: { productId: id, isPrimary: true },
        });
        if (primary) {
          await tx.productImage.update({ where: { id: primary.id }, data: { url: body.imageUrl } });
        } else {
          await tx.productImage.create({
            data: { productId: id, url: body.imageUrl, isPrimary: true },
          });
        }
      } else {
        // Admin cleared the image in the edit form -> remove it so the
        // frontend reflects the latest DB value (no stale image remains).
        await tx.productImage.deleteMany({ where: { productId: id } });
      }
      return tx.product.findUniqueOrThrow({
        where: { id },
        include: { category: true, images: { orderBy: { isPrimary: "desc" } } },
      });
    });

    await writeAudit(req, {
      action: "PRODUCT_UPDATE",
      entity: "Product",
      entityId: product.id,
      details: product.name,
    });
    await notifyStockTransitions([{productId:product.id,name:product.name,previous:Number(existing.stock),next:Number(product.stock)}],`PRODUCT_UPDATE:${product.id}:${product.updatedAt.toISOString()}`).catch(e=>console.error("[push] Product stock notification failed",e instanceof Error?e.message:e));
    res.json({ product: serializeProduct(product) });
  })
);

// PATCH /api/admin/products/:id/toggle
router.patch(
  "/products/:id/toggle",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = parseIntegerParam(req.params.id, "product id");
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new HttpError(404, "Product not found");
    const updated = await prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive },
    });
    await writeAudit(req, {
      action: "PRODUCT_TOGGLE",
      entity: "Product",
      entityId: updated.id,
      details: `isActive=${updated.isActive}`,
    });
    res.json({ product: serializeProduct(updated) });
  })
);

// PATCH /api/admin/products/:id/stock
// Quickly add (+), set, or deduct stock with auto audit logging and alerts.
router.patch(
  "/products/:id/stock",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = parseIntegerParam(req.params.id, "product id");
    const body = stockAdjustmentSchema.parse(req.body);
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { category: true, images: { orderBy: { isPrimary: "desc" } } },
    });
    if (!existing) throw new HttpError(404, "Product not found");

    const previousStock = Number(existing.stock);
    let nextStock = previousStock;

    if (body.action === "ADD") {
      nextStock = roundTo(previousStock + body.quantity, 3);
    } else if (body.action === "SET") {
      nextStock = roundTo(body.quantity, 3);
    } else if (body.action === "DEDUCT") {
      if (previousStock < body.quantity) {
        throw new HttpError(
          400,
          `Cannot deduct ${body.quantity} ${existing.unit}. Current stock is only ${previousStock} ${existing.unit}.`
        );
      }
      nextStock = roundTo(previousStock - body.quantity, 3);
    }

    if (nextStock < 0) {
      throw new HttpError(400, "Stock cannot be negative.");
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { stock: nextStock },
      include: { category: true, images: { orderBy: { isPrimary: "desc" } } },
    });

    const extraParts = [];
    if (body.reason) extraParts.push(`Reason: ${body.reason}`);
    if (body.purchaseRate !== undefined) extraParts.push(`Rate: ₹${body.purchaseRate}`);
    if (body.supplier) extraParts.push(`Supplier: ${body.supplier}`);
    if (body.note) extraParts.push(`Note: ${body.note}`);
    const extraText = extraParts.length > 0 ? ` (${extraParts.join(" | ")})` : "";

    await writeAudit(req, {
      action: "STOCK_ADJUSTMENT",
      entity: "Product",
      entityId: updated.id,
      details: `${body.action} ${body.quantity} (Stock: ${previousStock} -> ${nextStock})${extraText}`,
    });

    await notifyStockTransitions(
      [{ productId: updated.id, name: updated.name, previous: previousStock, next: nextStock }],
      `STOCK_ADJUST:${updated.id}:${updated.updatedAt.toISOString()}`
    ).catch((e) => console.error("[push] Stock notification failed", e instanceof Error ? e.message : e));

    res.json({ product: serializeProduct(updated) });
  })
);

// GET /api/admin/products/:id/stock-history (and aliases)
router.get(
  ["/products/:id/stock-history", "/products/:id/history", "/product/:id/stock-history"],
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIntegerParam(req.params.id, "product id");
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) throw new HttpError(404, "Product not found");

    // 1. Fetch manual stock adjustments from AdminAuditLog
    const auditLogs = await prisma.adminAuditLog.findMany({
      where: {
        entity: "Product",
        entityId: String(id),
        action: "STOCK_ADJUSTMENT",
      },
      include: { admin: { select: { id: true, username: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // 2. Fetch order items for this product (from non-cancelled orders)
    const orderItems = await prisma.orderItem.findMany({
      where: {
        OR: [
          { productId: id },
          { productName: product.name },
        ],
        order: { status: { not: "CANCELLED" } },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerMobile: true,
            source: true,
            status: true,
            createdAt: true,
          },
        },
      },
      take: 50,
    });

    // Parse and normalize into a single chronological timeline
    const history: Array<{
      id: string;
      type: "ADD" | "REMOVE" | "SET" | "ORDER";
      quantity: number;
      oldStock?: number;
      newStock?: number;
      reason?: string;
      note?: string;
      supplier?: string;
      purchaseRate?: number;
      orderNumber?: string;
      customerName?: string;
      customerMobile?: string;
      source?: string;
      adminUsername?: string;
      createdAt: string;
    }> = [];

    for (const log of auditLogs) {
      const text = log.details || "";
      const isAdd = text.startsWith("ADD");
      const isDeduct = text.startsWith("DEDUCT");
      const isSet = text.startsWith("SET");
      const type = isAdd ? "ADD" : isDeduct ? "REMOVE" : isSet ? "SET" : "ADD";

      const qtyMatch = text.match(/^(ADD|DEDUCT|SET)\s+([\d.]+)/);
      const qty = qtyMatch ? parseFloat(qtyMatch[2]) : 0;

      const transitionMatch = text.match(/Stock:\s*([\d.]+)\s*->\s*([\d.]+)/);
      const oldStock = transitionMatch ? parseFloat(transitionMatch[1]) : undefined;
      const newStock = transitionMatch ? parseFloat(transitionMatch[2]) : undefined;

      const reasonMatch = text.match(/Reason:\s*([^|)]+)/);
      const rateMatch = text.match(/Rate:\s*₹?([\d.]+)/);
      const supplierMatch = text.match(/Supplier:\s*([^|)]+)/);
      const noteMatch = text.match(/Note:\s*([^|)]+)/);

      history.push({
        id: `audit-${log.id}`,
        type,
        quantity: qty,
        oldStock,
        newStock,
        reason: reasonMatch ? reasonMatch[1].trim() : "स्टॉक समायोजन (Stock Adjustment)",
        purchaseRate: rateMatch ? parseFloat(rateMatch[1]) : undefined,
        supplier: supplierMatch ? supplierMatch[1].trim() : undefined,
        note: noteMatch ? noteMatch[1].trim() : undefined,
        adminUsername: log.admin?.username,
        createdAt: log.createdAt.toISOString(),
      });
    }

    for (const item of orderItems) {
      history.push({
        id: `order-item-${item.id}`,
        type: "ORDER",
        quantity: Number(item.quantity),
        orderNumber: item.order.orderNumber,
        customerName: item.order.customerName,
        customerMobile: item.order.customerMobile,
        source: item.order.source,
        reason: `ऑर्डर #${item.order.orderNumber}`,
        note: `ग्राहक: ${item.order.customerName || "Customer"} (${item.order.customerMobile || ""})`,
        createdAt: item.order.createdAt.toISOString(),
      });
    }

    // Always ensure product creation / initial stock is present as foundational entry
    const hasInitialEntry = history.some(
      (h) => h.id.startsWith("audit-") && h.oldStock === 0
    );
    if (!hasInitialEntry) {
      history.push({
        id: `product-create-${product.id}`,
        type: "ADD",
        quantity: Number(product.stock),
        oldStock: 0,
        newStock: Number(product.stock),
        reason: "उत्पाद निर्माण / प्रारंभिक स्टॉक (Initial Product Stock)",
        note: "Catalog initial stock entry",
        createdAt: product.createdAt.toISOString(),
      });
    }

    // Sort descending by date (newest first) and limit to last 20 entries
    history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const last20 = history.slice(0, 20);

    res.json({
      productId: id,
      productName: product.name,
      unit: product.unit,
      currentStock: product.stock,
      history: last20,
    });
  })
);

// DELETE /api/admin/products/:id
router.delete(
  "/products/:id",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = parseIntegerParam(req.params.id, "product id");
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { orderItems: true } } },
    });
    if (!existing) throw new HttpError(404, "Product not found");

    // A product that is referenced by existing orders must not be deleted,
    // otherwise order history would be broken. Return a clean, human-readable
    // error instead of leaking a Prisma foreign-key error to the client.
    if (existing._count.orderItems > 0) {
      throw new HttpError(400, "Unable to delete product");
    }

    try {
      await prisma.$transaction([
        prisma.productImage.deleteMany({ where: { productId: id } }),
        prisma.product.delete({ where: { id } }),
      ]);
    } catch {
      // Never surface a raw Prisma error to the frontend.
      throw new HttpError(400, "Unable to delete product");
    }

    await writeAudit(req, {
      action: "PRODUCT_DELETE",
      entity: "Product",
      entityId: id,
      details: existing.name,
    });
    res.json({ message: "Product deleted" });
  })
);

export default router;
