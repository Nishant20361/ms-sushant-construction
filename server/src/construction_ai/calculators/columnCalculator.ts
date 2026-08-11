export interface ColumnCalcInput {
  numColumns: number;
  heightFt?: number;
  widthInches?: number;
  depthInches?: number;
}

export interface ColumnCalcResult {
  numColumns: number;
  heightFt: number;
  dimensionsInches: string;
  totalConcreteCft: number;
  cementBags: number;
  steelKg: number;
  sandCft: number;
  aggregateCft: number;
  summaryHi: string;
  summaryEn: string;
}

/**
 * Calculates material requirement for RCC columns (M20 grade concrete 1:1.5:3).
 */
export function calculateColumns(input: ColumnCalcInput): ColumnCalcResult {
  const numColumns = Math.max(1, input.numColumns);
  const heightFt = input.heightFt ?? 10;
  const widthInches = input.widthInches ?? 9;
  const depthInches = input.depthInches ?? 12;

  const widthFt = widthInches / 12;
  const depthFt = depthInches / 12;

  // Wet volume per column & total
  const volPerCol = widthFt * depthFt * heightFt;
  const totalConcreteCft = volPerCol * numColumns;

  // Dry volume (1.54 multiplier)
  const dryVol = totalConcreteCft * 1.54;

  // M20 grade 1:1.5:3
  const cementVol = (1 / 5.5) * dryVol;
  const cementBags = Math.ceil(cementVol / 1.226);

  const sandCft = Math.round((1.5 / 5.5) * dryVol);
  const aggregateCft = Math.round((3 / 5.5) * dryVol);

  // Steel calculation: ~1.8% of concrete volume by weight (~140 kg per m3 / ~4 kg per cft)
  // ~30 kg per standard 9"x12"x10' column (4-6 bars of 12mm/16mm + 8mm stirrups)
  const steelKg = Math.round(totalConcreteCft * 4);

  const dimensionsInches = `${widthInches}" × ${depthInches}" × ${heightFt}ft`;

  const summaryHi =
    `🏛️ **${numColumns} कॉलम (Pillar) की सामग्री का अनुमान (${dimensionsInches}):**\n` +
    `• कुल सरिया (Steel TMT): ~${steelKg} kg (4-6 bars 12mm/16mm + 8mm रिंग/रिंग स्टिरप्स)\n` +
    `• सीमेंट: ~${cementBags} बैग\n` +
    `• बालू/रेत (Sand): ~${sandCft} cft\n` +
    `• गिट्टी (Aggregate): ~${aggregateCft} cft\n` +
    `• कुल कंक्रीट वॉल्यूम: ~${Math.round(totalConcreteCft)} cft\n\n` +
    `⚠️ *नोट: अंतिम रिइंफोर्समेंट और कॉलम साइज़ के लिए स्ट्रक्चरल इंजीनियर से सलाह लें।*`;

  const summaryEn =
    `🏛️ **${numColumns} Columns Estimation (${dimensionsInches}):**\n` +
    `• Total Steel Rebar: ~${steelKg} kg (Main bars 12mm/16mm + 8mm stirrups)\n` +
    `• Cement: ~${cementBags} bags\n` +
    `• Sand: ~${sandCft} cft\n` +
    `• Coarse Aggregate: ~${aggregateCft} cft\n` +
    `• Total Concrete Volume: ~${Math.round(totalConcreteCft)} cft\n\n` +
    `⚠️ *Note: Consult a structural engineer for final column design and rebar detailing.*`;

  return {
    numColumns,
    heightFt,
    dimensionsInches,
    totalConcreteCft: Math.round(totalConcreteCft * 100) / 100,
    cementBags,
    steelKg,
    sandCft,
    aggregateCft,
    summaryHi,
    summaryEn,
  };
}
