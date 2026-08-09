/**
 * Hindi & English keyword/intent maps used by the local rule-based assistant.
 *
 * These arrays let us detect language, intent, dimensions, quality, stage,
 * material and location without any external AI API. Hundreds of practical
 * Hindi + English + Hinglish (voice-transcribed) keywords are included.
 */

// -------- Language detection --------

/** Devanagari (Hindi) character range test. */
export const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

/** Distinctive Hindi words/phrases. */
export const HINDI_MARKERS = [
  "मकान",
  "घर",
  "बनाना",
  "बनाना है",
  "बाई",
  "गुणा",
  "मंजिल",
  "फर्श",
  "कितना",
  "है",
  "मुझे",
  "चाहिए",
  "लगेगा",
  "लागत",
  "सामग्री",
  "सीमेंट",
  "लोहा",
  "ईंट",
  "रेत",
  "अच्छा",
  "साधारण",
  "प्रीमियम",
  "कीमत",
  "फीट",
  "क्वालिटी",
  "नमस्ते",
  "धन्यवाद",
  "हां",
  "ना",
  "नहीं",
  "नींव",
  "खुदाई",
  "कॉलम",
  "बीम",
  "स्लैब",
  "छत",
  "दीवार",
  "प्लास्टर",
  "पेंट",
  "टाइल",
  "बाथरूम",
  "रसोई",
  "खिड़की",
  "दरवाजा",
  "पाइप",
  "प्लंबिंग",
  "बिजली",
  "वॉटरप्रूफिंग",
  "सीलन",
  "पानी",
  "टंकी",
  "सीढ़ी",
  "अनुमान",
  "माल",
  "खर्च",
  "लोकेशन",
  "शहर",
  "रंग",
  "पुट्टी",
  "सरिया",
  "गिट्टी",
  "बजरी",
];

/** Distinctive English words/phrases. */
export const ENGLISH_MARKERS = [
  "house",
  "home",
  "build",
  "construction",
  "estimate",
  "floors",
  "floor",
  "quality",
  "normal",
  "premium",
  "luxury",
  "feet",
  "sq",
  "cement",
  "steel",
  "bricks",
  "sand",
  "cost",
  "price",
  "material",
  "materials",
  "how much",
  "i want",
  "need",
  "hello",
  "hi",
  "thank",
  "yes",
  "no",
  "foundation",
  "column",
  "beam",
  "slab",
  "roof",
  "wall",
  "plaster",
  "paint",
  "tiles",
  "bathroom",
  "kitchen",
  "window",
  "door",
  "pipe",
  "plumbing",
  "electrical",
  "waterproofing",
  "water",
  "tank",
  "stair",
  "estimate",
  "location",
  "city",
  "putty",
  "primer",
  "aggregate",
  "reinforcement",
  "footing",
  "excavation",
  "pcc",
];

// -------- Greetings ---------

export const GREETING_HINDI = [
  "नमस्ते",
  "हैलो",
  "हेलो",
  "नमस्कार",
  "जय श्री कृष्ण",
  "जय श्री राम",
];

export const GREETING_ENGLISH = ["hello", "hi", "hey", "namaste", "good morning", "good evening", "good afternoon"];

// -------- Dimension separators --------

/**
 * Sequential patterns matched to extract "LENGTH WIDTH" pair, split by any of
 * these separators. Numeric tokens on either side represent length/width.
 */
export const DIMENSION_SEPARATORS: string[] = [
  " बाई ", // hi-IN
  " x ",
  " by ",
  " गुणा ",
  "×",
  "*",
];

// -------- Floor intents --------

export const FLOOR_WORDS_HINDI = ["मंजिल", "फर्श", "तल"];
export const FLOOR_WORDS_ENGLISH = ["floor", "floors"];

// -------- Quality intents --------

export const QUALITY_NORMAL_HINDI = ["साधारण", "नॉर्मल", "नार्मल", "सामान्य", "सस्ता", "economy", "निम्न"];
export const QUALITY_NORMAL_ENGLISH = ["normal", "basic", "standard", "economy", "cheap", "low"];

export const QUALITY_PREMIUM_HINDI = ["प्रीमियम", "अच्छा", "बेहतर", "शानदार", "हाई", "उच्च"];
export const QUALITY_PREMIUM_ENGLISH = ["premium", "high", "luxury", "best", "good", "upgrade"];

// -------- Simple yes / no --------

export const YES_HINDI = ["हां", "हाँ", "जी हां", "ठीक है"];
export const YES_ENGLISH = ["yes", "yeah", "yep", "sure", "ok", "okay"];

export const NO_HINDI = ["ना", "नहीं", "नहि"];
export const NO_ENGLISH = ["no", "nope", "nah"];

// -------- Material / project related nouns --------

/** Words that indicate the user wants an estimate but has given no dimensions. */
export const ESTIMATE_INTENT_HINDI = [
  "अनुमान",
  "कितना",
  "लगेगा",
  "लागत",
  "माल",
  "सामग्री",
  "खर्च",
  "कीमत",
];

export const ESTIMATE_INTENT_ENGLISH = [
  "estimate",
  "cost",
  "material",
  "materials",
  "budget",
  "how much",
  "price",
];

// ===========================================================================
// Stage / material query keywords (Hindi + English + Hinglish)
// Used by the knowledge-query layer in assistant.ts
// ===========================================================================

// -------- Roof / slab --------
export const ROOF_KEYWORDS = [
  "roof", "छत", "slab", "स्लैब", "ढलाई", "roof casting", "छत डालना", "छत की ढलाई",
  "roof banane", "roof ke liye", "छत बनाने", "roof slab", "terrace",
];

// -------- Foundation --------
export const FOUNDATION_KEYWORDS = [
  "foundation", "नींव", "फाउंडेशन", "footing", "फुटिंग", "excavation", "खुदाई",
  "plinth", "प्लिंथ", "base", "नींव में", "foundation ke liye", "फाउंडेशन में",
];

// -------- Column --------
export const COLUMN_KEYWORDS = [
  "column", "कॉलम", "pillar", "पिलर", "खंभा", "rcc column", "column size",
  "column ka size", "कॉलम का साइज",
];

// -------- Beam --------
export const BEAM_KEYWORDS = [
  "beam", "बीम", "rcc beam", "lintel", "लिंटर", "lintal", "beam size", "बीम का साइज",
];

// -------- Brick / wall --------
export const BRICK_WALL_KEYWORDS = [
  "brick", "bricks", "ईंट", "ईंटें", "brick wall", "ईंट की दीवार", "brickwork",
  "मेसनरी", "masonry", "aac block", "aac", "wall", "दीवार", "ईंट कितनी",
];

// -------- Plaster --------
export const PLASTER_KEYWORDS = [
  "plaster", "प्लास्टर", "cement plaster", "wall plaster", "छत प्लास्टर", "internal plaster",
  "external plaster", "प्लास्टर कितना",
];

// -------- Flooring / tiles --------
export const FLOORING_KEYWORDS = [
  "फर्श", "flooring", "tiles", "टाइल", "टाईल", "floor tiles", "marble",
  "granite", "फ्लोरिंग", "टाइल कितनी", "flooring kitna", "flooring kitni",
];

// -------- Wall tiles --------
export const WALL_TILES_KEYWORDS = [
  "wall tiles", "bathroom tiles", "kitchen tiles", "दीवार की टाइल", "वॉल टाइल",
];

// -------- Paint / putty / primer --------
export const PAINT_KEYWORDS = [
  "paint", "पेंट", "painting", "रंग", "रोगन", "primer", "प्राइमर", "putty", "पुट्टी",
  "interior paint", "exterior paint", "पेंट कितना", "paint kitna",
];

// -------- Doors / windows --------
export const DOOR_WINDOW_KEYWORDS = [
  "door", "doors", "दरवाजा", "दरवाजे", "window", "windows", "खिड़की", "खिड़कियाँ",
  "upvc", "aluminium", "wooden door", "दरवाजा खिड़की",
];

// -------- Electrical --------
export const ELECTRICAL_KEYWORDS = [
  "electrical", "बिजली", "wiring", "wire", "switch", "socket", "mcb", "db", "fan",
  "light", "ac point", "geyser point", "बिजली का काम", "बिजली का सामान", "electrical ka saman",
];

// -------- Plumbing --------
export const PLUMBING_KEYWORDS = [
  "plumbing", "प्लंबिंग", "water pipe", "pvc", "cpvc", "upvc", "drainage", "sewer",
  "kitchen sink", "wash basin", "toilet", "पाइप", "प्लंबिंग का सामान", "plumbing material",
];

// -------- Water tank --------
export const WATER_TANK_KEYWORDS = [
  "water tank", "पानी की टंकी", "overhead tank", "underground tank", "टंकी", "tank",
  "पानी की टंकी का साइज",
];

// -------- Staircase --------
export const STAIRCASE_KEYWORDS = [
  "stair", "staircase", "सीढ़ी", "stairs", "सीडियाँ", "सीढ़ी का डिजाइन",
];

// -------- Kitchen --------
export const KITCHEN_KEYWORDS = [
  "kitchen", "रसोई", "modular kitchen", "platform", "counter", "किचन", "रसोई बनाने",
];

// -------- Bathroom --------
export const BATHROOM_KEYWORDS = [
  "bathroom", "बाथरूम", "toilet", "washroom", "बाथरूम बनाने", "बाथरूम में", "bathroom ke liye",
];

// -------- Waterproofing --------
export const WATERPROOFING_KEYWORDS = [
  "waterproofing", "वॉटरप्रूफिंग", "छत में पानी", "roof leakage", "सीलन", "leakage",
  "roof waterproofing", "छत की सीलन", "पानी रिसना",
];

// -------- Cost / quality --------
export const COST_KEYWORDS = [
  "cost", "cost estimate", "construction cost", "कीमत", "लागत", "खर्च", "budget",
  "total cost", "घर बनाने की लागत", "घर बनाने का खर्च", "construction cost kitna",
];

// -------- Location / city --------
export const LOCATION_KEYWORDS = [
  "location", "city", "शहर", "लोकेशन", "place", "जगह", "delhi", "gurgaon", "noida",
  "faridabad", "bihar", "jharkhand", "odisha", "west bengal", "गांव", "मोहल्ला",
];

// -------- Structural (safety) keywords --------
export const STRUCTURAL_KEYWORDS = [
  "column size", "बीम का साइज", "beam size", "slab thickness", "स्लैब की मोटाई",
  "footing depth", "footing size", "reinforcement diameter", "सरिया का डाया", "sariya ka dia",
  "stair design", "सीढ़ी का डिजाइन", "column ka size", "कॉलम का साइज", "नींव की गहराई",
];

// -------- Material-specific quantity keywords --------
export const MATERIAL_QUANTITY_KEYWORDS: Record<string, string[]> = {
  cement: ["cement", "सीमेंट", "सिमेंट", "simaat", "cement kitna", "कितना सीमेंट"],
  steel: ["steel", "सरिया", "स्टील", "sariya", "steel kitna", "सरिया कितना", "tmt", "लोहा"],
  bricks: ["brick", "bricks", "ईंट", "ईंटें", "bricks kitni", "ईंट कितनी"],
  sand: ["sand", "रेत", "बालू", "sand kitna", "रेत कितना"],
  aggregate: ["aggregate", "गिट्टी", "बजरी", "कुट्टी", "aggregate kitna", "गिट्टी कितना"],
  tiles: ["tiles", "tile", "टाइल", "टाईल", "tiles kitni", "टाइल कितनी"],
  paint: ["paint", "पेंट", "paint kitna", "पेंट कितना"],
  steel_tonnes: ["steel ton", "steel tonne", "सरिया टन", "ton"],
};

// -------- Roaming / intent helpers --------

/** If any of these substrings appear in a message, it's a "what materials" question. */
export const WHAT_MATERIAL_MARKERS = [
  "kya kya chahiye", "kya kya lagega", "kya chahiye", "kya lagega", "requirement",
  "required", "materials needed", "material lagega", "क्या क्या चाहिए", "क्या चाहिए",
  "क्या क्या लगेगा", "क्या लगेगा", "कौन सा material", "कौन सा माल", "what material",
  "what is required", "ke liye kya", "के लिए क्या",
];

/** If any of these appear, it's asking for a quantity estimate. */
export const QUANTITY_MARKERS = [
  "kitna", "kitni", "how much", "how many", "कितना", "कितनी", "कितने", "quantity",
  "require", "required", "need", "chahiye", "लगेगा", "चाहिए",
];

// ---------------------------------------------------------------------------
// Cement knowledge query keywords (Hindi + English + Hinglish)
// ---------------------------------------------------------------------------

/** Words indicating a cement-specific conversation (company or product). */
export const CEMENT_QUERY_MARKERS = [
  "cement",
  "सीमेंट",
  "सिमेंट",
  "simaat",
  "cemen",
  "cement ka",
  "cement ke",
  "cement ki",
  "konsa cement",
  "which cement",
  "good cement",
  "best cement",
];

/** Words indicating the user is asking "which cement to use for X". */
export const CEMENT_RECOMMEND_MARKERS = [
  "konsa cement",
  "which cement",
  "konsa simaat",
  "कौन सा सीमेंट",
  "कौनसा सीमेंट",
  "simaat konsa",
  "cement konsa",
  "cement for",
  "cement ke liye",
  "ke liye konsa cement",
  "के लिए कौन सा सीमेंट",
  "good cement for",
  "best cement for",
  "cement for roof",
  "cement for slab",
  "cement for plaster",
  "रूफ के लिए सीमेंट",
  "छत के लिए सीमेंट",
  "प्लास्टर के लिए सीमेंट",
];

/** Common application words so a "cement for <application>" request maps generically. */
export const CEMENT_APPLICATION_MARKERS = [
  "roof",
  "slab",
  "छत",
  "स्लैब",
  "plaster",
  "प्लास्टर",
  "foundation",
  "नींव",
  "column",
  "कॉलम",
  "beam",
  "बीम",
  "flooring",
  "फर्श",
  "tiles",
  "टाइल",
  "brick",
  "masonry",
  "ईंट",
  "mortar",
  "pcc",
  "concrete",
  "कंक्रीट",
];

/** Small reusable follow-up performed naturally (not rigid). */
export const CEMENT_FOLLOWUP_HINDI =
  "क्या आप किसी और cement company या cement product के बारे में भी जानना चाहते हैं?";

export const CEMENT_FOLLOWUP_ENGLISH =
  "Would you like to know about any other cement company or product too?";

/** Natural opening offer shown when the assistant starts a conversation. */
export const CEMENT_OFFER_HINDI =
  "क्या आप किसी cement company या cement product के बारे में जानना चाहते हैं?\nजैसे ACC, Nuvoco, UltraTech, Ambuja, Dalmia आदि।";

export const CEMENT_OFFER_ENGLISH =
  "Would you like to learn about a cement company or cement product?\nFor example ACC, Nuvoco, UltraTech, Ambuja, Dalmia etc.";
