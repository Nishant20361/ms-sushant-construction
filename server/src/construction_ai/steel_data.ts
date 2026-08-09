/**
 * Steel / TMT knowledge dataset (local, rule-based, general knowledge).
 *
 * We deliberately avoid inventing brand-specific strength numbers or IS
 * certification claims. These are general, factual construction notes that
 * help the assistant discuss steel naturally.
 */
export interface SteelInfo {
  id: string;
  nameEn: string;
  nameHi: string;
  unit: string;
  usageHi: string;
  usageEn: string;
  notesHi: string[];
  notesEn: string[];
}

export const STEEL_DATA: SteelInfo[] = [
  {
    id: "tmt",
    nameEn: "TMT bars",
    nameHi: "TMT सरिया",
    unit: "kg / tonne",
    usageEn: "Primary reinforcement in RCC footings, columns, beams, slabs, lintels and staircases.",
    usageHi: "RCC नींव, कॉलम, बीम, स्लैब, लिंटर और सीढ़ी में मुख्य रीइन्फोर्समेंट के रूप में।",
    notesEn: [
      "Grade (e.g. Fe500) and diameter are decided by the structural design.",
      "Store off the ground and keep bars rust-free before use.",
    ],
    notesHi: [
      "Grade (जैसे Fe500) और diameter structural design के अनुसार तय होता है।",
      "सरिया को जमीन से ऊपर और जंग से बचाकर रखें।",
    ],
  },
  {
    id: "binding_wire",
    nameEn: "Binding wire",
    nameHi: "बाइंडिंग तार",
    unit: "kg",
    usageEn: "Tying TMT bars together before concreting.",
    usageHi: "कंक्रीट से पहले सरिया को आपस में बांधने के लिए।",
    notesEn: [
      "Approx 8–10 kg per tonne of steel is a common planning figure.",
      "18-gauge annealed wire is commonly used.",
    ],
    notesHi: [
      "हर tonne steel के लिए लगभग 8–10 kg बाइंडिंग तार लगता है।",
      "आमतौर पर 18-gauge annealed तार इस्तेमाल होता है।",
    ],
  },
  {
    id: "cover_block",
    nameEn: "Cover blocks",
    nameHi: "कवर ब्लॉक",
    unit: "nos",
    usageEn: "Maintain the required concrete cover over reinforcement.",
    usageHi: "सरिया के ऊपर आवश्यक concrete cover बनाए रखने के लिए।",
    notesEn: [
      "Cover protects steel from corrosion and fire.",
      "Cover dimensions follow the structural design.",
    ],
    notesHi: [
      "Cover सरिया को corrosion और आग से बचाता है।",
      "Cover की मोटाई structural design के अनुसार होती है।",
    ],
  },
];

/** Match a steel-related keyword and return the matching SteelInfo (or null). */
export function findSteelInfo(text: string): SteelInfo | null {
  const lower = text.toLowerCase();
  if (/(tmt|sariya|सरिया|सारिया|steel|स्टील|लोहा)/.test(lower)) {
    if (/(binding|बाइंडिंग|tie wire)/.test(lower)) {
      return findById("binding_wire");
    }
    if (/(cover block|कवर ब्लॉक)/.test(lower)) {
      return findById("cover_block");
    }
    return findById("tmt");
  }
  return null;
}

function findById(id: string): SteelInfo | null {
  return STEEL_DATA.find((s) => s.id === id) ?? null;
}
