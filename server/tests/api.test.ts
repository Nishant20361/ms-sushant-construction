import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { hashPassword } from "../src/utils/password.js";
import { buildGroqPrompt, detectGroqResponseLanguage } from "../src/construction_ai/groq.js";
import { serializeCategory, serializeOrderListForTracking, serializeSettings } from "../src/utils/serializer.js";
import { categorySchema, settingsSchema } from "../src/validators/index.js";
import { isWholeNumberUnit, quantityMatchesUnit } from "../src/utils/quantity.js";

let app: ReturnType<typeof createApp>;

const TEST_PASSWORD = "test-password-atleast-12-chars";

/** Fetch a fresh CSRF token cookie + value. Returns object with cookie and token. */
async function getCsrf() {
  const agent = supertest.agent(app);
  const res = await agent.get("/api/csrf");
  const setCookie = res.headers["set-cookie"] as string | string[] | undefined;
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ""];
  const csrfCookie = cookies.find((c: string) => c.startsWith("ms_sushant_csrf="));
  const token = csrfCookie
    ? decodeURIComponent(csrfCookie.split("=")[1].split(";")[0])
    : "";
  return { agent, token, cookies };
}

beforeAll(async () => {
  // Ensure clean test state
  await prisma.orderPayment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.admin.deleteMany();

  // Create test admin
  const hash = await hashPassword(TEST_PASSWORD);
  const admin = await prisma.admin.create({
    data: { username: "testadmin", passwordHash: hash, email: "test@example.com" },
  });

  // Create test category
  const cat = await prisma.category.create({
    data: { name: "Test Category", slug: "test-category", displayOrder: 1 },
  });

  // Create test product
  await prisma.product.create({
    data: {
      name: "Test Product",
      unit: "bag",
      price: 500,
      mrp: 550,
      stock: 10,
      isActive: true,
      categoryId: cat.id,
    },
  });

  // Create inactive product
  await prisma.product.create({
    data: {
      name: "Inactive Product",
      unit: "piece",
      price: 100,
      mrp: 120,
      stock: 5,
      isActive: false,
      categoryId: cat.id,
    },
  });

  // Create low-stock product
  await prisma.product.create({
    data: {
      name: "Low Stock Product",
      unit: "kg",
      price: 200,
      mrp: 220,
      stock: 2,
      isActive: true,
      categoryId: cat.id,
    },
  });

  app = createApp();
});

afterAll(async () => {
  await prisma.orderPayment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.$disconnect();
});

describe("Admin authentication", () => {
  it("returns 401 for unauthenticated admin route", async () => {
    const res = await supertest(app).get("/api/admin/dashboard");
    expect(res.status).toBe(401);
  });

  it("rejects wrong password", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/admin/auth/login")
      .set("X-CSRF-Token", token)
      .send({ username: "testadmin", password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("accepts correct credentials and sets cookie", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/admin/auth/login")
      .set("X-CSRF-Token", token)
      .send({ username: "testadmin", password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.admin).toBeDefined();
    expect(res.body.admin.username).toBe("testadmin");
  });

  it("invalidates active sessions across all devices when password is changed", async () => {
    const { agent: agent1, token: csrf1 } = await getCsrf();
    const { agent: agent2, token: csrf2 } = await getCsrf();

    await agent1
      .post("/api/admin/auth/login")
      .set("X-CSRF-Token", csrf1)
      .send({ username: "testadmin", password: TEST_PASSWORD });

    await agent2
      .post("/api/admin/auth/login")
      .set("X-CSRF-Token", csrf2)
      .send({ username: "testadmin", password: TEST_PASSWORD });

    const me1Before = await agent1.get("/api/admin/auth/me");
    expect(me1Before.status).toBe(200);

    const me2Before = await agent2.get("/api/admin/auth/me");
    expect(me2Before.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 1100));
    const newPassword = "new-strong-password-123";
    const changeRes = await agent1
      .post("/api/admin/auth/change-password")
      .set("X-CSRF-Token", csrf1)
      .send({ currentPassword: TEST_PASSWORD, newPassword });
    expect(changeRes.status).toBe(200);

    const me2After = await agent2.get("/api/admin/auth/me");
    expect(me2After.status).toBe(401);

    await new Promise((resolve) => setTimeout(resolve, 1100));
    const { agent: agent3, token: csrf3 } = await getCsrf();
    await agent3
      .post("/api/admin/auth/login")
      .set("X-CSRF-Token", csrf3)
      .send({ username: "testadmin", password: newPassword });
    await agent3
      .post("/api/admin/auth/change-password")
      .set("X-CSRF-Token", csrf3)
      .send({ currentPassword: newPassword, newPassword: TEST_PASSWORD });
  });
});

describe("Admin product management", () => {
  it("updates product stock and price with decimal values", async () => {
    const { agent, token } = await getCsrf();
    const login = await agent
      .post("/api/admin/auth/login")
      .set("X-CSRF-Token", token)
      .send({ username: "testadmin", password: TEST_PASSWORD });
    expect(login.status).toBe(200);

    const product = await prisma.product.findFirst({ where: { name: "Test Product" } });
    expect(product).toBeDefined();

    const update = await agent
      .put(`/api/admin/products/${product!.id}`)
      .set("X-CSRF-Token", token)
      .send({
        name: product!.name,
        description: "Updated stock test",
        unit: product!.unit,
        price: 212.5,
        mrp: 240.75,
        stock: 2.5,
        isActive: product!.isActive,
        categoryId: product!.categoryId,
        imageUrl: null,
      });

    expect(update.status).toBe(200);
    expect(update.body.product.stock).toBe(2.5);
    expect(update.body.product.price).toBe(212.5);

    const list = await agent.get("/api/admin/products?page=1&limit=10");
    expect(list.status).toBe(200);
    const found = list.body.products.find((p: any) => p.id === product!.id);
    expect(found).toBeDefined();
    expect(found.stock).toBe(2.5);
    expect(found.price).toBe(212.5);
  });

  it("calculates decimal totals without floating-point drift (85 x 2.5 = 212.5)", async () => {
    const { agent, token } = await getCsrf();
    const login = await agent
      .post("/api/admin/auth/login")
      .set("X-CSRF-Token", token)
      .send({ username: "testadmin", password: TEST_PASSWORD });
    expect(login.status).toBe(200);

    // Create a product priced per-kg.
    const cat = await prisma.category.findFirst({ where: { slug: "test-category" } });
    const create = await agent
      .post("/api/admin/products")
      .set("X-CSRF-Token", token)
      .send({
        name: "Iron Nail 1.5 Inch",
        description: "Per-kg pricing",
        unit: "kg",
        price: 85,
        mrp: 100,
        stock: 10,
        isActive: true,
        categoryId: cat!.id,
        imageUrl: null,
      });
    expect(create.status).toBe(201);
    const productId = create.body.product.id;

    // Place an order for 2.5 kg.
    const order = await agent
      .post("/api/orders")
      .set("X-CSRF-Token", token)
      .send({
        customerName: "Decimal Test",
        customerMobile: "9876543210",
        deliveryAddress: "123, Test Street, City, State 123456",
        items: [{ productId, quantity: 2.5 }],
      });
    expect(order.status).toBe(201);
    expect(order.body.order.subtotal).toBe(212.5);

    // Stock should have decreased by 2.5.
    const dbProduct = await prisma.product.findUnique({ where: { id: productId } });
    expect(Number(dbProduct!.stock)).toBe(7.5);
  });

  it("restores stock when an order is cancelled", async () => {
    const { agent, token } = await getCsrf();
    const login = await agent
      .post("/api/admin/auth/login")
      .set("X-CSRF-Token", token)
      .send({ username: "testadmin", password: TEST_PASSWORD });
    expect(login.status).toBe(200);

    // Create a fresh product so stock is predictable.
    const cat = await prisma.category.findFirst({ where: { slug: "test-category" } });
    const create = await agent
      .post("/api/admin/products")
      .set("X-CSRF-Token", token)
      .send({
        name: "Cancel Restore Product",
        description: "Stock restore test",
        unit: "kg",
        price: 50,
        mrp: 60,
        stock: 5,
        isActive: true,
        categoryId: cat!.id,
        imageUrl: null,
      });
    expect(create.status).toBe(201);
    const productId = create.body.product.id;

    const order = await agent
      .post("/api/orders")
      .set("X-CSRF-Token", token)
      .send({
        customerName: "Cancel Test",
        customerMobile: "9876543210",
        deliveryAddress: "123, Test Street, City, State 123456",
        items: [{ productId, quantity: 1.5 }],
      });
    expect(order.status).toBe(201);

    let dbProduct = await prisma.product.findUnique({ where: { id: productId } });
    expect(Number(dbProduct!.stock)).toBe(3.5);

    // Cancel the order -> stock should be restored to 5.
    const cancel = await agent
      .patch(`/api/admin/orders/${order.body.order.id}/status`)
      .set("X-CSRF-Token", token)
      .send({ status: "CANCELLED" });
    expect(cancel.status).toBe(200);

    dbProduct = await prisma.product.findUnique({ where: { id: productId } });
    expect(Number(dbProduct!.stock)).toBe(5);
  });

  it("toggles product active state via the dedicated endpoint", async () => {
    const { agent, token } = await getCsrf();
    const login = await agent
      .post("/api/admin/auth/login")
      .set("X-CSRF-Token", token)
      .send({ username: "testadmin", password: TEST_PASSWORD });
    expect(login.status).toBe(200);

    const product = await prisma.product.findFirst({ where: { name: "Inactive Product" } });
    expect(product).toBeDefined();

    // Activate it.
    const toggle = await agent
      .patch(`/api/admin/products/${product!.id}/toggle`)
      .set("X-CSRF-Token", token);
    expect(toggle.status).toBe(200);
    expect(toggle.body.product.isActive).toBe(true);
    expect(toggle.body.product.stock).toBe(5);

    // Toggle back.
    const toggle2 = await agent
      .patch(`/api/admin/products/${product!.id}/toggle`)
      .set("X-CSRF-Token", token);
    expect(toggle2.status).toBe(200);
    expect(toggle2.body.product.isActive).toBe(false);
  });
});

describe("CSRF protection", () => {
  it("returns 403 for a write request without a CSRF token", async () => {
    const res = await supertest(app)
      .post("/api/orders")
      .send({
        customerName: "CSRF Test",
        customerMobile: "9876543210",
        deliveryAddress: "123, Test Street, City, State 123456",
        items: [],
      });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/CSRF/i);
  });

  it("succeeds with valid CSRF token + cookie jar", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/orders")
      .set("X-CSRF-Token", token)
      .send({
        customerName: "CSRF Test",
        customerMobile: "9876543210",
        deliveryAddress: "123, Test Street, City, State 123456",
        items: [],
      });
    // items is empty -> schema will reject with 400; the key point is it's
    // NOT 403, proving the CSRF gate was passed.
    expect(res.status).toBe(400);
    expect(res.body.error).not.toMatch(/CSRF/i);
  });

  it("rejects authenticated admin write without CSRF token", async () => {
    // Login with the CSRF flow so the agent has an auth cookie.
    const { agent, token } = await getCsrf();
    const login = await agent
      .post("/api/admin/auth/login")
      .set("X-CSRF-Token", token)
      .send({ username: "testadmin", password: TEST_PASSWORD });
    expect(login.status).toBe(200);

    // Now perform a write WITHOUT the CSRF header (fresh supertest agent has no token).
    const noToken = supertest(app);
    const res = await noToken.post("/api/admin/categories").send({
      name: "No CSRF",
      slug: "no-csrf",
      displayOrder: 9,
      isActive: true,
    });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/CSRF/i);
  });

  it("accepts admin write with valid CSRF token + authenticated cookie", async () => {
    const { agent, token } = await getCsrf();
    const login = await agent
      .post("/api/admin/auth/login")
      .set("X-CSRF-Token", token)
      .send({ username: "testadmin", password: TEST_PASSWORD });
    expect(login.status).toBe(200);

    const res = await agent
      .post("/api/admin/categories")
      .set("X-CSRF-Token", token)
      .send({ name: "CSRF OK Category", slug: "csrf-ok-category", displayOrder: 9, isActive: true });
    expect(res.status).toBe(201);
  });

  it("logs out successfully with CSRF + auth cookie", async () => {
    const { agent, token } = await getCsrf();
    await agent
      .post("/api/admin/auth/login")
      .set("X-CSRF-Token", token)
      .send({ username: "testadmin", password: TEST_PASSWORD });
    const res = await agent
      .post("/api/admin/auth/logout")
      .set("X-CSRF-Token", token);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged out");
  });
});

describe("Checkout security", () => {
  let products: any[];

  beforeAll(async () => {
    products = await prisma.product.findMany({ where: { isActive: true } });
  });

  it("rejects invalid Indian mobile number", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/orders")
      .set("X-CSRF-Token", token)
      .send({
        customerName: "Test User",
        customerMobile: "12345",
        deliveryAddress: "123 Test Street, City, State 123456",
        items: [{ productId: products[0].id, quantity: 1 }],
      });
    expect(res.status).toBe(400);
    const details = res.body.details ?? [];
    const mobileErr = details.find((d: any) => /mobile/i.test(d.path ?? ""));
    expect(mobileErr).toBeDefined();
  });

  it("rejects invalid quantity (0)", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/orders")
      .set("X-CSRF-Token", token)
      .send({
        customerName: "Test User",
        customerMobile: "9876543210",
        deliveryAddress: "123 Test Street, City, State 123456",
        items: [{ productId: products[0].id, quantity: 0 }],
      });
    expect(res.status).toBe(400);
  });

  it("rejects browser-tampered price (server uses real price)", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/orders")
      .set("X-CSRF-Token", token)
      .send({
        customerName: "Rahul Verma",
        customerMobile: "9876543210",
        deliveryAddress: "123, Test Street, City, State 123456",
        items: [{ productId: products[0].id, quantity: 1, price: 1 }], // browser sends price=1
      });
    expect(res.status).toBe(201);
    // The server uses real product price, not the browser-supplied one
    const subtotal = Number(res.body.order.subtotal);
    expect(subtotal).toBe(Number(products[0].price)); // 1 × real price
  });

  it("rejects buying more than available stock", async () => {
    const { agent, token } = await getCsrf();
    const lowStock = products.find((p) => p.name === "Low Stock Product");
    const res = await agent
      .post("/api/orders")
      .set("X-CSRF-Token", token)
      .send({
        customerName: "Stock Test",
        customerMobile: "9876543210",
        deliveryAddress: "123, Test Street, City, State 123456",
        items: [{ productId: lowStock!.id, quantity: 99 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/stock/i);
  });

  it("rejects ordering inactive product", async () => {
    const { agent, token } = await getCsrf();
    const inactive = await prisma.product.findFirst({ where: { isActive: false } });
    const res = await agent
      .post("/api/orders")
      .set("X-CSRF-Token", token)
      .send({
        customerName: "Inactive Test",
        customerMobile: "9876543210",
        deliveryAddress: "123, Test Street, City, State 123456",
        items: [{ productId: inactive!.id, quantity: 1 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/inactive/i);
  });
});

describe("Admin permanent order delete (temporary cleanup feature)", () => {
  let agent: any;
  let token: string;

  beforeAll(async () => {
    // Share a single authenticated agent for all tests in this block to avoid
    // tripping the login rate limiter (10 logins / 15 min per IP).
    const csrf = await getCsrf();
    agent = csrf.agent;
    token = csrf.token;
    const login = await agent
      .post("/api/admin/auth/login")
      .set("X-CSRF-Token", token)
      .send({ username: "testadmin", password: TEST_PASSWORD });
    expect(login.status).toBe(200);
  });

  it("permanently deletes an order and its dependent records", async () => {
    // Create a dummy order.
    const products = await prisma.product.findMany({ where: { isActive: true } });
    const order = await agent
      .post("/api/orders")
      .set("X-CSRF-Token", token)
      .send({
        customerName: "Delete Test",
        customerMobile: "9876543210",
        deliveryAddress: "123, Test Street, City, State 123456",
        items: [{ productId: products[0].id, quantity: 1 }],
      });
    expect(order.status).toBe(201);
    const orderId = order.body.order.id;

    // Create a bill for the order.
    const bill = await agent
      .post(`/api/admin/orders/${orderId}/bill`)
      .set("X-CSRF-Token", token)
      .send({ discount: 0 });
    expect(bill.status).toBe(201);

    // Verify order + children exist before delete.
    const beforeItems = await prisma.orderItem.count({ where: { orderId } });
    const beforeBill = await prisma.bill.count({ where: { orderId } });
    expect(beforeItems).toBe(1);
    expect(beforeBill).toBe(1);

    // Delete the order.
    const del = await agent
      .delete(`/api/admin/orders/${orderId}`)
      .set("X-CSRF-Token", token);
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
    expect(del.body.message).toBe("Order deleted");

    // Verify all dependent records are gone.
    const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
    const dbItems = await prisma.orderItem.count({ where: { orderId } });
    const dbBill = await prisma.bill.count({ where: { orderId } });
    expect(dbOrder).toBeNull();
    expect(dbItems).toBe(0);
    expect(dbBill).toBe(0);
  });

  it("returns 404 when deleting a non-existent order", async () => {
    const del = await agent
      .delete("/api/admin/orders/99999999")
      .set("X-CSRF-Token", token);
    expect(del.status).toBe(404);
    expect(del.body.error).toMatch(/not found/i);
  });

  it("returns 403 for unauthenticated delete request (CSRF gate runs first)", async () => {
    const res = await supertest(app).delete("/api/admin/orders/1");
    // CSRF middleware runs before auth, so an unauthenticated write without a
    // CSRF token is rejected with 403 (never a raw auth error).
    expect(res.status).toBe(403);
  });
});

describe("Public data exposure", () => {
  it("validates and serializes optional category images", () => {
    const parsed = categorySchema.parse({ name: "Cement", slug: "cement", imageUrl: " https://res.cloudinary.com/example/image/upload/category.webp ", displayOrder: 1, isActive: true });
    expect(parsed.imageUrl).toBe("https://res.cloudinary.com/example/image/upload/category.webp");
    expect(serializeCategory({ id: 1, ...parsed, createdAt: new Date(), updatedAt: new Date() }).imageUrl).toBe(parsed.imageUrl);
    expect(serializeCategory({ id: 2, name: "Steel", slug: "steel", imageUrl: null }).imageUrl).toBeNull();
    expect(() => categorySchema.parse({ name: "Unsafe", slug: "unsafe", imageUrl: "javascript:alert(1)" })).toThrow();
  });

  it("accepts fractional kg quantities and rejects fractional count-based units", () => {
    expect(quantityMatchesUnit(1.25, "kg")).toBe(true);
    expect(quantityMatchesUnit(1.25, "bag")).toBe(false);
    expect(quantityMatchesUnit(0.5, "sheet")).toBe(false);
    expect(quantityMatchesUnit(1.5, "bag (50 kg)")).toBe(false);
    expect(quantityMatchesUnit(2.5, "piece (12 m)")).toBe(false);
    expect(isWholeNumberUnit("unit")).toBe(true);
  });

  it("publishes default-safe announcement settings and validates trimmed admin input", () => {
    const parsed = settingsSchema.parse({
      companyName: "Test", tagline: "", logoUrl: null, heroTitle: "", heroSubtitle: "", heroBannerUrl: null,
      phone: "", whatsappNumber: "", email: "", address: "", googleMapsUrl: "", aboutContent: "",
      facebookUrl: "", instagramUrl: "", youtubeUrl: "", businessLogoUrl: null,
      latestUpdateEnabled: true, latestUpdateText: "  New stock available  ",
    });
    expect(parsed.latestUpdateText).toBe("New stock available");
    expect(serializeSettings({ ...parsed, updatedAt: new Date() })).toMatchObject({ latestUpdateEnabled: true, latestUpdateText: "New stock available" });
  });

  it("serializes mobile history without private or accounting fields", () => {
    const summary = serializeOrderListForTracking({ id: 1, orderNumber: "MSC-1", status: "PROCESSING", createdAt: new Date(), subtotal: 500, customerName: "Private", customerMobile: "9876543210", deliveryAddress: "Private address", notes: "Private note", items: [{ productName: "Cement", quantity: 1, unit: "bag", price: 500, total: 500 }], bill: { finalAmount: 450, discount: 50 }, payments: [{ amount: 450 }] });
    expect(summary).toMatchObject({ orderNumber: "MSC-1", total: 450, items: [{ productName: "Cement", quantity: 1, unit: "bag" }] });
    for (const field of ["id", "customerName", "customerMobile", "deliveryAddress", "notes", "subtotal", "bill", "payments", "price"]) expect(JSON.stringify(summary)).not.toContain(`\"${field}\"`);
  });

  it("does not expose customer data in public API", async () => {
    const res = await supertest(app).get("/api/products");
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain("customerMobile");
    expect(body).not.toContain("deliveryAddress");
  });

  it("does not expose admin data in public API", async () => {
    const res = await supertest(app).get("/api/settings/public");
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain("passwordHash");
    expect(body).not.toContain("adminId");
  });
});

describe("Native public API boundary", () => {
  it("returns privacy-minimized order summaries for mobile history", async () => {
    const res = await supertest(app).get("/api/public/orders/track-by-mobile?customerMobile=9876543210");
    expect(res.status).toBe(200);
    expect(res.body.orders.length).toBeGreaterThan(0);
    expect(res.body.orders[0]).toEqual(expect.objectContaining({ orderNumber: expect.any(String), status: expect.any(String), createdAt: expect.any(String), total: expect.any(Number), items: expect.any(Array) }));
    const body = JSON.stringify(res.body);
    for (const field of ["customerName", "customerMobile", "deliveryAddress", "notes", "subtotal", "bill", "payments", "price"]) expect(body).not.toContain(`\"${field}\"`);
  });

  it("keeps detailed customer tracking free of private and internal fields", async () => {
    const order = await prisma.order.findFirst({ where: { customerMobile: "9876543210" }, orderBy: { createdAt: "desc" } });
    expect(order).not.toBeNull();
    const res = await supertest(app).get(`/api/public/orders/track?orderNumber=${encodeURIComponent(order!.orderNumber)}&customerMobile=9876543210`);
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    for (const field of ["deliveryAddress", "notes", "customerMobile", "id", "payments"]) expect(body).not.toContain(`\"${field}\"`);
  });

  it("rejects unbounded or invalid public product pagination", async () => {
    expect((await supertest(app).get("/api/public/products?limit=51")).status).toBe(400);
    expect((await supertest(app).get("/api/public/products?page=0")).status).toBe(400);
    expect((await supertest(app).get("/api/public/products?limit=not-a-number")).status).toBe(400);
  });

  it("supports whitelisted public product sorting and rejects invalid sort values", async () => {
    const ascending = await supertest(app).get("/api/public/products?sort=price_asc&limit=12");
    expect(ascending.status).toBe(200);
    const prices = ascending.body.products.map((product: any) => product.price);
    expect(prices).toEqual([...prices].sort((a: number, b: number) => a - b));

    const invalid = await supertest(app).get("/api/public/products?sort=rating_desc");
    expect(invalid.status).toBe(400);
  });

  it("supports real in-stock and description/category search filters", async () => {
    const inStock = await supertest(app).get("/api/public/products?inStock=true&limit=12");
    expect(inStock.status).toBe(200);
    expect(inStock.body.products.every((product: any) => product.stock > 0)).toBe(true);

    const categorySearch = await supertest(app).get("/api/public/products?search=Test%20Category&limit=12");
    expect(categorySearch.status).toBe(200);
    expect(categorySearch.body.products.length).toBeGreaterThan(0);
  });

  it("allows the reviewed native assistant endpoint without a CSRF cookie", async () => {
    const res = await supertest(app)
      .post("/api/public/construction-assistant/chat")
      .send({ message: "hello", language: "English" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toBeTruthy();
  });

  it("allows native order creation and ignores legacy customer payment fields", async () => {
    const product = await prisma.product.findFirst({ where: { isActive: true, stock: { gte: 1 } } });
    expect(product).toBeDefined();

    // Zod strips unknown legacy fields for compatibility with older website
    // bundles, and the public route never creates payment records from them.
    const created = await supertest(app)
      .post("/api/public/orders")
      .send({
        customerName: "Native Customer",
        customerMobile: "9876543210",
        cashAmount: 999999,
        onlineAmount: 999999,
        deliveryAddress: "Test address",
        items: [{ productId: product!.id, quantity: 1 }],
      });
    expect(created.status).toBe(201);
    const paymentCount = await prisma.orderPayment.count({ where: { orderId: created.body.order.id } });
    expect(paymentCount).toBe(0);
  });

  it("replays the same idempotency key without creating or decrementing twice", async () => {
    const product = await prisma.product.findFirst({ where: { name: "Test Product" } });
    await prisma.product.update({ where: { id: product!.id }, data: { stock: 10 } });
    const payload = { customerName: "Idempotent Customer", customerMobile: "9876543210", deliveryAddress: "Test address", items: [{ productId: product!.id, quantity: 1 }] };
    const key = "mobile-test-idempotency-one";
    const first = await supertest(app).post("/api/public/orders").set("Idempotency-Key", key).send(payload);
    const replay = await supertest(app).post("/api/public/orders").set("Idempotency-Key", key).send(payload);
    expect(first.status).toBe(201);
    expect(replay.status).toBe(200);
    expect(replay.body.order.id).toBe(first.body.order.id);
    expect(await prisma.order.count({ where: { clientRequestId: key } })).toBe(1);
    expect(Number((await prisma.product.findUnique({ where: { id: product!.id } }))!.stock)).toBe(9);

    const different = await supertest(app).post("/api/public/orders").set("Idempotency-Key", "mobile-test-idempotency-two").send(payload);
    expect(different.status).toBe(201);
    expect(different.body.order.id).not.toBe(first.body.order.id);
  });

  it("rejects a materially different payload that reuses an idempotency key", async () => {
    const product = await prisma.product.findFirst({ where: { name: "Test Product" } });
    await prisma.product.update({ where: { id: product!.id }, data: { stock: 10 } });
    const key = "mobile-test-idempotency-conflict";
    const original = { customerName: "Original Attempt", customerMobile: "9876543210", deliveryAddress: "First address", items: [{ productId: product!.id, quantity: 1 }] };
    const first = await supertest(app).post("/api/public/orders").set("Idempotency-Key", key).send(original);
    const conflict = await supertest(app).post("/api/public/orders").set("Idempotency-Key", key).send({ ...original, deliveryAddress: "Changed address" });
    expect(first.status).toBe(201);
    expect(conflict.status).toBe(409);
    expect(await prisma.order.count({ where: { clientRequestId: key } })).toBe(1);
    expect(Number((await prisma.product.findUnique({ where: { id: product!.id } }))!.stock)).toBe(9);
  });

  it("allows only one concurrent order for one remaining stock unit", async () => {
    const category = await prisma.category.findFirst({ where: { slug: "test-category" } });
    const product = await prisma.product.create({ data: { name: "Concurrency Product", unit: "piece", price: 50, mrp: 60, stock: 1, isActive: true, categoryId: category!.id } });
    const payload = { customerName: "Concurrent Customer", customerMobile: "9876543210", deliveryAddress: "Test address", items: [{ productId: product.id, quantity: 1 }] };
    const responses = await Promise.all([
      supertest(app).post("/api/public/orders").set("Idempotency-Key", "mobile-concurrent-key-one").send(payload),
      supertest(app).post("/api/public/orders").set("Idempotency-Key", "mobile-concurrent-key-two").send(payload),
    ]);
    expect(responses.filter((response) => response.status === 201)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 400 || response.status === 409)).toHaveLength(1);
    expect(Number((await prisma.product.findUnique({ where: { id: product.id } }))!.stock)).toBe(0);
  });

  it("collapses concurrent requests sharing one idempotency key", async () => {
    const product = await prisma.product.findFirst({ where: { name: "Test Product" } });
    await prisma.product.update({ where: { id: product!.id }, data: { stock: 10 } });
    const payload = { customerName: "Same Attempt", customerMobile: "9876543210", deliveryAddress: "Test address", items: [{ productId: product!.id, quantity: 1 }] };
    const key = "mobile-concurrent-same-key";
    const responses = await Promise.all([
      supertest(app).post("/api/public/orders").set("Idempotency-Key", key).send(payload),
      supertest(app).post("/api/public/orders").set("Idempotency-Key", key).send(payload),
    ]);
    expect(responses.every((response) => response.status === 200 || response.status === 201)).toBe(true);
    expect(new Set(responses.map((response) => response.body.order.id)).size).toBe(1);
    expect(await prisma.order.count({ where: { clientRequestId: key } })).toBe(1);
    expect(Number((await prisma.product.findUnique({ where: { id: product!.id } }))!.stock)).toBe(9);
  });

  it("keeps the legacy browser mutation route CSRF protected", async () => {
    const res = await supertest(app)
      .post("/api/construction-assistant/chat")
      .send({ message: "hello", language: "English" });
    expect(res.status).toBe(403);
  });
});

describe("Health endpoint", () => {
  it("returns health status", async () => {
    const res = await supertest(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("ms-sushant-construction");
  });
});

describe("Construction Assistant (local rule-based)", () => {
  it("builds explicit English, Hindi, and Hinglish provider language directives", () => {
    expect(buildGroqPrompt("What is cement used for?", "", "English")).toContain("Reply only in clear English");
    expect(buildGroqPrompt("सीमेंट का उपयोग कहाँ होता है?", "", "Hindi")).toContain("Hindi using Devanagari");
    expect(buildGroqPrompt("cement ka use kaha hota hai?", "", "Hinglish")).toContain("Hinglish using Roman script");
    expect(detectGroqResponseLanguage("What is cement used for?", "English")).toBe("English");
    expect(detectGroqResponseLanguage("सीमेंट का उपयोग कहाँ होता है?", "English")).toBe("Hindi");
    expect(detectGroqResponseLanguage("ghar banane me cement ka use kaha hota hai?", "English")).toBe("Hinglish");
  });

  it("answers a Hindi house-size query from the local dataset", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "मुझे 40 बाई 35 का घर बनाना है", language: "Hindi" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain("1,400 sq.ft");
    expect(res.body.language).toBe("Hindi");
  });

  it("remembers the session across turns (multi-turn)", async () => {
    const { agent, token } = await getCsrf();
    const first = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "40x35 house banana hai", language: "English" });
    expect(first.status).toBe(200);
    const sessionId = first.body.sessionId;
    expect(sessionId).toBeTruthy();

    const second = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "2 floor", sessionId, language: "English" });
    expect(second.status).toBe(200);

    const third = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "premium", sessionId, language: "English" });
    expect(third.status).toBe(200);
    expect(third.body.reply).toContain("Cement");
    expect(third.body.reply).toContain("Steel");
  });

  it("answers roof material query from local knowledge", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "छत बनाने में क्या क्या लगेगा", language: "Hindi" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/Cement|सीमेंट/i);
    expect(res.body.reply).toMatch(/TMT steel|सरिया|स्टील/i);
  });

  it("answers foundation material query from local knowledge", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "foundation ke liye kya chahiye?", language: "English" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain("Excavation");
    expect(res.body.reply).toContain("PCC bed");
  });

  it("answers how-much-cement after a size is provided", async () => {
    const { agent, token } = await getCsrf();
    const first = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "40x35 house", language: "English" });
    expect(first.status).toBe(200);
    const sessionId = first.body.sessionId;

const q = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "how much cement?", sessionId, language: "English" });
    expect(q.status).toBe(200);
    expect(q.body.reply.toLowerCase()).toContain("cement");
  });

  it("does not give unsafe structural dimensions", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "column size kya rakhe?", language: "English" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/structural engineer|स्ट्रक्चरल इंजीनियर/i);
  });

  it("explains a cement company from the local dataset", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "ACC cement ke bare me batao", language: "Hindi" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain("ACC");
    expect(res.body.reply).toContain("फायदे");
  });

it("gives cement recommendation guidance for an application", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "which cement is good for plaster?", language: "English" });
    expect(res.status).toBe(200);
    expect(res.body.reply.toLowerCase()).toContain("cement");
  });

  it("handles natural small talk (kaise ho)", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "kaise ho", language: "Hindi" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/बढ़िया|अच्छा|हूँ/i);
  });

  it("uses total area (area × floors) for later material questions", async () => {
    const { agent, token } = await getCsrf();
    const first = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "40x35 house", language: "English" });
    const sessionId = first.body.sessionId;
    await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "2 floor", sessionId, language: "English" });
    await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "normal", sessionId, language: "English" });
    const cement = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "cement kitna lagega", sessionId, language: "English" });
    // 1400 × 2 = 2800 sq.ft → ~1120 bags
    expect(cement.body.reply).toContain("1,120");
  });

  it("returns conversation context and producedEstimate flags", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "40x35 ka ghar banana hai", language: "Hindi" });
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBeTruthy();
    expect(res.body).toHaveProperty("conversation");
    expect(res.body).toHaveProperty("producedEstimate");
  });

  it("returns a natural welcome greeting on hello", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "hello", language: "Hindi" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain("स्वागत");
  });

it("explains the construction sequence", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "ghar banane ka sequence kya hai", language: "Hindi" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/foundation|नींव/i);
    expect(res.body.reply).toMatch(/roof|छत/i);
  });
});

describe("Construction Assistant PART 2 (Phases 11-30)", () => {
  it("answers a comparison (OPC vs PPC)", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "OPC vs PPC which is better?", language: "English" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain("OPC");
    expect(res.body.reply).toContain("PPC");
  });

  it("provides a material checklist", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "material list for building a house", language: "English" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/FOUNDATION/i);
    expect(res.body.reply).toMatch(/ROOF/i);
  });

  it("answers a why question", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "why steel in roof?", language: "English" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/tensile/i);
  });

  it("answers a cost breakdown after size is known", async () => {
    const { agent, token } = await getCsrf();
    const first = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "40x35 house", language: "English" });
    const sessionId = first.body.sessionId;
    await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "2 floor", sessionId, language: "English" });
    await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "normal", sessionId, language: "English" });
    const res = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "cost breakdown", sessionId, language: "English" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/Material/i);
    expect(res.body.reply).toMatch(/Labour/i);
  });

  it("estimates area from a room-based description", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "3 room 1 kitchen 2 bathroom", language: "English" });
    expect(res.status).toBe(200);
    expect(res.body.reply.toLowerCase()).toContain("sq.ft");
  });

  it("answers a product lookup (ACC F2R)", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "ACC F2R ke bare me batao", language: "Hindi" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain("ACC");
    expect(res.body.reply).toContain("F2R");
  });

  it("answers a construction stage guide", async () => {
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/construction-assistant/chat")
      .set("X-CSRF-Token", token)
      .send({ message: "ghar kaise banta hai?", language: "Hindi" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/foundation|नींव/i);
    expect(res.body.reply).toMatch(/roof|छत/i);
  });
});
