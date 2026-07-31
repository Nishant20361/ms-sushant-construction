import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { createOrderSchema } from "../validators/index.js";
import { generateOrderNumber } from "../utils/orderNumber.js";
import { normalizeIndianMobile } from "../utils/validatePhone.js";
import { serializeProduct, serializeCategory, serializeSettings } from "../utils/serializer.js";
import { orderLimiter } from "../middleware/rateLimit.js";

const router = Router();

// GET /api/products?category=slug&search=term&active=1
router.get(
  "/products",
  asyncHandler(async (req, res) => {
    const { category, search } = req.query;
    const where: any = { isActive: true };
    if (typeof category === "string" && category.length) {
      where.category = { slug: category, isActive: true };
    }
    if (typeof search === "string" && search.trim()) {
      where.name = { contains: search.trim() };
    }
    const products = await prisma.product.findMany({
      where,
      include: { category: true, images: { orderBy: { isPrimary: "desc" } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ products: products.map(serializeProduct) });
  })
);

// GET /api/products/:id
router.get(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Invalid product id");
    const product = await prisma.product.findFirst({
      where: { id, isActive: true },
      include: { category: true, images: { orderBy: { isPrimary: "desc" } } },
    });
    if (!product) throw new HttpError(404, "Product not found");
    res.json({ product: serializeProduct(product) });
  })
);

// GET /api/categories
router.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: { where: { isActive: true } } } } },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
    res.json({ categories: categories.map(serializeCategory) });
  })
);

// GET /api/settings/public
router.get(
  "/settings/public",
  asyncHandler(async (_req, res) => {
    const settings = await prisma.siteSetting.findFirst();
    res.json({ settings: serializeSettings(settings) });
  })
);

// POST /api/orders
// Browser sends ONLY productIds + quantities. Server verifies everything.
router.post(
  "/orders",
  orderLimiter,
  asyncHandler(async (req, res) => {
    const body = createOrderSchema.parse(req.body);
    const mobile = normalizeIndianMobile(body.customerMobile);
    if (!mobile) throw new HttpError(400, "Invalid mobile number");

    // Normalize line items (dedupe by productId, sum quantities).
    const map = new Map<number, number>();
    for (const it of body.items) {
      map.set(it.productId, (map.get(it.productId) ?? 0) + it.quantity);
    }
    const lineItems = Array.from(map.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));

    const order = await prisma.$transaction(async (tx) => {
      const productIds = lineItems.map((l) => l.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: { category: true },
      });

      if (products.length !== productIds.length) {
        throw new HttpError(400, "One or more products are no longer available.");
      }

      let subtotal = 0;
      const orderItems = lineItems.map((li) => {
        const product = products.find((p) => p.id === li.productId);
        if (!product) throw new HttpError(400, "Invalid product in order.");
        if (!product.isActive) throw new HttpError(400, `"${product.name}" is not available.`);
        if (product.stock < li.quantity) {
          throw new HttpError(
            400,
            `Only ${product.stock} unit(s) of "${product.name}" are in stock.`
          );
        }
        const price = Number(product.price);
        const total = Math.round(price * li.quantity * 100) / 100;
        subtotal += total;
        return {
          productId: product.id,
          productName: product.name,
          unit: product.unit,
          price,
          quantity: li.quantity,
          total,
        };
      });

      // Lock stock to prevent overselling.
      for (const li of lineItems) {
        await tx.product.updateMany({
          where: { id: li.productId, stock: { gte: li.quantity } },
          data: { stock: { decrement: li.quantity } },
        });
      }
      // Re-verify after decrement (in case of race).
      const after = await tx.product.findMany({ where: { id: { in: productIds } } });
      const soldOut = after.filter((p) => p.stock < 0);
      if (soldOut.length) {
        throw new HttpError(409, "Sorry, stock changed while placing the order. Please retry.");
      }

      subtotal = Math.round(subtotal * 100) / 100;

      return tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          customerName: body.customerName,
          customerMobile: mobile,
          deliveryAddress: body.deliveryAddress,
          notes: body.notes || null,
          subtotal,
          items: { create: orderItems },
        },
        include: { items: true },
      });
    });

    res.status(201).json({
      message: "Order placed successfully",
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        subtotal: order.subtotal,
        status: order.status,
        createdAt: order.createdAt,
      },
    });
  })
);

export default router;

