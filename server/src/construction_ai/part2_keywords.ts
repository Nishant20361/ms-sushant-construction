/**
 * PART 2 — Consultation / intent keywords, markers and material aliases
 * (Phases 11-30).
 *
 * Keeping these in a separate module avoids touching the existing
 * hindi_keywords.ts internals and keeps the Part 1 exports fully intact.
 */
import {
  WATERPROOFING_KEYWORDS,
  PLASTER_KEYWORDS,
  FLOORING_KEYWORDS,
  PAINT_KEYWORDS,
  BRICK_WALL_KEYWORDS,
  ELECTRICAL_KEYWORDS,
  PLUMBING_KEYWORDS,
  CEMENT_RECOMMEND_MARKERS,
  COST_KEYWORDS,
  MATERIAL_QUANTITY_KEYWORDS,
} from "./hindi_keywords.js";

// -------- Consultation intents --------
export const INTENT_BUILD_HOUSE = [
  "ghar banana", "ghar bana", "makan banana", "house build", "build a house",
  "build house", "new ghar", "घर बनाना", "मकान बनाना", "नया घर", "घर बनाना है",
  "ghar banana hai", "house banana", "makan bana",
];
export const INTENT_RENOVATE = [
  "renovate", "renovation", "remodel", "naya karwana", "renovet karna",
  "रेनोवेशन", "नया कराना", "renovation karna",
];
export const INTENT_CONSTRUCT_ROOF = [
  "roof banana", "roof bana", "छत बनाना", "छत बनानी", "slab banana", "slab bana",
  "roof banani hai", "छत बनानी है", "roof bana hai", "roof dalna",
];
export const INTENT_CONSTRUCT_FOUNDATION = [
  "foundation banana", "foundation bana", "नींव बनाना", "नींव बनानी", "footing banana",
  "foundation dalna", "नींव डालना",
];
export const INTENT_BOUNDARY_WALL = [
  "boundary wall", "compound wall", "सीमा दीवार", "बाउंड्री वॉल", "compound",
  "boundary banana", "बाउंड्री बनाना",
];
export const INTENT_MAKE_ROOM = [
  "room banana", "room bana", "कमरा बनाना", "कमरा बनानी", "kamra banana",
  "room add", "extra room",
];
export const INTENT_MAKE_KITCHEN = [
  "kitchen banana", "kitchen bana", "रसोई बनाना", "रसोई बनानी", "kitchen banana hai",
];
export const INTENT_MAKE_BATHROOM = [
  "bathroom banana", "bathroom bana", "बाथरूम बनाना", "bathroom banana hai", "washroom banana",
];
export const INTENT_MAKE_STAIRCASE = [
  "staircase banana", "stair banana", "सीढ़ी बनाना", "staircase bana", "सीढ़ी बनानी",
];
export const INTENT_RCC_SLAB = [
  "rcc slab", "rcc slab banana", "slab dalna", "slab cast", "छत की ढलाई", "छत डालना",
  "slab banana", "slab bana",
];
export const INTENT_REPAIR_ROOF = [
  "roof repair", "छत मरम्मत", "roof repair karna", "छत की मरम्मत", "roof thik",
];
export const INTENT_WATERPROOFING = WATERPROOFING_KEYWORDS;
export const INTENT_PLASTERING = PLASTER_KEYWORDS;
export const INTENT_FLOORING = FLOORING_KEYWORDS;
export const INTENT_PAINTING = PAINT_KEYWORDS;
export const INTENT_BRICKWORK = BRICK_WALL_KEYWORDS;
export const INTENT_CONCRETE_WORK = [
  "concrete work", "concreting", "कंक्रीट का काम", "concrete banana", "concrete karna",
  "concrete work karna",
];
export const INTENT_ELECTRICAL = ELECTRICAL_KEYWORDS;
export const INTENT_PLUMBING = PLUMBING_KEYWORDS;
export const INTENT_MATERIAL_SELECTION = [
  "material selection", "konsa material", "which material", "material choose",
  "कौन सा material", "material kaise chune", "best material",
];
export const INTENT_CEMENT_SELECTION = CEMENT_RECOMMEND_MARKERS;
export const INTENT_STEEL_SELECTION = [
  "konsa steel", "which steel", "steel choose", "konsa sariya", "which sariya",
  "कौन सा सरिया", "steel selection", "konsa tmt",
];
export const INTENT_COST_ESTIMATION = COST_KEYWORDS;
export const INTENT_QUANTITY_ESTIMATION = MATERIAL_QUANTITY_KEYWORDS;

// -------- "Why" markers --------
export const WHY_MARKERS = ["why", "kyu", "kyon", "क्यों", "क्यूं", "to kyu", "reason"];

// -------- Comparison markers --------
export const COMPARISON_MARKERS = [
  "vs", "versus", "compare", "comparison", "comparison between", "ka comparison",
  "ki tulna", "की तुलना", "तुलना", "difference between", "ka difference",
  "mein kya farak", "kya behtar", "better", "behtar", "which is best", "kya best",
];

// -------- Benefit markers --------
export const BENEFIT_MARKERS = [
  "benefit", "benefits", "fayde", "faida", "advantage", "advantages", "fayda",
  "फायदे", "फायदा", "लाभ", "kya faida", "kya benefit",
];

// -------- Loss / drawback markers --------
export const LOSS_MARKERS = [
  "loss", "nuksan", "drawback", "disadvantage", "problem", "issue", "kamzori",
  "नुकसान", "कमजोरी", "problem kya", "dikkat",
];

// -------- Checklist markers --------
export const CHECKLIST_MARKERS = [
  "material list", "pura material", "full material", "material checklist", "kya kya lagta",
  "sab material", "complete list", "पूरी सामग्री", "पूरी list", "पूरा material",
  "material ka list", "samaan ki list", "सामान की लिस्ट", "सामान की list",
];

// -------- Stage guide markers --------
export const STAGE_GUIDE_MARKERS = [
  "ghar kaise banta", "ghar kaise banta hai", "house kaise banta", "how is a house built",
  "kaise banta hai ghar", "घर कैसे बनता है", "construction process", "building process",
  "ghar banane ka tarika", "step by step house", "kaise banta hai",
];

// -------- Incomplete-question single words --------
export const INCOMPLETE_WORDS = [
  "cement", "सीमेंट", "roof", "छत", "steel", "सरिया", "bathroom", "बाथरूम",
  "foundation", "नींव", "waterproofing", "वॉटरप्रूफिंग", "brick", "ईंट", "sand", "रेत",
  "paint", "पेंट", "tiles", "टाइल", "cost", "price", "कीमत",
];

// ===========================================================================
// PART 2 — Material aliases (Phase 22)
// ===========================================================================
export const MATERIAL_ALIASES: Record<string, string[]> = {
  cement: ["cement", "सीमेंट", "सिमेंट", "simaat", "ciment", "seement", "cemnt", "cment"],
  steel: ["steel", "सरिया", "स्टील", "sariya", "saria", "सारिया", "tmt", "लोहा", "reinforcement", "rebar"],
  bricks: ["brick", "bricks", "ईंट", "ईंटें", "eent", "int", "brik"],
  sand: ["sand", "रेत", "बालू", "baloo", "balu", "ret"],
  aggregate: ["aggregate", "गिट्टी", "बजरी", "gitti", "कुट्टी", "bajri", "stone aggregate"],
  roof: ["roof", "छत", "slab", "स्लैब", "roof slab", "terrace"],
  foundation: ["foundation", "नींव", "नीव", "footing", "base", "फाउंडेशन"],
};

/** Find the canonical material id for a text using aliases (Phase 22). */
export function matchMaterialAlias(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [id, aliases] of Object.entries(MATERIAL_ALIASES)) {
    for (const a of aliases) {
      const key = a.toLowerCase();
      if (key.length >= 3 && (lower.includes(key) || lower.endsWith(key))) return id;
    }
  }
  return null;
}
