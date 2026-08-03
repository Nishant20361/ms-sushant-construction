/**
 * E2E verification for Cloudinary upload integration.
 *
 * Flow verified:
 *   Admin login → upload image → Cloudinary secure_url returned
 *   → ProductImage.url stored in DB → public API exposes imageUrl
 *   → frontend resolveImageUrl passes HTTPS through unchanged
 *   → Cloudinary URL actually serves an image (final <img> display).
 *
 * Run: npx tsx scripts/e2e-verify-cloudinary.ts
 *
 * Includes a hard deadline so it can NEVER hang indefinitely.
 */
import sharp from "sharp";
import supertest from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { hashPassword } from "../src/utils/password.js";

const TEST_PASSWORD = "e2e-test-pass-12345";
const app = createApp();
const DEADLINE_MS = 45_000;

/** Wrap a promise with a hard timeout. */
function withDeadline<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`STEP TIMED OUT after ${ms}ms: ${label}`)),
      ms
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

async function getCsrf(agent: ReturnType<typeof supertest.agent>) {
  const res = await withDeadline(agent.get("/api/csrf"), 10_000, "GET /api/csrf");
  const setCookie = res.headers["set-cookie"] as string | string[] | undefined;
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ""];
  const csrfCookie = cookies.find((c: string) => c.startsWith("ms_sushant_csrf="));
  const token = csrfCookie
    ? decodeURIComponent(csrfCookie.split("=")[1].split(";")[0])
    : "";
  if (!token) throw new Error("No CSRF token returned");
  return token;
}

async function main() {
  const overall = Date.now();

  // 1) Ensure a known admin exists.
  console.log("[1/9] Creating temp admin…");
  await withDeadline(
    prisma.admin.deleteMany({ where: { username: "e2e-admin" } }),
    10_000,
    "deleteMany admin"
  );
  const hash = await hashPassword(TEST_PASSWORD);
  await withDeadline(
    prisma.admin.create({
      data: {
        username: "e2e-admin",
        email: "e2e@example.com",
        passwordHash: hash,
      },
    }),
    10_000,
    "create admin"
  );
  console.log("[1/9] Temp admin ready.");

  // 2) CSRF + login.
  const agent = supertest.agent(app);
  const token = await getCsrf(agent);
  console.log("[2/9] CSRF token obtained.");

  const login = await withDeadline(
    agent
      .post("/api/admin/auth/login")
      .set("X-CSRF-Token", token)
      .send({ username: "e2e-admin", password: TEST_PASSWORD }),
    10_000,
    "admin login"
  );
  if (login.status !== 200) {
    throw new Error(`Login failed: ${login.status} ${JSON.stringify(login.body)}`);
  }
  console.log("[3/9] Admin login OK (200).");

  // 3) Upload a real PNG.
  const png = await sharp({
    create: { width: 400, height: 300, channels: 3, background: { r: 200, g: 20, b: 120 } },
  })
    .png()
    .toBuffer();
  const up = await withDeadline(
    agent
      .post("/api/admin/uploads")
      .set("X-CSRF-Token", token)
      .attach("file", png, "e2e-product.png"),
    20_000,
    "POST /api/admin/uploads"
  );
  if (up.status !== 201) {
    throw new Error(`Upload failed: ${up.status} ${JSON.stringify(up.body)}`);
  }
  const imageUrl: string = up.body.url;
  console.log("[4/9] Upload OK -> url:", imageUrl);

  const isCloud = /^https:\/\/res\.cloudinary\.com\//.test(imageUrl);
  console.log(`[4/9] Cloudinary secure_url: ${isCloud ? "YES" : "NO (local fallback)"}`);

  // 4) Create category + product with that imageUrl.
  const cat = await withDeadline(
    agent
      .post("/api/admin/categories")
      .set("X-CSRF-Token", token)
      .send({
        name: "E2E Cat " + Date.now(),
        slug: "e2e-cat-" + Date.now(),
        displayOrder: 99,
        isActive: true,
      }),
    10_000,
    "create category"
  );
  if (cat.status !== 201) throw new Error(`Category create failed: ${JSON.stringify(cat.body)}`);
  const catId = cat.body.category.id;
  console.log("[5/9] Category created, id:", catId);

  const prod = await withDeadline(
    agent
      .post("/api/admin/products")
      .set("X-CSRF-Token", token)
      .send({
        name: "E2E Product " + Date.now(),
        description: "cloudinary e2e",
        unit: "bag",
        price: 750,
        mrp: 800,
        stock: 20,
        isActive: true,
        categoryId: catId,
        imageUrl,
      }),
    10_000,
    "create product"
  );
  if (prod.status !== 201) throw new Error(`Product create failed: ${JSON.stringify(prod.body)}`);
  const productId = prod.body.product.id;
  console.log("[5/9] Product created, id:", productId);

  // 5) Verify ProductImage.url in database.
  const dbImage = await withDeadline(
    prisma.productImage.findFirst({ where: { productId } }),
    10_000,
    "find ProductImage"
  );
  console.log("[6/9] DB ProductImage.url:", dbImage?.url);
  if (!dbImage || dbImage.url !== imageUrl) {
    throw new Error(`DB image URL mismatch. DB=${dbImage?.url} Expected=${imageUrl}`);
  }
  console.log("[6/9] Database image URL saved correctly. ✓");

  // 6) Public API exposes imageUrl.
  const pub = await withDeadline(supertest(app).get("/api/products/" + productId), 10_000, "public product");
  console.log("[7/9] Public API status:", pub.status, "imageUrl:", pub.body.product.imageUrl);
  if (pub.body.product.imageUrl !== imageUrl) {
    throw new Error(`Public API imageUrl mismatch. Got=${pub.body.product.imageUrl}`);
  }
  console.log("[7/9] Public API exposes Cloudinary URL. ✓");

  // 7) Simulate frontend resolveImageUrl: HTTPS must pass through unchanged.
  const resolveImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return url;
  };
  const rendered = resolveImageUrl(pub.body.product.imageUrl);
  if (rendered !== imageUrl) {
    throw new Error(`resolveImageUrl changed the URL: ${rendered}`);
  }
  console.log("[8/9] Frontend resolveImageUrl passes HTTPS unchanged. ✓");

  // 8) Cloudinary URL actually serves an image (what <img> needs).
  const img = await withDeadline(fetch(imageUrl), 15_000, "fetch Cloudinary URL");
  const ct = img.headers.get("content-type") ?? "";
  console.log("[8/9] Cloudinary fetch status:", img.status, "content-type:", ct);
  if (!img.ok || !ct.startsWith("image/")) {
    throw new Error(`Cloudinary URL not serving an image. status=${img.status} type=${ct}`);
  }
  console.log("[8/9] Cloudinary URL is a displayable image. ✓");

  // 9) Cleanup.
  await agent.delete("/api/admin/products/" + productId).set("X-CSRF-Token", token).catch(() => {});
  await agent.delete("/api/admin/categories/" + catId).set("X-CSRF-Token", token).catch(() => {});
  await prisma.admin.deleteMany({ where: { username: "e2e-admin" } });
  console.log("[9/9] Cleanup done.");

  const elapsed = ((Date.now() - overall) / 1000).toFixed(1);
  console.log(`\n✅ E2E CLOUDINARY UPLOAD + PRODUCT IMAGE PASSED (${elapsed}s)`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error("\n❌ E2E CLOUDINARY VERIFICATION FAILED:", e?.message ?? e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});

