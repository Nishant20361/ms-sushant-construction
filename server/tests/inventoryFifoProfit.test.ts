import { describe, it, expect, beforeAll } from "vitest";
import supertest from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { hashPassword } from "../src/utils/password.js";

let app: ReturnType<typeof createApp>;

const TEST_PASSWORD = "fifo-profit-pass-atleast-12";
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

  await prisma.orderPayment.deleteMany();
  await prisma.orderItemCostAllocation.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productPurchaseBatch.deleteMany();

  const hash = await hashPassword(TEST_PASSWORD);
  await prisma.admin.deleteMany({ where: { username: "fifoadmin" } });
  await prisma.admin.create({
    data: { username: "fifoadmin", passwordHash: hash, email: "fifo@example.com" },
  });

  const csrf = await getCsrf();
  agent = csrf.agent;
  adminToken = csrf.token;

  const login = await agent
    .post("/api/admin/auth/login")
    .set("X-CSRF-Token", adminToken)
    .send({ username: "fifoadmin", password: TEST_PASSWORD });
  expect(login.status).toBe(200);

  const cat = await prisma.category.create({
    data: { name: "FIFO Test Cat", slug: `fifo-cat-${Date.now()}`, displayOrder: 1 },
  });
  testCatId = cat.id;
});

describe("FIFO Purchase Batch & Khatabook Profit Engine", () => {
  it("creates purchase batches and computes exact cost per unit", async () => {
    const product = await prisma.product.create({
      data: {
        name: "ACC Suraksha Power Cement",
        unit: "bag",
        price: 60,
        mrp: 75,
        stock: 0,
        categoryId: testCatId,
      },
    });

    // 1. Add Batch 1: 50 bags for ₹2500 (cost ₹50/bag)
    const res1 = await agent
      .patch(`/api/admin/products/${product.id}/stock`)
      .set("X-CSRF-Token", adminToken)
      .send({
        action: "ADD",
        quantity: 50,
        totalPurchaseCost: 2500,
        supplier: "ACC Plant Sindri",
        invoiceNumber: "ACC-INV-001",
      });

    expect(res1.status).toBe(200);
    expect(res1.body.product.stock).toBe(50);
    expect(res1.body.batch).toBeDefined();
    expect(res1.body.batch.costPricePerUnit).toBe(50);
    expect(res1.body.batch.totalPurchaseCost).toBe(2500);
    expect(res1.body.batch.remainingQuantity).toBe(50);

    // 2. Add Batch 2: 100 bags for ₹5500 (cost ₹55/bag)
    const res2 = await agent
      .patch(`/api/admin/products/${product.id}/stock`)
      .set("X-CSRF-Token", adminToken)
      .send({
        action: "ADD",
        quantity: 100,
        totalPurchaseCost: 5500,
        supplier: "ACC Plant Sindri",
        invoiceNumber: "ACC-INV-002",
      });

    expect(res2.status).toBe(200);
    expect(res2.body.product.stock).toBe(150);
    expect(res2.body.batch.costPricePerUnit).toBe(55);
    expect(res2.body.batch.totalPurchaseCost).toBe(5500);

    // 3. Update selling price to ₹65/bag
    await agent
      .put(`/api/admin/products/${product.id}`)
      .set("X-CSRF-Token", adminToken)
      .send({
        name: "ACC Suraksha Power Cement",
        unit: "bag",
        price: 65,
        mrp: 80,
        stock: 150,
        categoryId: testCatId,
        isActive: true,
      });

    // 4. Place assisted order for 60 bags at ₹65/bag with ₹50 discount
    const orderRes = await agent
      .post("/api/admin/orders/assisted")
      .set("X-CSRF-Token", adminToken)
      .send({
        customerName: "Ramesh Kumar Contractor",
        customerMobile: "9876543210",
        items: [{ productId: product.id, quantity: 60 }],
        discount: 50,
        paidAmount: 3850, // 60 * 65 = 3900 - 50 = 3850 (Fully Paid)
      });

    expect(orderRes.status).toBe(201);
    const order = orderRes.body.order;

    // Check remaining stock on product
    const updatedProd = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updatedProd.stock).toBe(90); // 150 - 60 = 90

    // Check purchase batches remaining quantity
    const batches = await prisma.productPurchaseBatch.findMany({
      where: { productId: product.id },
      orderBy: { id: "asc" },
    });
    expect(batches[0].remainingQuantity).toBe(0); // 50 allocated completely
    expect(batches[1].remainingQuantity).toBe(90); // 100 - 10 = 90 remaining

    // 5. Query Khatabook Profit Analytics
    const profitRes = await agent
      .get("/api/admin/khatabook/profit")
      .set("X-CSRF-Token", adminToken);

    expect(profitRes.status).toBe(200);
    const profitData = profitRes.body;

    // Gross Profit: (50 bags * (65 - 50) = 750) + (10 bags * (65 - 55) = 100) = ₹850 gross profit
    // Net Profit: ₹850 gross - ₹50 discount = ₹800 net profit
    expect(profitData.dailyProfit.grossProfit).toBe(850);
    expect(profitData.dailyProfit.discountGiven).toBe(50);
    expect(profitData.dailyProfit.netProfit).toBe(800);

    // Current Stock Valuation: 90 remaining bags in Batch 2 @ ₹55 = ₹4950
    expect(profitData.currentStockValuation).toBe(4950);

    // Product breakdown check
    const pBreakdown = profitData.productProfits.find((p: any) => p.productId === product.id);
    expect(pBreakdown).toBeDefined();
    expect(pBreakdown.unitsSold).toBe(60);
    expect(pBreakdown.totalRevenue).toBe(3900);
    expect(pBreakdown.totalCost).toBe(3050); // (50*50 + 10*55 = 2500 + 550)
    expect(pBreakdown.grossProfit).toBe(850);
  });

  it("cancelling an order restores FIFO purchase batches and updates live profit", async () => {
    const product = await prisma.product.create({
      data: {
        name: "Tata Tiscon 12mm TMT Bar",
        unit: "piece",
        price: 450,
        mrp: 500,
        stock: 0,
        categoryId: testCatId,
      },
    });

    // 1. Add batch: 20 pieces for ₹7000 (₹350/piece)
    await agent
      .patch(`/api/admin/products/${product.id}/stock`)
      .set("X-CSRF-Token", adminToken)
      .send({
        action: "ADD",
        quantity: 20,
        totalPurchaseCost: 7000,
        supplier: "Tata Steel Authorised Dealer",
        invoiceNumber: "TATA-99",
      });

    // 2. Place order for 10 pieces @ ₹450 (Revenue = 4500, Cost = 3500, Profit = 1000)
    const orderRes = await agent
      .post("/api/admin/orders/assisted")
      .set("X-CSRF-Token", adminToken)
      .send({
        customerName: "Sushant Construction Project Site",
        customerMobile: "9876543211",
        items: [{ productId: product.id, quantity: 10 }],
        paidAmount: 4500,
      });

    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.order.id;

    let batch = await prisma.productPurchaseBatch.findFirstOrThrow({ where: { productId: product.id } });
    expect(batch.remainingQuantity).toBe(10); // 20 - 10 = 10

    // 3. Cancel the order
    const cancelRes = await agent
      .patch(`/api/admin/orders/${orderId}/status`)
      .set("X-CSRF-Token", adminToken)
      .send({ status: "CANCELLED" });

    expect(cancelRes.status).toBe(200);

    // Verify stock is restored
    const prodAfter = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(prodAfter.stock).toBe(20);

    // Verify batch remaining quantity is restored back to 20
    batch = await prisma.productPurchaseBatch.findFirstOrThrow({ where: { productId: product.id } });
    expect(batch.remainingQuantity).toBe(20);

    // 4. Verify Product Batches API
    const batchesRes = await agent
      .get(`/api/admin/products/${product.id}/batches`)
      .set("X-CSRF-Token", adminToken);

    expect(batchesRes.status).toBe(200);
    expect(batchesRes.body.batches.length).toBe(1);
    expect(batchesRes.body.batches[0].costPricePerUnit).toBe(350);
    expect(batchesRes.body.batches[0].supplierName).toBe("Tata Steel Authorised Dealer");
  });

  it("restores and reallocates FIFO cost when order items are edited", async () => {
    const product = await prisma.product.create({
      data: { name: "Edit-safe FIFO Product", unit: "piece", price: 100, mrp: 120, stock: 0, categoryId: testCatId },
    });
    await agent.patch(`/api/admin/products/${product.id}/stock`).set("X-CSRF-Token", adminToken).send({
      action: "ADD", quantity: 20, totalPurchaseCost: 1000,
    });
    const created = await agent.post("/api/admin/orders/assisted").set("X-CSRF-Token", adminToken).send({
      customerName: "FIFO Edit Customer", customerMobile: "9876543212", items: [{ productId: product.id, quantity: 10 }], paidAmount: 0,
    });
    expect(created.status).toBe(201);

    const edited = await agent.patch(`/api/admin/orders/${created.body.order.id}/edit`).set("X-CSRF-Token", adminToken).send({
      items: [{ productId: product.id, quantity: 15 }],
    });
    expect(edited.status).toBe(200);
    const batch = await prisma.productPurchaseBatch.findFirstOrThrow({ where: { productId: product.id } });
    expect(batch.remainingQuantity).toBe(5);
    const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: created.body.order.id } });
    const allocations = await prisma.orderItemCostAllocation.findMany({ where: { orderItemId: item.id } });
    expect(allocations.reduce((sum, allocation) => sum + allocation.quantity, 0)).toBe(15);
    expect(allocations.reduce((sum, allocation) => sum + Number(allocation.totalCost), 0)).toBe(750);
  });

  it("reports legacy stock as uncosted instead of treating revenue as profit", async () => {
    const product = await prisma.product.create({
      data: { name: "Legacy Uncosted Product", unit: "piece", price: 100, mrp: 120, stock: 5, categoryId: testCatId },
    });
    const created = await agent.post("/api/admin/orders/assisted").set("X-CSRF-Token", adminToken).send({
      customerName: "Legacy Cost Customer", customerMobile: "9876543213", items: [{ productId: product.id, quantity: 2 }], paidAmount: 0,
    });
    expect(created.status).toBe(201);
    const response = await agent.get("/api/admin/khatabook/profit").set("X-CSRF-Token", adminToken);
    expect(response.status).toBe(200);
    const row = response.body.productProfits.find((entry: any) => entry.productId === product.id);
    expect(row.netProfit).toBe(0);
    expect(row.uncostedRevenue).toBe(200);
    expect(response.body.costingCoverage.isComplete).toBe(false);
  });
});
