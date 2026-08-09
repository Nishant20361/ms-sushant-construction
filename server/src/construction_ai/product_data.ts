/**
 * Structured product database (Phase 27 & 28).
 *
 * Each product entry stores general, factual information from a LOCAL dataset.
 * We tag confidence: "KNOWN" (in dataset), "GENERAL" (general knowledge) or
 * "UNAVAILABLE" (no reliable local info). We never pretend data is live.
 */
export type DataConfidence = "KNOWN" | "GENERAL" | "UNAVAILABLE";

export interface ProductInfo {
  /** Unique product key. */
  id: string;
  company: string;
  product: string;
  category: string;
  /** Aliases / keywords used to detect this product in a message. */
  keywords: string[];
  benefitsEn: string[];
  benefitsHi: string[];
  suitableForEn: string[];
  suitableForHi: string[];
  notIdealForEn: string[];
  notIdealForHi: string[];
  notesEn: string[];
  notesHi: string[];
  confidence: DataConfidence;
  /** Always "local dataset" for these. */
  source: string;
}

export const PRODUCTS: ProductInfo[] = [
  {
    id: "acc_f2r",
    company: "ACC",
    product: "ACC F2R",
    category: "cement",
    keywords: ["acc f2r", "f2r", "acc f2"],
    benefitsEn: [
      "A fast-setting, high-strength cement from ACC's product range.",
      "Generally used where quick strength development is needed.",
    ],
    benefitsHi: [
      "ACC के उत्पाद range का fast-setting, high-strength सीमेंट।",
      "आम तौर पर जहाँ जल्दी strength चाहिए वहाँ उपयोग।",
    ],
    suitableForEn: ["quick repairs", "small structural works", "urgent setting"],
    suitableForHi: ["तुरंत मरम्मत", "छोटे structural काम", "जल्दी set होने वाले काम"],
    notIdealForEn: ["large pours where long working time is needed"],
    notIdealForHi: ["बड़े pours जहाँ अधिक working time चाहिए"],
    notesEn: [
      "Verify the specific product details and strength with the local dealer.",
      "Confirm suitability with your engineer for structural use.",
    ],
    notesHi: [
      "विशिष्ट product details और strength स्थानीय dealer से पुष्टि करें।",
      "Structural उपयोग के लिए engineer से suitability confirm करें।",
    ],
    confidence: "KNOWN",
    source: "local dataset",
  },
  {
    id: "acc_concreto",
    company: "ACC",
    product: "ACC Concreto",
    category: "cement",
    keywords: ["concreto", "acc concreto"],
    benefitsEn: [
      "High-strength blended cement from ACC.",
      "Known for consistent strength for structural concrete.",
    ],
    benefitsHi: [
      "ACC का high-strength blended cement।",
      "Structural concrete के लिए consistent strength।",
    ],
    suitableForEn: ["slabs", "beams", "columns"],
    suitableForHi: ["स्लैब", "बीम", "कॉलम"],
    notIdealForEn: [],
    notIdealForHi: [],
    notesEn: ["Confirm grade and mix design with your engineer."],
    notesHi: ["Grade और mix design engineer से पुष्टि करें।"],
    confidence: "KNOWN",
    source: "local dataset",
  },
  {
    id: "nuvoco_vistas",
    company: "Nuvoco",
    product: "Nuvoco Vistas",
    category: "cement",
    keywords: ["vistas", "nuvoco vistas", "nuvoco"],
    benefitsEn: [
      "Part of Nuvoco's cement portfolio.",
      "Known for high-strength and specialty products.",
    ],
    benefitsHi: [
      "Nuvoco के cement portfolio का हिस्सा।",
      "High-strength और specialty products के लिए जाना जाता है।",
    ],
    suitableForEn: ["structural concrete", "residential projects"],
    suitableForHi: ["structural concrete", "residential projects"],
    notIdealForEn: [],
    notIdealForHi: [],
    notesEn: ["Specific product grade varies; confirm with local dealer."],
    notesHi: ["Specific product grade अलग हो सकता है; स्थानीय dealer से पुष्टि करें।"],
    confidence: "KNOWN",
    source: "local dataset",
  },
  {
    id: "ultratech",
    company: "UltraTech",
    product: "UltraTech Cement",
    category: "cement",
    keywords: ["ultratech", "ultra tech", "ultra"],
    benefitsEn: [
      "One of the largest cement producers in India.",
      "Broad product range with consistent quality.",
    ],
    benefitsHi: [
      "भारत के सबसे बड़े cement उत्पादकों में से एक।",
      "व्यापक product range और consistent quality।",
    ],
    suitableForEn: ["residential concrete", "slabs", "columns", "plaster"],
    suitableForHi: ["residential concrete", "स्लैब", "कॉलम", "प्लास्टर"],
    notIdealForEn: [],
    notIdealForHi: [],
    notesEn: ["Choose OPC/PPC grade per structural design."],
    notesHi: ["Structural design के अनुसार OPC/PPC grade चुनें।"],
    confidence: "KNOWN",
    source: "local dataset",
  },
  {
    id: "opc_cement",
    company: "Generic",
    product: "OPC Cement",
    category: "cement",
    keywords: ["opc", "opc 43", "opc 53", "ordinary portland"],
    benefitsEn: [
      "Higher early strength (OPC 53).",
      "Suitable for structural elements with higher strength need.",
    ],
    benefitsHi: [
      "जल्दी अधिक strength (OPC 53)।",
      "अधिक strength वाले structural elements के लिए उपयुक्त।",
    ],
    suitableForEn: ["slab", "columns", "beams", "precast"],
    suitableForHi: ["स्लैब", "कॉलम", "बीम", "precast"],
    notIdealForEn: [],
    notIdealForHi: [],
    notesEn: ["Grade and mix design from the engineer."],
    notesHi: ["Grade और mix design engineer से।"],
    confidence: "GENERAL",
    source: "local dataset",
  },
  {
    id: "ppc_cement",
    company: "Generic",
    product: "PPC Cement",
    category: "cement",
    keywords: ["ppc", "portland pozzolana"],
    benefitsEn: [
      "Good durability and workability.",
      "Lower heat of hydration.",
    ],
    benefitsHi: [
      "अच्छी durability और workability।",
      "कम heat of hydration।",
    ],
    suitableForEn: ["plaster", "masonry", "general construction"],
    suitableForHi: ["प्लास्टर", "चिनाई", "सामान्य निर्माण"],
    notIdealForEn: [],
    notIdealForHi: [],
    notesEn: ["Fine for most residential plaster/masonry."],
    notesHi: ["अधिकतर residential plaster/चिनाई के लिए ठीक।"],
    confidence: "GENERAL",
    source: "local dataset",
  },
  {
    id: "psc_cement",
    company: "Generic",
    product: "PSC Cement",
    category: "cement",
    keywords: ["psc", "portland slag", "slag cement"],
    benefitsEn: [
      "Good durability in aggressive environments.",
      "Lower heat of hydration.",
    ],
    benefitsHi: [
      "Aggressive environments में अच्छी durability।",
      "कम heat of hydration।",
    ],
    suitableForEn: ["marine", "mass concrete", "foundations"],
    suitableForHi: ["समुद्री", "mass concrete", "नींव"],
    notIdealForEn: [],
    notIdealForHi: [],
    notesEn: ["Use when the engineer specifies a blended/slag cement."],
    notesHi: ["जब engineer blended/slag cement निर्दिष्ट करे तब उपयोग।"],
    confidence: "GENERAL",
    source: "local dataset",
  },
  {
    id: "msand",
    company: "Generic",
    product: "M-Sand (manufactured sand)",
    category: "sand",
    keywords: ["m sand", "msand", "m-sand", "machine sand", "crusher sand", "एम सैंड"],
    benefitsEn: [
      "Easily available and consistent.",
      "Good grading when properly manufactured.",
      "Used in concrete and masonry.",
    ],
    benefitsHi: [
      "आसानी से उपलब्ध और consistent।",
      "सही निर्माण पर अच्छी grading।",
      "कंक्रीट और चिनाई में उपयोग।",
    ],
    suitableForEn: ["concrete", "masonry", "plastering"],
    suitableForHi: ["कंक्रीट", "चिनाई", "प्लास्टरिंग"],
    notIdealForEn: [],
    notIdealForHi: [],
    notesEn: ["Check grading and dust content."],
    notesHi: ["Grading और dust content जांचें।"],
    confidence: "GENERAL",
    source: "local dataset",
  },
  {
    id: "river_sand",
    company: "Generic",
    product: "River Sand",
    category: "sand",
    keywords: ["river sand", "रेत", "balu", "बालू"],
    benefitsEn: [
      "Naturally graded.",
      "Good workability in mortar/plaster.",
    ],
    benefitsHi: [
      "स्वाभाविक रूप से graded।",
      "Mortar/plaster में अच्छी workability।",
    ],
    suitableForEn: ["mortar", "plaster", "concrete"],
    suitableForHi: ["mortar", "plaster", "कंक्रीट"],
    notIdealForEn: [],
    notIdealForHi: [],
    notesEn: ["Avoid excess silt; wash if needed."],
    notesHi: ["अधिक silt से बचें; जरूरत पर धोएं।"],
    confidence: "GENERAL",
    source: "local dataset",
  },
  {
    id: "red_brick",
    company: "Generic",
    product: "Red Clay Brick",
    category: "bricks",
    keywords: ["red brick", "red clay", "ईंट", "eent"],
    benefitsEn: [
      "Traditional, widely available.",
      "Good compressive strength.",
    ],
    benefitsHi: [
      "पारंपरिक, आसानी से उपलब्ध।",
      "अच्छी compressive strength।",
    ],
    suitableForEn: ["load-bearing walls", "masonry"],
    suitableForHi: ["load-bearing दीवारें", "चिनाई"],
    notIdealForEn: [],
    notIdealForHi: [],
    notesEn: ["Soak bricks before use."],
    notesHi: ["उपयोग से पहले ईंटें भिगोएं।"],
    confidence: "GENERAL",
    source: "local dataset",
  },
  {
    id: "fly_ash_brick",
    company: "Generic",
    product: "Fly Ash Brick",
    category: "bricks",
    keywords: ["fly ash", "flyash", "फ्लाई ऐश"],
    benefitsEn: [
      "Uniform size and smooth finish.",
      "Lower water absorption.",
    ],
    benefitsHi: [
      "एक समान आकार और चिकनी finish।",
      "कम water absorption।",
    ],
    suitableForEn: ["walls", "masonry", "pavements"],
    suitableForHi: ["दीवारें", "चिनाई", "फर्श"],
    notIdealForEn: [],
    notIdealForHi: [],
    notesEn: ["Confirm quality and strength with manufacturer."],
    notesHi: ["Manufacturer से quality और strength पुष्टि करें।"],
    confidence: "GENERAL",
    source: "local dataset",
  },
  {
    id: "aac_block",
    company: "Generic",
    product: "AAC Block",
    category: "bricks",
    keywords: ["aac", "aac block", "foam block", "एएसी"],
    benefitsEn: [
      "Lightweight.",
      "Good thermal/sound insulation.",
    ],
    benefitsHi: [
      "हल्का।",
      "अच्छा thermal/sound insulation।",
    ],
    suitableForEn: ["partition walls", "external walls"],
    suitableForHi: ["partition दीवारें", "बाहरी दीवारें"],
    notIdealForEn: ["heavy load-bearing walls without design"],
    notIdealForHi: ["design के बिना भारी load-bearing दीवारें"],
    notesEn: ["Needs special block adhesive."],
    notesHi: ["विशेष block adhesive चाहिए।"],
    confidence: "GENERAL",
    source: "local dataset",
  },
  {
    id: "concrete_block",
    company: "Generic",
    product: "Concrete / Hollow Block",
    category: "bricks",
    keywords: ["concrete block", "hollow block", "cement block", "कंक्रीट ब्लॉक"],
    benefitsEn: ["Durable", "strong", "available in sizes"],
    benefitsHi: ["टिकाऊ", "मजबूत", "विभिन्न sizes में उपलब्ध"],
    suitableForEn: ["walls", "boundary walls"],
    suitableForHi: ["दीवारें", "बाउंड्री वॉल"],
    notIdealForEn: [],
    notIdealForHi: [],
    notesEn: ["Check local availability."],
    notesHi: ["स्थानीय availability जांचें।"],
    confidence: "GENERAL",
    source: "local dataset",
  },
  {
    id: "tmt_steel",
    company: "Generic",
    product: "TMT Steel Bars",
    category: "steel",
    keywords: ["tmt", "sariya", "सरिया", "rebar", "reinforcement bar"],
    benefitsEn: [
      "High yield strength for RCC.",
      "Good ductility and weldability.",
    ],
    benefitsHi: [
      "RCC के लिए उच्च yield strength।",
      "अच्छी ductility और weldability।",
    ],
    suitableForEn: ["footings", "columns", "beams", "slabs"],
    suitableForHi: ["फुटिंग", "कॉलम", "बीम", "स्लैब"],
    notIdealForEn: [],
    notIdealForHi: [],
    notesEn: ["Grade/dia from structural design."],
    notesHi: ["Grade/dia structural design से।"],
    confidence: "GENERAL",
    source: "local dataset",
  },
  {
    id: "roofing_sheet",
    company: "Generic",
    product: "Roofing Sheet",
    category: "roof",
    keywords: ["roofing sheet", "roof sheet", "छत की चादर", "रूफिंग शीट"],
    benefitsEn: ["Lightweight", "fast installation"],
    benefitsHi: ["हल्का", "तेजी से install"],
    suitableForEn: ["sheds", "carports", "certain structures"],
    suitableForHi: ["शेड", "कारपोर्ट", "कुछ structures"],
    notIdealForEn: ["permanent multi-storey flats"],
    notIdealForHi: ["स्थायी बहुमंजिला flats"],
    notesEn: ["Add overlap/ridge allowance."],
    notesHi: ["Overlap/ridge allowance जोड़ें।"],
    confidence: "GENERAL",
    source: "local dataset",
  },
  {
    id: "rcc_slab",
    company: "Generic",
    product: "RCC Slab",
    category: "roof",
    keywords: ["rcc slab", "rcc roof", "slab", "स्लैब"],
    benefitsEn: ["Strong", "permanent", "flat usable terrace"],
    benefitsHi: ["मजबूत", "स्थायी", "सपाट उपयोग योग्य छत"],
    suitableForEn: ["permanent residential roofs"],
    suitableForHi: ["स्थायी residential छतें"],
    notIdealForEn: [],
    notIdealForHi: [],
    notesEn: ["Structural design required."],
    notesHi: ["Structural design आवश्यक।"],
    confidence: "GENERAL",
    source: "local dataset",
  },
];

/** Look up a product by keyword match; returns the most specific match (longest keyword). */
export function findProduct(text: string): ProductInfo | null {
  const lower = text.toLowerCase();
  let best: ProductInfo | null = null;
  let bestLen = 0;
  for (const p of PRODUCTS) {
    for (const k of p.keywords) {
      if (lower.includes(k.toLowerCase())) {
        // "F2R" is short and could over-match; require word boundary for <=3 char keys.
        if (k.trim().length < 3 && !new RegExp(`(^|\\s)${k}(\\s|$)`, "i").test(lower.toLowerCase())) {
          continue;
        }
        if (k.length > bestLen) {
          best = p;
          bestLen = k.length;
        }
      }
    }
  }
  return best;
}
