import crypto from "node:crypto";
import express from "express";
import cookieParser from "cookie-parser";
import supertest from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ admin: null as any, session: null as any, setting: null as any }));
vi.mock("../src/db.js", () => {
  const tx: any = {
    $queryRaw: vi.fn(async () => []),
    admin: {
      findUnique: vi.fn(async ({ where }: any) => where.username && where.username !== state.admin.username ? null : state.admin),
      findUniqueOrThrow: vi.fn(async () => state.admin),
      update: vi.fn(async ({ data }: any) => { Object.assign(state.admin, data); return state.admin; }),
    },
    adminSession: {
      findUnique: vi.fn(async ({ where }: any) => state.session?.id === where.id ? state.session : null),
      update: vi.fn(async ({ data }: any) => { Object.assign(state.session, data); return state.session; }),
      updateMany: vi.fn(async () => { state.session.khatabookUnlockedUntil = null; return { count: 1 }; }),
    },
    siteSetting: { findFirst: vi.fn(async () => state.setting) },
  };
  tx.$transaction = async (fn: any) => fn(tx);
  return { prisma: tx };
});
vi.mock("../src/middleware/audit.js", () => ({ writeAudit: vi.fn(async () => {}) }));
vi.mock("../src/services/email.service.js", () => ({
  sendPasswordResetEmail: vi.fn(), sendPasswordChangedEmail: vi.fn(),
  sendAdmin2faOtpEmail: vi.fn(), sendKhatabookOtpEmail: vi.fn(),
}));
vi.mock("../src/utils/inventoryFifo.js", () => ({ getProfitAnalytics: vi.fn(async () => ({ syntheticProfit: 42 })) }));

import authRoutes from "../src/routes/admin/auth.js";
import settingsRoutes from "../src/routes/admin/settings.js";
import khatabookRoutes from "../src/routes/admin/khatabookAuth.js";
import profitRoutes from "../src/routes/admin/khatabookProfit.js";
import { hashPassword } from "../src/utils/password.js";
import { signAdminToken } from "../src/utils/token.js";
import { csrfProtect, issueCsrfToken } from "../src/utils/csrf.js";
import { config } from "../src/config.js";
import { HttpError } from "../src/utils/httpError.js";
import { verifyKhatabookPin } from "../src/services/khatabookSecurity.service.js";
import { getProfitAnalytics } from "../src/utils/inventoryFifo.js";

const password = "Test-only-strong-password!";
let passwordHash: string;
let pinHash: string;
const app = express();
app.use(express.json(), cookieParser());
app.get("/api/csrf", (req, res) => res.json({ token: issueCsrfToken(req, res) }));
app.use("/api", csrfProtect);
app.use("/api/admin", authRoutes, settingsRoutes, khatabookRoutes, profitRoutes);
app.use((error: HttpError, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(error.status || 500).json({ success: false, error: error.message });
});

beforeAll(async () => { passwordHash = await hashPassword(password); pinHash = await hashPassword("8675"); });
beforeEach(() => {
  vi.clearAllMocks();
  state.admin = { id: 1, username: "test-admin", passwordHash, isActive: true, twoFactorEnabled: false,
    email: "owner@example.invalid", failedLoginAttempts: 0, lockedUntil: null, role: "ADMIN" };
  const token = signAdminToken({ sub: "1", username: "test-admin", role: "ADMIN", sessionId: "test-session" });
  state.session = { id: "test-session", adminId: 1, tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    token, expiresAt: new Date(Date.now() + 3600_000), lastActiveAt: new Date(), khatabookUnlockedUntil: null };
  state.setting = { khatabookPinHash: pinHash, khatabookRecoveryEmail: "owner@example.invalid", updatedAt: new Date() };
});

async function client(authenticated = false) {
  const agent = supertest.agent(app);
  const csrf = await agent.get("/api/csrf");
  const cookie = `ms_sushant_csrf=${csrf.body.token}${authenticated ? `; ${config.cookieName}=${state.session.token}` : ""}`;
  return { agent, cookie, csrf: csrf.body.token as string };
}

describe("admin security fixes with isolated database and provider mocks", () => {
  it("does not reveal valid usernames or lockout counters in failed-login responses", async () => {
    const { agent, cookie, csrf } = await client();
    const attempt = (username: string) => agent.post("/api/admin/auth/login").set("Cookie", cookie).set("X-CSRF-Token", csrf).send({ username, password: "wrong" });
    const unknown = await attempt("missing-user");
    const known = await attempt("test-admin");
    expect(known.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(known.body).toEqual(unknown.body);
    expect(known.body).not.toHaveProperty("attemptsRemaining");
    expect(state.admin.failedLoginAttempts).toBe(1);
    state.admin.lockedUntil = new Date(Date.now() + 900_000);
    const locked = await attempt("test-admin");
    expect(locked.status).toBe(401);
    expect(locked.body).toEqual(unknown.body);
    expect(locked.headers).not.toHaveProperty("retry-after");
  });

  it("requires the current password to change a recovery email even with 2FA disabled", async () => {
    const { agent, cookie, csrf } = await client(true);
    const change = (currentPassword?: string) => agent.put("/api/admin/profile/email").set("Cookie", cookie).set("X-CSRF-Token", csrf)
      .send({ email: "replacement@example.invalid", currentPassword });
    expect((await change()).status).toBe(403);
    expect((await change("wrong")).status).toBe(403);
    expect(state.admin.email).toBe("owner@example.invalid");
    expect((await change(password)).status).toBe(200);
    expect(state.admin.email).toBe("replacement@example.invalid");
  });

  it("preserves the 2FA email safeguard", async () => {
    state.admin.twoFactorEnabled = true;
    const { agent, cookie, csrf } = await client(true);
    expect((await agent.put("/api/admin/profile/email").set("Cookie", cookie).set("X-CSRF-Token", csrf)
      .send({ email: "replacement@example.invalid", currentPassword: password })).status).toBe(409);
    expect(state.admin.email).toBe("owner@example.invalid");
  });

  it("requires a PIN unlock, allows a correct PIN, and revokes access on lock", async () => {
    const { agent, cookie, csrf } = await client(true);
    const profit = () => agent.get("/api/admin/khatabook/profit").set("Cookie", cookie);
    expect((await profit()).status).toBe(403);
    expect(getProfitAnalytics).not.toHaveBeenCalled();
    expect((await agent.post("/api/admin/khatabook/verify-pin").set("Cookie", cookie).set("X-CSRF-Token", csrf).send({ pin: "wrong" })).status).toBe(400);
    expect((await profit()).status).toBe(403);
    expect((await agent.post("/api/admin/khatabook/verify-pin").set("Cookie", cookie).set("X-CSRF-Token", csrf).send({ pin: "8675" })).status).toBe(200);
    expect((await profit()).body).toEqual({ syntheticProfit: 42 });
    expect((await agent.post("/api/admin/khatabook/lock").set("Cookie", cookie).set("X-CSRF-Token", csrf)).status).toBe(200);
    expect((await profit()).status).toBe(403);
  });

  it("rejects expired PIN unlocks and another device's session", async () => {
    const { agent, cookie } = await client(true);
    state.session.khatabookUnlockedUntil = new Date(Date.now() - 1);
    expect((await agent.get("/api/admin/khatabook/profit").set("Cookie", cookie)).status).toBe(403);
    state.session.adminId = 2;
    expect((await agent.get("/api/admin/khatabook/profit").set("Cookie", cookie)).status).toBe(401);
  });

  it("does not accept the former shared default PIN when no PIN is set", async () => {
    state.setting.khatabookPinHash = null;
    expect(await verifyKhatabookPin("1234")).toBe(false);
  });
});
