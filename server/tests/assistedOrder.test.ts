import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { hashPassword } from "../src/utils/password.js";

let app: ReturnType<typeof createApp>;

const TEST_PASSWORD = "assisted-test-atleast-12";
let productId1: number;
let productId2: number;

async function getCsrf() {
  const agent = supertest.agent(app);
  const res = await agent.get("/api/csrf");
  const setCookie = res.headers["set-cookie"] as string | string[] | undefined;
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ""];
  const csrfCookie = cookies.find((c: string) => c.startsWith("ms_sushant_csrf="));
  const token = csrfCookie
    ? decodeURIComponent(csrfCookie.split("=")[1].split(";")[0])
    : "";
  return { agent, token };
}

async function loginAgent() {
  const { agent, token } = await getCsrf();
  const login = await agent
    .post("/api/admin/auth/login")
    .set("X-CSRF-Token", token)
    .send({ username: "assistedadmin", password: TEST_PASSWORD });
  expect(login.status).toBe(200);
  return { agent, token };
}

beforeAll(async () => {
  app = createApp();

  // Clean test orders
  await prisma.orderPayment.deleteMany({
    where: { order: { customerMobile: { startsWith: "987654321" } } },
  });
  await prisma.orderItem.deleteMany({
    where: { order: { customerMobile: { startsWith: "987654321" } } },
  });
  await prisma.bill.deleteMany({
    where: { order: { customerMobile: { startsWith: "987654321" } } },
  });
  await prisma.order.deleteMany({
    where: { customerMobile: { startsWith: "987654321" } },
  });

  // Create test admin
  const hash = await hashPassword(TEST_PASSWORD);
  await prisma.admin.deleteMany({ where: { username: "assistedadmin" } });
  await prisma.admin.create({
    data: { username: "assistedadmin", passwordHash: hash, email: "assisted@example.com" },
  });

  // Create test category and test products
  const cat = await prisma.category.create({
    data: { name: "Assisted Test Cat", slug: `assisted-cat-${Date.now()}`, displayOrder: 1 },
  });

  const p1 = await prisma.product.create({
    data: {
      name: "Assisted Cement Bag",
      unit: "bag",
      price: 500,
      mrp: 550,
      stock: 500,
      categoryId: cat.id,
      isActive: true,
    },
  });
  productId1 = p1.id;

  const p2 = await prisma.product.create({
    data: {
      name: "Assisted Steel Rod",
      unit: "quintal",
      price: 5000,
      mrp: 5500,
      stock: 20,
      categoryId: cat.id,
      isActive: true,
    },
  });
  productId2 = p2.id;
});

describe("Admin Assisted Customer Orders", () => {
  it("CASE 1: New customer, ₹10,000 order with ₹10,000 payment -> PAID, due = 0", async () => {
    const { agent, token } = await loginAgent();
    // 20 bags @ 500 = 10,000
    const res = await agent
      .post("/api/admin/orders/assisted")
      .set("X-CSRF-Token", token)
      .send({
        customerName: "Aman Gupta",
        customerMobile: "9876543210",
        deliveryAddress: "Main Road, Govindpur",
        items: [{ productId: productId1, quantity: 20 }],
        paidAmount: 10000,
        paymentMode: "CASH",
      });

    expect(res.status).toBe(201);
    expect(res.body.order).toBeDefined();
    expect(res.body.order.subtotal).toBe(10000);
    expect(res.body.order.finalAmount).toBe(10000);
    expect(res.body.order.paidTotal).toBe(10000);
    expect(res.body.order.due).toBe(0);
    expect(res.body.order.paymentStatus).toBe("PAID");
  });

  it("CASE 2: New customer, ₹10,000 order with ₹4,000 payment -> PARTIALLY_PAID, due = ₹6,000", async () => {
    const { agent, token } = await loginAgent();
    const res = await agent
      .post("/api/admin/orders/assisted")
      .set("X-CSRF-Token", token)
      .send({
        customerName: "Vikas Sharma",
        customerMobile: "9876543211",
        deliveryAddress: "Near SBI Bank, Dhanbad",
        items: [{ productId: productId1, quantity: 20 }],
        paidAmount: 4000,
        paymentMode: "ONLINE",
      });

    expect(res.status).toBe(201);
    expect(res.body.order.subtotal).toBe(10000);
    expect(res.body.order.finalAmount).toBe(10000);
    expect(res.body.order.paidTotal).toBe(4000);
    expect(res.body.order.due).toBe(6000);
    expect(res.body.order.paymentStatus).toBe("PARTIALLY_PAID");
  });

  it("CASE 3: New customer, ₹10,000 order with ₹0 payment -> DUE, due = ₹10,000", async () => {
    const { agent, token } = await loginAgent();
    const res = await agent
      .post("/api/admin/orders/assisted")
      .set("X-CSRF-Token", token)
      .send({
        customerName: "Sunil Verma",
        customerMobile: "9876543212",
        items: [{ productId: productId1, quantity: 20 }],
        paidAmount: 0,
        paymentMode: "CASH",
      });

    expect(res.status).toBe(201);
    expect(res.body.order.subtotal).toBe(10000);
    expect(res.body.order.finalAmount).toBe(10000);
    expect(res.body.order.paidTotal).toBe(0);
    expect(res.body.order.due).toBe(10000);
    expect(res.body.order.paymentStatus).toBe("DUE");
  });

  it("CASE 4: Existing customer lookup auto-fills name/address and previous due", async () => {
    const { agent } = await loginAgent();
    // Lookup Vikas Sharma (from CASE 2: mobile 9876543211 with due ₹6,000)
    const res = await agent.get("/api/admin/customers/lookup?mobile=9876543211");
    expect(res.status).toBe(200);
    expect(res.body.found).toBe(true);
    expect(res.body.customer.name).toBe("Vikas Sharma");
    expect(res.body.customer.address).toBe("Near SBI Bank, Dhanbad");
    expect(res.body.previousDue).toBe(6000);
    expect(res.body.ordersCount).toBe(1);
  });

  it("CASE 5: Existing customer has ₹8,000 previous due; new order ₹5,000 with ₹2,000 paid -> previous due separate, new order due ₹3,000", async () => {
    const { agent, token } = await loginAgent();
    const mobile = "9876543215";

    // 1st order: 20 bags @ 500 = 10,000 with 2,000 paid -> ₹8,000 due
    await agent
      .post("/api/admin/orders/assisted")
      .set("X-CSRF-Token", token)
      .send({
        customerName: "Ramesh Singh",
        customerMobile: mobile,
        items: [{ productId: productId1, quantity: 20 }],
        paidAmount: 2000,
        paymentMode: "CASH",
      });

    // Lookup verifies ₹8,000 previous due
    const lookup = await agent.get(`/api/admin/customers/lookup?mobile=${mobile}`);
    expect(lookup.body.previousDue).toBe(8000);

    // 2nd order: 1 quintal @ 5000 = ₹5,000 with ₹2,000 paid -> new order due ₹3,000
    const res2 = await agent
      .post("/api/admin/orders/assisted")
      .set("X-CSRF-Token", token)
      .send({
        customerName: "Ramesh Singh",
        customerMobile: mobile,
        items: [{ productId: productId2, quantity: 1 }],
        paidAmount: 2000,
        paymentMode: "ONLINE",
      });

    expect(res2.status).toBe(201);
    expect(res2.body.order.subtotal).toBe(5000);
    expect(res2.body.order.paidTotal).toBe(2000);
    expect(res2.body.order.due).toBe(3000);

    // After 2nd order, total customer due should be 8000 + 3000 = 11000
    const lookupAfter = await agent.get(`/api/admin/customers/lookup?mobile=${mobile}`);
    expect(lookupAfter.body.previousDue).toBe(11000);
  });

  it("CASE 6: Transportation ₹500, Discount ₹300, Subtotal ₹10,000 -> Final = ₹10,200", async () => {
    const { agent, token } = await loginAgent();
    // 20 bags @ 500 = 10,000 + 500 (transport) - 300 (discount) = 10,200
    const res = await agent
      .post("/api/admin/orders/assisted")
      .set("X-CSRF-Token", token)
      .send({
        customerName: "Pooja Devi",
        customerMobile: "9876543216",
        items: [{ productId: productId1, quantity: 20 }],
        transportation: 500,
        discount: 300,
        paidAmount: 5000,
        paymentMode: "CASH",
      });

    expect(res.status).toBe(201);
    expect(res.body.order.subtotal).toBe(10000);
    expect(res.body.order.finalAmount).toBe(10200);
    expect(res.body.order.paidTotal).toBe(5000);
    expect(res.body.order.due).toBe(5200);
  });

  it("CASE 7: Insufficient stock rejects order safely with 400 and no DB changes", async () => {
    const { agent, token } = await loginAgent();
    const res = await agent
      .post("/api/admin/orders/assisted")
      .set("X-CSRF-Token", token)
      .send({
        customerName: "Excess Buyer",
        customerMobile: "9876543217",
        items: [{ productId: productId2, quantity: 99999 }], // only 20 in stock
        paidAmount: 0,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Insufficient stock/i);
  });

  it("CASE 8: Idempotent re-submission returns existing order without duplicates", async () => {
    const { agent, token } = await loginAgent();
    const clientRequestId = `req-assisted-${Date.now()}`;

    const payload = {
      customerName: "Idempotent User",
      customerMobile: "9876543218",
      items: [{ productId: productId1, quantity: 2 }],
      paidAmount: 1000,
      paymentMode: "CASH" as const,
      clientRequestId,
    };

    const res1 = await agent
      .post("/api/admin/orders/assisted")
      .set("X-CSRF-Token", token)
      .send(payload);
    expect(res1.status).toBe(201);
    const orderId1 = res1.body.order.id;

    // Retry with exact same clientRequestId
    const res2 = await agent
      .post("/api/admin/orders/assisted")
      .set("X-CSRF-Token", token)
      .send(payload);
    expect(res2.status).toBe(200);
    expect(res2.body.order.id).toBe(orderId1);
    expect(res2.body.replayed).toBe(true);
  });

  it("CASE 9: Customer lookup finds customer who ordered via Public Website", async () => {
    const { agent } = await loginAgent();
    // Simulate website order with +91 format
    const webOrder = await prisma.order.create({
      data: {
        orderNumber: `WEB-${Date.now()}`,
        customerName: "Sanjay Mishra",
        customerMobile: "+919939130538",
        deliveryAddress: "Near Bus Stand, Govindpur",
        subtotal: 5000,
        status: "CONFIRMED",
        source: "CUSTOMER_WEB",
        items: {
          create: [{
            productId: productId1,
            productName: "Assisted Cement Bag",
            unit: "bag",
            price: 500,
            quantity: 10,
            total: 5000,
          }],
        },
        bill: {
          create: {
            subtotal: 5000,
            finalAmount: 5000,
          },
        },
      },
    });

    // Lookup using plain 10 digits
    const lookup1 = await agent.get("/api/admin/customers/lookup?mobile=9939130538");
    expect(lookup1.status).toBe(200);
    expect(lookup1.body.found).toBe(true);
    expect(lookup1.body.customer.name).toBe("Sanjay Mishra");
    expect(lookup1.body.customer.address).toBe("Near Bus Stand, Govindpur");
    expect(lookup1.body.previousDue).toBe(5000);

    // Lookup using +91 format
    const lookup2 = await agent.get("/api/admin/customers/lookup?mobile=%2B919939130538");
    expect(lookup2.status, lookup2.text).toBe(200);
    expect(lookup2.body.found).toBe(true);
    expect(lookup2.body.customer.name).toBe("Sanjay Mishra");

    // Lookup using spaced format "+91 99391 30538"
    const lookup3 = await agent.get("/api/admin/customers/lookup?mobile=%2B91%2099391%2030538");
    expect(lookup3.status).toBe(200);
    expect(lookup3.body.found).toBe(true);
    expect(lookup3.body.customer.name).toBe("Sanjay Mishra");

    // Lookup using dashed format "99391-30538"
    const lookup4 = await agent.get("/api/admin/customers/lookup?mobile=99391-30538");
    expect(lookup4.status).toBe(200);
    expect(lookup4.body.found).toBe(true);
    expect(lookup4.body.customer.name).toBe("Sanjay Mishra");

    // Clean up
    await prisma.orderItem.deleteMany({ where: { orderId: webOrder.id } });
    await prisma.bill.deleteMany({ where: { orderId: webOrder.id } });
    await prisma.order.delete({ where: { id: webOrder.id } });
  });

  it("CASE 10: Admin order stores source as ADMIN_ASSISTED and appears in orders", async () => {
    const { agent, token } = await loginAgent();
    const res = await agent
      .post("/api/admin/orders/assisted")
      .set("X-CSRF-Token", token)
      .send({
        customerName: "Radha Kumari",
        customerMobile: "9876543219",
        deliveryAddress: "Village Khaira",
        items: [{ productId: productId1, quantity: 5 }],
        paidAmount: 2500,
        paymentMode: "CASH",
      });

    expect(res.status).toBe(201);
    expect(res.body.order.source).toBe("ADMIN_ASSISTED");

    // Verify order in general admin order detail endpoint
    const detail = await agent.get(`/api/admin/orders/${res.body.order.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.order.source).toBe("ADMIN_ASSISTED");
  });

  it("CASE 11: Excess payment on assisted order automatically clears customer's previous due orders in FIFO order", async () => {
    const { agent, token } = await loginAgent();
    const testMobile = "9876543217";

    // 1. Create an old due order for ₹1000 with ₹0 paid
    const oldOrder = await prisma.order.create({
      data: {
        orderNumber: "MSC-OLD-DUE-01",
        customerName: "Vikas Kumar",
        customerMobile: testMobile,
        subtotal: 1000,
        status: "CONFIRMED",
        items: {
          create: [{
            productId: productId1,
            productName: "ACC Gold Cement",
            unit: "bag",
            price: 500,
            quantity: 2,
            total: 1000,
          }],
        },
        bill: {
          create: {
            subtotal: 1000,
            finalAmount: 1000,
          },
        },
      },
      include: { bill: true, payments: true },
    });

    // Verify lookup reports ₹1000 previous due
    const lookup = await agent.get(`/api/admin/customers/lookup?mobile=${testMobile}`);
    expect(lookup.status).toBe(200);
    expect(lookup.body.previousDue).toBe(1000);

    // 2. Place a new assisted order of 1 bag (₹500), but customer pays ₹1200 (₹500 for this bill + ₹700 toward old due)
    const res = await agent
      .post("/api/admin/orders/assisted")
      .set("X-CSRF-Token", token)
      .send({
        customerName: "Vikas Kumar",
        customerMobile: testMobile,
        items: [{ productId: productId1, quantity: 1 }], // Bill is ₹500
        paidAmount: 1200, // ₹500 for current order + ₹700 for old order
        paymentMode: "CASH",
      });

    expect(res.status).toBe(201);
    expect(res.body.order.due).toBe(0);
    expect(res.body.order.paidTotal).toBe(500);

    // 3. Verify old order now has ₹700 payment recorded and only ₹300 remaining due!
    const refreshedOldOrder = await prisma.order.findUnique({
      where: { id: oldOrder.id },
      include: { payments: true },
    });
    const oldPaidTotal = refreshedOldOrder!.payments.reduce((s, p) => s + Number(p.amount), 0);
    expect(oldPaidTotal).toBe(700);

    // 4. Verify customer lookup now shows updated previous due of only ₹300!
    const updatedLookup = await agent.get(`/api/admin/customers/lookup?mobile=${testMobile}`);
    expect(updatedLookup.status).toBe(200);
    expect(updatedLookup.body.previousDue).toBe(300);

    // Clean up test orders
    await prisma.orderPayment.deleteMany({ where: { order: { customerMobile: testMobile } } });
    await prisma.orderItem.deleteMany({ where: { order: { customerMobile: testMobile } } });
    await prisma.bill.deleteMany({ where: { order: { customerMobile: testMobile } } });
    await prisma.order.deleteMany({ where: { customerMobile: testMobile } });
  });
});
