import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { hashPassword } from "../src/utils/password.js";

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

describe("Health endpoint", () => {
  it("returns health status", async () => {
    const res = await supertest(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("ms-sushant-construction");
  });
});
