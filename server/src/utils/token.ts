import jwt, { SignOptions } from "jsonwebtoken";
import { config } from "../config.js";
import { AdminJwtPayload } from "../types.js";

const ONE_DAY_SECONDS = 24 * 60 * 60;

export function signAdminToken(payload: AdminJwtPayload): string {
  const opts: SignOptions = {
    expiresIn: ONE_DAY_SECONDS,
    issuer: "ms-sushant-construction",
    audience: "ms-sushant-admin",
  };
  return jwt.sign(payload, config.jwtSecret, opts);
}

export function verifyAdminToken(token: string): AdminJwtPayload {
  const decoded = jwt.verify(token, config.jwtSecret, {
    issuer: "ms-sushant-construction",
    audience: "ms-sushant-admin",
  });
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }
  return decoded as unknown as AdminJwtPayload;
}

