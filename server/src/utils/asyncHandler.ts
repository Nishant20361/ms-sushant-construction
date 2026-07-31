import { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an async route handler so thrown errors are forwarded to the
 * centralized error handler instead of crashing the process.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

