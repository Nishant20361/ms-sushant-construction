import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { hashPassword } from "../src/utils/password.js";

let app: ReturnType<typeof createApp>;
const TEST_ADMIN_USERNAME = "security_test_admin";
const TEST_PASSWORD = "StrongSecurityPass123!";
let adminId: number;

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
  app = createApp();

  // Clean up any existing test admin
  await prisma.adminSession.deleteMany();
  const existing = await prisma.admin.findUnique({ where: { username: TEST_ADMIN_USERNAME } });
  if (existing) {
    await prisma.adminAuditLog.deleteMany({ where: { adminId: existing.id } });
    await prisma.admin.delete({ where: { id: existing.id } });
  }

  const passwordHash = await hashPassword(TEST_PASSWORD);
  const admin = await prisma.admin.create({
    data: {
      username: TEST_ADMIN_USERNAME,
      email: "test-admin@sushantconstruction.in",
      passwordHash,
      role: "ADMIN",
    },
  });
  adminId = admin.id;
});

afterAll(async () => {
  await prisma.adminSession.deleteMany({ where: { adminId } });
  await prisma.adminAuditLog.deleteMany({ where: { adminId } });
  await prisma.admin.deleteMany({ where: { id: adminId } });
});

describe("Admin 10-Attempt Lockout Security", () => {
  it("tracks failed attempts and locks out after 10 incorrect passwords", async () => {
    // Attempts 1 to 9 should return 401
    for (let i = 1; i <= 9; i++) {
      const { agent, token } = await getCsrf();
      const res = await agent
        .post("/api/admin/auth/login")
        .set("X-CSRF-Token", token)
        .send({ username: TEST_ADMIN_USERNAME, password: "wrong-password" });

      expect(res.status).toBe(401);
      expect(res.body).not.toHaveProperty("attemptsRemaining");
      expect((await prisma.admin.findUniqueOrThrow({ where: { id: adminId } })).failedLoginAttempts).toBe(i);
    }

    // 10th attempt triggers an internal lockout without revealing it
    const { agent, token } = await getCsrf();
    const res10 = await agent
      .post("/api/admin/auth/login")
      .set("X-CSRF-Token", token)
      .send({ username: TEST_ADMIN_USERNAME, password: "wrong-password" });

    expect(res10.status).toBe(401);
    expect(res10.body.error).toBe("Invalid username or password");
    expect((await prisma.admin.findUniqueOrThrow({ where: { id: adminId } })).lockedUntil!.getTime()).toBeGreaterThan(Date.now());

    // 11th attempt (even with correct password) while locked must still be rejected
    const { agent: agent11, token: token11 } = await getCsrf();
    const res11 = await agent11
      .post("/api/admin/auth/login")
      .set("X-CSRF-Token", token11)
      .send({ username: TEST_ADMIN_USERNAME, password: TEST_PASSWORD });

    expect(res11.status).toBe(401);
    expect(res11.body.error).toBe("Invalid username or password");

    // Manually unlock for remaining tests
    await prisma.admin.update({
      where: { id: adminId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  });

  it("successful login resets failed attempts counter", async () => {
    // 2 failed attempts
    for (let i = 0; i < 2; i++) {
      const { agent, token } = await getCsrf();
      await agent
        .post("/api/admin/auth/login")
        .set("X-CSRF-Token", token)
        .send({ username: TEST_ADMIN_USERNAME, password: "wrong-password" });
    }

    const checkAdmin = await prisma.admin.findUnique({ where: { id: adminId } });
    expect(checkAdmin?.failedLoginAttempts).toBe(2);

    // Correct login
    const { agent, token } = await getCsrf();
    const res = await agent
      .post("/api/admin/auth/login")
      .set("X-CSRF-Token", token)
      .send({ username: TEST_ADMIN_USERNAME, password: TEST_PASSWORD });

    expect(res.status).toBe(200);

    const updatedAdmin = await prisma.admin.findUnique({ where: { id: adminId } });
    expect(updatedAdmin?.failedLoginAttempts).toBe(0);
    expect(updatedAdmin?.lockedUntil).toBeNull();
  });
});

describe("Admin 5–6 Device Concurrent Session Limit", () => {
  it("enforces maximum 6 concurrent sessions and evicts oldest on 7th login", async () => {
    // Clear existing sessions
    await prisma.adminSession.deleteMany({ where: { adminId } });

    const agents: Array<{ agent: supertest.Agent; token: string }> = [];

    // Log in 6 devices
    for (let i = 1; i <= 6; i++) {
      const { agent, token } = await getCsrf();
      const res = await agent
        .post("/api/admin/auth/login")
        .set("X-CSRF-Token", token)
        .set("User-Agent", `TestDevice-${i}`)
        .send({ username: TEST_ADMIN_USERNAME, password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      agents.push({ agent, token });
    }

    // Verify all 6 devices are active and can access /me
    for (let i = 0; i < 6; i++) {
      const res = await agents[i].agent.get("/api/admin/auth/me");
      expect(res.status).toBe(200);
    }

    const sessionsCount = await prisma.adminSession.count({ where: { adminId } });
    expect(sessionsCount).toBe(6);

    // Now log in 7th device!
    const { agent: agent7, token: token7 } = await getCsrf();
    const res7 = await agent7
      .post("/api/admin/auth/login")
      .set("X-CSRF-Token", token7)
      .set("User-Agent", "TestDevice-7")
      .send({ username: TEST_ADMIN_USERNAME, password: TEST_PASSWORD });

    expect(res7.status).toBe(200);

    // Exactly 6 sessions must remain in DB
    const finalCount = await prisma.adminSession.count({ where: { adminId } });
    expect(finalCount).toBe(6);

    // Device 1 (the oldest) should now be evicted and rejected with 401
    const resEvicted = await agents[0].agent.get("/api/admin/auth/me");
    expect(resEvicted.status).toBe(401);
    expect(resEvicted.body.error).toContain("Maximum active device limit");

    // Devices 2 to 6 and Device 7 must still be authenticated!
    for (let i = 1; i < 6; i++) {
      const res = await agents[i].agent.get("/api/admin/auth/me");
      expect(res.status).toBe(200);
    }
    const res7Active = await agent7.get("/api/admin/auth/me");
    expect(res7Active.status).toBe(200);
  });
});

describe("Admin 2FA (Two-Factor Authentication)", () => {
  it("triggers 2FA OTP flow when enabled, verifies OTP, and signs in", async () => {
    // Enable 2FA on test admin
    await prisma.admin.update({
      where: { id: adminId },
      data: { twoFactorEnabled: true },
    });

    const { agent, token } = await getCsrf();
    const loginRes = await agent
      .post("/api/admin/auth/login")
      .set("X-CSRF-Token", token)
      .send({ username: TEST_ADMIN_USERNAME, password: TEST_PASSWORD });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.require2FA).toBe(true);
    expect(loginRes.body.tempToken).toBeDefined();
    expect(loginRes.body.maskedEmail).toBeDefined();

    const tempToken = loginRes.body.tempToken;

    // Reject wrong OTP
    const wrongRes = await agent
      .post("/api/admin/auth/verify-2fa")
      .set("X-CSRF-Token", token)
      .send({ tempToken, otp: "000000" });

    expect(wrongRes.status).toBe(400);
    expect(wrongRes.body.error).toContain("Incorrect verification code");

    // Fetch the OTP hash from DB or simulate valid OTP
    const testOtp = "123456";
    const crypto = await import("crypto");
    const testOtpHash = crypto.createHash("sha256").update(testOtp).digest("hex");
    await prisma.admin.update({
      where: { id: adminId },
      data: { twoFactorOtpHash: testOtpHash },
    });

    // Verify correct OTP
    const verifyRes = await agent
      .post("/api/admin/auth/verify-2fa")
      .set("X-CSRF-Token", token)
      .send({ tempToken, otp: testOtp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.admin).toBeDefined();
    expect(verifyRes.body.admin.username).toBe(TEST_ADMIN_USERNAME);

    // Verify session works
    const meRes = await agent.get("/api/admin/auth/me");
    expect(meRes.status).toBe(200);

    // Disable 2FA for subsequent tests
    await prisma.admin.update({
      where: { id: adminId },
      data: { twoFactorEnabled: false },
    });
  });
});
