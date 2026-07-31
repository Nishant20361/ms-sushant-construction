/**
 * Serializers keep money/stock values as plain JSON numbers and NEVER
 * leak internal fields (e.g. passwordHash) to clients.
 */

type DecimalLike = { toString(): string } | number | string | null;

function toNumber(v: DecimalLike): number {
  if (v == null) return 0;
  return Number(v);
}

export function serializeProduct(p: any) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    unit: p.unit,
    price: toNumber(p.price),
    mrp: toNumber(p.mrp),
    stock: p.stock,
    isActive: p.isActive,
    categoryId: p.categoryId,
    category: p.category
      ? { id: p.category.id, name: p.category.name, slug: p.category.slug }
      : null,
    imageUrl: p.images?.[0]?.url ?? null,
    images: (p.images ?? []).map((img: any) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      isPrimary: img.isPrimary,
    })),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function serializeCategory(c: any) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    displayOrder: c.displayOrder,
    isActive: c.isActive,
    productCount: c._count?.products ?? undefined,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export function serializeOrder(o: any) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerMobile: o.customerMobile,
    deliveryAddress: o.deliveryAddress,
    notes: o.notes,
    subtotal: toNumber(o.subtotal),
    status: o.status,
    items: (o.items ?? []).map((it: any) => ({
      id: it.id,
      productId: it.productId,
      productName: it.productName,
      unit: it.unit,
      price: toNumber(it.price),
      quantity: it.quantity,
      total: toNumber(it.total),
    })),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export function serializeSettings(s: any) {
  if (!s) return null;
  return {
    companyName: s.companyName,
    tagline: s.tagline,
    logoUrl: s.logoUrl,
    heroTitle: s.heroTitle,
    heroSubtitle: s.heroSubtitle,
    heroBannerUrl: s.heroBannerUrl,
    phone: s.phone,
    whatsappNumber: s.whatsappNumber,
    email: s.email,
    address: s.address,
    googleMapsUrl: s.googleMapsUrl,
    aboutContent: s.aboutContent,
    facebookUrl: s.facebookUrl,
    instagramUrl: s.instagramUrl,
    youtubeUrl: s.youtubeUrl,
    updatedAt: s.updatedAt,
  };
}

