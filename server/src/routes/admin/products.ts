import { Router } from "express";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { parseIntegerParam } from "../../utils/request.js";
import { productSchema } from "../../validators/index.js";
import { requireAdmin } from "../../middleware/auth.js";
import { writeAudit } from "../../middleware/audit.js";
import { serializeProduct } from "../../utils/serializer.js";
import { HttpError } from "../../utils/httpError.js";
import { AuthenticatedRequest } from "../../types.js";

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

