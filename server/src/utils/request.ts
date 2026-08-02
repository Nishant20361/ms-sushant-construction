import { HttpError } from "./httpError.js";

export function parseIntegerParam(value: unknown, name = "id"): number {
  if (value == null || value === "") {
    throw new HttpError(400, `Invalid ${name}`);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || Number.isNaN(parsed)) {
    throw new HttpError(400, `Invalid ${name}`);
  }
  return parsed;
}
