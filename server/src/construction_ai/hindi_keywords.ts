/**
 * Hindi & English keyword/intent maps used by the local rule-based assistant.
 *
 * These arrays let us detect language, intent, dimensions and quality without
 * any external AI API.
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
  "feet",
  "sq",
  "cement",
  "steel",
  "bricks",
  "sand",
  "cost",
  "price",
  "material",
  "how much",
  "i want",
  "need",
  "hello",
  "hi",
  "thank",
  "yes",
  "no",
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

