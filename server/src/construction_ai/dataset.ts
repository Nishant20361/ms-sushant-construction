/**
 * Construction knowledge dataset.
 *
 * All values are "per square foot" or per-unit estimates used by the local
 * rule-based assistant. These are APPROXIMATE planning figures only — final
 * quantities depend on the actual structural design, location, soil
 * conditions and material choices.
 *
 * NO external AI API is used anywhere in this dataset or the assistant.
 */

// ---------------------------------------------------------------------------
// Basic per-square-foot material rates (preliminary estimation only)
// ---------------------------------------------------------------------------
export interface MaterialRate {
  /** Bags of cement per square foot. */
  cementBagsPerSqft: number;
  /** Kilograms of steel per square foot. */
  steelKgPerSqft: number;
  /** Number of standard bricks per square foot. */
  bricksPerSqft: number;
  /** Cubic feet of sand per square foot. */
  sandCftPerSqft: number;
  /** Cubic feet of aggregate (bajri) per square foot. */
  aggregateCftPerSqft: number;
}

export const MATERIAL_RATES: MaterialRate = {
  cementBagsPerSqft: 0.4,
  steelKgPerSqft: 4,
  bricksPerSqft: 15,
  sandCftPerSqft: 1.8,
  aggregateCftPerSqft: 3,
};

export type BuildQuality = "normal" | "premium" | "luxury";

export interface CostBand {
  /** Minimum cost per square foot (INR). */
  min: number;
  /** Maximum cost per square foot (INR). */
  max: number;
}

export const COST_BANDS: Record<BuildQuality, CostBand> = {
  normal: { min: 1800, max: 2200 },
  premium: { min: 2500, max: 3500 },
  // Luxury is an extra tier; these are example configurable values.
  luxury: { min: 3500, max: 5000 },
};

/** Standard floor height factor used to scale a single-storey estimate. */
export const FLOOR_HEIGHT_FACTOR = 1;

/** Max floor count we will reasonably estimate. */
export const MAX_FLOORS = 5;

/** Max house area (sq.ft.) we will estimate. */
export const MAX_AREA = 100000;

// ---------------------------------------------------------------------------
// Bilingual disclaimers (Hindi + English)
// ---------------------------------------------------------------------------
export const PRELIMINARY_DISCLAIMER_HINDI =
  "यह केवल अनुमान है। वास्तविक मात्रा structural design, soil condition, slab design, column spacing, wall thickness, local material और engineer के design के अनुसार बदल सकती है।";

export const PRELIMINARY_DISCLAIMER_ENGLISH =
  "This is only a preliminary estimate. Actual quantities may vary based on structural design, soil condition, slab design, column spacing, wall thickness, local materials and the engineer's design.";

export const STRUCTURAL_DISCLAIMER_HINDI =
  "⚠️ यह structural engineer द्वारा verify किया जाना चाहिए।";

export const STRUCTURAL_DISCLAIMER_ENGLISH =
  "⚠️ This must be verified by a structural engineer.";

// ------------------------- Material dataset -------------------------
export interface MaterialInfo {
  id: string;
  /** English name */
  nameEn: string;
  /** Hindi name */
  nameHi: string;
  /** Common unit (bag, kg, tonne, CFT, sq.ft, pieces, nos, roll, ltr, m, etc.) */
  unit: string;
  /** Common usage context */
  usage: string;
  /** Approximate consumption (per sq.ft or per unit) */
  consumption: string;
  /** How the consumption is derived */
  basis: string;
  /** Wastage percentage (approx) */
  wastage: number;
  /** Common search/intent keywords (Hindi + English) */
  keywords: string[];
  /** Additional notes */
  notes: string[];
}

export const MATERIALS: MaterialInfo[] = [
  {
    id: "cement",
    nameEn: "Cement",
    nameHi: "सीमेंट",
    unit: "Bag (50 kg)",
    usage: "Concrete, mortar, plaster, PCC, foundation, masonry",
    consumption: "0.40 bag/sq.ft (preliminary)",
    basis: "Rule-of-thumb for residential built-up",
    wastage: 5,
    keywords: ["cement", "सीमेंट", "सिमेंट", "simaat", "concrete"],
    notes: ["Use OPC 43/53 or PPC as per design.", "Store off the ground and dry."],
  },
  {
    id: "steel",
    nameEn: "Steel / TMT bars",
    nameHi: "सरिया / स्टील / TMT",
    unit: "kg / tonne",
    usage: "Reinforcement in RCC footing, columns, beams, slabs, lintel, staircase",
    consumption: "4 kg/sq.ft (preliminary)",
    basis: "Rule-of-thumb for residential",
    wastage: 5,
    keywords: ["steel", "tmt", "स्टील", "सरिया", "सारिया", "sariya", "लोहा", "loha", "reinforcement", "सरिया का लोहा"],
    notes: ["Use Fe500/Fe550D as per design.", "Structural diameter decided by engineer."],
  },
  {
    id: "brick",
    nameEn: "Bricks (red clay)",
    nameHi: "ईंट / ईंटें",
    unit: "Nos",
    usage: "Load-bearing walls, partition walls, masonry",
    consumption: "15 bricks/sq.ft (preliminary)",
    basis: "Standard modular brick (approx 9x4.5x3 inch)",
    wastage: 8,
    keywords: ["brick", "bricks", "ईंट", "ईंटें", "int", "eint", "masonry", "wall brick"],
    notes: ["Soak bricks before use.", "Standard size ~230x114x75 mm."],
  },
  {
    id: "aac_block",
    nameEn: "AAC blocks",
    nameHi: "AAC ब्लॉक / फोम ब्लॉक",
    unit: "Nos",
    usage: "Lightweight partition & external walls",
    consumption: "~6-7 blocks/sq.mt (approx, size dependent)",
    basis: "Block size ~600x200x100/200 mm",
    wastage: 5,
    keywords: ["aac", "aac block", "foam block", "lightweight block", "एएसी ब्लॉक"],
    notes: ["Lighter than brick, faster construction.", "Needs special mortar/adhesive."],
  },
  {
    id: "concrete_block",
    nameEn: "Concrete blocks / Hollow blocks",
    nameHi: "कंक्रीट ब्लॉक / होलो ब्लॉक",
    unit: "Nos",
    usage: "Walls, partition, compound",
    consumption: "Size dependent (~10-12 per sq.mt)",
    basis: "Block size dependent",
    wastage: 5,
    keywords: ["concrete block", "hollow block", "cement block", "कंक्रीट ब्लॉक"],
    notes: ["Check local availability and sizes."],
  },
  {
    id: "sand",
    nameEn: "Sand (river / natural)",
    nameHi: "रेत / बालू",
    unit: "CFT",
    usage: "Mortar, plaster, concrete, PCC, brickwork",
    consumption: "1.8 CFT/sq.ft (preliminary)",
    basis: "Rule-of-thumb for residential",
    wastage: 8,
    keywords: ["sand", "रेत", "बालू", "balu", "river sand", "mortar sand"],
    notes: ["Quality affects strength; avoid silt-heavy sand."],
  },
  {
    id: "msand",
    nameEn: "M-Sand (manufactured sand)",
    nameHi: "एम सैंड / मशीन सैंड",
    unit: "CFT",
    usage: "Alternative to river sand in concrete & plaster",
    consumption: "Similar to sand (1.8 CFT/sq.ft)",
    basis: "Rule-of-thumb",
    wastage: 8,
    keywords: ["m sand", "msand", "m-sand", "machine sand", "एम सैंड", "क्रशर सैंड"],
    notes: ["Check grading & dust content."],
  },
  {
    id: "aggregate",
    nameEn: "Aggregate (bajri)",
    nameHi: "गिट्टी / बजरी / कुट्टी",
    unit: "CFT",
    usage: "Concrete, PCC, RCC, flooring base",
    consumption: "3 CFT/sq.ft (preliminary)",
    basis: "Rule-of-thumb",
    wastage: 5,
    keywords: ["aggregate", "bajri", "gitti", "गिट्टी", "बजरी", "कुट्टी"],
    notes: ["Use graded & clean aggregate."],
  },
  {
    id: "aggregate20",
    nameEn: "20mm aggregate",
    nameHi: "20mm गिट्टी",
    unit: "CFT",
    usage: "RCC structural concrete (columns, beams, slab)",
    consumption: "Part of aggregate mix",
    basis: "Mix design dependent",
    wastage: 5,
    keywords: ["20mm", "20 mm", "20mm aggregate", "20mm गिट्टी"],
    notes: ["Standard coarse aggregate for RCC."],
  },
  {
    id: "aggregate10",
    nameEn: "10mm aggregate",
    nameHi: "10mm गिट्टी",
    unit: "CFT",
    usage: "Thin sections, flooring, plaster base (grit)",
    consumption: "Part of aggregate mix",
    basis: "Mix design dependent",
    wastage: 5,
    keywords: ["10mm", "10 mm", "10mm aggregate", "10mm गिट्टी"],
    notes: ["Used for finishing & thin structural members."],
  },
  {
    id: "stone_dust",
    nameEn: "Stone dust / crusher dust",
    nameHi: "क्रशर डस्ट / स्टोन डस्ट",
    unit: "CFT",
    usage: "Base filler, flooring base, PCC",
    consumption: "Varies with application",
    basis: "Application dependent",
    wastage: 5,
    keywords: ["stone dust", "crusher dust", "क्रशर डस्ट", "स्टोन डस्ट"],
    notes: ["Often cheaper filler for base layers."],
  },
  {
    id: "rmc",
    nameEn: "RMC concrete (ready-mix)",
    nameHi: "RMC कंक्रीट / रेडीमिक्स",
    unit: "cu.m",
    usage: "Large pours: slab, footing, columns",
    consumption: "By concrete volume",
    basis: "Volume based",
    wastage: 3,
    keywords: ["rmc", "ready mix concrete", "राम सी", "रेडीमिक्स कंक्रीट"],
    notes: ["Ensure grade (M20/M25/M30) as per design."],
  },
  {
    id: "waterproofing_chemical",
    nameEn: "Waterproofing chemical",
    nameHi: "वॉटरप्रूफिंग केमिकल",
    unit: "Ltr / kg",
    usage: "Roof, bathroom, basement waterproofing",
    consumption: "Manufacturer label dependent",
    basis: "Coverage per manufacturer",
    wastage: 5,
    keywords: ["waterproofing", "वॉटरप्रूफिंग", "waterproof", "सीलन", "leakage", "छत में पानी"],
    notes: ["Coverage depends on product & coats."],
  },
  {
    id: "binding_wire",
    nameEn: "Binding wire",
    nameHi: "बाइंडिंग तार / बंधन तार",
    unit: "kg",
    usage: "Tying reinforcement bars",
    consumption: "~8-10 kg per tonne of steel",
    basis: "Per tonne of steel (approx)",
    wastage: 3,
    keywords: ["binding wire", "बाइंडिंग तार", "binding tar", "tie wire"],
    notes: ["18-gauge annealed wire commonly used."],
  },
  {
    id: "shuttering",
    nameEn: "Shuttering plywood",
    nameHi: "शटरिंग प्लाई / फॉर्मवर्क",
    unit: "sq.ft",
    usage: "Formwork for slab, columns, beams",
    consumption: "Depends on structural surface area",
    basis: "Formwork area",
    wastage: 10,
    keywords: ["shuttering", "formwork", "शटरिंग", "फॉर्मवर्क", "plywood", "फार्मवर्क"],
    notes: ["Reusable; lifespan depends on care & resin."],
  },
  {
    id: "scaffolding",
    nameEn: "Scaffolding",
    nameHi: "स्कैफोल्डिंग / मचान",
    unit: "Run",
    usage: "Access for masonry, plaster, painting",
    consumption: "By working height/area",
    basis: "Site dependent",
    wastage: 0,
    keywords: ["scaffolding", "scaffold", "मचान", "स्कैफोल्डिंग"],
    notes: ["Rental common; quantity varies."],
  },
  {
    id: "tiles",
    nameEn: "Floor/Vitrified tiles",
    nameHi: "टाइल / फ्लोर टाइल",
    unit: "sq.ft",
    usage: "Flooring, walls (kitchen, bathroom)",
    consumption: "= floor/wall area + 5-10% wastage",
    basis: "Area based",
    wastage: 8,
    keywords: ["tiles", "tile", "टाइल", "टाईल", "floor tile", "vitrified"],
    notes: ["Add 5-10% for cutting/breakage."],
  },
  {
    id: "granite",
    nameEn: "Granite",
    nameHi: "ग्रेनाइट / ग्रैनाइट",
    unit: "sq.ft",
    usage: "Countertops, flooring, stair treads",
    consumption: "Area + wastage",
    basis: "Area based",
    wastage: 8,
    keywords: ["granite", "ग्रेनाइट", "granite slab"],
    notes: ["Natural stone; thickness & finish vary."],
  },
  {
    id: "marble",
    nameEn: "Marble",
    nameHi: "संगमरमर / मार्बल",
    unit: "sq.ft",
    usage: "Premium flooring, stairs, vanity",
    consumption: "Area + wastage",
    basis: "Area based",
    wastage: 10,
    keywords: ["marble", "संगमरमर", "मार्बल"],
    notes: ["Porous; needs sealing/polishing."],
  },
  {
    id: "putty",
    nameEn: "Wall putty",
    nameHi: "पुट्टी / वॉल पुट्टी",
    unit: "kg",
    usage: "Smooth wall finish before painting",
    consumption: "~1-1.5 kg/sq.mt (2 coats)",
    basis: "Per sq.mt (approx)",
    wastage: 3,
    keywords: ["putty", "wall putty", "पुट्टी", "putty"],
    notes: ["Coverage varies by brand & surface."],
  },
  {
    id: "primer",
    nameEn: "Primer",
    nameHi: "प्राइमर",
    unit: "Ltr",
    usage: "Base coat before paint",
    consumption: "~1 ltr / 100-120 sq.ft (1 coat)",
    basis: "Per sq.ft (approx)",
    wastage: 3,
    keywords: ["primer", "प्राइमर"],
    notes: ["Water-based & solvent-based types."],
  },
  {
    id: "interior_paint",
    nameEn: "Interior paint (emulsion)",
    nameHi: "इंटीरियर पेंट / इमल्शन",
    unit: "Ltr",
    usage: "Interior walls & ceilings",
    consumption: "~1 ltr / 90-120 sq.ft (1 coat)",
    basis: "Coverage per brand (approx)",
    wastage: 3,
    keywords: ["paint", "interior paint", "emulsion", "पेंट", "paint", "रंग", "रोगन"],
    notes: ["Coverage varies by brand & coats."],
  },
  {
    id: "exterior_paint",
    nameEn: "Exterior paint",
    nameHi: "एक्सटीरियर पेंट / बाहरी पेंट",
    unit: "Ltr",
    usage: "External walls, weather-resistance",
    consumption: "~1 ltr / 80-110 sq.ft (1 coat)",
    basis: "Coverage per brand (approx)",
    wastage: 3,
    keywords: ["exterior paint", "external paint", "weather coat", "बाहरी पेंट"],
    notes: ["Weatherproof & UV-resistant types."],
  },
  {
    id: "wood",
    nameEn: "Wood / timber",
    nameHi: "लकड़ी / काष्ठ",
    unit: "CFT",
    usage: "Doors, frames, furniture, false ceiling (wooden)",
    consumption: "Project dependent",
    basis: "Item dependent",
    wastage: 10,
    keywords: ["wood", "timber", "लकड़ी", "lakdi", "wooden door"],
    notes: ["Use seasoned/treated wood."],
  },
  {
    id: "upvc",
    nameEn: "UPVC windows/doors",
    nameHi: "UPVC खिड़की/दरवाजा",
    unit: "sq.ft",
    usage: "Windows, doors, sliding profiles",
    consumption: "Area + frame allowance",
    basis: "Area based",
    wastage: 3,
    keywords: ["upvc", "upvc window", "upvc door", "यूपीवीसी"],
    notes: ["Low maintenance, thermally efficient."],
  },
  {
    id: "aluminium",
    nameEn: "Aluminium",
    nameHi: "एल्युमिनियम",
    unit: "sq.ft",
    usage: "Windows, doors, partitions, sections",
    consumption: "Area + frame allowance",
    basis: "Area based",
    wastage: 3,
    keywords: ["aluminium", "aluminum", "एल्युमिनियम", "एलुमिनियम"],
    notes: ["Lightweight, corrosion resistant."],
  },
  {
    id: "glass",
    nameEn: "Glass",
    nameHi: "कांच / ग्लास",
    unit: "sq.ft",
    usage: "Windows, doors, partitions, railing",
    consumption: "Opening area (approx)",
    basis: "Area based",
    wastage: 5,
    keywords: ["glass", "कांच", "ग्लास", "glass pane"],
    notes: ["Toughened glass for safety where required."],
  },
  {
    id: "electrical_wire",
    nameEn: "Electrical wire",
    nameHi: "बिजली तार / वायर",
    unit: "Roll (90 m)",
    usage: "Wiring, lighting, power circuits",
    consumption: "Layout dependent",
    basis: "Electrical layout",
    wastage: 5,
    keywords: ["electrical", "wire", "wiring", "बिजली", "तार", "वायर", "lectric"],
    notes: ["Use ISI marked wires; gauge by circuit."],
  },
  {
    id: "electrical_switch",
    nameEn: "Electrical switches & sockets",
    nameHi: "स्विच / सॉकेट / बोर्ड",
    unit: "Nos",
    usage: "Light/fan sockets, power points",
    consumption: "Room & point dependent",
    basis: "Point schedule",
    wastage: 2,
    keywords: ["switch", "socket", "board", "स्विच", "सॉकेट", "बोर्ड", "modular"],
    notes: ["Modular switches common."],
  },
  {
    id: "mcb",
    nameEn: "MCB (miniature circuit breaker)",
    nameHi: "MCB / सर्किट ब्रेकर",
    unit: "Nos",
    usage: "Circuit protection in distribution",
    consumption: "Per circuit",
    basis: "Circuit schedule",
    wastage: 0,
    keywords: ["mcb", "circuit breaker", "breaker", "ब्रेकर"],
    notes: ["Rated by load; install by electrician."],
  },
  {
    id: "db_box",
    nameEn: "DB box (distribution board)",
    nameHi: "DB बॉक्स / डिस्ट्रीब्यूशन बोर्ड",
    unit: "Nos",
    usage: "Houses MCBs & isolate circuits",
    consumption: "1 per phase / per floor",
    basis: "Layout dependent",
    wastage: 0,
    keywords: ["db", "db box", "distribution box", "डीबी बॉक्स"],
    notes: ["Size by number of ways needed."],
  },
  {
    id: "pvc_pipe",
    nameEn: "PVC pipes (drainage)",
    nameHi: "PVC पाइप",
    unit: "ft / m",
    usage: "Drainage, rain water, waste lines",
    consumption: "Layout dependent",
    basis: "Plumbing layout",
    wastage: 5,
    keywords: ["pvc", "pvc pipe", "drain", "drainage", "पीवीसी पाइप"],
    notes: ["Dia by application (e.g. 4 inch for drainage)."],
  },
  {
    id: "cpvc_pipe",
    nameEn: "CPVC pipes (hot water)",
    nameHi: "CPVC पाइप",
    unit: "ft / m",
    usage: "Hot water & cold water supply",
    consumption: "Layout dependent",
    basis: "Plumbing layout",
    wastage: 5,
    keywords: ["cpvc", "cpvc pipe", "hot water pipe", "सीपीवीसी"],
    notes: ["Suitable for hot water."],
  },
  {
    id: "upvc_pipe",
    nameEn: "UPVC pipes (water supply)",
    nameHi: "UPVC पाइप",
    unit: "ft / m",
    usage: "Drinking/cold water supply",
    consumption: "Layout dependent",
    basis: "Plumbing layout",
    wastage: 5,
    keywords: ["upvc pipe", "water pipe", "पानी का पाइप"],
    notes: ["Common for cold water supply."],
  },
  {
    id: "gi_pipe",
    nameEn: "GI pipes (galvanized iron)",
    nameHi: "GI पाइप / लोहे का पाइप",
    unit: "ft / m",
    usage: "Exposed supply, bore, heavy-duty lines",
    consumption: "Layout dependent",
    basis: "Plumbing layout",
    wastage: 5,
    keywords: ["gi pipe", "galvanized", "जीआई पाइप", "लोहे का पाइप"],
    notes: ["Rust resistant coating."],
  },
  {
    id: "bathroom_fittings",
    nameEn: "Bathroom CP fittings",
    nameHi: "बाथरूम फिटिंग / CP फिटिंग",
    unit: "Set",
    usage: "Taps, showers, mixers",
    consumption: "Per bathroom",
    basis: "Per bathroom",
    wastage: 2,
    keywords: ["bathroom", "bathroom fittings", "cp fittings", "बाथरूम", "tap", "shower", "नल"],
    notes: ["Quality/price varies widely."],
  },
  {
    id: "sanitary_fittings",
    nameEn: "Sanitary fittings",
    nameHi: "सैनिटरी फिटिंग",
    unit: "Set",
    usage: "WC, wash basin, cistern",
    consumption: "Per bathroom/toilet",
    basis: "Per bathroom",
    wastage: 2,
    keywords: ["sanitary", "wc", "basin", "toilet", "सैनिटरी", "बेसिन", "कमोड"],
    notes: ["Vitreous china commonly used."],
  },
  {
    id: "adhesive",
    nameEn: "Tile adhesive",
    nameHi: "टाइल एडहेसिव / गोंद",
    unit: "kg",
    usage: "Fixing tiles to walls/floor",
    consumption: "~4-5 kg/sq.mt (approx)",
    basis: "Per sq.mt",
    wastage: 3,
    keywords: ["adhesive", "tile adhesive", "एडहेसिव", "गोंद"],
    notes: ["Alternative to cement mortar."],
  },
  {
    id: "grout",
    nameEn: "Grout",
    nameHi: "ग्राउट / जोड़ भराव",
    unit: "kg",
    usage: "Filling tile joints",
    consumption: "~0.5 kg/sq.mt (approx)",
    basis: "Per sq.mt",
    wastage: 3,
    keywords: ["grout", "ग्राउट", "tile grout"],
    notes: ["Colour matched to tiles."],
  },
  {
    id: "sealant",
    nameEn: "Sealant / silicone",
    nameHi: "सीलेंट / सिलिकॉन",
    unit: "Nos / tube",
    usage: "Joints, gaps, waterproofing finish",
    consumption: "Joint dependent",
    basis: "Linear joint",
    wastage: 5,
    keywords: ["sealant", "silicone", "सीलेंट", "silicon"],
    notes: ["Flexible seal around fixtures."],
  },
  {
    id: "roofing_sheet",
    nameEn: "Roofing sheets (steel/profile)",
    nameHi: "रूफिंग शीट / छत की चादर",
    unit: "sq.ft",
    usage: "Sloped roofs, sheds, terraces",
    consumption: "Roof area + overlap",
    basis: "Area + overlap allowance",
    wastage: 5,
    keywords: ["roofing sheet", "roof sheet", "छत की चादर", "रूफिंग शीट"],
    notes: ["Add overlap & ridge allowance."],
  },
  {
    id: "insulation",
    nameEn: "Insulation materials",
    nameHi: "इंसुलेशन / थर्मोकोल",
    unit: "sq.ft",
    usage: "Heat/sound insulation in roof & walls",
    consumption: "Covered area",
    basis: "Area based",
    wastage: 3,
    keywords: ["insulation", "thermocol", "इंसुलेशन", "heat proof"],
    notes: ["Reduces heat & energy cost."],
  },
  {
    id: "false_ceiling_gypsum",
    nameEn: "False ceiling (gypsum board)",
    nameHi: "फॉल्स सीलिंग / जिप्सम",
    unit: "sq.ft",
    usage: "Decorative ceilings, concealed lighting",
    consumption: "Ceiling area + wastage",
    basis: "Area based",
    wastage: 8,
    keywords: ["false ceiling", "gypsum", "pop", "फॉल्स सीलिंग", "जिप्सम", "पीओपी"],
    notes: ["Add frame (GI/aluminium) & wastage."],
  },
];

// ------------------------- Construction stages -------------------------
export interface ConstructionStage {
  id: string;
  category: string;
  /** English name */
  nameEn: string;
  /** Hindi name */
  nameHi: string;
  keywords: string[];
  materials: string[];
  questions: string[];
  description: string;
  notes: string[];
}

export const CONSTRUCTION_STAGES: ConstructionStage[] = [
  {
    id: "site_preparation",
    category: "site",
    nameEn: "Site Preparation",
    nameHi: "जगह की तैयारी / साइट क्लियरिंग",
    keywords: ["site", "site preparation", "clearing", "जगह", "साइट", "तैयारी", "clean site"],
    materials: ["sand", "aggregate", "stone_dust"],
    questions: ["site area", "soil type"],
    description: "Clearing, levelling and setting out the plot before construction.",
    notes: ["Level the ground and set out the layout with pegs."],
  },
  {
    id: "excavation",
    category: "foundation",
    nameEn: "Excavation",
    nameHi: "खुदाई",
    keywords: ["excavation", "खुदाई", "digging", "footing pit", "earthwork", "खुदाई का काम"],
    materials: ["sand", "aggregate"],
    questions: ["footing depth", "soil type"],
    description: "Excavation of pits/trenches for foundation and footings.",
    notes: ["Depth is decided by soil & structural design."],
  },
  {
    id: "foundation",
    category: "foundation",
    nameEn: "Foundation",
    nameHi: "नींव / फाउंडेशन",
    keywords: ["foundation", "नींव", "फाउंडेशन", "base", "base work"],
    materials: ["cement", "sand", "aggregate", "steel", "waterproofing_chemical"],
    questions: ["soil type", "number of floors", "footing type"],
    description: "Load-bearing base that transfers building load to the soil.",
    notes: ["Foundation depends on soil, floors, load, footing type, column spacing, water table."],
  },
  {
    id: "pcc",
    category: "foundation",
    nameEn: "PCC (Plain Cement Concrete)",
    nameHi: "PCC / पीसीसी",
    keywords: ["pcc", "पीसीसी", "plain cement concrete", "leveling concrete", "pcc bed"],
    materials: ["cement", "sand", "aggregate"],
    questions: ["pcc area", "pcc thickness"],
    description: "Lean concrete bed under footings/floors for levelling.",
    notes: ["Usual mix ~1:4:8 or as per site."],
  },
  {
    id: "footing",
    category: "foundation",
    nameEn: "Footing",
    nameHi: "फुटिंग",
    keywords: ["footing", "फुटिंग", "isolated footing", "raft", "strip footing"],
    materials: ["cement", "sand", "aggregate", "steel", "binding_wire", "shuttering"],
    questions: ["footing type", "column spacing"],
    description: "Spread footing that distributes column load to the soil.",
    notes: ["Footing size & reinforcement decided by structural engineer."],
  },
  {
    id: "reinforcement",
    category: "structure",
    nameEn: "Reinforcement",
    nameHi: "सरिया बंधाई / रीइन्फोर्समेंट",
    keywords: ["reinforcement", "reinforcement work", "सरिया", "sariya bandhai", "steel fixing", "रीइन्फोर्समेंट"],
    materials: ["steel", "binding_wire"],
    questions: ["steel diameter", "structural drawings"],
    description: "Fixing TMT bars per structural drawings before concreting.",
    notes: ["Bar dia & spacing per structural design."],
  },
  {
    id: "plinth_beam",
    category: "structure",
    nameEn: "Plinth beam",
    nameHi: "प्लिंथ बीम",
    keywords: ["plinth beam", "प्लिंथ बीम", "plinth"],
    materials: ["cement", "sand", "aggregate", "steel", "binding_wire", "shuttering"],
    questions: ["plinth level"],
    description: "Horizontal beam at plinth level tying columns & supporting walls.",
    notes: ["Acts as a tie beam between columns."],
  },
  {
    id: "dpc",
    category: "structure",
    nameEn: "DPC (Damp Proof Course)",
    nameHi: "DPC / नमी रोक परत",
    keywords: ["dpc", "damp proof", "डीपीसी", "नमी रोक"],
    materials: ["cement", "sand", "waterproofing_chemical"],
    questions: ["dpc thickness"],
    description: "Moisture barrier layer above plinth to stop rising damp.",
    notes: ["Prevents damp rising into walls."],
  },
  {
    id: "brick_masonry",
    category: "walls",
    nameEn: "Brick/Block masonry",
    nameHi: "ईंट की चिनाई / मेसनरी",
    keywords: ["brick wall", "ईंट की दीवार", "brickwork", "मेसनरी", "masonry", "aac block wall", "wall"],
    materials: ["brick", "aac_block", "concrete_block", "cement", "sand"],
    questions: ["wall length", "wall height", "wall thickness"],
    description: "Construction of walls using bricks or blocks with mortar.",
    notes: ["15 bricks/sq.ft is rough rule; wastage 5-10%."],
  },
  {
    id: "columns",
    category: "structure",
    nameEn: "RCC Columns",
    nameHi: "कॉलम / खंभा",
    keywords: ["column", "columns", "कॉलम", "pillar", "पिलर", "खंभा", "rcc column"],
    materials: ["cement", "sand", "aggregate", "steel", "binding_wire", "shuttering"],
    questions: ["column size", "column spacing"],
    description: "Vertical RCC members carrying loads from beams/slab to footing.",
    notes: ["Column size decided by structural engineer and soil/building load."],
  },
  {
    id: "beams",
    category: "structure",
    nameEn: "RCC Beams",
    nameHi: "बीम",
    keywords: ["beam", "beams", "बीम", "rcc beam", "tie beam"],
    materials: ["cement", "sand", "aggregate", "steel", "binding_wire", "shuttering"],
    questions: ["beam size", "span"],
    description: "Horizontal RCC members transferring slab loads to columns.",
    notes: ["Beam size & steel per structural design."],
  },
  {
    id: "lintel",
    category: "structure",
    nameEn: "Lintel",
    nameHi: "लिंटर / लिंटल",
    keywords: ["lintel", "लिंटर", "lintal", "door lintel"],
    materials: ["cement", "sand", "aggregate", "steel", "binding_wire", "shuttering"],
    questions: ["opening width"],
    description: "Small RCC beam above doors/windows to carry wall load.",
    notes: ["Spans the opening width."],
  },
  {
    id: "roof_slab",
    category: "roof",
    nameEn: "RCC Roof / Slab",
    nameHi: "RCC छत / स्लैब",
    keywords: ["roof", "छत", "slab", "स्लैब", "रcc slab", "roof casting", "छत डालना", "छत की ढलाई", "roof slab"],
    materials: ["cement", "sand", "aggregate", "steel", "binding_wire", "shuttering", "waterproofing_chemical"],
    questions: ["roof area", "slab thickness"],
    description: "RCC slab casting for roof/floor using cement, sand, aggregate & steel.",
    notes: ["Concrete volume = L × W × thickness. Thickness not guaranteed without design."],
  },
  {
    id: "staircase",
    category: "roof",
    nameEn: "Staircase",
    nameHi: "सीढ़ी",
    keywords: ["stair", "staircase", "सीढ़ी", "stairs", "सीडियाँ"],
    materials: ["cement", "sand", "aggregate", "steel", "binding_wire", "shuttering"],
    questions: ["floor height", "available space"],
    description: "RCC staircase connecting floors.",
    notes: ["Design depends on floor height, space & structural design."],
  },
  {
    id: "internal_plaster",
    category: "plaster",
    nameEn: "Internal plaster",
    nameHi: "अंदरूनी प्लास्टर",
    keywords: ["plaster", "internal plaster", "inner plaster", "प्लास्टर", "अंदरूनी प्लास्टर", "wall plaster"],
    materials: ["cement", "sand"],
    questions: ["wall area", "plaster thickness"],
    description: "Cement-sand plaster on internal walls for smooth finish.",
    notes: ["Wet volume = area × thickness; dry volume uses conversion factor."],
  },
  {
    id: "external_plaster",
    category: "plaster",
    nameEn: "External plaster",
    nameHi: "बाहरी प्लास्टर",
    keywords: ["external plaster", "outer plaster", "बाहरी प्लास्टर", "facade plaster"],
    materials: ["cement", "sand", "waterproofing_chemical"],
    questions: ["wall area", "plaster thickness"],
    description: "Weather-resistant plaster on external walls.",
    notes: ["Often add waterproofing admixture."],
  },
  {
    id: "flooring",
    category: "flooring",
    nameEn: "Flooring",
    nameHi: "फर्श / फ्लोरिंग",
    keywords: ["floor", "फर्श", "flooring", "tiles", "टाइल", "marble", "granite", "floor tiles"],
    materials: ["tiles", "granite", "marble", "cement", "sand", "adhesive", "grout"],
    questions: ["floor area", "room-by-room"],
    description: "Laying tiles/marble/granite on floors.",
    notes: ["Required tile area = floor area × (1 + wastage%). wastage 5-10%."],
  },
  {
    id: "doors",
    category: "openings",
    nameEn: "Doors",
    nameHi: "दरवाजा",
    keywords: ["door", "doors", "दरवाजा", "दरवाजे", "wooden door", "upvc door"],
    materials: ["wood", "upvc", "aluminium"],
    questions: ["number of doors", "width", "height"],
    description: "Interior/exterior doors.",
    notes: ["Area = width × height. Material categories rather than fixed specs."],
  },
  {
    id: "windows",
    category: "openings",
    nameEn: "Windows",
    nameHi: "खिड़की",
    keywords: ["window", "windows", "खिड़की", "खिड़कियाँ", "upvc window", "aluminium window"],
    materials: ["upvc", "aluminium", "glass"],
    questions: ["number of windows", "width", "height"],
    description: "Windows for light & ventilation.",
    notes: ["Area = width × height."],
  },
  {
    id: "electrical",
    category: "services",
    nameEn: "Electrical work",
    nameHi: "बिजली का काम",
    keywords: ["electrical", "बिजली", "wiring", "wire", "switch", "socket", "mcb", "db", "fan", "light", "ac point", "geyser point"],
    materials: ["electrical_wire", "electrical_switch", "mcb", "db_box"],
    questions: ["rooms", "fans", "lights", "sockets"],
    description: "Wiring, switches, sockets, MCB & DB installation.",
    notes: ["Final quantity after electrical layout."],
  },
  {
    id: "plumbing",
    category: "services",
    nameEn: "Plumbing",
    nameHi: "प्लंबिंग / नलसाजी",
    keywords: ["plumbing", "प्लंबिंग", "water pipe", "pvc", "cpvc", "upvc", "drainage", "sewer", "bathroom", "kitchen sink", "wash basin", "toilet"],
    materials: ["pvc_pipe", "cpvc_pipe", "upvc_pipe", "gi_pipe", "sanitary_fittings", "bathroom_fittings"],
    questions: ["number of bathrooms", "kitchen", "wash basin", "toilet", "water tank", "geyser"],
    description: "Water supply, drainage & sanitary pipe work.",
    notes: ["Pipe quantity after plumbing layout."],
  },
  {
    id: "bathroom",
    category: "services",
    nameEn: "Bathroom construction",
    nameHi: "बाथरूम / बाथरूम कंस्ट्रक्शन",
    keywords: ["bathroom", "बाथरूम", "toilet", "washroom", "बाथरूम बनाना"],
    materials: ["tiles", "waterproofing_chemical", "bathroom_fittings", "sanitary_fittings", "pvc_pipe", "cpvc_pipe", "electrical_wire"],
    questions: ["bathroom area", "floor & wall tiles"],
    description: "Complete bathroom: waterproofing, tiles, fittings, plumbing, drainage.",
    notes: ["Wall tiles = wall length × height − openings. Add wastage."],
  },
  {
    id: "kitchen",
    category: "services",
    nameEn: "Kitchen construction",
    nameHi: "रसोई / किचन",
    keywords: ["kitchen", "रसोई", "modular kitchen", "platform", "counter", "किचन"],
    materials: ["tiles", "granite", "marble", "sanitary_fittings", "cpvc_pipe", "electrical_wire", "electrical_switch", "adhesive"],
    questions: ["kitchen area", "modular or platform"],
    description: "Kitchen: tiles, countertop, sink, plumbing, electrical points.",
    notes: ["Include platform, sink, plumbing & appliance points."],
  },
  {
    id: "waterproofing",
    category: "roof",
    nameEn: "Waterproofing",
    nameHi: "वॉटरप्रूफिंग",
    keywords: ["waterproofing", "वॉटरप्रूफिंग", "छत में पानी", "roof leakage", "सीलन", "leakage", "roof waterproofing"],
    materials: ["waterproofing_chemical", "sealant"],
    questions: ["roof area", "waterproofing product"],
    description: "Roof/slab waterproofing to prevent leakage & seepage.",
    notes: ["Coverage depends on manufacturer. Ask which product is used."],
  },
  {
    id: "painting",
    category: "finishing",
    nameEn: "Painting",
    nameHi: "पेंटिंग / पेंट",
    keywords: ["paint", "पेंट", "painting", "रंग", "रोगन", "paint work"],
    materials: ["putty", "primer", "interior_paint", "exterior_paint"],
    questions: ["wall area", "ceiling area", "number of coats"],
    description: "Wall & ceiling painting with putty, primer & paint.",
    notes: ["Coverage varies by brand, surface & coats."],
  },
  {
    id: "putty",
    category: "finishing",
    nameEn: "Putty",
    nameHi: "पुट्टी",
    keywords: ["putty", "पुट्टी", "wall putty", "putty work"],
    materials: ["putty"],
    questions: ["wall area"],
    description: "Smooth wall finish layer before painting.",
    notes: ["~1-1.5 kg/sq.mt for 2 coats."],
  },
  {
    id: "tiles_work",
    category: "finishing",
    nameEn: "Tiles",
    nameHi: "टाइल कार्य",
    keywords: ["tiles", "टाइल", "floor tiles", "wall tiles", "bathroom tiles", "kitchen tiles"],
    materials: ["tiles", "adhesive", "grout"],
    questions: ["floor area", "wall area"],
    description: "Laying floor & wall tiles.",
    notes: ["Add 5-10% wastage."],
  },
  {
    id: "false_ceiling",
    category: "finishing",
    nameEn: "False ceiling",
    nameHi: "फॉल्स सीलिंग",
    keywords: ["false ceiling", "फॉल्स सीलिंग", "gypsum", "pop", "जिप्सम", "पीओपी"],
    materials: ["false_ceiling_gypsum", "electrical_wire"],
    questions: ["ceiling area"],
    description: "Decorative gypsum/POP ceiling with concealed wiring.",
    notes: ["Area + frame + wastage."],
  },
  {
    id: "roof_finishing",
    category: "roof",
    nameEn: "Roof finishing",
    nameHi: "छत की फिनिशिंग",
    keywords: ["roof finish", "roof finishing", "छत की फिनिशिंग", "terrace finish", "roof treatment"],
    materials: ["cement", "sand", "waterproofing_chemical", "roofing_sheet", "insulation"],
    questions: ["roof area"],
    description: "Finishing the roof/terrace: waterproofing, screed, insulation.",
    notes: ["Protect roof from leakage & heat."],
  },
  {
    id: "final_finishing",
    category: "finishing",
    nameEn: "Final finishing",
    nameHi: "अंतिम फिनिशिंग",
    keywords: ["final finish", "final finishing", "अंतिम फिनिशिंग", "finishing work", "handover"],
    materials: ["interior_paint", "false_ceiling_gypsum", "bathroom_fittings", "sanitary_fittings", "electrical_switch"],
    questions: ["interior décor"],
    description: "Final touches: paint touch-up, fixtures, fittings, cleaning.",
    notes: ["All fittings & fixtures installed before handover."],
  },
];

// ---------------------------------------------------------------------------
// Foundation knowledge
// ---------------------------------------------------------------------------
export interface FoundationType {
  id: string;
  nameEn: string;
  nameHi: string;
  keywords: string[];
  description: string;
}

export const FOUNDATION_TYPES: FoundationType[] = [
  {
    id: "isolated_footing",
    nameEn: "Isolated footing",
    nameHi: "आइसोलेटेड फुटिंग",
    keywords: ["isolated footing", "isolated", "आइसोलेटेड फुटिंग"],
    description: "Individual footing under each column, used for evenly spaced columns on good soil.",
  },
  {
    id: "combined_footing",
    nameEn: "Combined footing",
    nameHi: "कंबाइंड फुटिंग",
    keywords: ["combined footing", "combined", "कंबाइंड फुटिंग"],
    description: "Single footing supporting two or more columns, used when columns are close.",
  },
  {
    id: "strip_footing",
    nameEn: "Strip footing",
    nameHi: "स्ट्रिप फुटिंग",
    keywords: ["strip footing", "strip", "स्ट्रिप फुटिंग"],
    description: "Continuous footing under a wall, common for load-bearing walls.",
  },
  {
    id: "raft_foundation",
    nameEn: "Raft foundation",
    nameHi: "राफ्ट फाउंडेशन",
    keywords: ["raft foundation", "raft", "राफ्ट फाउंडेशन"],
    description: "Full slab foundation spreading the load over a large area on weak soil.",
  },
  {
    id: "pile_foundation",
    nameEn: "Pile foundation",
    nameHi: "पाइल फाउंडेशन",
    keywords: ["pile foundation", "pile", "पाइल फाउंडेशन"],
    description: "Deep foundation using piles driven to load-bearing strata for weak/watery soil.",
  },
];

// ---------------------------------------------------------------------------
// Location / cost dataset (CONFIGURABLE example ranges, NOT live market rates)
// ---------------------------------------------------------------------------
export interface LocationCost {
  id: string;
  nameEn: string;
  nameHi: string;
  /** Aliases / keywords used to match typed location */
  aliases: string[];
  /** Example configurable cost band per sq.ft (₹). Label as approximate. */
  costPerSqft: { min: number; max: number };
}

export const LOCATIONS: LocationCost[] = [
  {
    id: "delhi_ncr",
    nameEn: "Delhi NCR",
    nameHi: "दिल्ली एनसीआर",
    aliases: ["delhi ncr", "ncr", "delhi", "दिल्ली"],
    costPerSqft: { min: 2000, max: 3200 },
  },
  {
    id: "gurgaon",
    nameEn: "Gurgaon",
    nameHi: "गुड़गांव",
    aliases: ["gurgaon", "गुड़गांव", "गुरुग्राम", "gurugram"],
    costPerSqft: { min: 2200, max: 3400 },
  },
  {
    id: "faridabad",
    nameEn: "Faridabad",
    nameHi: "फरीदाबाद",
    aliases: ["faridabad", "फरीदाबाद"],
    costPerSqft: { min: 1900, max: 3000 },
  },
  {
    id: "noida",
    nameEn: "Noida",
    nameHi: "नोएडा",
    aliases: ["noida", "नोएडा"],
    costPerSqft: { min: 2100, max: 3300 },
  },
  {
    id: "greater_noida",
    nameEn: "Greater Noida",
    nameHi: "ग्रेटर नोएडा",
    aliases: ["greater noida", "ग्रेटर नोएडा"],
    costPerSqft: { min: 1900, max: 3000 },
  },
  {
    id: "delhi",
    nameEn: "Delhi",
    nameHi: "दिल्ली",
    aliases: ["delhi", "दिल्ली", "new delhi"],
    costPerSqft: { min: 2000, max: 3200 },
  },
  {
    id: "bihar",
    nameEn: "Bihar",
    nameHi: "बिहार",
    aliases: ["bihar", "बिहार", "patna", "पटना"],
    costPerSqft: { min: 1600, max: 2600 },
  },
  {
    id: "jharkhand",
    nameEn: "Jharkhand",
    nameHi: "झारखंड",
    aliases: ["jharkhand", "झारखंड", "ranchi", "रांची"],
    costPerSqft: { min: 1600, max: 2600 },
  },
  {
    id: "odisha",
    nameEn: "Odisha",
    nameHi: "ओडिशा",
    aliases: ["odisha", "ओडिशा", "orissa", "भुवनेश्वर", "bhubaneswar"],
    costPerSqft: { min: 1600, max: 2600 },
  },
  {
    id: "west_bengal",
    nameEn: "West Bengal",
    nameHi: "पश्चिम बंगाल",
    aliases: ["west bengal", "पश्चिम बंगाल", "kolkata", "कोलकाता", "howrah"],
    costPerSqft: { min: 1700, max: 2800 },
  },
];

// ---------------------------------------------------------------------------
// Waterproofing systems
// ---------------------------------------------------------------------------
export interface WaterproofingType {
  id: string;
  nameEn: string;
  nameHi: string;
  keywords: string[];
  description: string;
}

export const WATERPROOFING_TYPES: WaterproofingType[] = [
  {
    id: "cementitious",
    nameEn: "Cementitious waterproofing",
    nameHi: "सीमेंटीशियस वॉटरप्रूफिंग",
    keywords: ["cementitious", "cementitious waterproofing", "सीमेंटीशियस"],
    description: "Cement-based coating/slurry; coverage per manufacturer.",
  },
  {
    id: "liquid_waterproofing",
    nameEn: "Liquid waterproofing",
    nameHi: "लिक्विड वॉटरप्रूफिंग",
    keywords: ["liquid waterproofing", "liquid", "लिक्विड वॉटरप्रूफिंग"],
    description: "Liquid membrane applied over roof; coverage per label.",
  },
  {
    id: "app_membrane",
    nameEn: "APP membrane",
    nameHi: "APP मेंब्रेन",
    keywords: ["app membrane", "app", "membrane", "मेंब्रेन"],
    description: "Torch-applied bituminous membrane sheets.",
  },
  {
    id: "bituminous",
    nameEn: "Bituminous coating",
    nameHi: "बिटुमिनस कोटिंग",
    keywords: ["bituminous", "bitumen", "बिटुमिनस", "bitumen coating"],
    description: "Bitumen-based coating for damp areas.",
  },
  {
    id: "pu_coating",
    nameEn: "PU coating",
    nameHi: "PU कोटिंग",
    keywords: ["pu coating", "polyurethane", "पीयू कोटिंग"],
    description: "Polyurethane coating; flexible & durable.",
  },
];

// ---------------------------------------------------------------------------
// Electrical estimation parameters (approximate)
// ---------------------------------------------------------------------------
export const ELECTRICAL_PARAMS = {
  pointsPerRoom: 8, // approx outlets/switches per room
  wireRollsPerPoint: 0.15, // approx 90m rolls per point (layout dependent)
};

// ---------------------------------------------------------------------------
// Plumbing estimation parameters (approximate)
// ---------------------------------------------------------------------------
export const PLUMBING_PARAMS = {
  pipePerBathroom: 40, // approx running feet of supply+drain per bathroom
  pipePerKitchen: 25, // approx running feet for kitchen
};

// ---------------------------------------------------------------------------
// Water tank guidance (approximate capacity ranges, NOT structural design)
// ---------------------------------------------------------------------------
export const WATER_TANK_PARAMS = {
  litersPerPersonPerDay: 135, // approx Indian benchmark
  overheadVsUndergroundSplit: 0.5, // approx 50% overhead, 50% underground
};

// ---------------------------------------------------------------------------
// Staircase guidance (design depends on floor height & space)
// ---------------------------------------------------------------------------
export const STAIRCASE_PARAMS = {
  approxTreadInches: 10,
  approxRiserInches: 7,
  note: "Staircase design depends on floor height, available space and structural design.",
};

// ---------------------------------------------------------------------------
// Cement company / product knowledge (general, benefits-focused)
// ---------------------------------------------------------------------------
//
// These entries provide GENERAL, benefits-focused product information from a
// locally stored dataset. We deliberately do NOT make claims that any brand
// is "best" or universally better than another, and we do NOT list
// disadvantages unless it is a verified product-specific limitation. Always
// advise that the final cement type/grade be matched to the structural/project
// requirements and the engineer's design.
export interface CementCompany {
  id: string;
  name: string;
  /** Hindi name if commonly transliterated; otherwise same as name. */
  nameHi: string;
  /** Aliases / keywords used to match a typed company name. */
  aliases: string[];
  /** General benefits (positive, factual, brand-neutral tone). */
  benefits: string[];
  /** Common applications for this brand's products. */
  applications: string[];
  /** Cement types/products the brand commonly offers, if locally known. */
  products: string[];
  /** General usage guidance. */
  usage: string[];
}

export const CEMENT_COMPANIES: CementCompany[] = [
  {
    id: "acc",
    name: "ACC",
    nameHi: "ACC",
    aliases: ["acc", "एसीसी", "एसि सी"],
    benefits: [
      "Widely available across India.",
      "Known for consistent quality and good setting characteristics.",
      "Range of OPC and blended cement products suited to many applications.",
    ],
    applications: [
      "Residential and commercial concrete works.",
      "Mortar, plaster and masonry.",
      "Foundation, slabs, columns and beams.",
    ],
    products: ["OPC 43 & 53 Grade", "PPC (Portland Pozzolana Cement)", "Gold/Concreta variants where available"],
    usage: [
      "Choose the grade/type based on the structural design and project requirement.",
      "Confirm strength grade (e.g. 43 or 53) with your engineer before use.",
    ],
  },
  {
    id: "nuvoco",
    name: "Nuvoco",
    nameHi: "नुवोको",
    aliases: ["nuvoco", "नुवोको", "nuvoco vistas", "nuvo"],
    benefits: [
      "Offers a broad portfolio of cement and building products.",
      "Known for high-strength and specialty cement products.",
      "Good for a range of residential and infrastructure applications.",
    ],
    applications: [
      "High-strength concrete works.",
      "Plaster and masonry.",
      "Pavements, slabs and structural members.",
    ],
    products: ["Concreto", "Nuvoco Vistas", "Portland & blended cement range"],
    usage: [
      "Use the product best matched to the application and design strength.",
      "Follow the manufacturer's mixing and curing guidance.",
    ],
  },
  {
    id: "ultratech",
    name: "UltraTech",
    nameHi: "अल्ट्राटेक",
    aliases: ["ultratech", "अल्ट्राटेक", "ultra tech", "ultra"],
    benefits: [
      "One of the largest cement producers in India with wide availability.",
      "Consistent quality and a broad product range.",
      "Trusted for large and small residential projects.",
    ],
    applications: [
      "Concrete for slabs, columns, beams and foundations.",
      "Plaster, mortar and masonry.",
      "Precast and ready-mix applications.",
    ],
    products: ["OPC 43 & 53 Grade", "PPC", "PSC (Portland Slag Cement)", "UltraTech Cement range"],
    usage: [
      "Select OPC/PPC based on the structural requirement and exposure condition.",
      "Match the grade to the concrete mix design recommended by the engineer.",
    ],
  },
  {
    id: "ambuja",
    name: "Ambuja",
    nameHi: "अंबुजा",
    aliases: ["ambuja", "अंबुजा", "ambuja cement"],
    benefits: [
      "Known for durable, easy-to-work cement.",
      "Good workability and handling characteristics.",
      "Widely used in residential construction.",
    ],
    applications: [
      "General concrete and masonry.",
      "Plaster and flooring.",
      "RCC structural members.",
    ],
    products: ["OPC 43 & 53 Grade", "PPC", "Ambuja Compocem / specialty range"],
    usage: [
      "Choose the right grade for the structural element.",
      "Ensure proper curing for best strength.",
    ],
  },
  {
    id: "dalmia",
    name: "Dalmia",
    nameHi: "दलमिया",
    aliases: ["dalmia", "दलमिया", "dalmia cement"],
    benefits: [
      "Cement made with focus on quality and strength.",
      "Range of OPC and blended cements.",
      "Suitable for residential and commercial works.",
    ],
    applications: [
      "Concrete, mortar and plaster.",
      "Foundations and structural members.",
      "Paving and masonry.",
    ],
    products: ["Dalmia OPC 43 & 53", "Dalmia PPC", "High-strength variants"],
    usage: [
      "Select the grade per the structural design.",
      "Store cement dry and use within its shelf life.",
    ],
  },
  {
    id: "jk",
    name: "JK Cement",
    nameHi: "जेके सीमेंट",
    aliases: ["jk", "jk cement", "जेके सीमेंट", "jaykay"],
    benefits: [
      "Known for a range of grey and white cement products.",
      "Good strength and finish characteristics.",
      "Widely available in many regions.",
    ],
    applications: [
      "General concrete and masonry.",
      "Plaster and finishing works.",
      "Specialty/white cement applications where relevant.",
    ],
    products: ["JK OPC 43 & 53", "JK PPC", "JK White Cement"],
    usage: [
      "Match the product to the application and design.",
      "White cement is used mainly for finishes and decorative work.",
    ],
  },
  {
    id: "shree",
    name: "Shree Cement",
    nameHi: "श्री सीमेंट",
    aliases: ["shree", "shree cement", "श्री सीमेंट", "shree ultra"],
    benefits: [
      "Large Indian cement producer with steady quality.",
      "Known for energy-efficient manufacturing.",
      "Broad range of OPC and blended cements.",
    ],
    applications: [
      "Concrete, mortar and plaster.",
      "Masonry and pavements.",
      "Structural members.",
    ],
    products: ["Shree OPC 43 & 53", "Shree PPC", "Bangur brand (same group)"],
    usage: [
      "Choose grade/type per structural requirement.",
      "Confirm availability in your local market.",
    ],
  },
  {
    id: "wonder",
    name: "Wonder Cement",
    nameHi: "वंडर सीमेंट",
    aliases: ["wonder", "wonder cement", "वंडर सीमेंट"],
    benefits: [
      "Known for high-strength OPC 53 grade cement.",
      "Good strength early-age characteristics.",
      "Popular in North and Central India.",
    ],
    applications: [
      "High-strength concrete and RCC works.",
      "Slabs, columns and beams.",
      "Plaster and masonry.",
    ],
    products: ["Wonder OPC 53 Grade", "Wonder PPC"],
    usage: [
      "OPC 53 is suited where higher early strength is specified.",
      "Follow the concrete mix design from the engineer.",
    ],
  },
  {
    id: "ramco",
    name: "Ramco",
    nameHi: "रामको",
    aliases: ["ramco", "रामको", "ramco cement"],
    benefits: [
      "Known in South India for consistent quality.",
      "Range of OPC and blended cements.",
      "Good workability characteristics.",
    ],
    applications: [
      "Concrete and masonry.",
      "Plaster and structural works.",
      "Pavement and flooring.",
    ],
    products: ["Ramco OPC 43 & 53", "Ramco PPC", "High-strength variants"],
    usage: [
      "Select product/grade per the structural design.",
      "Ensure proper curing and cover to reinforcement.",
    ],
  },
  {
    id: "birla",
    name: "Birla",
    nameHi: "बिरला",
    aliases: ["birla", "बिरला", "birla cement", "ultratech birla"],
    benefits: [
      "Belongs to a large, reputed business group.",
      "Known for quality and a wide product range.",
      "Widely trusted in residential construction.",
    ],
    applications: [
      "General concrete and masonry.",
      "Plaster and finishing.",
      "RCC structural members.",
    ],
    products: ["Birla OPC 43 & 53", "Birla PPC", "Birla white cement"],
    usage: [
      "Match the grade/type to the application.",
      "Confirm the correct product for your region and project.",
    ],
  },
  {
    id: "bangur",
    name: "Bangur",
    nameHi: "बांगुर",
    aliases: ["bangur", "बांगुर", "bangur cement"],
    benefits: [
      "Part of the Shree Cement group, known for steady quality.",
      "Offers OPC and blended cement options.",
      "Good availability in many regions.",
    ],
    applications: [
      "Concrete, mortar and plaster.",
      "Masonry and pavements.",
      "Structural members.",
    ],
    products: ["Bangur OPC 43 & 53", "Bangur PPC"],
    usage: [
      "Choose the grade/type based on the structural design.",
      "Store and handle cement as per manufacturer guidance.",
    ],
  },
];
