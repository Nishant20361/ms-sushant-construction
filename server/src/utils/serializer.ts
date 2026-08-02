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
    stock: toNumber(p.stock),
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

/**
 * Safe public view of an order for the tracking endpoint. NEVER exposes
 * admin-only data (notes, deliveryAddress, customerMobile are intentionally
 * included only where the customer already knows them: mobile is used for
 * verification and address is the customer's own address).
 */
export function serializeOrderForTracking(o: any) {
  return {
    orderNumber: o.orderNumber,
    status: o.status,
    createdAt: o.createdAt,
    subtotal: toNumber(o.subtotal),
    customerName: o.customerName,
    deliveryAddress: o.deliveryAddress,
    items: (o.items ?? []).map((it: any) => ({
      productName: it.productName,
      quantity: it.quantity,
      unit: it.unit,
      price: toNumber(it.price),
      total: toNumber(it.total),
    })),
    bill: serializeBillForTracking(o.bill),
  };
}

/**
 * Public summary list of a customer's orders (used when tracking by mobile
 * number only). Exposes only what the customer needs to pick an order.
 */
export function serializeOrderListForTracking(o: any) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    createdAt: o.createdAt,
    subtotal: toNumber(o.subtotal),
    customerName: o.customerName,
    items: (o.items ?? []).map((it: any) => ({
      productName: it.productName,
      quantity: it.quantity,
      unit: it.unit,
      price: toNumber(it.price),
      total: toNumber(it.total),
    })),
    bill: serializeBillForTracking(o.bill),
  };
}

/** Safe public bill view (no admin fields). */
export function serializeBillForTracking(b: any) {
  if (!b) return null;
  return {
    discount: toNumber(b.discount),
    finalAmount: toNumber(b.finalAmount),
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

/** Admin bill view. */
export function serializeBill(b: any) {
  if (!b) return null;
  return {
    id: b.id,
    orderId: b.orderId,
    subtotal: toNumber(b.subtotal),
    discount: toNumber(b.discount),
    finalAmount: toNumber(b.finalAmount),
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
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
    // Business invoice fields
    businessName: s.businessName ?? "",
    businessAddress: s.businessAddress ?? "",
    gstNumber: s.gstNumber ?? "",
    businessMobile: s.businessMobile ?? "",
    businessEmail: s.businessEmail ?? "",
    businessLogoUrl: s.businessLogoUrl ?? "",
    updatedAt: s.updatedAt,
  };
}

