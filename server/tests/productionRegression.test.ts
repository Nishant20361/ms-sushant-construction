import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import supertest from "supertest";
import sharp from "sharp";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { hashPassword } from "../src/utils/password.js";
import { signAdminToken, signTemp2faToken } from "../src/utils/token.js";
import { config } from "../src/config.js";
import { generateOrderNumber } from "../src/utils/orderNumber.js";

const app = createApp();
const username = "production_regression_admin";
const password = "Regression-password-123!";
let adminId: number;
let productId: number;
let categoryId: number;
const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

async function client(login = false) {
  const agent = supertest.agent(app);
  const csrf = await agent.get("/api/csrf");
  const token = csrf.body.token as string;
  if (login) {
    const response = await agent.post("/api/admin/auth/login").set("X-CSRF-Token", token).send({ username, password });
    expect(response.status, response.text).toBe(200);
  }
  return { agent, token };
}

beforeAll(async () => {
  const admin = await prisma.admin.create({ data: { username, passwordHash: await hashPassword(password), email: "regression@example.com" } });
  adminId = admin.id;
  const category = await prisma.category.create({ data: { name: "Regression", slug: `regression-${Date.now()}` } });
  categoryId = category.id;
  const product = await prisma.product.create({ data: { name: "Regression bags", unit: "bag", price: 100, mrp: 100, stock: 2, categoryId } });
  productId = product.id;
});

afterAll(async () => {
  await prisma.orderItem.deleteMany({ where: { order: { customerMobile: "9876500011" } } });
  await prisma.order.deleteMany({ where: { customerMobile: "9876500011" } });
  await prisma.product.deleteMany({ where: { id: productId } });
  await prisma.category.deleteMany({ where: { id: categoryId } });
  await prisma.adminAuditLog.deleteMany({ where: { adminId } });
  await prisma.admin.deleteMany({ where: { id: adminId } });
});

describe("Production regressions", () => {
  it("returns 400 for malformed JSON and malformed upload paths", async () => {
    expect((await supertest(app).post("/api/admin/auth/login").set("Content-Type", "application/json").send('{"bad":')).status).toBe(400);
    expect((await supertest(app).get("/uploads/products/%E0%A4%A.png")).status).toBe(400);
  });

  it("allows cross-origin idempotency headers and does not cache authenticated responses", async () => {
    const preflight = await supertest(app).options("/api/orders").set("Origin", config.clientUrl)
      .set("Access-Control-Request-Method", "POST").set("Access-Control-Request-Headers", "idempotency-key,x-csrf-token");
    expect(preflight.status).toBe(204);
    expect(preflight.headers["access-control-allow-headers"]).toContain("Idempotency-Key");
    expect((await supertest(app).get("/api/admin/auth/me")).headers["cache-control"]).toBe("no-store");
  });

  it("counts simultaneous failed logins without losing increments", async () => {
    const clients = await Promise.all(Array.from({ length: 10 }, () => client()));
    const results = await Promise.all(clients.map(({ agent, token }) => agent.post("/api/admin/auth/login")
      .set("X-CSRF-Token", token).send({ username, password: "incorrect-password" })));
    expect(results.filter((result) => result.status === 429)).toHaveLength(1);
    const admin = await prisma.admin.findUniqueOrThrow({ where: { id: adminId } });
    expect(admin.failedLoginAttempts).toBe(10);
    expect(admin.lockedUntil).not.toBeNull();
    await prisma.admin.update({ where: { id: adminId }, data: { lockedUntil: new Date(0) } });
    const { agent, token } = await client();
    const retry = await agent.post("/api/admin/auth/login").set("X-CSRF-Token", token).send({ username, password: "incorrect-password" });
    expect(retry.status).toBe(401);
    expect(retry.body.attemptsRemaining).toBe(9);
  });

  it("enforces the device limit under concurrent successful logins", async () => {
    await prisma.admin.update({ where: { id: adminId }, data: { failedLoginAttempts: 0, lockedUntil: null } });
    await Promise.all(Array.from({ length: 8 }, () => client(true)));
    expect(await prisma.adminSession.count({ where: { adminId } })).toBe(6);
  });

  it("rejects sessionless tokens and sessions assigned to another account", async () => {
    const legacy = signAdminToken({ sub: String(adminId), username, role: "ADMIN" });
    expect((await supertest(app).get("/api/admin/auth/me").set("Cookie", `${config.cookieName}=${legacy}`)).status).toBe(401);
    const wrongToken = signAdminToken({ sub: String(adminId), username, role: "ADMIN", sessionId: crypto.randomUUID() });
    expect((await supertest(app).get("/api/admin/auth/me").set("Cookie", `${config.cookieName}=${wrongToken}`)).status).toBe(401);
  });

  it("requires the current password when changing two-factor authentication", async () => {
    const { agent, token } = await client(true);
    const response = await agent.post("/api/admin/auth/toggle-2fa").set("X-CSRF-Token", token).send({ enabled: true });
    expect(response.status).toBe(400);
    expect((await prisma.admin.findUniqueOrThrow({ where: { id: adminId } })).twoFactorEnabled).toBe(false);
  });

  it("consumes an OTP only once during simultaneous verification", async () => {
    await prisma.admin.update({ where: { id: adminId }, data: {
      twoFactorEnabled: true, twoFactorOtpHash: hash("123456"), twoFactorOtpExpiresAt: new Date(Date.now() + 600_000),
    } });
    const tempToken = signTemp2faToken(adminId, username);
    const clients = await Promise.all([client(), client()]);
    const results = await Promise.all(clients.map(({ agent, token }) => agent.post("/api/admin/auth/verify-2fa")
      .set("X-CSRF-Token", token).send({ tempToken, otp: "123456" })));
    expect(results.map((response) => response.status).sort()).toEqual([200, 400]);
    await prisma.admin.update({ where: { id: adminId }, data: { twoFactorEnabled: false } });
  });

  it("locks verification and resend after five incorrect codes", async () => {
    await prisma.admin.update({ where: { id: adminId }, data: {
      twoFactorEnabled: true, twoFactorFailedAttempts: 0,
      twoFactorOtpHash: hash("123456"), twoFactorOtpExpiresAt: new Date(Date.now() + 600_000),
    } });
    const tempToken = signTemp2faToken(adminId, username);
    const { agent, token } = await client();
    for (let i = 0; i < 5; i++) {
      expect((await agent.post("/api/admin/auth/verify-2fa").set("X-CSRF-Token", token).send({ tempToken, otp: "000000" })).status).toBe(400);
    }
    expect((await agent.post("/api/admin/auth/verify-2fa").set("X-CSRF-Token", token).send({ tempToken, otp: "123456" })).status).toBe(429);
    expect((await agent.post("/api/admin/auth/resend-2fa").set("X-CSRF-Token", token).send({ tempToken })).status).toBe(429);
    expect((await agent.post("/api/admin/auth/login").set("X-CSRF-Token", token).send({ username, password })).status).toBe(429);
    await prisma.admin.update({ where: { id: adminId }, data: { twoFactorEnabled: false, twoFactorFailedAttempts: 0, lockedUntil: null, failedLoginAttempts: 0 } });
  });

  it("invalidates pending verification after a password change and protects the 2FA email", async () => {
    const { agent, token } = await client(true);
    await prisma.admin.update({ where: { id: adminId }, data: {
      twoFactorEnabled: true, twoFactorOtpHash: hash("123456"), twoFactorOtpExpiresAt: new Date(Date.now() + 600_000),
    } });
    const changedEmail = await agent.put("/api/admin/profile/email").set("X-CSRF-Token", token).send({ email: "replacement@example.com" });
    expect(changedEmail.status).toBe(409);
    const tempToken = signTemp2faToken(adminId, username);
    await prisma.admin.update({ where: { id: adminId }, data: { passwordChangedAt: new Date(Date.now() + 1) } });
    expect((await agent.post("/api/admin/auth/verify-2fa").set("X-CSRF-Token", token).send({ tempToken, otp: "123456" })).status).toBe(401);
    await prisma.admin.update({ where: { id: adminId }, data: { passwordChangedAt: null, twoFactorEnabled: false, twoFactorOtpHash: null, twoFactorOtpExpiresAt: null } });
  });

  it("keeps WebP uploads retrievable after temporary-file cleanup", async () => {
    const { agent, token } = await client(true);
    const input = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).webp().toBuffer();
    const response = await agent.post("/api/admin/uploads").set("X-CSRF-Token", token).attach("file", input, "test.webp");
    expect(response.status, response.text).toBe(201);
    // Local fallback must survive the async unlink of the original upload.
    await new Promise((resolve) => setTimeout(resolve, 30));
    const image = await agent.get(response.body.url);
    expect(image.status).toBe(200);
    expect(image.headers["content-type"]).toContain("image/webp");
  });

  it("hides inactive categories and rejects orders for their products", async () => {
    await prisma.category.update({ where: { id: categoryId }, data: { isActive: false } });
    expect((await supertest(app).get(`/api/products/${productId}`)).status).toBe(404);
    const response = await supertest(app).post("/api/public/orders").send({
      customerName: "Regression Customer", customerMobile: "9876500011", items: [{ productId, quantity: 1 }],
    });
    expect(response.status).toBe(400);
    await prisma.category.update({ where: { id: categoryId }, data: { isActive: true } });
  });

  it("does not oversell when two cancelled orders are reactivated simultaneously", async () => {
    await prisma.product.update({ where: { id: productId }, data: { stock: 1 } });
    const orders = await Promise.all([1, 2].map(() => prisma.order.create({ data: {
      orderNumber: generateOrderNumber(), customerName: "Regression Customer", customerMobile: "9876500011", subtotal: 100, status: "CANCELLED",
      items: { create: { productId, productName: "Regression bags", unit: "bag", price: 100, quantity: 1, total: 100 } },
    } })));
    const clients = await Promise.all([client(true), client(true)]);
    const results = await Promise.all(clients.map(({ agent, token }, index) => agent.patch(`/api/admin/orders/${orders[index].id}/status`)
      .set("X-CSRF-Token", token).send({ status: "CONFIRMED" })));
    expect(results.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(Number((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock)).toBe(0);
  });

  it("preserves stock and payment history when rejecting unsafe order deletion", async () => {
    const order = await prisma.order.create({ data: {
      orderNumber: generateOrderNumber(), customerName: "Regression Customer", customerMobile: "9876500011", subtotal: 100,
    } });
    const { agent, token } = await client(true);
    expect((await agent.delete(`/api/admin/orders/${order.id}`).set("X-CSRF-Token", token)).status).toBe(409);
    await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED", payments: { create: { amount: 10, paymentMode: "CASH" } } } });
    expect((await agent.delete(`/api/admin/orders/${order.id}`).set("X-CSRF-Token", token)).status).toBe(409);
    expect(await prisma.orderPayment.count({ where: { orderId: order.id } })).toBe(1);
  });
});
