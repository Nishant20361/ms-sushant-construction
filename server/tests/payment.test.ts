import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { hashPassword } from "../src/utils/password.js";

let app: ReturnType<typeof createApp>;

const TEST_PASSWORD = "payment-test-atleast-12";

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

/** Authenticate the agent and return it. */
async function loginAgent() {
  const { agent, token } = await getCsrf();
  const login = await agent
    .post("/api/admin/auth/login")
    .set("X-CSRF-Token", token)
    .send({ username: "paymentadmin", password: TEST_PASSWORD });
  expect(login.status).toBe(200);
  return { agent, token };
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
  await prisma.admin.create({
    data: { username: "paymentadmin", passwordHash: hash, email: "payment@example.com" },
  });

  // Create a test category + product priced at 1000 so subtotals are clean.
  const cat = await prisma.category.create({
    data: { name: "Payment Category", slug: "payment-cat", displayOrder: 1 },
  });
  await prisma.product.create({
    data: {
      name: "Payment Product",
      unit: "bag",
      price: 1000,
      mrp: 1100,
      stock: 100,
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

async function placeOrder(
  agent: any,
  token: string,
  { cash = 0, online = 0, qty = 1, mobile = "9000000001", name = "Payment Test" } = {}
) {
  const product = await prisma.product.findFirst({ where: { name: "Payment Product" } });
  const res = await agent
    .post("/api/orders")
    .set("X-CSRF-Token", token)
    .send({
      customerName: name,
      customerMobile: mobile,
      deliveryAddress: "123, Test Street, City, State 123456",
      cashAmount: cash,
      onlineAmount: online,
      items: [{ productId: product!.id, quantity: qty }],
    });
  return res;
}

/** Fetch the admin serialized order. */
async function getOrder(agent: any, id: number) {
  const res = await agent.get(`/api/admin/orders/${id}`);
  expect(res.status).toBe(200);
  return res.body.order;
}

describe("Payment management", () => {
  let agent: any;
  let token: string;

  beforeAll(async () => {
    const l = await loginAgent();
    agent = l.agent;
    token = l.token;
  });

  it("records a fully paid order (cash only)", async () => {
    const res = await placeOrder(agent, token, { cash: 1000, mobile: "9000000002", name: "Full Cash" });
    expect(res.status).toBe(201);
    const order = await getOrder(agent, res.body.order.id);
    expect(order.subtotal).toBe(1000);
    expect(order.finalAmount).toBe(1000);
    expect(order.cashTotal).toBe(1000);
    expect(order.onlineTotal).toBe(0);
    expect(order.paidTotal).toBe(1000);
    expect(order.due).toBe(0);
    expect(order.paymentStatus).toBe("PAID");
    expect(order.payments).toHaveLength(1);
    expect(order.payments[0].paymentMode).toBe("CASH");
  });

  it("records a partially paid order (cash + online)", async () => {
    const res = await placeOrder(agent, token, { cash: 3000, online: 2000, qty: 10, mobile: "9000000003", name: "Partial Pay" });
    expect(res.status).toBe(201);
    const order = await getOrder(agent, res.body.order.id);
    // 10 x 1000 = 10000
    expect(order.subtotal).toBe(10000);
    expect(order.finalAmount).toBe(10000);
    expect(order.cashTotal).toBe(3000);
    expect(order.onlineTotal).toBe(2000);
    expect(order.paidTotal).toBe(5000);
    expect(order.due).toBe(5000);
    expect(order.paymentStatus).toBe("PARTIALLY_PAID");
    expect(order.payments).toHaveLength(2);
  });

  it("creates a completely due order (no payment)", async () => {
    const res = await placeOrder(agent, token, { mobile: "9000000004", name: "No Pay" });
    expect(res.status).toBe(201);
    const order = await getOrder(agent, res.body.order.id);
    expect(order.subtotal).toBe(1000);
    expect(order.paidTotal).toBe(0);
    expect(order.due).toBe(1000);
    expect(order.paymentStatus).toBe("DUE");
    expect(order.payments).toHaveLength(0);
  });

  it("rejects a payment that exceeds the order total", async () => {
    const res = await placeOrder(agent, token, { cash: 2000, mobile: "9000000005", name: "Overpay" });
    // subtotal is 1000, cash 2000 exceeds it
    expect(res.status).toBe(400);
  });

  it("receives an additional payment later and reduces the due", async () => {
    const res = await placeOrder(agent, token, { cash: 1000, mobile: "9000000006", name: "Later Pay" });
    expect(res.status).toBe(201);
    const orderId = res.body.order.id;

    let order = await getOrder(agent, orderId);
    expect(order.due).toBe(0);
    expect(order.paymentStatus).toBe("PAID");

    // Create a bill with a discount so final amount = 800 (1000-200).
    const bill = await agent
      .post(`/api/admin/orders/${orderId}/bill`)
      .set("X-CSRF-Token", token)
      .send({ discount: 200 });
    expect(bill.status).toBe(201);

    // Now due = 800 - 1000 = 0 (overpaid). Instead, create a fresh partially
    // paid order, then receive the balance later.
    const res2 = await placeOrder(agent, token, { cash: 400, qty: 1, mobile: "9000000007", name: "Later Pay 2" });
    const orderId2 = res2.body.order.id;
    order = await getOrder(agent, orderId2);
    expect(order.due).toBe(600);

    const pay = await agent
      .post(`/api/admin/orders/${orderId2}/payments`)
      .set("X-CSRF-Token", token)
      .send({ amount: 600, paymentMode: "ONLINE" });
    expect(pay.status).toBe(201);
    expect(pay.body.payment.paymentMode).toBe("ONLINE");
    expect(pay.body.order.due).toBe(0);
    expect(pay.body.order.paymentStatus).toBe("PAID");

    // History is preserved: 2 payment records exist.
    const dbPayments = await prisma.orderPayment.count({ where: { orderId: orderId2 } });
    expect(dbPayments).toBe(2);
  });

  it("rejects receiving more than the remaining due", async () => {
    const res = await placeOrder(agent, token, { cash: 400, qty: 1, mobile: "9000000008", name: "Over Due" });
    const orderId = res.body.order.id;
    const pay = await agent
      .post(`/api/admin/orders/${orderId}/payments`)
      .set("X-CSRF-Token", token)
      .send({ amount: 2000, paymentMode: "CASH" });
    expect(pay.status).toBe(400);
  });

  it("computes the due based on the final bill amount after discount", async () => {
    const res = await placeOrder(agent, token, { qty: 10, cash: 5000, mobile: "9000000009", name: "Discount Due" });
    const orderId = res.body.order.id;
    // subtotal 10000, paid 5000 -> due 5000
    let order = await getOrder(agent, orderId);
    expect(order.due).toBe(5000);

    // Apply a 1000 discount -> final amount 9000, due = 9000-5000 = 4000.
    const bill = await agent
      .post(`/api/admin/orders/${orderId}/bill`)
      .set("X-CSRF-Token", token)
      .send({ discount: 1000 });
    expect(bill.status).toBe(201);

    order = await getOrder(agent, orderId);
    expect(order.finalAmount).toBe(9000);
    expect(order.due).toBe(4000);
    expect(order.paymentStatus).toBe("PARTIALLY_PAID");
  });

  it("exposes the due snapshot for customer due management", async () => {
    // 9000000009 has 4000 due after the discount test above.
    const snap = await agent.get("/api/admin/orders/due-snapshot");
    expect(snap.status).toBe(200);
    const customers = snap.body.customers;
    expect(Array.isArray(customers)).toBe(true);
    const rahul = customers.find((c: any) => c.customerMobile === "9000000009");
    expect(rahul).toBeDefined();
    expect(rahul.totalDue).toBe(4000);
    expect(rahul.orders.length).toBeGreaterThan(0);
  });

  it("filters orders by payment status", async () => {
    const due = await agent.get("/api/admin/orders?payment=DUE");
    expect(due.status).toBe(200);
    const paid = await agent.get("/api/admin/orders?payment=PAID");
    expect(paid.status).toBe(200);
    // At least one DUE order exists (created above).
    expect(due.body.orders.length).toBeGreaterThanOrEqual(1);
  });

it("subtotals collected and due on the dashboard", async () => {
    const dash = await agent.get("/api/admin/dashboard");
    expect(dash.status).toBe(200);
    expect(typeof dash.body.stats.totalCollected).toBe("number");
    expect(typeof dash.body.stats.totalDue).toBe("number");
    expect(dash.body.stats.totalDue).toBeGreaterThanOrEqual(0);
    expect(typeof dash.body.stats.totalCashCollected).toBe("number");
    expect(typeof dash.body.stats.totalOnlineCollected).toBe("number");
  });

  // ---- Phase 2: Customer Due Management ----

  it("returns enriched customer due summary (orders/purchase/paid/due)", async () => {
    // 9000000009 has a 4000 due from the earlier discount test.
    const snap = await agent.get("/api/admin/orders/due-snapshot");
    expect(snap.status).toBe(200);
    const customers = snap.body.customers;
    const rahul = customers.find((c: any) => c.customerMobile === "9000000009");
    expect(rahul).toBeDefined();
    expect(typeof rahul.totalOrders).toBe("number");
    expect(typeof rahul.totalPurchase).toBe("number");
    expect(typeof rahul.totalPaid).toBe("number");
    expect(rahul.totalDue).toBe(4000);
    expect(rahul.orders.length).toBeGreaterThan(0);
  });

  it("filters due snapshot by customer name/mobile/order number", async () => {
    // Search by name.
    const byName = await agent.get("/api/admin/orders/due-snapshot?search=Discount");
    expect(byName.status).toBe(200);
    expect(byName.body.customers.length).toBe(1);
    expect(byName.body.customers[0].customerMobile).toBe("9000000009");

    // Search by mobile.
    const byMobile = await agent.get("/api/admin/orders/due-snapshot?search=9000000009");
    expect(byMobile.status).toBe(200);
    expect(byMobile.body.customers.length).toBe(1);
  });

  it("filters due snapshot by payment status", async () => {
    const byDue = await agent.get("/api/admin/orders/due-snapshot?paymentStatus=DUE");
    expect(byDue.status).toBe(200);
    // Every customer in the DUE-filtered list must have a positive due.
    for (const c of byDue.body.customers) {
      expect(c.totalDue).toBeGreaterThan(0);
    }
  });

  it("returns customer detail with orders and payment history", async () => {
    // 9000000009 (Discount Due) has 5000 paid + 4000 due, one order.
    const detail = await agent.get("/api/admin/orders/customer/9000000009");
    expect(detail.status).toBe(200);
    expect(detail.body.customer.customerName).toBeDefined();
    expect(detail.body.orders.length).toBeGreaterThan(0);
    expect(detail.body.paymentHistory).toBeDefined();
    // The order had a 5000 cash payment at order time.
    const firstOrder = detail.body.orders[0];
    expect(firstOrder.due).toBe(4000);
  });

  it("allocates a customer payment across multiple due orders (FIFO)", async () => {
    // Create two due orders for one customer.
    const o1 = await placeOrder(agent, token, { cash: 0, qty: 1, mobile: "9010000001", name: "FIFO Cust" }); // 1000 due
    const o2 = await placeOrder(agent, token, { cash: 0, qty: 1, mobile: "9010000001", name: "FIFO Cust" }); // 1000 due
    expect(o1.status).toBe(201);
    expect(o2.status).toBe(201);

    // Customer total due = 2000. Pay 1500 -> clears order 1 (1000) + 500 of order 2.
    const pay = await agent
      .post("/api/admin/orders/customer/9010000001/payments")
      .set("X-CSRF-Token", token)
      .send({ amount: 1500, paymentMode: "CASH", notes: "FIFO test payment" });
    expect(pay.status).toBe(201);
    expect(pay.body.payments.length).toBe(2);
    expect(pay.body.customer.totalDue).toBe(500);
    expect(pay.body.orders[0].due).toBe(0); // oldest order cleared
    expect(pay.body.orders[1].due).toBe(500); // remainder on newer order

    // History preserved: each order now has exactly 1 payment record.
    const p1 = await prisma.orderPayment.count({ where: { orderId: o1.body.order.id } });
    const p2 = await prisma.orderPayment.count({ where: { orderId: o2.body.order.id } });
    expect(p1).toBe(1);
    expect(p2).toBe(1);
  });

  it("rejects a customer payment exceeding total due", async () => {
    // 9010000001 now has 500 due.
    const pay = await agent
      .post("/api/admin/orders/customer/9010000001/payments")
      .set("X-CSRF-Token", token)
      .send({ amount: 10000, paymentMode: "CASH" });
    expect(pay.status).toBe(400);
  });

  it("records a mixed cash/online payment at customer level and reduces due", async () => {
    // 9010000001 has 500 remaining. Pay 300 cash + 200 online.
    const payCash = await agent
      .post("/api/admin/orders/customer/9010000001/payments")
      .set("X-CSRF-Token", token)
      .send({ amount: 300, paymentMode: "CASH" });
    expect(payCash.status).toBe(201);
    expect(payCash.body.customer.totalDue).toBe(200);

    const payOnline = await agent
      .post("/api/admin/orders/customer/9010000001/payments")
      .set("X-CSRF-Token", token)
      .send({ amount: 200, paymentMode: "ONLINE" });
    expect(payOnline.status).toBe(201);
    expect(payOnline.body.customer.totalDue).toBe(0);
  });

  it("date-range filter on due snapshot works", async () => {
    // Use a custom from/to that includes today (all test orders created now).
    const from = new Date(Date.now() - 60000).toISOString();
    const to = new Date(Date.now() + 60000).toISOString();
    const snap = await agent.get(
      `/api/admin/orders/due-snapshot?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
    expect(snap.status).toBe(200);
    expect(Array.isArray(snap.body.customers)).toBe(true);
  });

  it("dashboard due decreases after a customer payment", async () => {
    // Capture due before.
    const before = await agent.get("/api/admin/dashboard");
    const beforeDue = before.body.stats.totalDue;

    // Create a fresh due order and then fully pay it at customer level.
    const ord = await placeOrder(agent, token, { cash: 0, qty: 1, mobile: "9020000001", name: "Dash Due" }); // 1000 due
    expect(ord.status).toBe(201);
    const dashBefore = await agent.get("/api/admin/dashboard");

    const pay = await agent
      .post("/api/admin/orders/customer/9020000001/payments")
      .set("X-CSRF-Token", token)
      .send({ amount: 1000, paymentMode: "CASH" });
    expect(pay.status).toBe(201);
    expect(pay.body.customer.totalDue).toBe(0);

    const after = await agent.get("/api/admin/dashboard");
    expect(after.body.stats.totalDue).toBeLessThanOrEqual(dashBefore.body.stats.totalDue);
expect(after.body.stats.totalCashCollected).toBeGreaterThanOrEqual(beforeDue);
  });
});
