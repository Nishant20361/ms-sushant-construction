import jwt, { SignOptions } from "jsonwebtoken";
import { config } from "../config.js";
import { AdminJwtPayload, Admin2faTempPayload } from "../types.js";

const ONE_DAY_SECONDS = 24 * 60 * 60;
const TEN_MINUTES_SECONDS = 10 * 60;

export function signAdminToken(payload: AdminJwtPayload): string {
  const opts: SignOptions = {
    expiresIn: ONE_DAY_SECONDS,
    issuer: "ms-sushant-construction",
    audience: "ms-sushant-admin",
  };
  return jwt.sign({ ...payload, sessionIssuedAtMs: Date.now() }, config.jwtSecret, opts);
}

export function verifyAdminToken(token: string): AdminJwtPayload {
  const decoded = jwt.verify(token, config.jwtSecret, {
    algorithms: ["HS256"],
    issuer: "ms-sushant-construction",
    audience: "ms-sushant-admin",
  });
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }
  return decoded as unknown as AdminJwtPayload;
}

export function signTemp2faToken(adminId: number, username: string): string {
  const opts: SignOptions = {
    expiresIn: TEN_MINUTES_SECONDS,
    issuer: "ms-sushant-construction",
    audience: "ms-sushant-admin-2fa",
  };
  return jwt.sign({ sub: String(adminId), username, purpose: "2fa_pending", issuedAtMs: Date.now() }, config.jwtSecret, opts);
}

export function verifyTemp2faToken(token: string): Admin2faTempPayload {
  const decoded = jwt.verify(token, config.jwtSecret, {
    algorithms: ["HS256"],
    issuer: "ms-sushant-construction",
    audience: "ms-sushant-admin-2fa",
  });
  if (typeof decoded === "string") {
    throw new Error("Invalid 2FA token payload");
  }
  return decoded as unknown as Admin2faTempPayload;
}
