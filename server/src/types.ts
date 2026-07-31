import { Request } from "express";

export interface AdminJwtPayload {
  sub: string;
  username: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  admin?: AdminJwtPayload;
}

