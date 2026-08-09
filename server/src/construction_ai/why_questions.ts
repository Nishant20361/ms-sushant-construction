/**
 * "Why" question answers (Phase 14).
 *
 * These are GENERAL, factual construction explanations — never engineering
 * approval. The assistant uses them whenever the customer asks WHY something
 * is done (steel in roof, waterproofing, wet/curing cement, etc.).
 */
export interface WhyRule {
  id: string;
  /** Keywords that trigger this answer. */
  triggers: string[];
  replyEn: string;
  replyHi: string;
}

export const WHY_RULES: WhyRule[] = [
  {
    id: "why_steel_roof",
    triggers: [
      "roof me steel",
      "steel roof me",
      "slab me sariya",
      "sariya kyu",
      "छत में सरिया क्यों",
      "छत में steel क्यों",
      "slab me steel kyu",
      "why steel in roof",
      "why steel in slab",
      "why reinforcement",
      "reinforcement kyu",
    ],
    replyEn:
      "In an RCC slab, steel reinforcement helps concrete handle tensile forces. Concrete performs well in compression, while reinforcement helps handle tensile stress.\n\nThe actual reinforcement quantity is decided by the structural design.",
    replyHi:
      "RCC slab में steel reinforcement concrete को tensile forces handle करने में मदद करता है। Concrete compression में अच्छा perform करता है, जबकि reinforcement tensile stress को handle करने में मदद करता है।\n\nActual reinforcement quantity structural design के अनुसार तय होती है।",
  },
  {
    id: "why_waterproofing",
    triggers: [
      "waterproofing kyu",
      "why waterproofing",
      "waterproofing kyon",
      "वॉटरप्रूफिंग क्यों",
      "छत में waterproofing क्यों",
      "why waterproof",
      "seepage kyu",
    ],
    replyEn:
      "The main purpose of waterproofing is to prevent water seepage and moisture from entering the structure.\n\nWaterproofing is especially useful in roofs, bathrooms and terraces.",
    replyHi:
      "Waterproofing का मुख्य उद्देश्य पानी की seepage और moisture को structure के अंदर जाने से रोकना है।\n\nRoof, bathroom और terrace में waterproofing खास तौर पर useful होती है।",
  },
  {
    id: "why_wet_cement",
    triggers: [
      "cement ko wet",
      "cement ko gila",
      "cement kyu wet",
      "curing kyu",
      "why wet cement",
      "why curing",
      "curing kyon",
      "पानी क्यों डालते हैं",
      "क्योरिंग क्यों",
      "सीमेंट को गीला क्यों",
    ],
    replyEn:
      "In concrete/cement-based work, curing helps maintain the hydration process, which helps with strength development and cracking control.\n\nThe exact curing method should be based on the work and site conditions.",
    replyHi:
      "Concrete/cement-based work में curing से hydration process को maintain करने में मदद मिलती है, जिससे strength development और cracking control में फायदा हो सकता है।\n\nExact curing method work और site conditions के अनुसार होना चाहिए।",
  },
  {
    id: "why_brick_soak",
    triggers: [
      "brick kyu bhigo",
      "brick soak kyu",
      "why soak bricks",
      "ईंट क्यों भिगोते",
      "ईंट भिगोना क्यों",
    ],
    replyEn:
      "Soaking bricks before use prevents them from absorbing water from the mortar too quickly. This helps the mortar bond properly and reduces cracking.\n\nSoak bricks as commonly practiced, but avoid over-soaking just before laying.",
    replyHi:
      "ईंटों को उपयोग से पहले भिगोने से वे mortar से पानी जल्दी नहीं सोखतीं, जिससे mortar की bonding अच्छी बनती है और दरारें कम होती हैं।\n\nईंटों को सामान्य तरीके से भिगोएं, लेकिन बिछाने से ठीक पहले अधिक भिगोने से बचें।",
  },
  {
    id: "why_curing_concrete",
    triggers: [
      "concrete kyu cure",
      "why cure concrete",
      "कंक्रीट क्योर क्यों",
      "concrete ko pani kyu",
    ],
    replyEn:
      "Curing keeps concrete moist so the cement keeps hydrating and gaining strength. It also helps control shrinkage cracks.\n\nThe curing duration and method depend on the mix and site conditions.",
    replyHi:
      "Curing से कंक्रीट नम रहता है, जिससे cement का hydration जारी रहता है और strength बढ़ती है। यह shrinkage cracks को भी नियंत्रित करता है।\n\nCuring की अवधि और तरीका mix और site conditions पर निर्भर करता है।",
  },
  {
    id: "why_steel_columns",
    triggers: [
      "column me steel kyu",
      "why steel in column",
      "why steel in columns",
      "कॉलम में सरिया क्यों",
    ],
    replyEn:
      "Columns carry vertical loads and also face bending and tension in some conditions. Steel reinforcement helps columns handle these stresses that plain concrete alone may not manage well.\n\nColumn reinforcement (bars, ties, spacing) is decided by the structural design.",
    replyHi:
      "कॉलम vertical loads उठाते हैं और कुछ स्थितियों में bending व tension का सामना भी करते हैं। Steel reinforcement कॉलम को इन stresses को संभालने में मदद करता है, जो सिर्फ concrete अकेले अच्छे से नहीं कर पाता।\n\nColumn reinforcement (bars, ties, spacing) structural design के अनुसार तय होता है।",
  },
  {
    id: "why_mix_ratio",
    triggers: [
      "mix ratio kyu",
      "why mix ratio",
      "concrete ratio kyu",
      "मिक्स रेशो क्यों",
    ],
    replyEn:
      "A proper mix ratio balances cement, sand and aggregate so the concrete reaches its designed strength and workability.\n\nThe mix ratio is based on the structural requirement (e.g. M20, M25).",
    replyHi:
      "सही mix ratio से cement, sand और aggregate का संतुलन बना रहता है, जिससे concrete अपनी designed strength और workability तक पहुंचता है।\n\nMix ratio structural requirement (जैसे M20, M25) पर आधारित होता है।",
  },
];

/** Find a "why" answer whose triggers match the text (most specific / longest trigger wins). */
export function findWhyRule(text: string): WhyRule | null {
  const lower = text.toLowerCase();
  let best: WhyRule | null = null;
  let bestLen = 0;
  for (const rule of WHY_RULES) {
    for (const t of rule.triggers) {
      if (lower.includes(t.toLowerCase()) && t.length > bestLen) {
        best = rule;
        bestLen = t.length;
      }
    }
  }
  return best;
}

