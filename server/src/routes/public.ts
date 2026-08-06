import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parseIntegerParam } from "../utils/request.js";
import { HttpError } from "../utils/httpError.js";
import { createOrderSchema, orderTrackSchema, orderTrackByMobileSchema } from "../validators/index.js";
import { generateOrderNumber } from "../utils/orderNumber.js";
import { normalizeIndianMobile } from "../utils/validatePhone.js";
import { serializeProduct, serializeCategory, serializeSettings, serializeOrderForTracking, serializeOrderListForTracking } from "../utils/serializer.js";
import { orderLimiter, trackLimiter } from "../middleware/rateLimit.js";
import { sendAdminNewOrderEmail } from "../utils/email.js";

const router = Router();

// GET /api/products?category=slug&search=term&page=1&limit=12
router.get(
  "/products",
  asyncHandler(async (req, res) => {
    const {
      category,
      search,
      page = "1",
      limit = "12",
    } = req.query as Record<string, string>;

    const where: any = { isActive: true };

    if (category) {
      where.category = {
        slug: category,
        isActive: true,
      };
    }

    if (search?.trim()) {
      where.name = {
        contains: search.trim(),
      };
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          images: {
            orderBy: { isPrimary: "desc" },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limitNum,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      products: products.map(serializeProduct),
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  })
);

// GET /api/products/:id
router.get(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const id = parseIntegerParam(req.params.id, "product id");
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

const order = await prisma.$transaction(
      async (tx) => {
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
          // Unit-based validation: bag and piece must be whole numbers.
          const unit = (product.unit || "").toLowerCase();
          const requiresInteger = unit === "bag" || unit === "piece";
          if (requiresInteger && !Number.isInteger(li.quantity)) {
            throw new HttpError(400, `Quantity for "${product.name}" must be a whole number (${product.unit}).`);
          }
          const available = Number(product.stock);
          if (available < li.quantity) {
            throw new HttpError(400, `Only ${available} units in stock. Please reduce quantity.`);
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

        // Validate payment amounts
        const cashAmount = Math.round((Number(body.cashAmount) || 0) * 100) / 100;
        const onlineAmount = Math.round((Number(body.onlineAmount) || 0) * 100) / 100;
        if (cashAmount + onlineAmount > subtotal) {
          throw new HttpError(
            400,
            `Payment amount (${cashAmount + onlineAmount}) cannot exceed the order total (${subtotal}).`
          );
        }

        // Build payment records (one per non-zero mode). Only store payments
        // that were actually made; a fully-due order simply has no records.
        const paymentRecords = [];
        if (cashAmount > 0) {
          paymentRecords.push({ amount: cashAmount, paymentMode: "CASH" });
        }
        if (onlineAmount > 0) {
          paymentRecords.push({ amount: onlineAmount, paymentMode: "ONLINE" });
        }

        return tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            customerName: body.customerName,
            customerMobile: mobile,
            deliveryAddress: body.deliveryAddress || null,
            notes: body.notes || null,
            subtotal,
            items: { create: orderItems },
            payments: { create: paymentRecords },
          },
          include: { items: true, payments: true },
        });
      },
      {
        // Order placement does several sequential DB writes (fetch products,
        // decrement stock per line item, re-verify, create order). The default
        // interactive-transaction timeout of 5000ms can be exceeded under load
        // or when the DB is slow, causing "Transaction already closed" errors.
        // Raise it to a safe value (matches the admin edit-order transaction).
        maxWait: 10000,
        timeout: 30000,
      }
    );

    // ----- Fire-and-forget: notify the admin (email + in-app bell) -----
    // The order is already committed; email/notification failures must never
    // fail the request or lose the order.
    (async () => {
      try {
        // Always use the admin email stored in the database (fully dynamic).
        // Never fall back to an environment variable — the DB is the source of truth.
        const admin = await prisma.admin.findFirst({
          where: { isActive: true },
          orderBy: { id: "asc" },
        });
        const to = admin?.email || "";

        const orderItems = order.items ?? [];
        await sendAdminNewOrderEmail(to, {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerMobile: order.customerMobile,
          deliveryAddress: order.deliveryAddress,
          subtotal: order.subtotal,
          status: order.status,
          createdAt: order.createdAt,
          items: orderItems.map((it) => ({
            productName: it.productName,
            quantity: it.quantity,
            price: Number(it.price),
            total: Number(it.total),
            unit: it.unit,
          })),
        });

        if (admin) {
          await prisma.notification.create({
            data: {
              adminId: admin.id,
              orderId: order.id,
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              status: order.status,
            },
          });
        }
      } catch (err) {
        // Never crash the server because admin notification failed.
        console.error("[order] Admin notification failed:", err);
      }
    })();

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

// GET /api/orders/track?orderNumber=&customerMobile=
// Public order tracking. Returns only the customer's own order details.
router.get(
  "/orders/track",
  trackLimiter,
  asyncHandler(async (req, res) => {
    const parsed = orderTrackSchema.parse({
      orderNumber: req.query.orderNumber ?? "",
      customerMobile: req.query.customerMobile ?? "",
    });
    const mobile = normalizeIndianMobile(parsed.customerMobile);
    if (!mobile) throw new HttpError(400, "Invalid mobile number");

    const order = await prisma.order.findUnique({
      where: { orderNumber: parsed.orderNumber },
      include: { items: true, bill: true },
    });
    if (!order) throw new HttpError(404, "Order not found");

    // Verify the mobile number matches the order (privacy).
    if (order.customerMobile !== mobile) {
      throw new HttpError(404, "Order not found");
    }

    res.json({ order: serializeOrderForTracking(order) });
  })
);

// GET /api/orders/track-by-mobile?customerMobile=
// Public order tracking using ONLY the mobile number. Returns a safe list of
// all orders linked to that mobile so the customer can pick the right one.
router.get(
  "/orders/track-by-mobile",
  trackLimiter,
  asyncHandler(async (req, res) => {
    const parsed = orderTrackByMobileSchema.parse({
      customerMobile: req.query.customerMobile ?? "",
    });
    const mobile = normalizeIndianMobile(parsed.customerMobile);
    if (!mobile) throw new HttpError(400, "Invalid mobile number");

    const orders = await prisma.order.findMany({
      where: { customerMobile: mobile },
      include: { items: true, bill: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({ orders: orders.map(serializeOrderListForTracking) });
  })
);

export default router;

