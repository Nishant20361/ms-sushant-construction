/**
 * Cement company / product knowledge (modular re-export of dataset.ts).
 *
 * The full cement dataset lives in dataset.ts; this module re-exports the
 * cement-related structures so the assistant can import them cleanly.
 */
import {
  CEMENT_COMPANIES,
  CementCompany,
  FOUNDATION_TYPES,
  FoundationType,
} from "./dataset.js";

export { CEMENT_COMPANIES, FOUNDATION_TYPES };
export type { CementCompany, FoundationType };

export function findCementCompany(text: string): CementCompany | null {
  const lower = text.toLowerCase();
  return CEMENT_COMPANIES.find((c) => c.aliases.some((a) => lower.includes(a.toLowerCase()))) ?? null;
}
