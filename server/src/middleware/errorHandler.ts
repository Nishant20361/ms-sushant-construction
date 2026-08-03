import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { HttpError } from "../utils/httpError.js";
import { config } from "../config.js";

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ success: false, error: "Route not found" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: "Validation failed",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return;
  }

  // Prisma known request errors (e.g. unique constraint)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ success: false, error: "A record with that unique value already exists." });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ success: false, error: "Record not found." });
      return;
    }
    if (err.code === "P2023" || err.message.includes("22P03") || err.message.includes("invalid binary data format")) {
      res.status(400).json({ success: false, error: "Invalid numeric value provided. Please check the data and try again." });
      return;
    }
  }

  // Our own HTTP errors
  if (err instanceof HttpError) {
    res.status(err.status).json({ success: false, error: err.message });
    return;
  }

  // Multer errors
  if (err instanceof Error && "code" in err && (err as any).code === "LIMIT_FILE_SIZE") {
    res.status(400).json({ success: false, error: "File too large. Maximum allowed size is 5 MB." });
    return;
  }
  if (err instanceof Error && "code" in err && (err as any).code === "UNSUPPORTED_FILE") {
    res.status(400).json({ success: false, error: "Unsupported file type." });
    return;
  }

  // Fallback: never leak internals
  if (config.isProd) {
    console.error("[error]", err);
    res.status(500).json({ success: false, error: "Internal server error." });
  } else {
    console.error("[error]", err);
    const message = err instanceof Error ? err.message : "Internal server error.";
    res.status(500).json({ success: false, error: message });
  }
}

