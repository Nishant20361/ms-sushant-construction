import { Router } from "express";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";
import { productSchema } from "../../validators/index.js";
import { requireAdmin } from "../../middleware/auth.js";
import { writeAudit } from "../../middleware/audit.js";
import { serializeProduct } from "../../utils/serializer.js";
import { AuthenticatedRequest } from "../../types.js";

const router = Router();

// GET /api/admin/products?search=&categoryId=&active=&page=&limit=
router.get(
  "/products",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { search, categoryId, active, page = "1", limit = "20" } = req.query as Record<string, string>;
    const where: any = {};
    if (search) where.name = { contains: search };
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
    const id = Number(req.params.id);
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

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: body.name,
          description: body.description || null,
          unit: body.unit,
          price: body.price,
          mrp: body.mrp,
          stock: body.stock,
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
    const id = Number(req.params.id);
    const body = productSchema.parse(req.body);
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Product not found");

    const product = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name: body.name,
          description: body.description || null,
          unit: body.unit,
          price: body.price,
          mrp: body.mrp,
          stock: body.stock,
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
    const id = Number(req.params.id);
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
    const id = Number(req.params.id);
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Product not found");
    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: id } }),
      prisma.orderItem.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);
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

