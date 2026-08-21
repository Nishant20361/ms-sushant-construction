import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parseIntegerParam } from "../utils/request.js";
import { HttpError } from "../utils/httpError.js";
import { createOrderSchema, orderTrackSchema, orderTrackByMobileSchema, publicProductQuerySchema } from "../validators/index.js";
import { generateOrderNumber } from "../utils/orderNumber.js";
import { normalizeIndianMobile } from "../utils/validatePhone.js";
import { serializeProduct, serializeCategory, serializeSettings, serializeOrderForTracking, serializeOrderListForTracking } from "../utils/serializer.js";
import { orderLimiter, trackLimiter } from "../middleware/rateLimit.js";
import { sendOrderNotificationEmail } from "../services/email.service.js";
import { config } from "../config.js";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { createAdminNotification, notifyStockTransitions } from "../services/push.service.js";
import { quantityMatchesUnit } from "../utils/quantity.js";

const router = Router();

function getValidOrderNotificationEmail(adminEmail?: string | null): string {
  const configuredEmail = config.smtp.user || process.env.EMAIL_USER || process.env.ADMIN_EMAIL || "";

  if (adminEmail && adminEmail.trim()) {
    const emailLower = adminEmail.trim().toLowerCase();
    // Ignore dummy placeholder test domains
    if (!emailLower.endsWith("@example.com") && !emailLower.endsWith("@test.com")) {
      return emailLower;
    }
  }

  return configuredEmail ? configuredEmail.trim().toLowerCase() : "";
}

// GET /api/products?category=slug&search=term&page=1&limit=12
router.get(
  "/products",
  asyncHandler(async (req, res) => {
    const { category, search, page: pageNum, limit: limitNum, sort, inStock } = publicProductQuerySchema.parse(req.query);

    const where: any = { isActive: true };

    if (category) {
      where.category = {
        slug: category,
        isActive: true,
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { name: { contains: search, mode: "insensitive" }, isActive: true } },
      ];
    }

    if (inStock === true) where.stock = { gt: 0 };

    const orderByBySort = {
      newest: { createdAt: "desc" },
      price_asc: { price: "asc" },
      price_desc: { price: "desc" },
      name_asc: { name: "asc" },
      name_desc: { name: "desc" },
    } as const;

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
        orderBy: orderByBySort[sort],
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

    const rawIdempotencyKey = req.get("Idempotency-Key")?.trim();
    if (rawIdempotencyKey && !/^[A-Za-z0-9._:-]{8,128}$/.test(rawIdempotencyKey)) {
      throw new HttpError(400, "Invalid order request identifier");
    }

    // Normalize line items (dedupe by productId, sum quantities).
    const map = new Map<number, number>();
    for (const it of body.items) {
      map.set(it.productId, (map.get(it.productId) ?? 0) + it.quantity);
    }
    const lineItems = Array.from(map.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
    })).sort((a, b) => a.productId - b.productId);

    const requestHash = rawIdempotencyKey ? createHash("sha256").update(JSON.stringify({
      customerName: body.customerName,
      customerMobile: mobile,
      deliveryAddress: body.deliveryAddress,
      notes: body.notes,
      items: lineItems,
    })).digest("hex") : undefined;

    const existing = rawIdempotencyKey ? await prisma.order.findUnique({
      where: { clientRequestId: rawIdempotencyKey },
      include: { items: true },
    }) : null;
    if (existing && existing.clientRequestHash !== requestHash) {
      throw new HttpError(409, "This order attempt no longer matches your cart. Please start a new attempt.");
    }

    let replayed = Boolean(existing);
    let order = existing;
    if (!order) try {
      order = await prisma.$transaction(
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
          if (!quantityMatchesUnit(li.quantity, product.unit)) {
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

        // Atomically decrement each stock row. A zero affected-row count means
        // another checkout consumed the stock after the availability check.
        for (const li of lineItems) {
          const update = await tx.product.updateMany({
            where: { id: li.productId, stock: { gte: li.quantity } },
            data: { stock: { decrement: li.quantity } },
          });
          if (update.count !== 1) {
            throw new HttpError(409, "Sorry, stock changed while placing the order. Please retry.");
          }
        }

        subtotal = Math.round(subtotal * 100) / 100;

        return tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            customerName: body.customerName,
            customerMobile: mobile,
            deliveryAddress: body.deliveryAddress || null,
            notes: body.notes || null,
            subtotal,
            clientRequestId: rawIdempotencyKey,
            clientRequestHash: requestHash,
            items: { create: orderItems },
          },
          include: { items: true },
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
    } catch (error) {
      if (!(rawIdempotencyKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      const concurrent = await prisma.order.findUnique({ where: { clientRequestId: rawIdempotencyKey }, include: { items: true } });
      if (!concurrent || concurrent.clientRequestHash !== requestHash) throw new HttpError(409, "This order attempt could not be safely confirmed.");
      order = concurrent;
      replayed = true;
    }

    if (!order) throw new HttpError(500, "Order could not be confirmed");

    if (!replayed) {
      const affected=await prisma.product.findMany({where:{id:{in:order.items.map(i=>i.productId)}},select:{id:true,name:true,stock:true}});
      const qty=new Map(order.items.map(i=>[i.productId,Number(i.quantity)]));
      await notifyStockTransitions(affected.map(p=>({productId:p.id,name:p.name,next:Number(p.stock),previous:Number(p.stock)+(qty.get(p.id)??0)})),`PUBLIC_ORDER:${order.id}`).catch(e=>console.error("[push] Order stock notification failed",e instanceof Error?e.message:e));
    }

    // ----- Order Notification (email + in-app bell) -----
    let finalRecipient = "";

    if (!replayed) try {
      const admin = await prisma.admin.findFirst({
        where: { isActive: true },
        orderBy: { id: "asc" },
      });

      finalRecipient = getValidOrderNotificationEmail(admin?.email);
      if (finalRecipient) {
        const orderItems = order.items ?? [];
        const sent = await sendOrderNotificationEmail(finalRecipient, {
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

        if (!sent) console.warn("[order] Notification email was not sent");
      }

      if (admin) {
        await createAdminNotification({adminId:admin.id,type:"NEW_ORDER",title:"New order received",message:`Order ${order.orderNumber} · ₹${Number(order.subtotal).toFixed(2)}`,orderId:order.id,orderNumber:order.orderNumber,customerName:order.customerName,metadata:{status:order.status},dedupeKey:`NEW_ORDER:${order.id}`});
      }
    } catch (err: unknown) {
      console.error("[order] Admin notification error:", err);
    }

    res.status(replayed ? 200 : 201).json({
      message: replayed ? "Order already placed" : "Order placed successfully",
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
      select: {
        orderNumber: true,
        status: true,
        createdAt: true,
        subtotal: true,
        items: { select: { productName: true, quantity: true, unit: true } },
        bill: { select: { finalAmount: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ orders: orders.map(serializeOrderListForTracking) });
  })
);

export default router;
