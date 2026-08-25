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
      "A proper mix ratio balances cement, sand and aggregate so the concrete reaches its designed strength and workability.\n\nThe mix ratio is based on the structural requirement (e.g. M20 is 1:1.5:3, M25 is 1:1:2).",
    replyHi:
      "सही mix ratio से cement, sand और aggregate का संतुलन बना रहता है, जिससे concrete अपनी designed strength और workability तक पहुंचता है।\n\nMix ratio structural requirement (जैसे M20: 1:1.5:3, M25: 1:1:2) पर आधारित होता है।",
  },
  {
    id: "why_cover_blocks",
    triggers: [
      "cover block kyu",
      "cover block kyon",
      "why cover block",
      "why cover blocks",
      "कवर ब्लॉक क्यों",
      "cover block lagana kyu",
      "sariya me cover",
    ],
    replyEn:
      "Cover blocks ensure proper concrete thickness (clear cover) between steel rebar and the outer surface.\n\nKey reasons:\n1. Protects steel from corrosion and rusting caused by air/moisture.\n2. Provides fire resistance.\n3. Standard covers: Slab = 15-20mm, Beam = 25mm, Column = 40mm, Footing = 50mm.",
    replyHi:
      "Cover blocks सरिया (steel rebar) और शटरिंग के बीच जरूरी दूरी (clear cover) बनाए रखने के लिए लगाए जाते हैं।\n\nमुख्य कारण:\n1. सरिया को हवा व नमी से जंग (rust/corrosion) लगने से बचाना।\n2. आग से सुरक्षा (fire resistance)।\n3. मानक कवर: Slab = 15-20mm, Beam = 25mm, Column = 40mm, Footing = 50mm।",
  },
  {
    id: "why_vibrator",
    triggers: [
      "vibrator kyu",
      "vibrator kyon",
      "why vibrator",
      "why concrete vibrator",
      "वाइब्रेटर क्यों",
      "dhalai me vibrator",
      "honeycomb kyu",
    ],
    replyEn:
      "A needle vibrator removes trapped air pockets (voids) from wet concrete, ensuring dense compaction and preventing honeycombing.\n\nTips:\n- Insert needle vertically and vibrate for 5-10 seconds per spot.\n- Avoid over-vibrating to prevent aggregate segregation.",
    replyHi:
      "ढलाई के समय needle vibrator गीले कंक्रीट से फंसी हुई हवा (air voids) को बाहर निकालता है ताकि कंक्रीट ठोस (dense) बने और गंजापन (honeycombing) न आए।\n\nसुझाव:\n- वाइब्रेटर को सीधा (vertical) डालें और हर जगह 5-10 सेकंड ही चलाएं।\n- बहुत ज्यादा वाइब्रेट न करें वरना गिट्टी नीचे बैठ जाएगी।",
  },
  {
    id: "why_lap_length",
    triggers: [
      "lap length kyu",
      "lapping kyu",
      "why lap length",
      "sariya lap kyu",
      "50d kyu",
      "सरिया में लैपिंग क्यों",
    ],
    replyEn:
      "Lap length is the overlapping distance required when joining two steel bars so tensile and compressive stress transfers safely from one bar to another.\n\nStandard thumb rule: Generally 40d to 50d (where d is bar diameter in mm, e.g. for 12mm bar, 50 × 12 = 600mm or 2 feet lap). Laps must be staggered and not placed at maximum bending points.",
    replyHi:
      "जब एक सरिया की लंबाई खत्म होती है तो दूसरे सरिया को जोड़ने के लिए Lap Length दी जाती है ताकि लोड (stress) सुरक्षित रूप से एक सरिया से दूसरे में ट्रांसफर हो सके।\n\nमानक नियम: आमतौर पर 40d से 50d (जहाँ d सरिया का डाया है, जैसे 12mm सरिया के लिए 50 × 12 = 600mm यानी 2 फीट लैप)। लैप कभी भी एक ही जगह नहीं, आगे-पीछे (staggered) देने चाहिए।",
  },
  {
    id: "why_dpc",
    triggers: [
      "dpc kyu",
      "dpc kyon",
      "why dpc",
      "damp proof course kyu",
      "डीपीसी क्यों",
      "plinth level dpc",
    ],
    replyEn:
      "DPC (Damp Proof Course) is a 40-50mm thick waterproof concrete layer laid at plinth level to block capillary rise of moisture from ground soil into super-structure walls, preventing rising dampness and peeling paint.",
    replyHi:
      "DPC (Damp Proof Course) प्लिंथ लेवल पर 40-50mm मोटी वाटरप्रूफ कंक्रीट की लेयर होती है। इसका काम जमीन की नमी (moisture/capillary rise) को ऊपर की दीवारों में चढ़ने से रोकना है, जिससे दीवारों में सीलन और पेंट खराब नहीं होता।",
  },
  {
    id: "why_9inch_wall",
    triggers: [
      "9 inch wall kyu",
      "9 inch deewar kyu",
      "why 9 inch wall",
      "outer wall 9 inch",
      "9 inch diwar kyu",
      "बाहरी दीवार 9 इंच क्यों",
    ],
    replyEn:
      "External walls are kept 9 inches (230mm) thick for structural stability, weather protection (rain & sun heat insulation), safety, and resistance to external vibrations. Internal partition walls are kept 4.5 inches (115mm) to save floor space and reduce building dead load.",
    replyHi:
      "बाहरी दीवारें 9 इंच (230mm) इसलिए रखी जाती हैं ताकि घर को मजबूती, सुरक्षा, धूप/बारिश से सुरक्षा और थर्मल इंसुलेशन मिले। अंदर की दीवारें 4.5 इंच (115mm) रखी जाती हैं ताकि कमरे का स्पेस बचे और इमारत का वजन (dead load) कम रहे।",
  },
  {
    id: "why_primer",
    triggers: [
      "primer kyu",
      "primer kyon",
      "why primer",
      "paint se pehle primer",
      "प्राइमर क्यों",
      "putty se pehle primer",
    ],
    replyEn:
      "Primer acts as an adhesive bonding agent between the plaster/putty and the top paint coat. It seals surface porosity, neutralizes alkalinity, prevents moisture suction, and ensures paint color stays vibrant without peeling.",
    replyHi:
      "Primer प्लास्टर/पुट्टी और पेंट के बीच मजबूत पकड़ (bonding) बनाता है। यह सतह के पोर्स को सील करता है, क्षार (alkalinity) को रोकता है और पेंट को पपड़ी बनकर उखड़ने से बचाता है, जिससे पेंट की चमक कई साल टिकती है।",
  },
  {
    id: "why_stirrups_rings",
    triggers: [
      "ring kyu",
      "stirrup kyu",
      "why stirrups",
      "why rings in column",
      "column me ring kyu",
      "beam me ring kyu",
      "टाई क्यों लगाते हैं",
      "रिंग क्यों",
    ],
    replyEn:
      "Stirrups (in beams) and lateral ties (in columns) hold vertical main steel bars in place during concrete pouring and resist shear forces and buckling under heavy loads. Ties are typically 8mm spaced at 100-150mm center-to-center.",
    replyHi:
      "कॉलम और बीम में रिंग (Stirrups/Ties) मेन वर्टिकल सरिया को अपनी सही जगह पर पकड़ कर रखते हैं, ढलाई के समय सरिया हिलने नहीं देते और बीम/कॉलम को शियर फोर्स (Shear Failure & Buckling) से बचाते हैं। आमतौर पर 8mm सरिया 100-150mm दूरी पर बांधा जाता है।",
  },
  {
    id: "why_cpvc_upvc",
    triggers: [
      "cpvc kyu",
      "upvc kyu",
      "why cpvc",
      "why upvc",
      "garm pani ke liye pipe",
      "cpvc upvc kyu",
      "पाइप कौन सा लगाएं",
    ],
    replyEn:
      "CPVC pipes withstand temperatures up to 93°C, making them ideal for hot & cold domestic water supply (geysers, solar heaters). UPVC pipes are lead-free, chemical resistant, and economical for regular cold water supply and external plumbing lines.",
    replyHi:
      "CPVC पाइप 93°C तक गर्म पानी झेल सकते हैं, इसलिए बाथरूम और गीजर की गर्म-ठंडे पानी की फिटिंग के लिए CPVC सबसे बेस्ट हैं। UPVC पाइप ठंडे पानी की सप्लाई और बाहरी बोरिंग/टंकी कनेक्शन के लिए मजबूत और किफायती होते हैं।",
  },
  {
    id: "why_anti_termite",
    triggers: [
      "termite kyu",
      "anti termite kyu",
      "why anti termite",
      "deemak se bachao",
      "दीमक का इलाज क्यों",
      "deemak treatment",
    ],
    replyEn:
      "Anti-termite chemical barrier treatment (using Chlorpyrifos or Imidacloprid) applied in foundation trenches, backfilled soil, and plinth area before flooring creates a permanent chemical barrier that prevents subterranean termites from damaging wooden doors, frames, and furniture.",
    replyHi:
      "नींव (foundation), प्लिंथ भराव और फर्श डालने से पहले Anti-Termite केमिकल ट्रीटमेंट जमीन के नीचे एक सुरक्षा कवच बनाता है, जिससे दीमक घर के दरवाजों, चौखटों और लकड़ी के फर्नीचर तक कभी नहीं पहुंच पाती।",
  },
  {
    id: "why_roof_slope",
    triggers: [
      "roof slope kyu",
      "chhat me dhalan",
      "why roof slope",
      "parnala kyu",
      "छत में ढलान क्यों",
    ],
    replyEn:
      "Proper roof terrace slope (minimum 1 in 50 or 1 inch per 4-5 feet) directs rainwater quickly toward rainwater downspout pipes (parnala), preventing stagnant ponding water which is the #1 cause of roof leakage and damp ceiling spots.",
    replyHi:
      "छत पर कम से कम 1:50 (4-5 फीट पर 1 इंच) की ढलान जरूरी है ताकि बारिश का पानी तुरंत परनाले/पाइप से नीचे गिर जाए। छत पर पानी रुकने से ही 90% सीलन और छत टपकने की समस्या शुरू होती है।",
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

