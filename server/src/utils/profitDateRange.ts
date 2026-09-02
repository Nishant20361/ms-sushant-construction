import { HttpError } from "./httpError.js";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoDate(value: unknown, field: "from" | "to"): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !ISO_DATE.test(value)) {
    throw new HttpError(400, `${field} must use YYYY-MM-DD format`);
  }

  const match = ISO_DATE.exec(value)!;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new HttpError(400, `${field} is not a valid calendar date`);
  }
  return value;
}

export function parseProfitDateRange(from: unknown, to: unknown): { from?: string; to?: string } {
  const parsedFrom = parseIsoDate(from, "from");
  const parsedTo = parseIsoDate(to, "to");
  if (parsedFrom && parsedTo && parsedFrom > parsedTo) {
    throw new HttpError(400, "from date must be on or before to date");
  }
  return { from: parsedFrom, to: parsedTo };
}
