import { z } from "zod";

// ------------------------- Public -------------------------
export const createOrderSchema = z.object({
  customerName: z.string().trim().min(2, "Please enter your full name").max(120),
  customerMobile: z
    .string()
    .trim()
    .regex(/^(?:\+91|91|0)?[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"),
  deliveryAddress: z.string().trim().max(500).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().min(0.001, "Quantity must be at least 0.001").max(1000000),
      })
    )
    .min(1, "Cart is empty")
    .max(50, "Too many line items"),
});

export const publicProductQuerySchema = z.object({
  category: z.string().trim().max(100).optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  sort: z.enum(["newest", "price_asc", "price_desc", "name_asc", "name_desc"]).default("newest"),
  inStock: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
});

// ------------------------- Admin receive payment -----------------------
// Receive a pending payment from an order/customer. The amount must be
// positive and the mode must be CASH or ONLINE.
export const receivePaymentSchema = z.object({
  amount: z.coerce.number().positive("Payment amount must be greater than zero").max(100_000_000),
  paymentMode: z.enum(["CASH", "ONLINE"]).default("CASH"),
  paymentDate: z.string().optional(),
  notes: z.string().trim().max(500).optional(),
});

// Receive a payment against a CUSTOMER's total outstanding balance. The
// amount is allocated across the customer's due orders oldest-first (FIFO).
// Each allocation creates its own OrderPayment record so history is preserved.
export const receiveCustomerPaymentSchema = z.object({
  amount: z.coerce.number().positive("Payment amount must be greater than zero").max(100_000_000),
  paymentMode: z.enum(["CASH", "ONLINE"]).default("CASH"),
  paymentDate: z.string().optional(),
  notes: z.string().trim().max(500).optional(),
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
  imageUrl: z.string().trim().max(500).refine((value) => !value || /^https:\/\/[^\s]+$/i.test(value), "Category image must use a valid HTTPS URL").nullable().optional().transform((value) => value || null),
  displayOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.coerce.boolean().default(true),
});

// ------------------------- Admin products -------------------------
export const productSchema = z.object({
  name: z.string().trim().min(2, "Product name is required").max(200),
  description: z.string().trim().max(2000).optional().default(""),
  unit: z.string().trim().min(1, "Unit is required").max(50),
  price: z.coerce.number().nonnegative("Price must be 0 or more"),
  mrp: z.coerce.number().nonnegative("MRP must be 0 or more"),
  stock: z.coerce.number().nonnegative("Stock must be 0 or more"),
  categoryId: z.coerce.number().int().positive(),
  isActive: z.coerce.boolean().default(true),
  imageUrl: z.string().trim().max(500).nullable().default(""),
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

const androidUpdateUrl = z.preprocess(
  (value) => value === null || value === undefined ? "" : value,
  z.string()
  .trim()
  .max(1000)
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "APK URL must be a safe HTTPS URL")
);

const optionalAndroidText = (maxLength: number) => z.preprocess(
  (value) => value === null || value === undefined ? "" : value,
  z.string().trim().max(maxLength)
);

function isDirectAndroidApkUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && /\.apk$/i.test(url.pathname);
  } catch {
    return false;
  }
}

const androidVersionPattern = /^\d+(?:\.\d+){0,3}(?:[-+][0-9A-Za-z.-]+)?$/;

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

// Optional email field: accepts null/undefined/empty -> "" (cleared value),
// but still requires a valid email format whenever a non-empty value is given.
// This lets an admin remove an existing email and save without a validation
// failure, while keeping email-format validation for real addresses.
const optionalEmail = z.preprocess(
  (v) => (v === null || v === undefined ? "" : v),
  z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "A valid email is required")
);

export const settingsSchema = z.object({
  companyName: z.string().trim().min(1).max(120),
  tagline: z.string().trim().max(200),
  logoUrl: z.string().trim().max(500).nullable().transform((v) => v ?? ""),
  heroTitle: z.string().trim().max(200),
  heroSubtitle: z.string().trim().max(400),
  heroBannerUrl: z.string().trim().max(500).nullable().transform((v) => v ?? ""),
  mobileHeroTitle: z.string().trim().max(200).optional().default("Quality Construction Materials"),
  mobileHeroSubtitle: z.string().trim().max(400).optional().default("ACC Cement, Nuvoco Cement, Tata & Mongia steel rods, roofing sheets, waterproofing chemicals and more — at the best prices."),
  mobileHeroBannerUrl: z.string().trim().max(500).nullable().optional().transform((v) => v ?? ""),
  phone: z.string().trim().max(30),
  whatsappNumber: z.string().trim().max(20),
  email: optionalEmail,
  address: z.string().trim().max(500),
  googleMapsUrl: mapsUrlSafe,
  aboutContent: z.string().trim().max(5000),
  facebookUrl: safeHttpUrl,
  instagramUrl: safeHttpUrl,
  youtubeUrl: safeHttpUrl,
  // Business invoice fields
  businessName: z.string().trim().max(120).optional().default(""),
  businessAddress: z.string().trim().max(500).optional().default(""),
  gstNumber: z.string().trim().max(50).optional().default(""),
  businessMobile: z.string().trim().max(30).optional().default(""),
  businessEmail: optionalEmail.optional().default(""),
  businessLogoUrl: z.string().trim().max(500).nullable().transform((v) => v ?? ""),
  latestUpdateEnabled: z.boolean().optional().default(false),
  latestUpdateText: z.string().trim().max(300).optional().default(""),
  androidUpdateEnabled: z.boolean().optional().default(false),
  androidLatestVersion: optionalAndroidText(40).optional().default(""),
  androidLatestBuild: z.coerce.number().int().min(0).max(2_147_483_647).optional().default(0),
  androidApkUrl: androidUpdateUrl.optional().default(""),
  androidUpdateMessage: optionalAndroidText(300).optional().default(""),
}).superRefine((settings, ctx) => {
  if (!settings.androidUpdateEnabled) return;

  if (!settings.androidLatestVersion || !androidVersionPattern.test(settings.androidLatestVersion)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["androidLatestVersion"], message: "Enter a valid version such as 1.0.2" });
  }
  if (!Number.isInteger(settings.androidLatestBuild) || settings.androidLatestBuild < 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["androidLatestBuild"], message: "Build number must be a whole number of at least 1" });
  }
  if (!isDirectAndroidApkUrl(settings.androidApkUrl)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["androidApkUrl"], message: "APK URL must be a direct HTTPS URL ending in .apk, not an Expo build page" });
  }
});

// ------------------------- Admin order status -------------------------
export const orderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
  ]),
});

// ------------------------- Public order tracking ---------------------
export const orderTrackSchema = z.object({
  orderNumber: z.string().trim().min(3, "Order ID is required").max(50),
  customerMobile: z
    .string()
    .trim()
    .regex(/^(?:\+91|91|0)?[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"),
});

// Track orders by mobile number only (customer may forget Order ID).
export const orderTrackByMobileSchema = z.object({
  customerMobile: z
    .string()
    .trim()
    .regex(/^(?:\+91|91|0)?[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"),
});

// ------------------------- Admin billing -----------------------------
export const billSchema = z.object({
  discount: z
    .coerce.number()
    .min(0, "Discount cannot be negative")
    .max(10_000_000, "Discount is too large")
    .default(0),
});

// ------------------------- Admin notifications ------------------------
export const notificationReadSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).max(100).optional(),
  all: z.coerce.boolean().optional(),
});
export const pushDeviceSchema = z.object({
  expoPushToken: z.string().trim().regex(/^(?:Exponent|Expo)PushToken\[[A-Za-z0-9_-]+\]$/, "Invalid Expo push token"),
  platform: z.enum(["android"]).default("android"),
});

// ------------------------- Admin profile ------------------------------
export const adminProfileSchema = z.object({
  lowStockThreshold: z.coerce.number().int().min(0).max(10000).default(10),
});

// ------------------------- Admin forgot/reset password -------------------
export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("A valid email is required").max(200),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128, "Password too long"),
});

// ------------------------- Construction Assistant --------------------
export const constructionChatSchema = z.object({
  message: z.string().trim().min(1, "Message cannot be empty").max(2000),
  sessionId: z.string().trim().max(100).optional(),
  language: z.enum(["Hindi", "English", "Hinglish", "Other"]).optional(),
});

// ------------------------- Construction Knowledge (Phase 5) --------------
export const constructionKnowledgeSchema = z.object({
  category: z.string().trim().min(1, "Category is required").max(100),
  title: z.string().trim().min(1, "Title is required").max(200),
  content: z.string().trim().min(1, "Content is required").max(10000),
  keywords: z
    .array(z.string().trim().min(1).max(100))
    .min(1, "At least one keyword is required")
    .max(100),
  materialType: z.string().trim().max(100).nullable().optional(),
  companyName: z.string().trim().max(100).nullable().optional(),
});

export const adminEmailSchema = z.object({
  email: z.preprocess(
    (v) => (v === null || v === undefined || v === "" ? null : v),
    z
      .string()
      .trim()
      .email("A valid admin email is required")
      .max(200)
      .nullable()
      .optional()
  ),
});
