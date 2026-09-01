import { describe, it, expect, beforeAll } from "vitest";
import supertest from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { hashPassword } from "../src/utils/password.js";

let app: ReturnType<typeof createApp>;

const TEST_PASSWORD = "stock-adj-pass-atleast-12";
let adminToken: string;
let agent: supertest.Agent;
let testCatId: number;

async function getCsrf() {
  const ag = supertest.agent(app);
  const res = await ag.get("/api/csrf");
  const setCookie = res.headers["set-cookie"] as string | string[] | undefined;
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ""];
  const csrfCookie = cookies.find((c: string) => c.startsWith("ms_sushant_csrf="));
  const token = csrfCookie
    ? decodeURIComponent(csrfCookie.split("=")[1].split(";")[0])
    : "";
  return { agent: ag, token };
}

beforeAll(async () => {
  app = createApp();

  // Create test admin
  const hash = await hashPassword(TEST_PASSWORD);
  await prisma.admin.deleteMany({ where: { username: "stockadmin" } });
  await prisma.admin.create({
    data: { username: "stockadmin", passwordHash: hash, email: "stock@example.com" },
  });

  const csrf = await getCsrf();
  agent = csrf.agent;
  adminToken = csrf.token;

  const login = await agent
    .post("/api/admin/auth/login")
    .set("X-CSRF-Token", adminToken)
    .send({ username: "stockadmin", password: TEST_PASSWORD });
  expect(login.status).toBe(200);

  const cat = await prisma.category.create({
    data: { name: "Stock Test Cat", slug: `stock-cat-${Date.now()}`, displayOrder: 1 },
  });
  testCatId = cat.id;
});

describe("Godam Stock Adjustments & History", () => {
  it("CASE 1: Current stock = 984, Add = 200 -> Expected = 1184", async () => {
    const p = await prisma.product.create({
      data: {
        name: "Nuvoco Cover Block",
        unit: "piece",
        price: 2.5,
        mrp: 4.0,
        stock: 984,
        categoryId: testCatId,
      },
    });

    const res = await agent
      .patch(`/api/admin/products/${p.id}/stock`)
      .set("X-CSRF-Token", adminToken)
      .send({ action: "ADD", quantity: 200, supplier: "ABC Supplier", purchaseRate: 2.0 });

    expect(res.status).toBe(200);
    expect(res.body.product.stock).toBe(1184);

    const check = await prisma.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(Number(check.stock)).toBe(1184);
  });

  it("CASE 2: Current stock = 167.5, Add = 2.5 -> Expected = 170 (decimal stock)", async () => {
    const p = await prisma.product.create({
      data: {
        name: "Tata TMT Wire",
        unit: "kg",
        price: 75,
        mrp: 80,
        stock: 167.5,
        categoryId: testCatId,
      },
    });

    const res = await agent
      .patch(`/api/admin/products/${p.id}/stock`)
      .set("X-CSRF-Token", adminToken)
      .send({ action: "ADD", quantity: 2.5 });

    expect(res.status).toBe(200);
    expect(res.body.product.stock).toBe(170);

    const check = await prisma.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(Number(check.stock)).toBe(170);
  });

  it("CASE 3: Current stock = 100, Remove = 25 with reason 'Damage' -> Expected = 75", async () => {
    const p = await prisma.product.create({
      data: {
        name: "Red Bricks Class A",
        unit: "piece",
        price: 10,
        mrp: 12,
        stock: 100,
        categoryId: testCatId,
      },
    });

    const res = await agent
      .patch(`/api/admin/products/${p.id}/stock`)
      .set("X-CSRF-Token", adminToken)
      .send({ action: "DEDUCT", quantity: 25, reason: "Damage", note: "Damaged during unloading" });

    expect(res.status).toBe(200);
    expect(res.body.product.stock).toBe(75);

    const check = await prisma.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(Number(check.stock)).toBe(75);
  });

  it("CASE 4: Current = 20, Remove = 25 -> Rejected 400 (Cannot deduct), stock remains 20", async () => {
    const p = await prisma.product.create({
      data: {
        name: "UltraTech Super",
        unit: "bag",
        price: 450,
        mrp: 480,
        stock: 20,
        categoryId: testCatId,
      },
    });

    const res = await agent
      .patch(`/api/admin/products/${p.id}/stock`)
      .set("X-CSRF-Token", adminToken)
      .send({ action: "DEDUCT", quantity: 25, reason: "Stock Correction" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Cannot deduct 25 bag/i);

    const check = await prisma.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(Number(check.stock)).toBe(20);
  });

  it("CASE 5: Remove without reason -> Validation error 400", async () => {
    const p = await prisma.product.create({
      data: {
        name: "Dr. Fixit 101 LW+",
        unit: "litre",
        price: 180,
        mrp: 210,
        stock: 50,
        categoryId: testCatId,
      },
    });

    const res = await agent
      .patch(`/api/admin/products/${p.id}/stock`)
      .set("X-CSRF-Token", adminToken)
      .send({ action: "DEDUCT", quantity: 5 }); // Missing reason

    expect(res.status).toBe(400);
    const msg = res.body.details?.[0]?.message || res.body.error;
    expect(msg).toMatch(/Reason is required/i);
  });

  it("CASE 6: Current = 5, Remove = 5 with reason -> Expected 0 (Out of stock)", async () => {
    const p = await prisma.product.create({
      data: {
        name: "PVC Pipe 4 inch",
        unit: "piece",
        price: 320,
        mrp: 350,
        stock: 5,
        categoryId: testCatId,
      },
    });

    const res = await agent
      .patch(`/api/admin/products/${p.id}/stock`)
      .set("X-CSRF-Token", adminToken)
      .send({ action: "DEDUCT", quantity: 5, reason: "Lost / Missing" });

    expect(res.status).toBe(200);
    expect(res.body.product.stock).toBe(0);

    const check = await prisma.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(Number(check.stock)).toBe(0);
  });

  it("CASE 7: Manual stock adjustment does NOT create sales, payment, or due records", async () => {
    const orderCountBefore = await prisma.order.count();
    const paymentCountBefore = await prisma.orderPayment.count();

    const p = await prisma.product.create({
      data: {
        name: "Binding Wire Coil",
        unit: "kg",
        price: 85,
        mrp: 95,
        stock: 500,
        categoryId: testCatId,
      },
    });

    await agent
      .patch(`/api/admin/products/${p.id}/stock`)
      .set("X-CSRF-Token", adminToken)
      .send({ action: "ADD", quantity: 100 });

    await agent
      .patch(`/api/admin/products/${p.id}/stock`)
      .set("X-CSRF-Token", adminToken)
      .send({ action: "DEDUCT", quantity: 10, reason: "Damage" });

    const orderCountAfter = await prisma.order.count();
    const paymentCountAfter = await prisma.orderPayment.count();

    expect(orderCountAfter).toBe(orderCountBefore);
    expect(paymentCountAfter).toBe(paymentCountBefore);
  });

  it("CASE 8: Stock history endpoint returns accurate audit logs and order references", async () => {
    const p = await prisma.product.create({
      data: {
        name: "History Test Cement",
        unit: "bag",
        price: 400,
        mrp: 440,
        stock: 100,
        categoryId: testCatId,
      },
    });

    // 1. Add 50
    await agent
      .patch(`/api/admin/products/${p.id}/stock`)
      .set("X-CSRF-Token", adminToken)
      .send({ action: "ADD", quantity: 50, supplier: "ACC Cements Ltd", note: "50 bags received" });

    // 2. Remove 5
    await agent
      .patch(`/api/admin/products/${p.id}/stock`)
      .set("X-CSRF-Token", adminToken)
      .send({ action: "DEDUCT", quantity: 5, reason: "Damage" });

    // 3. Create an order with this product
    const order = await prisma.order.create({
      data: {
        orderNumber: `HIST-${Date.now()}`,
        customerName: "Mohan Lal",
        customerMobile: "9876543299",
        subtotal: 4000,
        status: "CONFIRMED",
        items: {
          create: [{
            productId: p.id,
            productName: p.name,
            unit: p.unit,
            price: 400,
            quantity: 10,
            total: 4000,
          }],
        },
      },
    });

    const res = await agent.get(`/api/admin/products/${p.id}/stock-history`);
    expect(res.status).toBe(200);
    expect(res.body.productId).toBe(p.id);
    expect(res.body.history.length).toBeGreaterThanOrEqual(3);

    const types = res.body.history.map((h: any) => h.type);
    expect(types).toContain("ADD");
    expect(types).toContain("REMOVE");
    expect(types).toContain("ORDER");

    // Clean up test order
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
    await prisma.order.delete({ where: { id: order.id } });
  });
});
