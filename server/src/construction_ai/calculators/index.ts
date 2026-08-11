export * from "./slabCalculator.js";
export * from "./columnCalculator.js";
export * from "./brickWallCalculator.js";
export * from "./paintCalculator.js";
export * from "./tileCalculator.js";

import { calculateSlab, SlabCalcResult } from "./slabCalculator.js";
import { calculateColumns, ColumnCalcResult } from "./columnCalculator.js";
import { calculateBrickWall, BrickWallCalcResult } from "./brickWallCalculator.js";
import { calculatePaint, PaintCalcResult } from "./paintCalculator.js";
import { calculateTiles, TileCalcResult } from "./tileCalculator.js";

export type AdvancedCalcType = "slab" | "column" | "brickwall" | "paint" | "tile" | null;

export interface AdvancedCalcResult {
  type: AdvancedCalcType;
  result: SlabCalcResult | ColumnCalcResult | BrickWallCalcResult | PaintCalcResult | TileCalcResult | null;
  formattedText: string;
}

/**
 * Extract numbers and intent from text and run the appropriate advanced calculator.
 */
export function processAdvancedCalculator(message: string): AdvancedCalcResult {
  const lower = message.toLowerCase();

  // Extract first 4-digit or 3-digit or 2-digit numbers
  const numberMatches = lower.match(/\d+/g)?.map(Number) || [];
  const firstNumber = numberMatches[0] || 1000;
  const secondNumber = numberMatches[1] || 0;

  // Check dimension pair e.g. 40x25 => 1000
  let areaFromDimensions = 0;
  const dimMatch = lower.match(/(\d+)\s*[x×*]\s*(\d+)/);
  if (dimMatch) {
    areaFromDimensions = Number(dimMatch[1]) * Number(dimMatch[2]);
  }

  // 1. Slab Calculator Intent
  if (
    lower.includes("chhat") ||
    lower.includes("छत") ||
    lower.includes("slab") ||
    lower.includes("ढलाई") ||
    lower.includes("roof slab")
  ) {
    const area = areaFromDimensions || (firstNumber >= 50 ? firstNumber : 1000);
    const res = calculateSlab({ areaSqFt: area });
    return { type: "slab", result: res, formattedText: res.summaryHi };
  }

  // 2. Column Calculator Intent
  if (
    lower.includes("column") ||
    lower.includes("कॉलम") ||
    lower.includes("pillar") ||
    lower.includes("पिलर")
  ) {
    // Check if user specified column count (e.g., "20 column", "15 pillar")
    const countMatch = lower.match(/(\d+)\s*(column|कॉलम|pillar|पिलर)/i) || lower.match(/(column|कॉलम|pillar|पिलर)\s*(\d+)/i);
    const numCols = countMatch ? Number(countMatch[1] || countMatch[2]) : (firstNumber < 100 ? firstNumber : 20);
    const res = calculateColumns({ numColumns: numCols });
    return { type: "column", result: res, formattedText: res.summaryHi };
  }

  // 3. Paint Calculator Intent
  if (
    lower.includes("paint") ||
    lower.includes("पेंट") ||
    lower.includes("putty") ||
    lower.includes("पुट्टी") ||
    lower.includes("primer") ||
    lower.includes("प्राइमर")
  ) {
    const area = areaFromDimensions || (firstNumber >= 50 ? firstNumber : 1000);
    const res = calculatePaint({ areaSqFt: area });
    return { type: "paint", result: res, formattedText: res.summaryHi };
  }

  // 4. Tile Calculator Intent
  if (
    lower.includes("tile") ||
    lower.includes("टाइल") ||
    lower.includes("flooring") ||
    lower.includes("फर्श")
  ) {
    const area = areaFromDimensions || (firstNumber >= 50 ? firstNumber : 1000);
    const res = calculateTiles({ areaSqFt: area });
    return { type: "tile", result: res, formattedText: res.summaryHi };
  }

  // 5. Brick Wall Calculator Intent
  if (
    lower.includes("itt") ||
    lower.includes("ईंट") ||
    lower.includes("brick") ||
    lower.includes("wall") ||
    lower.includes("दीवार")
  ) {
    const area = areaFromDimensions || (firstNumber && secondNumber ? firstNumber * secondNumber : (firstNumber >= 50 ? firstNumber : 500));
    const res = calculateBrickWall({ wallAreaSqFt: area });
    return { type: "brickwall", result: res, formattedText: res.summaryHi };
  }

  return { type: null, result: null, formattedText: "" };
}
