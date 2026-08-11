export interface PaintCalcInput {
  areaSqFt: number;
  coats?: number;
}

export interface PaintCalcResult {
  areaSqFt: number;
  coats: number;
  paintLitres: number;
  puttyKg: number;
  primerLitres: number;
  summaryHi: string;
  summaryEn: string;
}

/**
 * Calculates paint, wall putty, and primer requirement.
 */
export function calculatePaint(input: PaintCalcInput): PaintCalcResult {
  const areaSqFt = Math.max(1, input.areaSqFt);
  const coats = input.coats ?? 2;

  // Putty coverage: ~13 sq.ft per kg (2 coats)
  const puttyKg = Math.ceil(areaSqFt / 13);

  // Primer coverage: ~100 sq.ft per litre (1 coat)
  const primerLitres = Math.ceil(areaSqFt / 100);

  // Paint coverage: ~65 sq.ft per litre for 2 coats
  const paintLitres = Math.ceil((areaSqFt / 65) * (coats / 2));

  const summaryHi =
    `🎨 **${areaSqFt} sq.ft. वॉल पेंट एवं पुट्टी का अनुमान (${coats} कोट पेंट):**\n` +
    `• पेंट (Emulsion Paint): ~${paintLitres} लीटर\n` +
    `• वॉल पुट्टी (Wall Putty): ~${puttyKg} kg\n` +
    `• प्राइमर (Primer): ~${primerLitres} लीटर`;

  const summaryEn =
    `🎨 **${areaSqFt} sq.ft. Wall Paint & Putty Estimation (${coats} Coats):**\n` +
    `• Emulsion Paint: ~${paintLitres} Litres\n` +
    `• Wall Putty: ~${puttyKg} kg\n` +
    `• Primer: ~${primerLitres} Litres`;

  return {
    areaSqFt,
    coats,
    paintLitres,
    puttyKg,
    primerLitres,
    summaryHi,
    summaryEn,
  };
}
