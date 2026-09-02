import { Request } from "express";

export interface AdminJwtPayload {
  sub: string;
  username: string;
  role: string;
  sessionIssuedAtMs?: number;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  admin?: AdminJwtPayload;
}
