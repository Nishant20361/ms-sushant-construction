export interface TileCalcInput {
  areaSqFt: number;
  tileSizeFeet?: number; // default 2 ft (2x2 tile = 4 sqft)
  wastagePercent?: number; // default 10%
}

export interface TileCalcResult {
  areaSqFt: number;
  netAreaWithWastage: number;
  totalTiles: number;
  totalBoxes: number;
  adhesiveKg: number;
  summaryHi: string;
  summaryEn: string;
}

/**
 * Calculates tiles, boxes, adhesive/cement for flooring or wall tiles.
 */
export function calculateTiles(input: TileCalcInput): TileCalcResult {
  const areaSqFt = Math.max(1, input.areaSqFt);
  const tileSizeFeet = input.tileSizeFeet ?? 2; // 2x2 ft tiles
  const wastagePercent = input.wastagePercent ?? 10;

  const tileAreaSqFt = tileSizeFeet * tileSizeFeet;
  const netAreaWithWastage = areaSqFt * (1 + wastagePercent / 100);

  const totalTiles = Math.ceil(netAreaWithWastage / tileAreaSqFt);
  // Standard box has 4 tiles (16 sq.ft)
  const totalBoxes = Math.ceil(netAreaWithWastage / (tileAreaSqFt * 4));

  // Tile adhesive/cement (~1 bag 20kg per 40 sq.ft => ~0.5 kg per sq.ft)
  const adhesiveKg = Math.ceil(areaSqFt * 0.5);

  const summaryHi =
    `📐 **${areaSqFt} sq.ft. टाइल्स एवं एडहेसिव का अनुमान (${tileSizeFeet}'×${tileSizeFeet}' साइज, ${wastagePercent}% कटिंग वेस्टेज सहित):**\n` +
    `• कुल टाइल्स नग: ~${totalTiles} पीस\n` +
    `• टाइल बॉक्सेस (Boxes): ~${totalBoxes} डिब्बे (4 पीस/बॉक्स)\n` +
    `• टाइल एडहेसिव / सीमेंट केमिकल: ~${adhesiveKg} kg (~${Math.ceil(adhesiveKg / 20)} बैग)\n` +
    `• कटिंग एवं मार्जिन वेस्टेज जोड़ा गया: ${wastagePercent}%`;

  const summaryEn =
    `📐 **${areaSqFt} sq.ft. Tiles & Adhesive Estimation (${tileSizeFeet}'×${tileSizeFeet}' size, ${wastagePercent}% cutting wastage):**\n` +
    `• Total Tiles Pieces: ~${totalTiles} pcs\n` +
    `• Tile Boxes: ~${totalBoxes} boxes (4 pcs/box)\n` +
    `• Tile Adhesive / Chemical: ~${adhesiveKg} kg (~${Math.ceil(adhesiveKg / 20)} bags)\n` +
    `• Cutting Wastage Included: ${wastagePercent}%`;

  return {
    areaSqFt,
    netAreaWithWastage: Math.round(netAreaWithWastage * 100) / 100,
    totalTiles,
    totalBoxes,
    adhesiveKg,
    summaryHi,
    summaryEn,
  };
}
