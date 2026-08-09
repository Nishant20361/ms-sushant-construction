/**
 * Calculation helpers: parse a house size from user text and compute the
 * material + cost estimate from the dataset.
 *
 * All new helpers are APPROXIMATE planning calculations. They are clearly
 * labelled as estimates and never presented as engineering approval.
 */
import {
  MATERIAL_RATES,
  COST_BANDS,
  BuildQuality,
  MAX_AREA,
  WATER_TANK_PARAMS,
  ELECTRICAL_PARAMS,
  PLUMBING_PARAMS,
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
 * Supported separators: "x", "×", "*", "by", "बाई", "बाय", "बाइ", "गुणा".
 * Handles trailing "h"/"f" (e.g. "40x35h") and "feet"/"ft"/"फीट" suffixes.
 * Returns null when a valid LENGTH x WIDTH pair cannot be found.
 */
export function parseDimensions(text: string): ParsedDimensions | null {
  const cleaned = text
    .toLowerCase()
    // Normalize the various separators to a single marker with spaces.
    .replace(/गुणा/g, " x ")
    .replace(/बाई/g, " x ")
    .replace(/बाय/g, " x ")
    .replace(/बाइ/g, " x ")
    .replace(/×/g, " x ")
    .replace(/\*/g, " x ")
    .replace(/\bby\b/g, " x ")
// Normalize "feet"/"ft"/"फीट"/"fit"/"h"/"f" suffixes.
    .replace(/\s*(?:feet|ft|फीट|फुट|fit|h|f)\b/g, "");

  // Match a pair of numbers separated by "x", with optional "feet"/"ft"/"फीट" suffix.
  const patterns: RegExp[] = [
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

// ===========================================================================
// NEW: Approximate per-stage & material calculators (all planning estimates)
// ===========================================================================

/** Convert inches to feet. */
export function inchesToFeet(inches: number): number {
  return inches / 12;
}

/**
 * Approximate RCC roof/slab concrete volume.
 * volume(cu.ft) = length(ft) × width(ft) × thickness(ft).
 * Thickness is NOT a structural recommendation — example only.
 */
export function calculateRoofConcrete(
  lengthFt: number,
  widthFt: number,
  thicknessInches: number
): { volumeCft: number; volumeCum: number } {
  const volumeCft = lengthFt * widthFt * inchesToFeet(thicknessInches);
  // 1 cu.ft ≈ 0.0283168 cu.m
  const volumeCum = volumeCft * 0.0283168;
  return { volumeCft, volumeCum };
}

/**
 * Approximate RCC roof material for a given concrete volume.
 * Uses a typical nominal residential mix (e.g. M20 ~1:1.5:3) as an example.
 * Dry volume factor ~1.54.
 */
export function estimateRoofMaterials(
  volumeCft: number
): { cementBags: number; sandCft: number; aggregateCft: number; steelKg: number } {
  const dryFactor = 1.54;
  const dryVol = volumeCft * dryFactor;
  // M20 nominal mix 1 : 1.5 : 3 (cement : sand : aggregate)
  const totalParts = 1 + 1.5 + 3;
  const cementCft = (dryVol / totalParts) * 1;
  const sandCft = (dryVol / totalParts) * 1.5;
  const aggregateCft = (dryVol / totalParts) * 3;
  // 1 bag cement ≈ 1.25 CFT
  const cementBags = Math.round(cementCft / 1.25);
  // Approx 80-100 kg steel per cu.m of slab (structural). Use 90 kg/cu.m.
  const steelKg = Math.round((volumeCft * 0.0283168) * 90);
  return {
    cementBags,
    sandCft: Math.round(sandCft),
    aggregateCft: Math.round(aggregateCft),
    steelKg,
  };
}

/**
 * Approximate brick wall requirement.
 * bricks = wall volume(sq.ft of face) × bricksPerSqft, with wastage.
 * wallFaceArea = length × height (sq.ft). thickness in inches.
 */
export function calculateBrickWall(
  lengthFt: number,
  heightFt: number,
  thicknessInches: number,
  wastage = 0.08
): { bricks: number; mortarCft: number; cementBags: number; sandCft: number } {
  const faceArea = lengthFt * heightFt;
  // Rough rule: 15 bricks/sq.ft of wall face (for 9-inch wall roughly).
  // Adjust roughly by thickness factor (9-inch standard).
  const thicknessFactor = thicknessInches / 9;
  const bricks = Math.round(faceArea * 15 * thicknessFactor * (1 + wastage));
  // Approx mortar ~ 0.3 CFT per sq.ft of 9-inch wall.
  const mortarCft = Math.round(faceArea * 0.3 * thicknessFactor);
  // Approx 1:6 mortar: cement ~ 1.2 bags per 10 CFT mortar; sand ~ 6 CFT per 7 CFT.
  const cementBags = Math.round((mortarCft / 10) * 1.2);
  const sandCft = Math.round((mortarCft / 7) * 6);
  return { bricks, mortarCft, cementBags, sandCft };
}

/**
 * Approximate PCC material for a given area & thickness.
 * dryFactor ~1.54, nominal lean mix 1:4:8.
 */
export function calculatePCC(
  areaSqft: number,
  thicknessInches: number
): { volumeCft: number; cementBags: number; sandCft: number; aggregateCft: number } {
  const volumeCft = areaSqft * inchesToFeet(thicknessInches);
  const dryVol = volumeCft * 1.54;
  const totalParts = 1 + 4 + 8;
  const cementCft = (dryVol / totalParts) * 1;
  const sandCft = (dryVol / totalParts) * 4;
  const aggregateCft = (dryVol / totalParts) * 8;
  return {
    volumeCft: Math.round(volumeCft),
    cementBags: Math.round(cementCft / 1.25),
    sandCft: Math.round(sandCft),
    aggregateCft: Math.round(aggregateCft),
  };
}

/**
 * Approximate plaster material.
 * wetVolume = area × thickness. dryVolume ≈ 1.33 × wetVolume.
 * Nominal cement : sand = 1:6 (internal) example.
 */
export function calculatePlaster(
  areaSqft: number,
  thicknessInches: number,
  ratioCementSand: [number, number] = [1, 6]
): { wetVolumeCft: number; dryVolumeCft: number; cementBags: number; sandCft: number } {
  const wetVolumeCft = areaSqft * inchesToFeet(thicknessInches);
  const dryVolumeCft = wetVolumeCft * 1.33;
  const [cementParts, sandParts] = ratioCementSand;
  const totalParts = cementParts + sandParts;
  const cementCft = (dryVolumeCft / totalParts) * cementParts;
  const sandCft = (dryVolumeCft / totalParts) * sandParts;
  return {
    wetVolumeCft: Math.round(wetVolumeCft),
    dryVolumeCft: Math.round(dryVolumeCft),
    cementBags: Math.round(cementCft / 1.25),
    sandCft: Math.round(sandCft),
  };
}

/**
 * Approximate flooring requirement.
 * Required tile area = floor area × (1 + wastage%).
 */
export function calculateFlooring(
  lengthFt: number,
  widthFt: number,
  wastage = 0.08
): { floorArea: number; requiredTileArea: number; wastageAmount: number } {
  const floorArea = lengthFt * widthFt;
  const requiredTileArea = floorArea * (1 + wastage);
  return {
    floorArea: Math.round(floorArea),
    requiredTileArea: Math.round(requiredTileArea),
    wastageAmount: Math.round(floorArea * wastage),
  };
}

/**
 * Approximate wall tile area.
 * wallTileArea = wall length × wall height, minus openings.
 */
export function calculateWallTiles(
  wallLengthFt: number,
  wallHeightFt: number,
  openingAreaSqft = 0,
  wastage = 0.08
): { wallArea: number; requiredTileArea: number; wastageAmount: number } {
  const wallArea = wallLengthFt * wallHeightFt - openingAreaSqft;
  const requiredTileArea = wallArea * (1 + wastage);
  return {
    wallArea: Math.round(wallArea),
    requiredTileArea: Math.round(requiredTileArea),
    wastageAmount: Math.round(wallArea * wastage),
  };
}

/**
 * Approximate painting input.
 * Coverage approx ranges (per ltr per coat). wallAreaSqft & ceilingAreaSqft.
 */
export function calculatePaint(
  wallAreaSqft: number,
  ceilingAreaSqft = 0,
  coats = 2,
  coverageSqftPerLtr = 100
): { totalArea: number; paintLtr: number; primerLtr: number; puttyKg: number } {
  const totalArea = wallAreaSqft + ceilingAreaSqft;
  const paintLtr = Math.round((totalArea * coats) / coverageSqftPerLtr);
  // Primer ~1 coat over walls+ceiling.
  const primerLtr = Math.round(totalArea / coverageSqftPerLtr);
  // Putty ~0.2 kg/sq.ft (approx 2 coats).
  const puttyKg = Math.round(totalArea * 0.2);
  return { totalArea: Math.round(totalArea), paintLtr, primerLtr, puttyKg };
}

/** Approximate cost by location using configurable ranges. */
export function calculateCostByLocation(
  areaSqft: number,
  costPerSqft: { min: number; max: number }
): { costMin: number; costMax: number } {
  return { costMin: areaSqft * costPerSqft.min, costMax: areaSqft * costPerSqft.max };
}

/**
 * Approximate water tank capacity for a household.
 * liters = people × litersPerPersonPerDay × reserveDays.
 * Returns range (e.g. 2-3 days).
 */
export function waterTankCapacity(
  people: number,
  reserveDays: [number, number] = [2, 3]
): { litersMin: number; litersMax: number; perDay: number } {
  const perDay = people * WATER_TANK_PARAMS.litersPerPersonPerDay;
  return {
    litersMin: Math.round(perDay * reserveDays[0]),
    litersMax: Math.round(perDay * reserveDays[1]),
    perDay: Math.round(perDay),
  };
}

/** Approximate doors/windows area. */
export function doorsWindowsArea(
  count: number,
  widthFt: number,
  heightFt: number
): { areaSqft: number; eachArea: number } {
  const eachArea = widthFt * heightFt;
  return { areaSqft: Math.round(eachArea * count), eachArea: Math.round(eachArea) };
}

/** Approximate electrical estimate based on room/point counts. */
export function estimateElectrical(params: {
  rooms?: number;
  fans?: number;
  lights?: number;
  sockets?: number;
  acPoints?: number;
  geyserPoints?: number;
}): { points: number; wireRolls: number; note: string } {
  const rooms = params.rooms ?? 1;
  const basePoints =
    (params.fans ?? rooms) +
    (params.lights ?? rooms * 2) +
    (params.sockets ?? rooms * 3) +
    (params.acPoints ?? 0) +
    (params.geyserPoints ?? 0);
  const points = Math.max(1, basePoints);
  const wireRolls = Math.round(points * ELECTRICAL_PARAMS.wireRollsPerPoint);
  return {
    points,
    wireRolls,
    note: "Electrical wiring का final quantity electrical layout के बाद तय होगा।",
  };
}

/** Approximate plumbing pipe estimate. */
export function estimatePlumbing(params: {
  bathrooms?: number;
  kitchens?: number;
  washBasins?: number;
  toilets?: number;
}): { totalPipeFt: number; note: string } {
  const bathrooms = params.bathrooms ?? 1;
  const kitchens = params.kitchens ?? 1;
  const totalPipeFt = Math.round(
    bathrooms * PLUMBING_PARAMS.pipePerBathroom + kitchens * PLUMBING_PARAMS.pipePerKitchen
  );
  return { totalPipeFt, note: "Pipe quantity plumbing layout के बाद तय होगा।" };
}

/** Approximate staircase material note (design dependent). */
export function staircaseEstimate(): { note: string } {
  return {
    note: "Staircase design depends on floor height, available space and structural design.",
  };
}

// ===========================================================================
// PART 2 — Room-based area estimation & cost breakdown helpers
// ===========================================================================

/**
 * Approximate house built-up area from a room composition (Phase 12).
 * Uses rough per-room planning figures (sq.ft). These are approximate and
 * only used to start a conversation when the user gives rooms instead of
 * dimensions.
 */
export interface RoomComposition {
  bedrooms?: number;
  halls?: number;
  kitchens?: number;
  bathrooms?: number;
  stores?: number;
  balconies?: number;
  verandas?: number;
  staircases?: number;
}

export function estimateAreaFromRooms(rooms: RoomComposition): number {
  const bedrooms = rooms.bedrooms ?? 0;
  const halls = rooms.halls ?? 0;
  const kitchens = rooms.kitchens ?? 0;
  const bathrooms = rooms.bathrooms ?? 0;
  const stores = rooms.stores ?? 0;
  const balconies = rooms.balconies ?? 0;
  const verandas = rooms.verandas ?? 0;
  const staircases = rooms.staircases ?? 0;

  // Rough per-room planning figures (sq.ft).
  const area =
    bedrooms * 180 +
    halls * 250 +
    kitchens * 120 +
    bathrooms * 60 +
    stores * 80 +
    balconies * 40 +
    verandas * 60 +
    staircases * 80;
  return area;
}

/** Format a number with Indian grouping (re-export convenience). */
export function roomBasedAreaLabel(area: number): string {
  return formatIndianNumber(area) + " sq.ft";
}
