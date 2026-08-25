/**
 * Comparison engine dataset (Phase 16).
 *
 * Simple structured comparisons (table / bullets) between common materials,
 * roof types and cement types. All points are GENERAL construction facts —
 * no invented company-specific claims.
 */
export interface ComparisonSide {
  nameEn: string;
  nameHi: string;
  pointsEn: string[];
  pointsHi: string[];
}

export interface ComparisonItem {
  id: string;
  /** Keywords that trigger this comparison ("a vs b" style). */
  a: ComparisonSide;
  b: ComparisonSide;
  /** Short natural follow-up question. */
  followupEn?: string;
  followupHi?: string;
}

export const COMPARISONS: ComparisonItem[] = [
  {
    id: "opc_vs_ppc",
    a: {
      nameEn: "OPC",
      nameHi: "OPC",
      pointsEn: [
        "Higher early strength, especially OPC 53.",
        "Good for structural concrete (slab, columns).",
        "Higher heat of hydration.",
      ],
      pointsHi: [
        "जल्दी अधिक strength, खासकर OPC 53।",
        "Structural concrete (स्लैब, कॉलम) के लिए अच्छा।",
        "अधिक heat of hydration।",
      ],
    },
    b: {
      nameEn: "PPC",
      nameHi: "PPC",
      pointsEn: [
        "Lower early strength but good durability.",
        "Lower heat of hydration.",
        "Good for plaster, masonry and general work.",
      ],
      pointsHi: [
        "शुरुआती strength कम पर अच्छी durability।",
        "कम heat of hydration।",
        "प्लास्टर, चिनाई और सामान्य काम के लिए अच्छा।",
      ],
    },
    followupEn: "Is your main structural element a slab/column, or general plaster/masonry?",
    followupHi: "आपका मुख्य काम slab/column है या सामान्य plaster/चिनाई?",
  },
  {
    id: "psc_vs_opc",
    a: {
      nameEn: "PSC",
      nameHi: "PSC",
      pointsEn: [
        "Better durability in aggressive environments.",
        "Lower heat of hydration.",
        "Strength builds steadily, slower early strength.",
      ],
      pointsHi: [
        "Aggressive environments में बेहतर durability।",
        "कम heat of hydration।",
        "Strength धीरे-धीरे बढ़ती है।",
      ],
    },
    b: {
      nameEn: "OPC",
      nameHi: "OPC",
      pointsEn: [
        "Higher early strength.",
        "Widely used for general RCC.",
        "Higher heat of hydration.",
      ],
      pointsHi: [
        "जल्दी अधिक strength।",
        "सामान्य RCC में व्यापक उपयोग।",
        "अधिक heat of hydration।",
      ],
    },
    followupEn: "Would you like to discuss which one fits your structural design?",
    followupHi: "क्या आप जानना चाहेंगे कि आपके structural design में कौन सा उपयुक्त रहेगा?",
  },
  {
    id: "msand_vs_river",
    a: {
      nameEn: "M-Sand",
      nameHi: "एम सैंड",
      pointsEn: [
        "Easily available.",
        "Consistent grading through controlled manufacturing.",
        "Used in concrete and masonry.",
      ],
      pointsHi: [
        "आसानी से उपलब्ध।",
        "Controlled manufacturing से consistency बेहतर।",
        "कंक्रीट और चिनाई में उपयोग।",
      ],
    },
    b: {
      nameEn: "River Sand",
      nameHi: "नदी की रेत",
      pointsEn: [
        "Naturally graded, traditional choice.",
        "Good workability in mortar/plaster.",
        "Availability varies by region.",
      ],
      pointsHi: [
        "स्वाभाविक रूप से graded, पारंपरिक विकल्प।",
        "Mortar/plaster में अच्छी workability।",
        "Availability क्षेत्र के अनुसार बदलती है।",
      ],
    },
    followupEn: "Do you want to check which one suits your plaster or concrete work?",
    followupHi: "क्या आप जानना चाहते हैं कि plaster या concrete के लिए कौन सी उपयुक्त रहेगी?",
  },
  {
    id: "redbrick_vs_flyash",
    a: {
      nameEn: "Red Brick",
      nameHi: "लाल ईंट",
      pointsEn: [
        "Traditional, widely available.",
        "Good compressive strength.",
        "Familiar to local masons.",
      ],
      pointsHi: [
        "पारंपरिक, आसानी से उपलब्ध।",
        "अच्छी compressive strength।",
        "स्थानीय कारीगरों से परिचित।",
      ],
    },
    b: {
      nameEn: "Fly Ash Brick",
      nameHi: "फ्लाई ऐश ईंट",
      pointsEn: [
        "Uniform size and smooth finish.",
        "Lower water absorption.",
        "Environment-friendly by-product use.",
      ],
      pointsHi: [
        "एक समान आकार और चिकनी finish।",
        "कम water absorption।",
        "पर्यावरण-अनुकूल by-product उपयोग।",
      ],
    },
    followupEn: "Is this for a load-bearing wall or a partition wall?",
    followupHi: "यह load-bearing दीवार के लिए है या partition दीवार के लिए?",
  },
  {
    id: "redbrick_vs_aac",
    a: {
      nameEn: "Red Brick",
      nameHi: "लाल ईंट",
      pointsEn: [
        "Higher density and strength.",
        "Traditional mortar masonry.",
        "More load on the structure.",
      ],
      pointsHi: [
        "अधिक density और strength।",
        "पारंपरिक mortar चिनाई।",
        "Structure पर अधिक भार।",
      ],
    },
    b: {
      nameEn: "AAC Block",
      nameHi: "AAC ब्लॉक",
      pointsEn: [
        "Lightweight — less structural load.",
        "Better thermal and sound insulation.",
        "Needs special block adhesive.",
      ],
      pointsHi: [
        "हल्का — structural load कम।",
        "बेहतर thermal और sound insulation।",
        "विशेष block adhesive चाहिए।",
      ],
    },
    followupEn: "Do you want load-bearing walls or lightweight partition walls?",
    followupHi: "आपको load-bearing दीवारें चाहिए या lightweight partition दीवारें?",
  },
  {
    id: "rcc_vs_sheet",
    a: {
      nameEn: "RCC Roof",
      nameHi: "RCC छत",
      pointsEn: [
        "Strong permanent structure.",
        "Heavier.",
        "Structural design required.",
        "Higher construction complexity.",
      ],
      pointsHi: [
        "मजबूत स्थायी structure।",
        "भारी।",
        "Structural design आवश्यक।",
        "अधिक construction complexity।",
      ],
    },
    b: {
      nameEn: "Roofing Sheet",
      nameHi: "रूफिंग शीट",
      pointsEn: [
        "Lightweight.",
        "Faster installation.",
        "Suitable for certain structures.",
        "Insulation/weather considerations required.",
      ],
      pointsHi: [
        "हल्का।",
        "तेजी से install।",
        "कुछ structures के लिए उपयुक्त।",
        "Insulation/weather considerations जरूरी।",
      ],
    },
    followupEn: "Is your house a permanent residential house or a shed/type structure?",
    followupHi: "आपका घर permanent residential house है या shed/type structure?",
  },
  {
    id: "acc_vs_nuvoco",
    a: {
      nameEn: "ACC",
      nameHi: "ACC",
      pointsEn: [
        "Widely available across India.",
        "Known for consistent quality.",
        "Range of OPC and blended cements.",
      ],
      pointsHi: [
        "पूरे भारत में व्यापक रूप से उपलब्ध।",
        "Consistent quality के लिए जाना जाता है।",
        "OPC और blended cements की रेंज।",
      ],
    },
    b: {
      nameEn: "Nuvoco",
      nameHi: "नुवोको",
      pointsEn: [
        "Broad portfolio of cement & building products.",
        "Known for high-strength and specialty cement.",
        "Used in residential and infrastructure work.",
      ],
      pointsHi: [
        "Cement और building products का व्यापक portfolio।",
        "High-strength और specialty cement के लिए जाना जाता है।",
        "Residential और infrastructure काम में उपयोग।",
      ],
    },
    followupEn: "Would you like to compare specific products from each brand?",
    followupHi: "क्या आप दोनों brands के specific products की तुलना करना चाहेंगे?",
  },
  {
    id: "cement_vs_steel_use",
    a: {
      nameEn: "Cement",
      nameHi: "सीमेंट",
      pointsEn: [
        "Binds aggregates into concrete.",
        "Used in mortar, plaster, masonry.",
        "Works well in compression.",
      ],
      pointsHi: [
        "Aggregates को concrete में जोड़ता है।",
        "Mortar, plaster, चिनाई में उपयोग।",
        "Compression में अच्छा।",
      ],
    },
    b: {
      nameEn: "Steel",
      nameHi: "स्टील",
      pointsEn: [
        "Handles tensile forces in RCC.",
        "Used as reinforcement bars.",
        "Provides ductility to structures.",
      ],
      pointsHi: [
        "RCC में tensile forces संभालता है।",
        "Reinforcement bars के रूप में।",
        "Structures को ductility देता है।",
      ],
    },
    followupEn: "Both work together in RCC — would you like a full material list?",
    followupHi: "RCC में दोनों साथ काम करते हैं — क्या आप पूरी material list चाहेंगे?",
  },
  {
    id: "fe500_vs_fe500d",
    a: {
      nameEn: "Fe 500",
      nameHi: "Fe 500 TMT",
      pointsEn: [
        "Standard high-yield strength TMT steel.",
        "Min elongation ~12%.",
        "Suitable for general non-critical residential framing.",
      ],
      pointsHi: [
        "मानक high-strength TMT सरिया।",
        "न्यूनतम elongation ~12%।",
        "सामान्य आवासीय निर्माण के लिए उपयुक्त।",
      ],
    },
    b: {
      nameEn: "Fe 500D",
      nameHi: "Fe 500D TMT (D = Ductile)",
      pointsEn: [
        "High ductility (D = Ductile) with min 16% elongation.",
        "Superior earthquake & seismic shock resistance.",
        "Lower sulfur/phosphorus impurities, better bendability.",
      ],
      pointsHi: [
        "अधिक लचीलापन (D = Ductile) और 16%+ elongation।",
        "भूकंपरोधी (Earthquake-resistant) संरचनाओं के लिए सर्वोत्तम।",
        "कम अशुद्धियां और आसानी से मोड़ा जा सकने वाला।",
      ],
    },
    followupEn: "Fe 500D is recommended for RCC columns and slabs in earthquake zones. Would you like a steel estimate?",
    followupHi: "भूकंप प्रभावित क्षेत्रों में RCC छत और कॉलम के लिए Fe 500D सबसे उपयुक्त है। क्या आपको सरिया का अनुमान चाहिए?",
  },
  {
    id: "m20_vs_m25",
    a: {
      nameEn: "M20 Concrete",
      nameHi: "M20 कंक्रीट (1:1.5:3)",
      pointsEn: [
        "Standard mix ratio: 1 Cement : 1.5 Sand : 3 Aggregate.",
        "Characteristic strength: 20 N/mm² at 28 days.",
        "Minimum grade for standard residential RCC slabs and beams.",
      ],
      pointsHi: [
        "मानक मिक्स रेशो: 1 सीमेंट : 1.5 बालू : 3 गिट्टी।",
        "28 दिन में सामर्थ्य: 20 N/mm²।",
        "साधारण 1-2 मंजिला घर की छत और बीम के लिए मानक।",
      ],
    },
    b: {
      nameEn: "M25 Concrete",
      nameHi: "M25 कंक्रीट (1:1:2)",
      pointsEn: [
        "Richer mix ratio: 1 Cement : 1 Sand : 2 Aggregate.",
        "Characteristic strength: 25 N/mm² at 28 days.",
        "Recommended for heavy columns, commercial frames, and water tanks.",
      ],
      pointsHi: [
        "मजबूत मिक्स रेशो: 1 सीमेंट : 1 बालू : 2 गिट्टी।",
        "28 दिन में सामर्थ्य: 25 N/mm²।",
        "मल्टी-स्टोरी कॉलम, भारी बीम और पानी की टंकी के लिए उपयुक्त।",
      ],
    },
    followupEn: "Would you like concrete material calculations for your roof slab?",
    followupHi: "क्या आप अपनी छत की ढलाई के लिए सीमेंट, बालू और गिट्टी की गणना करना चाहते हैं?",
  },
  {
    id: "vitrified_vs_ceramic",
    a: {
      nameEn: "Vitrified Tiles",
      nameHi: "विट्रीफाइड टाइल्स",
      pointsEn: [
        "Extremely low water absorption (<0.5%).",
        "Very strong, scratch resistant, stain resistant.",
        "Ideal for living rooms, bedrooms, and heavy foot-traffic areas.",
      ],
      pointsHi: [
        "पानी सोखने की क्षमता न के बराबर (<0.5%)।",
        "काफी मजबूत, खरोंच व दाग-धब्बे रोधी।",
        "लिविंग रूम, बेडरूम और पूरे घर की फ्लोरिंग के लिए बेस्ट।",
      ],
    },
    b: {
      nameEn: "Ceramic Tiles",
      nameHi: "सिरेमिक टाइल्स",
      pointsEn: [
        "Higher water absorption (3-10%).",
        "More economical, lightweight, available in non-skid textures.",
        "Best suited for bathroom walls, kitchen splashbacks, and balconies.",
      ],
      pointsHi: [
        "पानी सोखने की दर अधिक (3-10%)।",
        "किफायती, हल्की और फिसलन-रोधी (anti-skid) सतह।",
        "बाथरूम की दीवारों, किचन डैडो और बालकनी के लिए सही।",
      ],
    },
    followupEn: "Would you like an estimate of tile boxes needed for your rooms?",
    followupHi: "क्या आप अपने कमरों के लिए टाइल के डिब्बों की गणना चाहते हैं?",
  },
  {
    id: "rmc_vs_sitemix",
    a: {
      nameEn: "Ready Mix Concrete (RMC)",
      nameHi: "रेडी मिक्स कंक्रीट (RMC)",
      pointsEn: [
        "Computer-controlled batching with consistent water-cement ratio.",
        "Very fast pouring with concrete pump directly to high floors.",
        "Reduces on-site clutter, labour, and noise.",
      ],
      pointsHi: [
        "प्लांट में कंप्यूटर द्वारा सटीक वजन और सही अनुपात।",
        "पंप से सीधे ऊपरी मंजिल तक बहुत तेज ढलाई।",
        "साइट पर रेत/गिट्टी का फैलाव और लेबर की सिरदर्दी नहीं।",
      ],
    },
    b: {
      nameEn: "Site Mixed Concrete",
      nameHi: "साइट मिक्स (मिक्सर मशीन)",
      pointsEn: [
        "Economical for small pours and independent houses.",
        "Easier to adjust timings without transit delay risk.",
        "Requires vigilant on-site supervision of water and box measurements.",
      ],
      pointsHi: [
        "छोटे कामों और एकल मकानों के लिए काफी किफायती।",
        "ट्रैफिक या डिलीवरी में देरी का कोई खतरा नहीं।",
        "पानी की मात्रा और फर्मा नाप पर कड़ी निगरानी जरूरी।",
      ],
    },
    followupEn: "What is your roof slab area to decide between RMC and mixer machine?",
    followupHi: "RMC या साइट मिक्सर में से चुनने के लिए आपकी छत का एरिया कितना है?",
  },
];

/** Find a comparison whose A/B names appear in the text (e.g. "ACC vs Nuvoco"). */
export function findComparison(text: string): ComparisonItem | null {
  const lower = text.toLowerCase();
  let best: ComparisonItem | null = null;
  let bestScore = 0;
  for (const c of COMPARISONS) {
    const a = c.a.nameEn.toLowerCase();
    const b = c.b.nameEn.toLowerCase();
    let score = 0;
    if (lower.includes(a)) score += a.length;
    if (lower.includes(b)) score += b.length;
    // Also match Hindi names
    if (lower.includes(c.a.nameHi.toLowerCase())) score += 3;
    if (lower.includes(c.b.nameHi.toLowerCase())) score += 3;
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return bestScore >= 4 ? best : null;
}

