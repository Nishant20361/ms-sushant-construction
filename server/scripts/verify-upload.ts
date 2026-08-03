/**
 * End-to-end verification of the product image upload flow.
 *
 *  1. Boots the app (test DB isolation is NOT used here — it runs against
 *     whatever DATABASE_URL the environment resolves to, mirroring the dev
 *     server).
 *  2. Logs in as an admin with CSRF.
 *  3. Uploads a real PNG through POST /api/admin/uploads.
 *  4. Asserts the returned URL:
 *       - When Cloudinary is configured: an https://res.cloudinary.com/... URL,
 *         and the image is actually reachable over HTTPS.
 *       - Otherwise (local fallback): /uploads/products/<file>.webp and the
 *         file exists under server/uploads/products, served as image/webp.
 *  5. Creates a product with the returned image URL and verifies the URL is
 *     stored in ProductImage.url (reflecting the real DB flow).
 *
 * Usage (from server/): npx tsx scripts/verify-upload.ts
 */
import sharp from "sharp";
import supertest from "supertest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { hashPassword } from "../src/utils/password.js";
import { UPLOAD_DIR, PRODUCTS_DIR } from "../src/middleware/upload.js";
import { isCloudinaryConfigured } from "../src/utils/cloudinary.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_PASSWORD = "verify-upload-pass-123";

const app = createApp();

async function getCsrf() {
  const agent = supertest.agent(app);
  const res = await agent.get("/api/csrf");
  const setCookie = res.headers["set-cookie"] as string | string[] | undefined;
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ""];
  const csrfCookie = cookies.find((c: string) => c.startsWith("ms_sushant_csrf="));
  const token = csrfCookie ? decodeURIComponent(csrfCookie.split("=")[1].split(";")[0]) : "";
  return { agent, token };
}

async function main() {
  // Create/refresh a known test admin in the current DB.
  await prisma.admin.deleteMany({ where: { username: "verify-upload-admin" } });
  const hash = await hashPassword(TEST_PASSWORD);
  await prisma.admin.create({
    data: { username: "verify-upload-admin", email: "verify-upload@example.com", passwordHash: hash },
  });

  // Login.
  const { agent, token } = await getCsrf();
  const login = await agent
    .post("/api/admin/auth/login")
    .set("X-CSRF-Token", token)
    .send({ username: "verify-upload-admin", password: TEST_PASSWORD });
  if (login.status !== 200) {
    throw new Error(`Login failed: ${login.status} ${JSON.stringify(login.body)}`);
  }
  console.log("[verify] login ok");

  // Build a real test PNG in memory.
  const pngBuffer = await sharp({
    create: { width: 320, height: 240, channels: 3, background: { r: 20, g: 120, b: 200 } },
  })
    .png()
    .toBuffer();

  // Upload it.
  const up = await agent
    .post("/api/admin/uploads")
    .set("X-CSRF-Token", token)
    .attach("file", pngBuffer, "test-image.png");
  if (up.status !== 201) {
    throw new Error(`Upload failed: ${up.status} ${JSON.stringify(up.body)}`);
  }
  const url: string = up.body.url;
  console.log("[verify] upload ok, url =", url);

  const cloudinaryMode = isCloudinaryConfigured();

  if (cloudinaryMode) {
    // Cloudinary mode: expect an https://res.cloudinary.com/... URL.
    if (!/^https:\/\/res\.cloudinary\.com\/.+/.test(url)) {
      throw new Error(`Expected a Cloudinary secure URL, got: ${url}`);
    }
    // The image must actually be reachable over HTTPS.
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Cloudinary image not reachable: GET ${url} -> ${res.status}`);
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) {
      throw new Error(`Expected image/* content-type, got ${ct}`);
    }
    console.log("[verify] Cloudinary URL reachable, content-type =", ct);
  } else {
    // Local fallback mode: expect /uploads/products/<file>.webp.
    if (!/^\/uploads\/products\/[a-zA-Z0-9._-]+\.webp$/.test(url)) {
      throw new Error(`Unexpected URL shape: ${url}`);
    }

    // File must exist on disk under uploads/products.
    const filename = url.split("/").pop()!;
    const onDisk = path.join(PRODUCTS_DIR, filename);
    if (!fs.existsSync(onDisk)) {
      throw new Error(`File not found on disk at ${onDisk}`);
    }
    console.log("[verify] file exists at", path.relative(__dirname, onDisk));

    // Uploaded file must be webp.
    const meta = await sharp(onDisk).metadata();
    if (meta.format !== "webp") {
      throw new Error(`Expected webp, got ${meta.format}`);
    }
    console.log("[verify] file is webp,", meta.width + "x" + meta.height);

    // GET the served URL and assert content-type.
    const served = await supertest(app).get(url);
    if (served.status !== 200) {
      throw new Error(`GET ${url} returned ${served.status}`);
    }
    if (served.headers["content-type"] !== "image/webp") {
      throw new Error(`Expected image/webp, got ${served.headers["content-type"]}`);
    }
    console.log("[verify] GET", url, "-> 200 image/webp,", served.body.length, "bytes");

    // Path traversal must be rejected by the allowlist.
    const bad = await supertest(app).get("/uploads/%2e%2e/package.json");
    if (bad.status !== 404) {
      throw new Error(`Path traversal should 404, got ${bad.status}`);
    }
    console.log("[verify] path traversal rejected (404)");
  }

  // ---- Verify the real DB flow: ProductImage.url stores the returned URL ----
  // Create a category + product, attach the uploaded image, then confirm the
  // image URL is persisted exactly as returned by the upload endpoint.
  const cat = await prisma.category.create({
    data: { name: "Verify Upload Cat", slug: `verify-upload-${Date.now()}`, displayOrder: 999 },
  });
  const product = await prisma.product.create({
    data: {
      name: "Verify Upload Product",
      unit: "bag",
      price: 100,
      mrp: 120,
      stock: 5,
      isActive: true,
      categoryId: cat.id,
    },
    include: { images: true },
  });
  await prisma.productImage.create({
    data: { productId: product.id, url, isPrimary: true },
  });
  const saved = await prisma.productImage.findFirst({
    where: { productId: product.id, isPrimary: true },
  });
  if (!saved || saved.url !== url) {
    throw new Error(`ProductImage.url mismatch. Expected ${url}, got ${saved?.url}`);
  }
  console.log("[verify] ProductImage.url stored correctly:", saved.url);

  // Cleanup.
  await prisma.productImage.deleteMany({ where: { productId: product.id } });
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.category.delete({ where: { id: cat.id } });
  await prisma.admin.deleteMany({ where: { username: "verify-upload-admin" } });

  console.log("\n✅ Upload verification PASSED");
}

main()
  .catch((e) => {
    console.error("\n❌ Upload verification FAILED:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

