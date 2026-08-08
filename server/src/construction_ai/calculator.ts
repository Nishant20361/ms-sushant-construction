/**
 * Calculation helpers: parse a house size from user text and compute the
 * material + cost estimate from the dataset.
 */
import {
  MATERIAL_RATES,
  COST_BANDS,
  BuildQuality,
  MAX_AREA,
} from "./dataset.js";

export interface ParsedDimensions {
  length: number;
  width: number;
  area: number;
  /** The normalized raw string, e.g. "40x35". */
  raw: string;
}

/** Formats a plain (English) number with Indian-style lakh grouping. */
export function formatIndianNumber(num: number): string {
  if (!Number.isFinite(num)) return String(Math.round(num));
  const s = String(Math.round(num));
  // Add Indian digit grouping (e.g. 21000 -> 21,000 ; 2500000 -> 25,00,000)
  let out = s;
  const last3 = out.slice(-3);
  const rest = out.slice(0, -3);
  if (rest) {
    const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    out = grouped + "," + last3;
  }
  return out;
}

/**
 * Parse a two-dimensional house size from the user's message.
 *
 * Supported separators: "x", "×", "*", "by", "बाई", "गुणा".
 * Unquoted numbers are matched regardless of surrounding words.
 * Returns null when a valid LENGTH x WIDTH pair cannot be found.
 */
export function parseDimensions(text: string): ParsedDimensions | null {
  const cleaned = text
    .toLowerCase()
    // Normalize the various separators to a single marker with spaces.
    .replace(/गुणा/g, " बाई ")
    .replace(/×/g, " x ")
    .replace(/\*/g, " x ")
    .replace(/\bby\b/g, " x ")
    .replace(/बाई/g, " x ");

  // Match a pair of numbers separated by "x", with optional "feet"/"ft"/"फीट" suffix.
  const patterns: RegExp[] = [
    /(\d+)\s*[xX]\s*(\d+)/,
    /(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)/,
  ];

  for (const re of patterns) {
    const m = re.exec(cleaned);
    if (m && m[1] && m[2]) {
      const length = Number(m[1]);
      const width = Number(m[2]);
      if (!Number.isFinite(length) || !Number.isFinite(width) || length <= 0 || width <= 0) {
        continue;
      }
      const area = length * width;
      if (area > MAX_AREA) continue;
      return { length, width, area, raw: `${length}x${width}` };
    }
  }

  // Fallback: accept "40 बाई 35" already converted to "40 x 35" above.
  return null;
}

export interface MaterialEstimate {
  area: number;
  cementBags: number;
  steelTonnes: number;
  bricks: number;
  sandCft: number;
  aggregateCft: number;
  costMin: number;
  costMax: number;
}

/**
 * Compute estimated materials + cost for a given house area and quality.
 *
 * Cement uses 0.4 bags/sq.ft; steel 4 kg/sq.ft (converted to tonnes);
 * bricks 15/sq.ft; sand 1.8 CFT/sq.ft; aggregate 3 CFT/sq.ft.
 */
export function calculateMaterials(
  area: number,
  quality: BuildQuality
): MaterialEstimate {
  const r = MATERIAL_RATES;
  const band = COST_BANDS[quality];

  const cementBags = Math.round(r.cementBagsPerSqft * area);
  const steelTonnes = Math.round((r.steelKgPerSqft * area) / 1000 * 10) / 10;
  const bricks = Math.round(r.bricksPerSqft * area);
  const sandCft = Math.round(r.sandCftPerSqft * area);
  const aggregateCft = Math.round(r.aggregateCftPerSqft * area);

  const costMin = band.min * area;
  const costMax = band.max * area;

  return {
    area,
    cementBags,
    steelTonnes,
    bricks,
    sandCft,
    aggregateCft,
    costMin,
    costMax,
  };
}

