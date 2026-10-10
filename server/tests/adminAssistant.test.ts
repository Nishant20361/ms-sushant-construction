import { beforeAll, describe, it, expect, vi } from "vitest";
import supertest from "supertest";
import jwt from "jsonwebtoken";
vi.mock("../src/construction_ai/groq.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  askGroq: vi.fn(),
}));
import { askGroq } from "../src/construction_ai/groq.js";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { config } from "../src/config.js";
import { hashPassword } from "../src/utils/password.js";
import { intentSchema, interpret } from "../src/admin_ai/intent.js";
const app = createApp();
const password = "assistant-Test-only-Password123!";
const suffix = String(Date.now());
const username = `assistant-admin-${suffix}`;
const customer = `Raju ${suffix}`;
let agent: supertest.Agent;
let token: string;
let choices: { contextToken: string; options: unknown[] };
function model(intent: unknown) {
  vi.mocked(askGroq).mockReset();
  vi.mocked(askGroq).mockResolvedValueOnce({
    text: JSON.stringify(intent),
    model: "mock",
  });
}
function send(message: string, extra: Record<string, unknown> = {}) {
  return agent
    .post("/api/admin/assistant/chat")
    .set("X-CSRF-Token", token)
    .send({ message, ...extra });
}
async function unlock() {
  expect(
    (
      await agent
        .post("/api/admin/khatabook/change-pin")
        .set("X-CSRF-Token", token)
        .send({ adminPassword: password, newPin: "8472" })
    ).status,
  ).toBe(200);
}
beforeAll(async () => {
  await prisma.order.deleteMany({
    where: { customerMobile: { in: ["9876500101", "9876500102"] } },
  });
  await prisma.admin.create({
    data: { username, passwordHash: await hashPassword(password) },
  });
  await prisma.order.create({
    data: {
      orderNumber: `AI-${suffix}-1`,
      customerName: customer,
      customerMobile: "9876500101",
      deliveryAddress: "Dhanbad east",
      subtotal: 1000,
      status: "DELIVERED",
      bill: { create: { subtotal: 1000, discount: 100, finalAmount: 900 } },
      payments: { create: { amount: 200, paymentMode: "CASH" } },
    },
  });
  await prisma.order.create({
    data: {
      orderNumber: `AI-${suffix}-2`,
      customerName: customer,
      customerMobile: "9876500102",
      deliveryAddress: "Dhanbad west",
      subtotal: 500,
      status: "DELIVERED",
    },
  });
  await prisma.order.create({
    data: {
      orderNumber: `AI-${suffix}-3`,
      customerName: customer,
      customerMobile: "9876500101",
      subtotal: 250,
      status: "PENDING",
      payments: { create: { amount: 50, paymentMode: "ONLINE" } },
    },
  });
  await prisma.order.create({
    data: {
      orderNumber: `AI-${suffix}-4`,
      customerName: customer,
      customerMobile: "9876500101",
      subtotal: 9999,
      status: "CANCELLED",
    },
  });
  agent = supertest.agent(app);
  token = (await agent.get("/api/csrf")).body.token;
  expect(
    (
      await agent
        .post("/api/admin/auth/login")
        .set("X-CSRF-Token", token)
        .send({ username, password })
    ).status,
  ).toBe(200);
});
describe("Private Business Saathi", () => {
  it("requires admin authentication and CSRF", async () => {
    expect(
      (
        await supertest(app)
          .post("/api/admin/assistant/chat")
          .send({ message: "help" })
      ).status,
    ).toBe(403);
    const guest = supertest.agent(app);
    const csrf = (await guest.get("/api/csrf")).body.token;
    expect(
      (
        await guest
          .post("/api/admin/assistant/chat")
          .set("X-CSRF-Token", csrf)
          .send({ message: "help" })
      ).status,
    ).toBe(401);
    expect(
      (await agent.post("/api/admin/assistant/chat").send({ message: "help" }))
        .status,
    ).toBe(403);
  });
  it("provides friendly business advice without unlocking private balances", async () => {
    model({
      action: "chat",
      reply:
        "Kapde ke business mein repeat customers par focus karo. Shop online hai ya offline?",
    });
    const r = await send("Kapde ka business kaise badhaun?");
    expect(r.status).toBe(200);
    expect(r.body.message).toContain("repeat customers");
    expect(r.body.contextToken).toBeTruthy();
    const prompt = vi.mocked(askGroq).mock.calls.at(-1)!;
    expect(prompt[0]).not.toContain("9876500101");
    expect(prompt[1]).toContain("ANY kind of business");
    model({
      action: "chat",
      reply: "Offline shop ke liye repeat-customer offers try karo.",
    });
    expect(
      (await send("offline", { contextToken: r.body.contextToken })).body
        .message,
    ).toContain("Offline shop");
    expect(vi.mocked(askGroq).mock.calls.at(-1)![0]).toContain(
      "Kapde ka business",
    );
  });
  it("requires PIN before revealing customer names or balances", async () => {
    expect((await send("9876500101")).status).toBe(403);
    expect((await send("Customer ki udhari dekhni hai")).status).toBe(403);
  });
  it("offers same-name customers instead of choosing and calculates actual dues", async () => {
    await unlock();
    model({ action: "dues", customer });
    const r = await send("Grahak ka udhar kitna hai?");
    expect(r.status).toBe(200);
    expect(r.body.options).toHaveLength(2);
    choices = r.body;
    expect(
      r.body.options.map((o: { label: string }) => o.label).join(" "),
    ).toContain("Dhanbad west");
    expect(r.body.message).not.toContain("₹");
    const selected = await send("selected", {
      contextToken: choices.contextToken,
      selection: "9876500101",
    });
    expect(selected.status).toBe(200);
    expect(selected.body.message).toContain("900.00");
    expect(Object.keys(selected.body)).toEqual(["message"]);
    const order = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: `AI-${suffix}-3` },
    });
    await prisma.orderPayment.create({
      data: { orderId: order.id, amount: 100, paymentMode: "CASH" },
    });
    expect((await send("9876500101")).body.message).toContain("800.00");
  });
  it("keeps exact-number, bare-name and common Hinglish lookups fast without Groq", async () => {
    vi.mocked(askGroq).mockClear();
    expect((await send("9876500102")).body.message).toContain("500.00");
    expect(await interpret("Raju ka kitna udhar hai?")).toEqual({
      action: "dues",
      customer: "Raju",
    });
    expect(await interpret("Ramesh Kumar")).toEqual({
      action: "dues",
      customer: "Ramesh Kumar",
    });
    expect(askGroq).not.toHaveBeenCalled();
  });
  it("rejects forged, expired and cross-device customer selections", async () => {
    expect(
      (
        await send("pick", {
          contextToken: choices.contextToken,
          selection: "0000000000",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await send("pick", {
          contextToken: choices.contextToken.slice(0, -8) + "forgedxx",
          selection: "9876500101",
        })
      ).status,
    ).toBe(400);
    const decoded = jwt.decode(choices.contextToken) as Record<string, unknown>;
    delete decoded.exp;
    delete decoded.iat;
    expect(
      (
        await send("pick", {
          contextToken: jwt.sign(decoded, config.jwtSecret, { expiresIn: -1 }),
          selection: "9876500101",
        })
      ).status,
    ).toBe(400);
    const second = supertest.agent(app);
    const csrf = (await second.get("/api/csrf")).body.token;
    await second
      .post("/api/admin/auth/login")
      .set("X-CSRF-Token", csrf)
      .send({ username, password });
    expect(
      (
        await second
          .post("/api/admin/khatabook/verify-pin")
          .set("X-CSRF-Token", csrf)
          .send({ pin: "8472" })
      ).status,
    ).toBe(200);
    expect(
      (
        await second
          .post("/api/admin/assistant/chat")
          .set("X-CSRF-Token", csrf)
          .send({
            message: "pick",
            contextToken: choices.contextToken,
            selection: "9876500101",
          })
      ).status,
    ).toBe(400);
  });
  it("rechecks lock even on old options and handles missing/fully-paid customers", async () => {
    await agent.post("/api/admin/khatabook/lock").set("X-CSRF-Token", token);
    expect(
      (
        await send("pick", {
          contextToken: choices.contextToken,
          selection: "9876500101",
        })
      ).status,
    ).toBe(403);
    await unlock();
    expect((await send("0000000000")).body.message).toContain("nahi mila");
    const order = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: `AI-${suffix}-2` },
    });
    await prisma.orderPayment.create({
      data: { orderId: order.id, amount: 600, paymentMode: "CASH" },
    });
    expect((await send("9876500102")).body.message).toContain("0.00");
  });
  it("fails safely for unsupported writes, invented amounts and provider failure", async () => {
    const before = {
      products: await prisma.product.findMany(),
      orders: await prisma.order.count(),
      payments: await prisma.orderPayment.count(),
    };
    model({ action: "price", product: "cement", price: 1 });
    expect((await send("cement price change karo")).body.message).toContain(
      "koi record change nahi",
    );
    expect(
      (
        await agent
          .post("/api/admin/assistant/actions/anything")
          .set("X-CSRF-Token", token)
          .send({ decision: "confirm" })
      ).status,
    ).toBe(404);
    expect({
      products: await prisma.product.findMany(),
      orders: await prisma.order.count(),
      payments: await prisma.orderPayment.count(),
    }).toEqual(before);
    expect(
      intentSchema.safeParse({
        action: "dues",
        customer: "Raju",
        sql: "DELETE",
      }).success,
    ).toBe(false);
    vi.mocked(askGroq).mockRejectedValueOnce(Error("timeout"));
    expect((await send("business growth kaise hogi?")).body.message).toContain(
      "AI abhi jawab nahi",
    );
    model({ action: "dues", customer: "Raju", balance: 0 });
    expect((await send("customer balance batao")).body.message).toContain(
      "koi record change nahi",
    );
  });
});
