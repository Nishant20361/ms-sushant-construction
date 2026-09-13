import { Request } from "express";

export interface AdminJwtPayload {
  sub: string;
  username: string;
  role: string;
  sessionId?: string;
  sessionIssuedAtMs?: number;
  iat?: number;
  exp?: number;
}

export interface Admin2faTempPayload {
  sub: string;
  username: string;
  purpose: "2fa_pending";
  issuedAtMs?: number;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  admin?: AdminJwtPayload;
}
