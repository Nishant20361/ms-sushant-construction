/**
 * Construction knowledge dataset.
 *
 * All values are "per square foot" estimates used by the local rule-based
 * assistant. These are approximate planning figures only — final quantities
 * depend on the actual structural design, location and soil conditions.
 */

export interface MaterialRate {
  /** Bags of cement per square foot. */
  cementBagsPerSqft: number;
  /** Kilograms of steel per square foot. */
  steelKgPerSqft: number;
  /** Number of standard bricks per square foot. */
  bricksPerSqft: number;
  /** Cubic feet of sand per square foot. */
  sandCftPerSqft: number;
  /** Cubic feet of aggregate (bajri) per square foot. */
  aggregateCftPerSqft: number;
}

export const MATERIAL_RATES: MaterialRate = {
  cementBagsPerSqft: 0.4,
  steelKgPerSqft: 4,
  bricksPerSqft: 15,
  sandCftPerSqft: 1.8,
  aggregateCftPerSqft: 3,
};

export type BuildQuality = "normal" | "premium";

export interface CostBand {
  /** Minimum cost per square foot (INR). */
  min: number;
  /** Maximum cost per square foot (INR). */
  max: number;
}

export const COST_BANDS: Record<BuildQuality, CostBand> = {
  normal: { min: 1800, max: 2200 },
  premium: { min: 2500, max: 3500 },
};

/** Standard floor height factor used to scale a single-storey estimate. */
export const FLOOR_HEIGHT_FACTOR = 1;

/** Max floor count we will reasonably estimate. */
export const MAX_FLOORS = 5;

/** Max house area (sq.ft.) we will estimate. */
export const MAX_AREA = 100000;
