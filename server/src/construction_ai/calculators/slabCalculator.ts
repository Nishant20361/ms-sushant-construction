export interface SlabCalcInput {
  areaSqFt: number;
  thicknessInches?: number;
}

export interface SlabCalcResult {
  areaSqFt: number;
  thicknessInches: number;
  concreteVolumeCft: number;
  cementBags: number;
  steelKg: number;
  sandCft: number;
  aggregateCft: number;
  summaryHi: string;
  summaryEn: string;
}

/**
 * Calculates material requirement for an RCC slab (M20 grade 1:1.5:3).
 */
export function calculateSlab(input: SlabCalcInput): SlabCalcResult {
  const areaSqFt = Math.max(1, input.areaSqFt);
  const thicknessInches = input.thicknessInches ?? 5;
  const thicknessFt = thicknessInches / 12;

  const concreteVolumeCft = areaSqFt * thicknessFt;
  const dryVolumeCft = concreteVolumeCft * 1.54;

  const cementVolCft = (1 / 5.5) * dryVolumeCft;
  const cementBags = Math.ceil(cementVolCft / 1.226);

  const sandCft = Math.round((1.5 / 5.5) * dryVolumeCft);
  const aggregateCft = Math.round((3 / 5.5) * dryVolumeCft);
  const steelKg = Math.round(areaSqFt * 0.85 * (thicknessInches / 5));

  const summaryHi =
    `🏗️ **${areaSqFt} sq.ft. RCC छत ढलाई का अनुमान (${thicknessInches}" मोटाई):**\n` +
    `• सीमेंट: ~${cementBags} बैग\n` +
    `• सरिया/स्टील (TMT): ~${steelKg} kg\n` +
    `• बालू/रेत (Sand): ~${sandCft} cft\n` +
    `• गिट्टी (Aggregate): ~${aggregateCft} cft\n` +
    `• कुल कंक्रीट वॉल्यूम: ~${Math.round(concreteVolumeCft)} cft`;

  const summaryEn =
    `🏗️ **${areaSqFt} sq.ft. RCC Slab Estimation (${thicknessInches}" Thickness):**\n` +
    `• Cement: ~${cementBags} bags\n` +
    `• Steel Rebar (TMT): ~${steelKg} kg\n` +
    `• Sand: ~${sandCft} cft\n` +
    `• Coarse Aggregate: ~${aggregateCft} cft\n` +
    `• Total Concrete Volume: ~${Math.round(concreteVolumeCft)} cft`;

  return {
    areaSqFt,
    thicknessInches,
    concreteVolumeCft: Math.round(concreteVolumeCft * 100) / 100,
    cementBags,
    steelKg,
    sandCft,
    aggregateCft,
    summaryHi,
    summaryEn,
  };
}
