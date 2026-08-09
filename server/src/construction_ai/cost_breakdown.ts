/**
 * Cost breakdown dataset (Phase 18).
 *
 * Provides approximate percentage splits of total construction cost into
 * categories (material, labour, finishing, electrical, plumbing, other).
 * These are GENERAL planning figures — not live market rates.
 */
import { BuildQuality, COST_BANDS } from "./dataset.js";

export interface CostCategory {
  id: string;
  nameEn: string;
  nameHi: string;
  /** Approximate percentage of total cost. */
  percent: number;
}

/** Approximate category splits (sums to ~100%). */
export const DEFAULT_COST_SPLIT: CostCategory[] = [
  { id: "material", nameEn: "Material", nameHi: "Material / सामग्री", percent: 45 },
  { id: "labour", nameEn: "Labour", nameHi: "Labour / मजदूरी", percent: 25 },
  { id: "finishing", nameEn: "Finishing", nameHi: "Finishing / फिनिशिंग", percent: 12 },
  { id: "electrical", nameEn: "Electrical", nameHi: "Electrical / बिजली", percent: 6 },
  { id: "plumbing", nameEn: "Plumbing", nameHi: "Plumbing / प्लंबिंग", percent: 5 },
  { id: "other", nameEn: "Other / contingency", nameHi: "अन्य / आकस्मिक", percent: 7 },
];

export interface CostBreakdownResult {
  totalMin: number;
  totalMax: number;
  categories: { category: CostCategory; min: number; max: number }[];
}

/**
 * Approximate cost breakdown for a given area and quality.
 * Uses the configured per-sqft cost band (configurable, NOT live).
 */
export function costBreakdown(area: number, quality: BuildQuality): CostBreakdownResult {
  const band = COST_BANDS[quality] ?? COST_BANDS.normal;
  const totalMin = band.min * area;
  const totalMax = band.max * area;
  const categories = DEFAULT_COST_SPLIT.map((category) => ({
    category,
    min: Math.round((totalMin * category.percent) / 100),
    max: Math.round((totalMax * category.percent) / 100),
  }));
  return { totalMin, totalMax, categories };
}
