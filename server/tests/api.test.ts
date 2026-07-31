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
