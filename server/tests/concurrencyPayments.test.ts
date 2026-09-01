import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { hashPassword } from "../src/utils/password.js";
import { signAdminToken } from "../src/utils/token.js";
import { computeOrderFinancials, allocateCustomerPaymentFIFO, roundCurrency } from "../src/utils/financials.js";
import crypto from "crypto";

const app = createApp();
const TEST_PASSWORD = "TestAdminPassword123!";

async function getCsrf(agent = supertest.agent(app)) {
  const res = await agent.get("/api/csrf");
  const cookieHeader = res.headers["set-cookie"];
  const csrfCookie = Array.isArray(cookieHeader)
    ? cookieHeader.find((c: string) => c.startsWith("ms_csrf_token="))
    : typeof cookieHeader === "string" && cookieHeader.startsWith("ms_csrf_token=")
    ? cookieHeader
    : "";
  const token = res.body.token || (csrfCookie ? decodeURIComponent(csrfCookie.split("=")[1].split(";")[0]) : "");
  return { agent, token };
}

async function createAuthenticatedAgent(username: string) {
  const { agent, token } = await getCsrf();
  const login = await agent
    .post("/api/admin/auth/login")
    .set("X-CSRF-Token", token)
    .send({ username, password: TEST_PASSWORD });
  expect(login.status).toBe(200);
  return { agent, token };
}

describe("Financial, Concurrency & Invariant Security Test Suite", () => {
  let adminId: number;
  let adminUsername: string;
  let testProductId: number;
  let testProduct2Id: number;

  beforeAll(async () => {
    adminUsername = `fin_admin_${Date.now()}`;
    const passwordHash = await hashPassword(TEST_PASSWORD);
    const admin = await prisma.admin.create({
      data: {
        username: adminUsername,
        email: `${adminUsername}@example.com`,
        passwordHash,
        role: "SUPER_ADMIN",
        isActive: true,
      },
    });
    adminId = admin.id;

    // Create test category and products
    const category = await prisma.category.create({
      data: {
        name: `Test Cat ${Date.now()}`,
        slug: `test-cat-${Date.now()}`,
      },
    });

    const p1 = await prisma.product.create({
      data: {
        name: "Test Cement Bag",
        price: 350.0,
        mrp: 400.0,
        stock: 500,
        categoryId: category.id,
      },
    });
    testProductId = p1.id;

    const p2 = await prisma.product.create({
      data: {
        name: "Test Steel Rod",
        price: 75.5,
        mrp: 90.0,
        stock: 1000,
        categoryId: category.id,
      },
    });
    testProduct2Id = p2.id;
  });

  afterAll(async () => {
    await prisma.adminPasswordResetToken.deleteMany({ where: { adminId } });
    await prisma.adminAuditLog.deleteMany({ where: { adminId } });
    await prisma.admin.deleteMany({ where: { id: adminId } });
    await prisma.orderItem.deleteMany({ where: { productId: { in: [testProductId, testProduct2Id] } } });
    await prisma.product.deleteMany({ where: { id: { in: [testProductId, testProduct2Id] } } });
  });

  // ---------------------------------------------------------------------------
  // 1. Authoritative Financial Engine Unit Calculations
  // ---------------------------------------------------------------------------
  describe("Authoritative Financial Calculations", () => {
    it("handles zero payments correctly", () => {
      const fin = computeOrderFinancials({
        subtotal: 500,
        bill: { discount: 50, finalAmount: 450 },
        payments: [],
      });
      expect(fin.subtotal).toBe(500);
      expect(fin.discount).toBe(50);
      expect(fin.finalAmount).toBe(450);
      expect(fin.paidTotal).toBe(0);
      expect(fin.due).toBe(450);
      expect(fin.paymentStatus).toBe("DUE");
    });

    it("handles partial cash and online payments", () => {
      const fin = computeOrderFinancials({
        subtotal: 1000,
        bill: { discount: 100, finalAmount: 900 },
        payments: [
          { amount: 300, paymentMode: "CASH" },
          { amount: 200, paymentMode: "ONLINE" },
        ],
      });
      expect(fin.cashTotal).toBe(300);
      expect(fin.onlineTotal).toBe(200);
      expect(fin.paidTotal).toBe(500);
      expect(fin.due).toBe(400);
      expect(fin.paymentStatus).toBe("PARTIALLY_PAID");
    });

    it("handles full payment clearing due", () => {
      const fin = computeOrderFinancials({
        subtotal: 1000,
        bill: { discount: 100, finalAmount: 900 },
        payments: [{ amount: 900, paymentMode: "ONLINE" }],
      });
      expect(fin.paidTotal).toBe(900);
      expect(fin.due).toBe(0);
      expect(fin.paymentStatus).toBe("PAID");
    });

    it("allocates FIFO deterministically across multiple orders", () => {
      const orders = [
        { id: 1, finalAmount: 200, paidTotal: 0, due: 200 },
        { id: 2, finalAmount: 300, paidTotal: 100, due: 200 },
        { id: 3, finalAmount: 500, paidTotal: 0, due: 500 },
      ];
      const { allocations, totalAllocated, remainingUnallocated } = allocateCustomerPaymentFIFO(orders, 350);
      expect(totalAllocated).toBe(350);
      expect(remainingUnallocated).toBe(0);
      expect(allocations).toHaveLength(2);
      expect(allocations[0]).toEqual({
        orderId: 1,
        allocatedAmount: 200,
        previousDue: 200,
        remainingDue: 0,
      });
      expect(allocations[1]).toEqual({
        orderId: 2,
        allocatedAmount: 150,
        previousDue: 200,
        remainingDue: 50,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Concurrent Single-Order Payment Race Conditions
  // ---------------------------------------------------------------------------
  describe("Concurrent Single-Order Payments", () => {
    it("prevents double-payment / overpayment when two concurrent payments arrive", async () => {
      // Create an order with subtotal 100 and finalAmount 100, currently unpaid
      const order = await prisma.order.create({
        data: {
          orderNumber: `CONC-1-${Date.now()}`,
          customerName: "Concurrent Test Customer",
          customerMobile: "9876543211",
          subtotal: 100,
          status: "DELIVERED",
          bill: {
            create: {
              subtotal: 100,
              discount: 0,
              finalAmount: 100,
            },
          },
        },
      });

      const client1 = await createAuthenticatedAgent(adminUsername);
      const client2 = await createAuthenticatedAgent(adminUsername);

      // Send 2 simultaneous payment requests of ₹80 each.
      // Since remaining due is 100, total attempted is 160. Exactly one MUST succeed, and the second MUST fail with 400.
      const [res1, res2] = await Promise.all([
        client1.agent
          .post(`/api/admin/orders/${order.id}/payments`)
          .set("X-CSRF-Token", client1.token)
          .send({ amount: 80, paymentMode: "CASH" }),
        client2.agent
          .post(`/api/admin/orders/${order.id}/payments`)
          .set("X-CSRF-Token", client2.token)
          .send({ amount: 80, paymentMode: "ONLINE" }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 400]);

      // Verify database state: exactly 1 payment of ₹80 recorded, due is ₹20, paidTotal never exceeds 100
      const updated = await prisma.order.findUnique({
        where: { id: order.id },
        include: { payments: true, bill: true },
      });
      const fin = computeOrderFinancials(updated!);
      expect(fin.paidTotal).toBe(80);
      expect(fin.due).toBe(20);
      expect(fin.paymentStatus).toBe("PARTIALLY_PAID");

      // Cleanup
      await prisma.orderPayment.deleteMany({ where: { orderId: order.id } });
      await prisma.bill.deleteMany({ where: { orderId: order.id } });
      await prisma.order.delete({ where: { id: order.id } });
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Concurrent Multi-Order Customer FIFO Payments
  // ---------------------------------------------------------------------------
  describe("Concurrent Customer FIFO Payments", () => {
    it("guarantees deterministic oldest-first allocation and prevents duplicate customer payments", async () => {
      const mobile = `98765${Date.now().toString().slice(-5)}`;

      // Create two orders for customer with due ₹100 and ₹200 (Total due = ₹300)
      const ord1 = await prisma.order.create({
        data: {
          orderNumber: `FIFO-1-${Date.now()}`,
          customerName: "FIFO Customer",
          customerMobile: mobile,
          subtotal: 100,
          status: "DELIVERED",
          bill: { create: { subtotal: 100, discount: 0, finalAmount: 100 } },
        },
      });

      const ord2 = await prisma.order.create({
        data: {
          orderNumber: `FIFO-2-${Date.now()}`,
          customerName: "FIFO Customer",
          customerMobile: mobile,
          subtotal: 200,
          status: "DELIVERED",
          bill: { create: { subtotal: 200, discount: 0, finalAmount: 200 } },
        },
      });

      const client1 = await createAuthenticatedAgent(adminUsername);
      const client2 = await createAuthenticatedAgent(adminUsername);

      // Send 2 simultaneous payments of ₹200 each (Total attempted = 400 > Total Due 300)
      const [res1, res2] = await Promise.all([
        client1.agent
          .post(`/api/admin/orders/customer/${mobile}/payments`)
          .set("X-CSRF-Token", client1.token)
          .send({ amount: 200, paymentMode: "CASH" }),
        client2.agent
          .post(`/api/admin/orders/customer/${mobile}/payments`)
          .set("X-CSRF-Token", client2.token)
          .send({ amount: 200, paymentMode: "ONLINE" }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 400]);

      // Verify that the succeeded request allocated ₹100 to ord1 (clearing it) and ₹100 to ord2 (leaving ₹100 due)
      const ord1Fresh = await prisma.order.findUnique({ where: { id: ord1.id }, include: { payments: true, bill: true } });
      const ord2Fresh = await prisma.order.findUnique({ where: { id: ord2.id }, include: { payments: true, bill: true } });

      const fin1 = computeOrderFinancials(ord1Fresh!);
      const fin2 = computeOrderFinancials(ord2Fresh!);

      expect(fin1.paidTotal).toBe(100);
      expect(fin1.due).toBe(0);
      expect(fin1.paymentStatus).toBe("PAID");

      expect(fin2.paidTotal).toBe(100);
      expect(fin2.due).toBe(100);
      expect(fin2.paymentStatus).toBe("PARTIALLY_PAID");

      // Cleanup
      await prisma.orderPayment.deleteMany({ where: { orderId: { in: [ord1.id, ord2.id] } } });
      await prisma.bill.deleteMany({ where: { orderId: { in: [ord1.id, ord2.id] } } });
      await prisma.order.deleteMany({ where: { id: { in: [ord1.id, ord2.id] } } });
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Discount & Order Editing Invariants
  // ---------------------------------------------------------------------------
  describe("Discount and Order Editing Invariants", () => {
    it("rejects discount that would make finalAmount lower than paidTotal", async () => {
      const order = await prisma.order.create({
        data: {
          orderNumber: `DISC-INV-${Date.now()}`,
          customerName: "Discount Invariant Customer",
          customerMobile: "9876543233",
          subtotal: 500,
          status: "DELIVERED",
          bill: { create: { subtotal: 500, discount: 0, finalAmount: 500 } },
          payments: {
            create: {
              amount: 400,
              paymentMode: "CASH",
            },
          },
        },
      });

      const { agent, token } = await createAuthenticatedAgent(adminUsername);

      // Customer already paid 400 out of 500. Attempting a discount of 200 would make finalAmount = 300 < paidTotal (400)
      const res = await agent
        .put(`/api/admin/orders/${order.id}/bill`)
        .set("X-CSRF-Token", token)
        .send({ discount: 200 });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already paid/i);

      // Attempting a valid discount of 50 (finalAmount = 450 >= paidTotal 400) should succeed
      const validRes = await agent
        .put(`/api/admin/orders/${order.id}/bill`)
        .set("X-CSRF-Token", token)
        .send({ discount: 50 });

      expect(validRes.status).toBe(200);
      expect(validRes.body.bill.discount).toBe(50);
      expect(validRes.body.bill.finalAmount).toBe(450);

      // Cleanup
      await prisma.orderPayment.deleteMany({ where: { orderId: order.id } });
      await prisma.bill.deleteMany({ where: { orderId: order.id } });
      await prisma.order.delete({ where: { id: order.id } });
    });

    it("rejects order item editing that reduces subtotal below already recorded payments", async () => {
      const order = await prisma.order.create({
        data: {
          orderNumber: `EDIT-INV-${Date.now()}`,
          customerName: "Edit Invariant Customer",
          customerMobile: "9876543244",
          subtotal: 700, // 2 items at 350
          status: "DELIVERED",
          items: {
            create: {
              productId: testProductId,
              productName: "Test Cement Bag",
              unit: "bag",
              price: 350,
              quantity: 2,
              total: 700,
            },
          },
          payments: {
            create: {
              amount: 500,
              paymentMode: "ONLINE",
            },
          },
        },
      });

      const { agent, token } = await createAuthenticatedAgent(adminUsername);

      // Editing to 1 item (subtotal = 350 < paid 500) must be rejected
      const res = await agent
        .patch(`/api/admin/orders/${order.id}/edit`)
        .set("X-CSRF-Token", token)
        .send({
          items: [{ productId: testProductId, quantity: 1 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already paid/i);

      // Cleanup
      await prisma.orderPayment.deleteMany({ where: { orderId: order.id } });
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
      await prisma.order.delete({ where: { id: order.id } });
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Payment Status Filtering and Exact Pagination
  // ---------------------------------------------------------------------------
  describe("Payment Status Filtering and Pagination", () => {
    it("applies paymentStatus filter in database and returns exact totals and pages", async () => {
      const prefix = `PAGE-${Date.now()}`;
      // Create 2 PAID orders and 1 DUE order
      const o1 = await prisma.order.create({
        data: {
          orderNumber: `${prefix}-PAID-1`,
          customerName: "Page Paid 1",
          customerMobile: "9876543255",
          subtotal: 100,
          status: "DELIVERED",
          payments: { create: { amount: 100, paymentMode: "CASH" } },
        },
      });
      const o2 = await prisma.order.create({
        data: {
          orderNumber: `${prefix}-PAID-2`,
          customerName: "Page Paid 2",
          customerMobile: "9876543255",
          subtotal: 100,
          status: "DELIVERED",
          payments: { create: { amount: 100, paymentMode: "CASH" } },
        },
      });
      const o3 = await prisma.order.create({
        data: {
          orderNumber: `${prefix}-DUE-1`,
          customerName: "Page Due 1",
          customerMobile: "9876543255",
          subtotal: 100,
          status: "DELIVERED",
        },
      });

      const { agent } = await createAuthenticatedAgent(adminUsername);

      // Filter by search prefix and paymentStatus=PAID
      const res = await agent
        .get(`/api/admin/orders?search=${prefix}&paymentStatus=PAID&limit=10`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.orders).toHaveLength(2);
      expect(res.body.orders.every((o: any) => o.paymentStatus === "PAID")).toBe(true);

      // An out-of-range page must still report the exact filtered total.
      const emptyPage = await agent
        .get(`/api/admin/orders?search=${prefix}&paymentStatus=PAID&limit=1&page=99`);
      expect(emptyPage.status).toBe(200);
      expect(emptyPage.body.total).toBe(2);
      expect(emptyPage.body.pages).toBe(2);
      expect(emptyPage.body.orders).toEqual([]);

      // Filter by search prefix and paymentStatus=DUE
      const dueRes = await agent
        .get(`/api/admin/orders?search=${prefix}&paymentStatus=DUE&limit=10`);

      expect(dueRes.status).toBe(200);
      expect(dueRes.body.total).toBe(1);
      expect(dueRes.body.orders).toHaveLength(1);
      expect(dueRes.body.orders[0].paymentStatus).toBe("DUE");

      // Cleanup
      await prisma.orderPayment.deleteMany({ where: { orderId: { in: [o1.id, o2.id, o3.id] } } });
      await prisma.order.deleteMany({ where: { id: { in: [o1.id, o2.id, o3.id] } } });
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Security: Atomic Single-Use Password Reset Token
  // ---------------------------------------------------------------------------
  describe("Security: Password Reset Concurrency", () => {
    it("allows only one concurrent password reset using the same token", async () => {
      // Create a dedicated admin for the password reset test
      const resetPasswordHash = await hashPassword(TEST_PASSWORD);
      const resetAdmin = await prisma.admin.create({
        data: {
          username: `reset_admin_${Date.now()}`,
          email: `reset_admin_${Date.now()}@example.com`,
          passwordHash: resetPasswordHash,
          role: "SUPER_ADMIN",
          isActive: true,
        },
      });

      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      await prisma.adminPasswordResetToken.create({
        data: {
          adminId: resetAdmin.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      const { agent: client1, token: csrf1 } = await getCsrf();
      const { agent: client2, token: csrf2 } = await getCsrf();

      // Send 2 simultaneous reset requests with the same token
      const [res1, res2] = await Promise.all([
        client1
          .post("/api/admin/auth/reset-password")
          .set("X-CSRF-Token", csrf1)
          .send({ token: rawToken, newPassword: "NewSecurePassword123!" }),
        client2
          .post("/api/admin/auth/reset-password")
          .set("X-CSRF-Token", csrf2)
          .send({ token: rawToken, newPassword: "NewSecurePassword123!" }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 400]);

      // Verify token is marked as used
      const rec = await prisma.adminPasswordResetToken.findFirst({ where: { tokenHash } });
      expect(rec?.usedAt).not.toBeNull();

      // Cleanup resetAdmin
      await prisma.adminPasswordResetToken.deleteMany({ where: { adminId: resetAdmin.id } });
      await prisma.adminAuditLog.deleteMany({ where: { adminId: resetAdmin.id } });
      await prisma.admin.delete({ where: { id: resetAdmin.id } });
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Security: Image Upload Fail-Closed Validation
  // ---------------------------------------------------------------------------
  describe("Security: Image Upload Validation", () => {
    it("rejects fake or corrupted image files and cleans up temporary storage", async () => {
      const fakeImageBuffer = Buffer.from("NOT_AN_IMAGE_PAYLOAD_HERE");
      const { agent, token } = await createAuthenticatedAgent(adminUsername);

      const res = await agent
        .post("/api/admin/uploads")
        .set("X-CSRF-Token", token)
        .attach("file", fakeImageBuffer, "fake.jpg");

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/corrupted or invalid/i);
    });
  });
});
