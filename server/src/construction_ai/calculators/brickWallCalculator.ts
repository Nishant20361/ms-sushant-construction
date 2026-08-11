export interface BrickWallCalcInput {
  wallLengthFt?: number;
  wallHeightFt?: number;
  wallAreaSqFt?: number;
  thicknessInches?: number; // 9 inch or 4.5 inch
}

export interface BrickWallCalcResult {
  wallAreaSqFt: number;
  thicknessInches: number;
  numberOfBricks: number;
  cementBags: number;
  sandCft: number;
  summaryHi: string;
  summaryEn: string;
}

/**
 * Calculates bricks, cement, and sand for masonry wall (1:6 mortar).
 */
export function calculateBrickWall(input: BrickWallCalcInput): BrickWallCalcResult {
  let wallAreaSqFt = input.wallAreaSqFt ?? 0;
  if (!wallAreaSqFt && input.wallLengthFt && input.wallHeightFt) {
    wallAreaSqFt = input.wallLengthFt * input.wallHeightFt;
  }
  wallAreaSqFt = Math.max(1, wallAreaSqFt);

  const thicknessInches = input.thicknessInches ?? 9;
  const isHalfBrick = thicknessInches <= 5; // 4.5 inch wall

  // Bricks multiplier per sq.ft (including 5% wastage)
  const bricksPerSqFt = isHalfBrick ? 5.6 : 11.25;
  const numberOfBricks = Math.ceil(wallAreaSqFt * bricksPerSqFt);

  // Mortar (1:6 ratio)
  const cementPerSqFt = isHalfBrick ? 0.006 : 0.012; // bags
  const sandPerSqFt = isHalfBrick ? 0.09 : 0.18; // cft

  const cementBags = Math.max(1, Math.ceil(wallAreaSqFt * cementPerSqFt));
  const sandCft = Math.round(wallAreaSqFt * sandPerSqFt);

  const wallType = isHalfBrick ? '4.5" (Partition Wall)' : '9" (Main Wall)';

  const summaryHi =
    `🧱 **${wallAreaSqFt} sq.ft. ईंट की दीवार का अनुमान (${wallType}):**\n` +
    `• कुल ईंटें (Red Bricks): ~${numberOfBricks} नग\n` +
    `• सीमेंट (प्लास्टर/चिनाई): ~${cementBags} बैग\n` +
    `• बालू/रेत (Sand): ~${sandCft} cft`;

  const summaryEn =
    `🧱 **${wallAreaSqFt} sq.ft. Brick Wall Estimation (${wallType}):**\n` +
    `• Total Red Bricks: ~${numberOfBricks} pcs\n` +
    `• Cement (Mortar 1:6): ~${cementBags} bags\n` +
    `• Sand: ~${sandCft} cft`;

  return {
    wallAreaSqFt,
    thicknessInches,
    numberOfBricks,
    cementBags,
    sandCft,
    summaryHi,
    summaryEn,
  };
}
