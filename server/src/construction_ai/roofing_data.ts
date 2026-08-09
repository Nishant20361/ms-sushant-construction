/**
 * Roofing / roofing-sheet knowledge dataset (local, rule-based, general).
 *
 * General construction guidance only — no brand-specific claims.
 */
export interface RoofingInfo {
  id: string;
  nameEn: string;
  nameHi: string;
  unit: string;
  useEn: string;
  useHi: string;
  notesEn: string[];
  notesHi: string[];
}

export const ROOFING_DATA: RoofingInfo[] = [
  {
    id: "roofing_sheet",
    nameEn: "Roofing sheets (steel / profile)",
    nameHi: "रूफिंग शीट / छत की चादर",
    unit: "sq.ft",
    useEn: "Sloped roofs, sheds, carports and terrace shading.",
    useHi: "ढलान वाली छत, शेड, कारपोर्ट और छत की छाया के लिए।",
    notesEn: [
      "Add overlap and ridge allowance over the plain roof area.",
      "Type (galvanized / color-coated / polycarbonate) is chosen by application and budget.",
    ],
    notesHi: [
      "सादे छत area के ऊपर overlap और ridge allowance जोड़ें।",
      "टाइप (galvanized / color-coated / polycarbonate) application और budget के अनुसार चुना जाता है।",
    ],
  },
  {
    id: "rcc_roof",
    nameEn: "RCC roof / slab",
    nameHi: "RCC छत / स्लैब",
    unit: "sq.ft",
    useEn: "Permanent flat roof/floor slabs in RCC buildings.",
    useHi: "RCC भवनों में स्थायी सपाट छत / फर्श स्लैब।",
    notesEn: [
      "Concrete volume = length × width × thickness.",
      "Slab thickness and reinforcement are verified by a structural engineer.",
    ],
    notesHi: [
      "Concrete की मात्रा = लंबाई × चौड़ाई × मोटाई।",
      "Slab की मोटाई और सरिया structural engineer द्वारा verify करें।",
    ],
  },
  {
    id: "waterproofing",
    nameEn: "Roof waterproofing",
    nameHi: "छत वॉटरप्रूफिंग",
    unit: "sq.ft",
    useEn: "Preventing roof leakage and seepage.",
    useHi: "छत की सीलन और रिसाव रोकने के लिए।",
    notesEn: [
      "Coverage depends on the manufacturer's product and number of coats.",
      "Apply over a clean, cured surface for best results.",
    ],
    notesHi: [
      "Coverage manufacturer के product और coats की संख्या पर निर्भर करता है।",
      "साफ और cured सतह पर लगाने पर सबसे अच्छा परिणाम मिलता है।",
    ],
  },
];

export function findRoofingInfo(text: string): RoofingInfo | null {
  const lower = text.toLowerCase();
  if (/(waterproofing|वॉटरप्रूफिंग|सीलन|leakage)/.test(lower)) {
    return ROOFING_DATA.find((r) => r.id === "waterproofing") ?? null;
  }
  if (/(rcc roof|slab|छत डालना|स्लैब)/.test(lower)) {
    return ROOFING_DATA.find((r) => r.id === "rcc_roof") ?? null;
  }
  if (/(roofing sheet|roof sheet|छत की चादर|रूफिंग शीट)/.test(lower)) {
    return ROOFING_DATA.find((r) => r.id === "roofing_sheet") ?? null;
  }
  return null;
}
