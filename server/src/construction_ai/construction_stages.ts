/**
 * Construction stages dataset (modular re-export of dataset.ts).
 */
import {
  CONSTRUCTION_STAGES,
  ConstructionStage,
  FOUNDATION_TYPES,
  FoundationType,
} from "./dataset.js";

export { CONSTRUCTION_STAGES, FOUNDATION_TYPES };
export type { ConstructionStage, FoundationType };

/** Find the construction stage with the most keyword hits (most specific match). */
export function findStage(text: string): ConstructionStage | null {
  const lower = text.toLowerCase();
  let best: { stage: ConstructionStage; score: number } | null = null;
  for (const s of CONSTRUCTION_STAGES) {
    let score = 0;
    for (const k of s.keywords) {
      if (lower.includes(k.toLowerCase())) score += k.length;
    }
    if (score > 0 && (!best || score > best.score)) best = { stage: s, score };
  }
  return best ? best.stage : null;
}
