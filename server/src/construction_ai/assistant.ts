/**
 * Local rule-based Construction Assistant.
 *
 * This module implements the full conversation logic: language detection
 * (Hindi/English), a simple multi-turn state machine (size → floors →
 * quality → estimate) and bilingual reply generation. No external AI is used.
 */
import {
  DEVANAGARI_REGEX,
  HINDI_MARKERS,
  ENGLISH_MARKERS,
  GREETING_HINDI,
  GREETING_ENGLISH,
  FLOOR_WORDS_HINDI,
  FLOOR_WORDS_ENGLISH,
  QUALITY_NORMAL_HINDI,
  QUALITY_NORMAL_ENGLISH,
  QUALITY_PREMIUM_HINDI,
  QUALITY_PREMIUM_ENGLISH,
  YES_HINDI,
  YES_ENGLISH,
} from "./hindi_keywords.js";
import { BuildQuality, MAX_FLOORS } from "./dataset.js";
import { parseDimensions, calculateMaterials, formatIndianNumber } from "./calculator.js";

export type AssistantLanguage = "Hindi" | "English";

export interface SessionData {
  language: AssistantLanguage;
  dimensions: { length: number; width: number; area: number; raw: string } | null;
  floors: number | null;
  quality: BuildQuality | null;
}

export interface AssistantResult {
  reply: string;
  language: AssistantLanguage;
  /** True when a reusable estimate was produced this turn. */
  producedEstimate: boolean;
}

const WELCOME_HINDI =
  "नमस्ते! मैं आपका 🏠 Construction Assistant हूं। मैं आपके घर निर्माण में मदद कर सकता हूं। कृपया मुझे अपने घर का आकार बताएं, जैसे 40x35 फीट।";

const WELCOME_ENGLISH =
  "Namaste! I'm your 🏠 Construction Assistant. I can help estimate materials and cost for your home. Please tell me your house size, e.g. 40x35 feet.";

const ASK_FLOORS_HINDI = "घर में कितनी मंजिलें (floors) चाहिए?";
const ASK_FLOORS_ENGLISH = "How many floors do you want?";

const ASK_QUALITY_HINDI = "क्वालिटी कौन सी चाहिए — Normal या Premium?";
const ASK_QUALITY_ENGLISH = "Which quality do you prefer — Normal or Premium?";

const INVALID_SIZE_HINDI =
  "मुझे सही आकार समझ नहीं आया। कृपया लंबाई और चौड़ाई ऐसे बताएं, जैसे 40x35 फीट।";
const INVALID_SIZE_ENGLISH =
  "I didn't understand the size. Please provide length x width, e.g. 40x35 feet.";

const INVALID_FLOOR_HINDI = "कृपया मंजिलों की संख्या बताएं, जैसे 1 या 2।";
const INVALID_FLOOR_ENGLISH = "Please tell me the number of floors, e.g. 1 or 2.";

const INVALID_QUALITY_HINDI = "कृपया Normal या Premium में से चुनें।";
const INVALID_QUALITY_ENGLISH = "Please choose Normal or Premium.";

const THANKS_HINDI = "धन्यवाद!";
const THANKS_ENGLISH = "Thank you!";

/** Detect the language of a user message. Returns null if undetermined. */
export function detectLanguage(text: string): AssistantLanguage | null {
  const lower = text.toLowerCase();
  if (DEVANAGARI_REGEX.test(text)) return "Hindi";
  let hindiHits = 0;
  for (const w of HINDI_MARKERS) if (lower.includes(w.toLowerCase())) hindiHits++;
  let englishHits = 0;
  for (const w of ENGLISH_MARKERS) if (lower.includes(w)) englishHits++;
  if (hindiHits > englishHits) return "Hindi";
  if (englishHits > hindiHits) return "English";
  return null;
}

function isGreeting(text: string): boolean {
  const lower = text.toLowerCase().trim();
  for (const g of GREETING_HINDI) if (lower.includes(g)) return true;
  for (const g of GREETING_ENGLISH) if (lower.includes(g)) return true;
  return false;
}

function isThanks(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("धन्यवाद") ||
    lower.includes("शुक्रिया") ||
    lower.includes("thank you") ||
    lower.endsWith("thanks")
  );
}

function inList(text: string, list: string[]): boolean {
  const lower = text.toLowerCase();
  return list.some((w) => lower.includes(w.toLowerCase()));
}

function extractFloors(text: string, language: AssistantLanguage): number | null {
  const lower = text.toLowerCase();
  // Prefer explicit mention of floor count.
  const digits = lower.match(/(\d+)/);
  const hasFloorWord = language === "Hindi"
    ? inList(text, FLOOR_WORDS_HINDI)
    : inList(text, FLOOR_WORDS_ENGLISH);

  if (digits) {
    const n = Number(digits[1]);
    if (Number.isInteger(n) && n >= 1 && n <= MAX_FLOORS) return n;
  }

  if (hasFloorWord) {
    // Implicit single-storey phrasing e.g. "ground floor"
    if (inList(lower, ["ground", "single", "एक तल", "एक मंजिल", "builder floor"])) return 1;
    // Could not determine; ask again.
    return null;
  }

  // "how many floors" questions are handled elsewhere; here no floor word.
  return null;
}

function extractQuality(text: string, language: AssistantLanguage): BuildQuality | null {
  const lower = text.toLowerCase();
  const premiumList = language === "Hindi" ? [...QUALITY_PREMIUM_HINDI, ...QUALITY_PREMIUM_ENGLISH] : QUALITY_PREMIUM_ENGLISH;
  const normalList = language === "Hindi" ? [...QUALITY_NORMAL_HINDI, ...QUALITY_NORMAL_ENGLISH] : QUALITY_NORMAL_ENGLISH;
  const hasPremium = premiumList.some((w) => lower.includes(w.toLowerCase()));
  const hasNormal = normalList.some((w) => lower.includes(w.toLowerCase()));
  if (hasPremium && !hasNormal) return "premium";
  if (hasNormal && !hasPremium) return "normal";
  return null;
}

function buildQuoteLines(d: SessionData["dimensions"], est: ReturnType<typeof calculateMaterials>, lang: AssistantLanguage): string[] {
  const l = d!.length;
  const w = d!.width;
  const area = est.area;
  if (lang === "Hindi") {
    const lakh = (n: number) => `₹${formatIndianNumber(n / 100000)} लाख`;
    const lines = [
      `आपके ${l}×${w} फीट (${formatIndianNumber(area)} sq.ft.) घर के लिए अनुमानित सामग्री:`,
      ``,
      `🧱 Cement:`,
      `   लगभग ${formatIndianNumber(est.cementBags)} Bags`,
      ``,
      `🔩 Steel:`,
      `   लगभग ${est.steelTonnes} Ton`,
      ``,
      `🧱 Bricks:`,
      `   लगभग ${formatIndianNumber(est.bricks)}`,
      ``,
      `🏖️ Sand:`,
      `   लगभग ${formatIndianNumber(est.sandCft)} CFT`,
      ``,
      `🪨 Aggregate:`,
      `   लगभग ${formatIndianNumber(est.aggregateCft)} CFT`,
      ``,
      `💰 Construction Cost:`,
      `   लगभग ${lakh(est.costMin)}-${lakh(est.costMax)}`,
      ``,
      `Note: Final quantity structural design और location के अनुसार बदल सकती है।`,
    ];
    return lines;
  }

  const inr = (n: number) => `₹${formatIndianNumber(n)}`;
  const lines = [
    `Estimated materials for your ${l}x${w} ft (${formatIndianNumber(area)} sq.ft.) home:`,
    ``,
    `🧱 Cement:`,
    `   ~${formatIndianNumber(est.cementBags)} Bags`,
    ``,
    `🔩 Steel:`,
    `   ~${est.steelTonnes} Ton`,
    ``,
    `🧱 Bricks:`,
    `   ~${formatIndianNumber(est.bricks)}`,
    ``,
    `🏖️ Sand:`,
    `   ~${formatIndianNumber(est.sandCft)} CFT`,
    ``,
    `🪨 Aggregate:`,
    `   ~${formatIndianNumber(est.aggregateCft)} CFT`,
    ``,
    `💰 Construction Cost:`,
    `   ~${inr(est.costMin)}-${inr(est.costMax)}`,
    ``,
    `Note: Final quantities may vary based on structural design and location.`,
  ];
  return lines;
}

/**
 * Process one user message against the session state and return a reply.
 * The session object is mutated as the conversation advances.
 */
export function processMessage(
  session: SessionData,
  message: string
): AssistantResult {
  const lang = session.language;
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  // -------- Greetings --------
  if (isGreeting(trimmed) && !session.dimensions && !session.floors && !session.quality) {
    return {
      reply: lang === "Hindi" ? WELCOME_HINDI : WELCOME_ENGLISH,
      language: lang,
      producedEstimate: false,
    };
  }

  // -------- Thanks --------
  if (isThanks(trimmed)) {
    const produced = session.dimensions && session.floors && session.quality;
    const base = lang === "Hindi" ? THANKS_HINDI : THANKS_ENGLISH;
    const extra = produced
      ? lang === "Hindi"
        ? " और कुछ पूछना हो तो बताइए!"
        : " Let me know if you need anything else!"
      : (lang === "Hindi" ? " मैं आपके घर के अनुमान में कैसे मदद कर सकता हूं?" : " How can I help with your home estimate?");
    return { reply: base + extra, language: lang, producedEstimate: false };
  }

  // -------- Understand current field-of-attention --------
  // 1) Size: if dimension missing, look for size in the message.
  if (!session.dimensions) {
    const dims = parseDimensions(trimmed);
    if (dims) {
      session.dimensions = dims;
      // If floors also still missing, ask floors next.
      return {
        reply: `${lang === "Hindi" ? "बढ़िया! ✅ " : "Great! ✅ "}${dimSizeReply(dims, lang)}`,
        language: lang,
        producedEstimate: false,
      };
    }
    return {
      reply: lang === "Hindi" ? INVALID_SIZE_HINDI : INVALID_SIZE_ENGLISH,
      language: lang,
      producedEstimate: false,
    };
  }

  // 2) Floors: if dimension known but floors missing.
  if (!session.floors) {
    const floors = extractFloors(trimmed, lang);
    if (floors !== null) {
      session.floors = floors;
      // If a bare number was given we treat it as floors.
      return {
        reply: `${floorsReply(floors, lang)}
${lang === "Hindi" ? ASK_QUALITY_HINDI : ASK_QUALITY_ENGLISH}`,
        language: lang,
        producedEstimate: false,
      };
    }
    // The user might still be providing a size (dimension already set, e.g. if
    // they typed both size & floors in one message). Re-check dimensions.
    const dims = parseDimensions(trimmed);
    if (dims) {
      session.dimensions = dims;
      return {
        reply: `${lang === "Hindi" ? "बढ़िया! ✅ " : "Great! ✅ "}${dimSizeReply(dims, lang)}\n${lang === "Hindi" ? ASK_FLOORS_HINDI : ASK_FLOORS_ENGLISH}`,
        language: lang,
        producedEstimate: false,
      };
    }
    return {
      reply: lang === "Hindi" ? INVALID_FLOOR_HINDI : INVALID_FLOOR_ENGLISH,
      language: lang,
      producedEstimate: false,
    };
  }

  // 3) Quality: if size + floors known but quality missing.
  if (!session.quality) {
    const quality = extractQuality(trimmed, lang);
    if (quality) {
      session.quality = quality;
      const est = calculateMaterials(session.dimensions!.area, quality);
      const lines = buildQuoteLines(session.dimensions, est, lang);
      return {
        reply: lines.join("\n"),
        language: lang,
        producedEstimate: true,
      };
    }
    // Handle "yes"/"no" as default normal when quality asked without explicit word.
    if (inList(lower, [...YES_HINDI, ...YES_ENGLISH])) {
      session.quality = "normal";
      const est = calculateMaterials(session.dimensions!.area, "normal");
      return {
        reply: buildQuoteLines(session.dimensions, est, lang).join("\n"),
        language: lang,
        producedEstimate: true,
      };
    }
    return {
      reply: lang === "Hindi" ? INVALID_QUALITY_HINDI : INVALID_QUALITY_ENGLISH,
      language: lang,
      producedEstimate: false,
    };
  }

  // -------- Everything known: re-weight with new information / new size -----
  // If user provides a new size, recalc and start asking floors again.
  const newDims = parseDimensions(trimmed);
  if (newDims) {
    session.dimensions = newDims;
    session.floors = null;
    session.quality = null;
    return {
      reply: `${lang === "Hindi" ? "बढ़िया! ✅ " : "Great! ✅ "}${dimSizeReply(newDims, lang)}\n${lang === "Hindi" ? ASK_FLOORS_HINDI : ASK_FLOORS_ENGLISH}`,
      language: lang,
      producedEstimate: false,
    };
  }

  // Otherwise, recompute with current settings (cheap).
  const est = calculateMaterials(session.dimensions!.area, session.quality);
  return {
    reply: buildQuoteLines(session.dimensions, est, lang).join("\n"),
    language: lang,
    producedEstimate: true,
  };
}

/** Build a friendly confirmation line after a valid size is captured. */
function dimSizeReply(
  dims: { length: number; width: number; area: number; raw: string },
  lang: AssistantLanguage
): string {
  const area = formatIndianNumber(dims.area);
  if (lang === "Hindi") {
    return `आपके ${dims.length}×${dims.width} फीट का घर ${area} sq.ft. क्षेत्रफल का है।\n${ASK_FLOORS_HINDI}`;
  }
  return `Your ${dims.length}x${dims.width} ft home has an area of ${area} sq.ft.\n${ASK_FLOORS_ENGLISH}`;
}

function floorsReply(floors: number, lang: AssistantLanguage): string {
  if (lang === "Hindi") return `ठीक है, ${floors} मंजिल। ✅`;
  return `Okay, ${floors} floor${floors > 1 ? "s" : ""}. ✅`;
}

export function createInitialSession(lang: AssistantLanguage): SessionData {
  return {
    language: lang,
    dimensions: null,
    floors: null,
    quality: null,
  };
}

