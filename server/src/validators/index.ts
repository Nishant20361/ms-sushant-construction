import { z } from "zod";

// ------------------------- Public -------------------------
export const createOrderSchema = z.object({
  customerName: z.string().trim().min(2, "Please enter your full name").max(120),
  customerMobile: z
    .string()
    .trim()
    .regex(/^(?:\+91|91|0)?[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"),
  deliveryAddress: z.string().trim().min(10, "Please enter a complete delivery address").max(500),
  notes: z.string().trim().max(1000).optional().default(""),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1, "Quantity must be at least 1").max(999),
      })
    )
    .min(1, "Cart is empty")
    .max(50, "Too many line items"),
});

// ------------------------- Admin auth -------------------------
export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(12, "New password must be at least 12 characters")
    .max(128, "Password too long"),
});

// ------------------------- Admin categories -------------------------
export const categorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required").max(100),
  slug: z.string().trim().min(2).max(100).optional(),
  displayOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

// ------------------------- Admin products -------------------------
export const productSchema = z.object({
  name: z.string().trim().min(2, "Product name is required").max(200),
  description: z.string().trim().max(2000).optional().default(""),
  unit: z.string().trim().min(1, "Unit is required").max(50),
  price: z.number().nonnegative("Price must be 0 or more"),
  mrp: z.number().nonnegative("MRP must be 0 or more"),
  stock: z.number().int().nonnegative("Stock must be 0 or more"),
  categoryId: z.number().int().positive(),
  isActive: z.boolean().default(true),
  imageUrl: z.string().trim().max(500).optional().default(""),
});

// ------------------------- Admin settings -------------------------
const safeHttpUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === "" || /^https?:\/\//.test(v),
    "URL must start with http:// or https://"
  );

const mapsUrlSafe = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) =>
      v === "" ||
      /^https:\/\/(www\.)?google\.(com|co\.in)\/maps(\/|$)/.test(v) ||
      /^https:\/\/maps\.google\.com\/maps(\?|\/|$)/.test(v),
    "Google Maps URL must be a valid Google Maps URL"
  );

export const settingsSchema = z.object({
  companyName: z.string().trim().min(1).max(120),
  tagline: z.string().trim().max(200),
  logoUrl: z.string().trim().max(500).nullable().transform((v) => v ?? ""),
  heroTitle: z.string().trim().max(200),
  heroSubtitle: z.string().trim().max(400),
  heroBannerUrl: z.string().trim().max(500).nullable().transform((v) => v ?? ""),
  phone: z.string().trim().max(30),
  whatsappNumber: z.string().trim().max(20),
  email: z.string().trim().max(120),
  address: z.string().trim().max(500),
  googleMapsUrl: mapsUrlSafe,
  aboutContent: z.string().trim().max(5000),
  facebookUrl: safeHttpUrl,
  instagramUrl: safeHttpUrl,
  youtubeUrl: safeHttpUrl,
});

// ------------------------- Admin order status -------------------------
export const orderStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "DELIVERED", "CANCELLED"]),
});

