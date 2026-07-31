import { Router } from "express";
import { prisma } from "../../db.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";
import { categorySchema } from "../../validators/index.js";
import { requireAdmin } from "../../middleware/auth.js";
import { writeAudit } from "../../middleware/audit.js";
import { serializeCategory } from "../../utils/serializer.js";
import { slugify } from "../../utils/slug.js";
import { AuthenticatedRequest } from "../../types.js";

const router = Router();

async function ensureUniqueSlug(slug: string, excludeId?: number): Promise<string> {
  const exists = await prisma.category.findFirst({
    where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
  });
  if (exists) throw new HttpError(409, "Category slug already exists");
  return slug;
}

// GET /api/admin/categories
router.get(
  "/categories",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
    res.json({ categories: categories.map(serializeCategory) });
  })
);

// POST /api/admin/categories
router.post(
  "/categories",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = categorySchema.parse(req.body);
    const slug = body.slug?.trim() ? slugify(body.slug) : slugify(body.name);
    if (!slug) throw new HttpError(400, "Invalid category slug");
    await ensureUniqueSlug(slug);

    const category = await prisma.category.create({
      data: {
        name: body.name,
        slug,
        displayOrder: body.displayOrder,
        isActive: body.isActive,
      },
    });
    await writeAudit(req, {
      action: "CATEGORY_CREATE",
      entity: "Category",
      entityId: category.id,
      details: category.name,
    });
    res.status(201).json({ category: serializeCategory(category) });
  })
);

// PUT /api/admin/categories/:id
router.put(
  "/categories/:id",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const body = categorySchema.parse(req.body);
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Category not found");
    const slug = body.slug?.trim() ? slugify(body.slug) : slugify(body.name);
    if (!slug) throw new HttpError(400, "Invalid category slug");
    await ensureUniqueSlug(slug, id);

    const category = await prisma.category.update({
      where: { id },
      data: { name: body.name, slug, displayOrder: body.displayOrder, isActive: body.isActive },
    });
    await writeAudit(req, {
      action: "CATEGORY_UPDATE",
      entity: "Category",
      entityId: category.id,
      details: category.name,
    });
    res.json({ category: serializeCategory(category) });
  })
);

// DELETE /api/admin/categories/:id (deactivate rather than hard-delete if it has products)
router.delete(
  "/categories/:id",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Category not found");
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      const category = await prisma.category.update({ where: { id }, data: { isActive: false } });
      await writeAudit(req, {
        action: "CATEGORY_DEACTIVATE",
        entity: "Category",
        entityId: id,
        details: `${existing.name} (${productCount} products)`,
      });
      res.json({ message: "Category deactivated (it has products)", category: serializeCategory(category) });
      return;
    }
    await prisma.category.delete({ where: { id } });
    await writeAudit(req, {
      action: "CATEGORY_DELETE",
      entity: "Category",
      entityId: id,
      details: existing.name,
    });
    res.json({ message: "Category deleted" });
  })
);

export default router;

