/**
 * Local rule-based Conversational Construction Assistant.
 *
 * This is the heart of the assistant. It is fully local and rule-based:
 *  - Detects Hindi / English / Hinglish automatically.
 *  - Remembers the current conversation (dimensions, floors, quality, total
 *    area, rooms, bathrooms, roof/foundation, cement product, etc.).
 *  - Answers ONLY what the customer asks (never dumps the whole dataset).
 *  - Handles natural small talk and a smart question flow (one/two questions
 *    at a time).
 *  - Never invents product specifications or structural dimensions.
 *
 * No external AI API is used anywhere.
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
  ROOF_KEYWORDS,
  FOUNDATION_KEYWORDS,
  COLUMN_KEYWORDS,
  BEAM_KEYWORDS,
  PLASTER_KEYWORDS,
  FLOORING_KEYWORDS,
  WALL_TILES_KEYWORDS,
  PAINT_KEYWORDS,
  DOOR_WINDOW_KEYWORDS,
  ELECTRICAL_KEYWORDS,
  PLUMBING_KEYWORDS,
  WATER_TANK_KEYWORDS,
  STAIRCASE_KEYWORDS,
  KITCHEN_KEYWORDS,
  BATHROOM_KEYWORDS,
  WATERPROOFING_KEYWORDS,
  COST_KEYWORDS,
  LOCATION_KEYWORDS,
  STRUCTURAL_KEYWORDS,
  MATERIAL_QUANTITY_KEYWORDS,
  WHAT_MATERIAL_MARKERS,
  CEMENT_QUERY_MARKERS,
  CEMENT_RECOMMEND_MARKERS,
  CEMENT_APPLICATION_MARKERS,
  CEMENT_FOLLOWUP_HINDI,
  CEMENT_FOLLOWUP_ENGLISH,
  CEMENT_OFFER_HINDI,
  CEMENT_OFFER_ENGLISH,
  QUANTITY_MARKERS,
} from "./hindi_keywords.js";
import {
  BuildQuality,
  MAX_FLOORS,
  COST_BANDS,
  LOCATIONS,
  MATERIALS,
  CONSTRUCTION_STAGES,
  WATERPROOFING_TYPES,
  CEMENT_COMPANIES,
  PRELIMINARY_DISCLAIMER_HINDI,
  PRELIMINARY_DISCLAIMER_ENGLISH,
  STRUCTURAL_DISCLAIMER_HINDI,
  STRUCTURAL_DISCLAIMER_ENGLISH,
} from "./dataset.js";
import {
  parseDimensions,
  calculateMaterials,
  formatIndianNumber,
  calculateRoofConcrete,
  estimateRoofMaterials,
  calculatePlaster,
  calculateFlooring,
  calculatePaint,
  calculateCostByLocation,
  waterTankCapacity,
  estimateElectrical,
  estimatePlumbing,
} from "./calculator.js";
import {
  getTotalArea,
  createInitialSession,
  SessionData,
  AssistantLanguage,
} from "./conversation_memory.js";
import {
  SUGGESTED_QUESTIONS,
  findSmallTalk,
  constructionSequenceReply,
  estimateHeader,
} from "./conversation_data.js";
import { findStage } from "./construction_stages.js";
import { findCementCompany } from "./cement_data.js";
import { findSteelInfo } from "./steel_data.js";
import { findRoofingInfo } from "./roofing_data.js";

export { createInitialSession, getTotalArea };
export type { SessionData, AssistantLanguage };

export interface AssistantResult {
  reply: string;
  language: AssistantLanguage;
  /** The resolved conversation state (for the UI to show context). */
  conversation: {
    length: number | null;
    width: number | null;
    area: number | null;
    floors: number | null;
    totalArea: number | null;
    quality: string | null;
    location: string | null;
  };
  /** True when a reusable estimate was produced this turn. */
  producedEstimate: boolean;
  /** Optional suggested questions to show after this reply. */
  suggestions?: string[];
}

// ---------------------------------------------------------------------------
// Welcome / greeting messages (natural, friendly)
// ---------------------------------------------------------------------------
const WELCOME_HINDI =
  `नमस्ते 😊 M/S Sushant Construction में आपका स्वागत है।\n` +
  `मैं घर बनाने, material, cost, cement, steel, roof और foundation की जानकारी दे सकता हूँ।\n\n` +
  `आप किस बारे में जानना चाहते हैं?`;

const WELCOME_ENGLISH =
  `Hello 😊 Welcome to M/S Sushant Construction.\n` +
  `I can help you with house building, materials, cost, cement, steel, roof and foundation.\n\n` +
  `What would you like to know?`;

const ASK_FLOORS_HINDI = `घर कितने floor का बनाना है?\nExample:\n1 floor\n2 floor\n3 floor`;
const ASK_FLOORS_ENGLISH = `How many floors do you want?\nExample:\n1 floor\n2 floor\n3 floor`;

const ASK_QUALITY_HINDI = `Quality बताइए:\nNormal\nPremium`;
const ASK_QUALITY_ENGLISH = `What quality do you want?\nNormal / Premium`;

const INVALID_SIZE_HINDI =
  `मुझे सही size समझ नहीं आया। कृपया लंबाई × चौड़ाई बताएं, जैसे 40×35 ft.`;
const INVALID_SIZE_ENGLISH =
  `I didn't understand the size. Please give length × width, e.g. 40×35 ft.`;

const INVALID_FLOOR_HINDI = `कृपया floors की संख्या बताएं, जैसे 1 या 2।`;
const INVALID_FLOOR_ENGLISH = `Please tell me the number of floors, e.g. 1 or 2.`;

const INVALID_QUALITY_HINDI = `कृपया Normal या Premium में से चुनें।`;
const INVALID_QUALITY_ENGLISH = `Please choose Normal or Premium.`;

const UNKNOWN_HINDI = `मुझे समझ नहीं आया 😊 कृपया घर के size (जैसे 40×35) या material/cost के बारे में पूछिए।`;
const UNKNOWN_ENGLISH = `I didn't quite get that 😊 Please ask about your house size (e.g. 40×35) or materials/cost.`;

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
function isGreeting(text: string): boolean {
  const lower = text.toLowerCase().trim();
  for (const g of GREETING_HINDI) {
    if (lower === g || lower.startsWith(g + " ") || lower.includes(" " + g + " ") || lower.endsWith(" " + g)) return true;
  }
  for (const g of GREETING_ENGLISH) {
    if (g.length < 3) {
      if (lower === g) return true;
      if (new RegExp(`(^|\\s)${g}(\\s|$)`).test(lower)) return true;
    } else if (lower.includes(g)) {
      return true;
    }
  }
  return false;
}

function isThanks(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("धन्यवाद") ||
    lower.includes("शुक्रिया") ||
    lower.includes("thank you") ||
    lower.endsWith("thanks") ||
    lower.includes("thx")
  );
}

function inList(text: string, list: string[]): boolean {
  const lower = text.toLowerCase();
  return list.some((w) => lower.includes(w.toLowerCase()));
}

function extractFloors(text: string, language: AssistantLanguage): number | null {
  const lower = text.toLowerCase();

  // 1) Prefer a number directly adjacent to a floor word, e.g. "2 floor",
  //    "2-floor", "2 मंजिल", "2 तल". This avoids accidentally grabbing the
  //    house length from something like "40x35 2 floor".
  const floorRe =
    /(\d+)\s*(?:floor|floors|stor|story|storie|मंजिल|फर्श|तल)|(\d+)\s*-\s*(?:floor|मंजिल)|(?:floor|मंजिल)\s*(\d+)/i;
  const m = floorRe.exec(lower);
  if (m) {
    const raw = m[1] || m[2] || m[3];
    if (raw) {
      const n = Number(raw);
      if (Number.isInteger(n) && n >= 1 && n <= MAX_FLOORS) return n;
    }
  }

  const hasFloorWord = language === "Hindi"
    ? inList(text, FLOOR_WORDS_HINDI)
    : inList(text, FLOOR_WORDS_ENGLISH);

  // 2) Implicit single-storey phrasing.
  if (hasFloorWord) {
    if (inList(lower, ["ground", "single", "ground floor", "एक तल", "एक मंजिल", "builder floor"])) return 1;
  }

  // 3) Fallback: a lone small number (1..MAX) that is not part of a dimension
  //    pair (dimension numbers like 40, 35 will be > MAX_FLOORS).
  const tokens = lower.match(/\d+(?:\.\d+)?/g) || [];
  for (const t of tokens) {
    const n = Number(t);
    if (Number.isInteger(n) && n >= 1 && n <= MAX_FLOORS) {
      return n;
    }
  }
  return null;
}

function extractQuality(text: string, language: AssistantLanguage): BuildQuality | null {
  const lower = text.toLowerCase();
  const premiumList = language === "Hindi"
    ? [...QUALITY_PREMIUM_HINDI, ...QUALITY_PREMIUM_ENGLISH]
    : QUALITY_PREMIUM_ENGLISH;
  const normalList = language === "Hindi"
    ? [...QUALITY_NORMAL_HINDI, ...QUALITY_NORMAL_ENGLISH]
    : QUALITY_NORMAL_ENGLISH;
  const hasPremium = premiumList.some((w) => lower.includes(w.toLowerCase()));
  const hasNormal = normalList.some((w) => lower.includes(w.toLowerCase()));
  if (hasPremium && !hasNormal) return "premium";
  if (hasNormal && !hasPremium) return "normal";
  return null;
}

function findLocation(text: string) {
  const lower = text.toLowerCase();
  return LOCATIONS.find((loc) => loc.aliases.some((a) => lower.includes(a.toLowerCase())));
}

function isStructuralQuestion(text: string): boolean {
  return inList(text, STRUCTURAL_KEYWORDS);
}

function extractNumber(text: string, unit: string): number | null {
  const lower = text.toLowerCase();
  const re = new RegExp(`(\\d+)\\s*${unit}s?`, "i");
  const m = re.exec(lower);
  if (m) {
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function extractPeople(text: string): number | null {
  const lower = text.toLowerCase();
  const re = /(\d+)\s*(?:log|people|persons|member|सदस्य|लोग|लोगों)/i;
  const m = re.exec(lower);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0 && n < 100) return n;
  }
  return null;
}

function extractCount(text: string): { count: number; length: number; width: number } | null {
  const lower = text.toLowerCase();
  const countRe = /(\d+)\s*(?:door|doors|window|windows|दरवाजा|दरवाजे|खिड़की|खिड़कियाँ)/i;
  const countM = countRe.exec(lower);
  const dims = parseDimensions(text);
  if (countM && dims) {
    const n = Number(countM[1]);
    if (Number.isFinite(n) && n > 0 && n < 100) {
      return { count: n, length: dims.length, width: dims.width };
    }
  }
  return null;
}

function dimSizeReply(dims: { length: number; width: number; area: number }, lang: AssistantLanguage): string {
  const area = formatIndianNumber(dims.area);
  if (lang === "Hindi") {
    return `बहुत अच्छा 👍 आपके ${dims.length}×${dims.width} फीट घर का area लगभग ${area} sq.ft. है।`;
  }
  return `Great 👍 Your ${dims.length}x${dims.width} ft home has an area of about ${area} sq.ft.`;
}

// ---------------------------------------------------------------------------
// Material quantity reply (answers ONLY what was asked)
// ---------------------------------------------------------------------------
function materialQuantityReply(materialId: string, totalArea: number, lang: AssistantLanguage): string {
  const disc = lang === "Hindi" ? PRELIMINARY_DISCLAIMER_HINDI : PRELIMINARY_DISCLAIMER_ENGLISH;
  const fmt = (n: number) => formatIndianNumber(Math.round(n));
  const areaLabel =
    lang === "Hindi" ? `${fmt(totalArea)} sq.ft.` : `${fmt(totalArea)} sq.ft.`;
  if (lang === "Hindi") {
    switch (materialId) {
      case "cement":
        return `🧱 ${fmt(totalArea)} sq.ft. के लिए लगभग ${fmt(totalArea * 0.4)} bags cement लग सकते हैं।\n\n⚠️ ${disc}`;
      case "steel":
        return `🔩 ${fmt(totalArea)} sq.ft. के लिए steel का rough estimate लगभग ${(Math.round(((totalArea * 4) / 1000) * 10) / 10).toFixed(1)} tonnes हो सकता है।\n\n⚠️ ${disc}`;
      case "bricks":
        return `🧱 ${fmt(totalArea)} sq.ft. के लिए लगभग ${fmt(totalArea * 15)} bricks लग सकती हैं।\n\n⚠️ ${disc}`;
      case "sand":
        return `🏖️ ${fmt(totalArea)} sq.ft. के लिए लगभग ${fmt(totalArea * 1.8)} CFT sand लग सकती है।\n\n⚠️ ${disc}`;
      case "aggregate":
        return `🪨 ${fmt(totalArea)} sq.ft. के लिए लगभग ${fmt(totalArea * 3)} CFT aggregate लग सकता है।\n\n⚠️ ${disc}`;
      default: {
        const m = MATERIALS.find((x) => x.id === materialId);
        return m
          ? `${areaLabel} के लिए ${m.nameHi} का consumption: ${m.consumption}\n\n⚠️ ${disc}`
          : `⚠️ ${disc}`;
      }
    }
  }
  switch (materialId) {
    case "cement":
      return `🧱 For ${fmt(totalArea)} sq.ft., roughly ${fmt(totalArea * 0.4)} cement bags are needed.\n\n⚠️ ${disc}`;
    case "steel":
      return `🔩 For ${fmt(totalArea)} sq.ft., the rough steel estimate is about ${(Math.round(((totalArea * 4) / 1000) * 10) / 10).toFixed(1)} tonnes.\n\n⚠️ ${disc}`;
    case "bricks":
      return `🧱 For ${fmt(totalArea)} sq.ft., roughly ${fmt(totalArea * 15)} bricks are needed.\n\n⚠️ ${disc}`;
    case "sand":
      return `🏖️ For ${fmt(totalArea)} sq.ft., roughly ${fmt(totalArea * 1.8)} CFT of sand is needed.\n\n⚠️ ${disc}`;
    case "aggregate":
      return `🪨 For ${fmt(totalArea)} sq.ft., roughly ${fmt(totalArea * 3)} CFT of aggregate is needed.\n\n⚠️ ${disc}`;
    default: {
      const m = MATERIALS.find((x) => x.id === materialId);
      return m
        ? `${areaLabel}: ${m.nameEn} consumption: ${m.consumption}\n\n⚠️ ${disc}`
        : `⚠️ ${disc}`;
    }
  }
}

// ---------------------------------------------------------------------------
// Knowledge replies
// ---------------------------------------------------------------------------
function whatMaterialStageReply(stage: (typeof CONSTRUCTION_STAGES)[0], lang: AssistantLanguage): string {
  const materialNames = stage.materials
    .map((id) => MATERIALS.find((m) => m.id === id))
    .filter(Boolean)
    .map((m) => (lang === "Hindi" ? `${m!.nameHi} (${m!.nameEn})` : m!.nameEn));
  const disc = lang === "Hindi" ? PRELIMINARY_DISCLAIMER_HINDI : PRELIMINARY_DISCLAIMER_ENGLISH;
  if (lang === "Hindi") {
    return [
      `🏗️ ${stage.nameEn} (${stage.nameHi}) में आम तौर पर ये material लगते हैं:`,
      ``,
      ...materialNames.map((m, i) => `${i + 1}. ${m}`),
      ``,
      stage.description ? `📝 ${stage.description}` : "",
      ``,
      `⚠️ ${disc}`,
    ].filter((l) => l !== "").join("\n");
  }
  return [
    `🏗️ ${stage.nameEn} generally requires:`,
    ``,
    ...materialNames.map((m, i) => `${i + 1}. ${m}`),
    ``,
    stage.description ? `📝 ${stage.description}` : "",
    ``,
    `⚠️ ${disc}`,
  ].filter((l) => l !== "").join("\n");
}

function roofKnowledgeReply(lang: AssistantLanguage): string {
  if (lang === "Hindi") {
    return [
      `🏗️ RCC छत (slab) में आम तौर पर ये material लगते हैं:`,
      ``,
      `1. Cement (सीमेंट)`,
      `2. Sand (रेत)`,
      `3. Aggregate (गिट्टी)`,
      `4. TMT steel (सरिया)`,
      `5. Binding wire (बाइंडिंग तार)`,
      `6. Shuttering (शटरिंग)`,
      `7. Waterproofing (वॉटरप्रूफिंग)`,
      `8. Curing water (क्योरिंग पानी)`,
      `9. Electrical conduits (बिजली के पाइप)`,
      ``,
      `📏 Concrete volume = लंबाई × चौड़ाई × मोटाई`,
      ``,
      `⚠️ Slab की मोटाई structural engineer verify करें।`,
    ].join("\n");
  }
  return [
    `🏗️ RCC roof (slab) generally requires:`,
    ``,
    `1. Cement`,
    `2. Sand`,
    `3. Aggregate`,
    `4. TMT steel`,
    `5. Binding wire`,
    `6. Shuttering`,
    `7. Waterproofing`,
    `8. Curing water`,
    `9. Electrical conduits`,
    ``,
    `📏 Concrete volume = Length × Width × Thickness`,
    ``,
    `⚠️ Slab thickness must be verified by a structural engineer.`,
  ].join("\n");
}

function foundationKnowledgeReply(lang: AssistantLanguage): string {
  const disc = lang === "Hindi" ? STRUCTURAL_DISCLAIMER_HINDI : STRUCTURAL_DISCLAIMER_ENGLISH;
  if (lang === "Hindi") {
    return [
      `🏗️ Foundation (नींव) में आम तौर पर ये काम/material लगते हैं:`,
      ``,
      `1. Excavation (खुदाई)`,
      `2. PCC bed`,
      `3. Reinforcement steel (सरिया)`,
      `4. Cement (सीमेंट)`,
      `5. Sand (रेत)`,
      `6. Aggregate (गिट्टी)`,
      `7. Shuttering (जहाँ आवश्यक हो)`,
      `8. Waterproofing / DPC`,
      `9. Backfilling (वापस भराई)`,
      ``,
      `Foundation निर्भर करता है: soil type, floors, load, footing type, column spacing, water table पर।`,
      ``,
      `Footing types: Isolated, Combined, Strip, Raft, Pile`,
      ``,
      `⚠️ ${disc}`,
    ].join("\n");
  }
  return [
    `🏗️ Foundation generally involves:`,
    ``,
    `1. Excavation`,
    `2. PCC bed`,
    `3. Reinforcement steel`,
    `4. Cement`,
    `5. Sand`,
    `6. Aggregate`,
    `7. Shuttering (where required)`,
    `8. Waterproofing / DPC`,
    `9. Backfilling`,
    ``,
    `Foundation depends on soil type, floors, load, footing type, column spacing, water table.`,
    ``,
    `Footing types: Isolated, Combined, Strip, Raft, Pile`,
    ``,
    `⚠️ ${disc}`,
  ].join("\n");
}

function structuralReply(lang: AssistantLanguage): string {
  const disc = lang === "Hindi" ? STRUCTURAL_DISCLAIMER_HINDI : STRUCTURAL_DISCLAIMER_ENGLISH;
  if (lang === "Hindi") {
    return `⚠️ Column size, beam size, slab thickness, footing depth और reinforcement diameter structural engineer और soil/building load के अनुसार तय होना चाहिए।\n\n${disc}`;
  }
  return `⚠️ Column size, beam size, slab thickness, footing depth and reinforcement diameter must be decided by a structural engineer based on soil/building load.\n\n${disc}`;
}

function waterproofingReply(lang: AssistantLanguage): string {
  const categories = WATERPROOFING_TYPES.map((t) => (lang === "Hindi" ? `- ${t.nameHi} (${t.nameEn})` : `- ${t.nameEn}`));
  const disc = lang === "Hindi" ? PRELIMINARY_DISCLAIMER_HINDI : PRELIMINARY_DISCLAIMER_ENGLISH;
  if (lang === "Hindi") {
    return [
      `💧 Waterproofing के सामान्य प्रकार:`,
      ``,
      ...categories,
      ``,
      `Coverage manufacturer के product पर निर्भर करता है।`,
      `❓ कौन सा waterproofing product use कर रहे हैं?`,
      ``,
      `⚠️ ${disc}`,
    ].join("\n");
  }
  return [
    `💧 Common waterproofing types:`,
    ``,
    ...categories,
    ``,
    `Coverage depends on the manufacturer's product.`,
    `❓ Which waterproofing product are you using?`,
    ``,
    `⚠️ ${disc}`,
  ].join("\n");
}

function paintKnowledgeReply(area: number | null, lang: AssistantLanguage): string {
  const disc = lang === "Hindi" ? PRELIMINARY_DISCLAIMER_HINDI : PRELIMINARY_DISCLAIMER_ENGLISH;
  if (area == null) {
    if (lang === "Hindi") {
      return [
        `🎨 Painting में ये लगता है: Wall putty, Primer, Interior paint, Exterior paint।`,
        ``,
        `Paint coverage brand, surface और coats के अनुसार बदलता है।`,
        `❓ कृपया अपने घर का area बताएं (जैसे 40×35) ताकि अनुमान निकाल सकूं।`,
      ].join("\n");
    }
    return [
      `🎨 Painting requires: Wall putty, Primer, Interior paint, Exterior paint.`,
      ``,
      `Paint coverage varies by brand, surface and number of coats.`,
      `❓ Please provide your house area (e.g. 40×35) so I can estimate.`,
    ].join("\n");
  }
  const p = calculatePaint(area);
  if (lang === "Hindi") {
    return [
      `🎨 ${formatIndianNumber(area)} sq.ft. के लिए अनुमानित painting:`,
      ``,
      `🧱 Interior paint: ~${p.paintLtr} Ltr (2 coats)`,
      `🖌️ Primer: ~${p.primerLtr} Ltr`,
      `🧴 Putty: ~${p.puttyKg} kg`,
      ``,
      `⚠️ ${disc}`,
    ].join("\n");
  }
  return [
    `🎨 Approx painting for ${formatIndianNumber(area)} sq.ft.:`,
    ``,
    `🧱 Interior paint: ~${p.paintLtr} Ltr (2 coats)`,
    `🖌️ Primer: ~${p.primerLtr} Ltr`,
    `🧴 Putty: ~${p.puttyKg} kg`,
    ``,
    `⚠️ ${disc}`,
  ].join("\n");
}

function tilesKnowledgeReply(area: number | null, lang: AssistantLanguage): string {
  const disc = lang === "Hindi" ? PRELIMINARY_DISCLAIMER_HINDI : PRELIMINARY_DISCLAIMER_ENGLISH;
  if (area == null) {
    if (lang === "Hindi") {
      return [
        `🟫 Tiles के लिए मुझे floor area चाहिए।`,
        `Required tile area = floor area × (1 + wastage 5-10%)।`,
        `❓ कृपया अपने घर का area बताएं (जैसे 40×35)।`,
      ].join("\n");
    }
    return [
      `🟫 For tiles I need the floor area.`,
      `Required tile area = floor area × (1 + wastage 5-10%).`,
      `❓ Please provide your house area (e.g. 40×35).`,
    ].join("\n");
  }
  const f = calculateFlooring(Math.sqrt(area), Math.sqrt(area));
  if (lang === "Hindi") {
    return [
      `🟫 ${formatIndianNumber(area)} sq.ft. के लिए अनुमानित tiles:`,
      ``,
      `Floor area: ${formatIndianNumber(area)} sq.ft.`,
      `Required tile area (with 8% wastage): ~${formatIndianNumber(f.requiredTileArea)} sq.ft.`,
      ``,
      `⚠️ ${disc}`,
    ].join("\n");
  }
  return [
    `🟫 Approx tiles for ${formatIndianNumber(area)} sq.ft.:`,
    ``,
    `Floor area: ${formatIndianNumber(area)} sq.ft.`,
    `Required tile area (with 8% wastage): ~${formatIndianNumber(f.requiredTileArea)} sq.ft.`,
    ``,
    `⚠️ ${disc}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Cement knowledge
// ---------------------------------------------------------------------------
function isBareCementCompany(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (lower.length < 2 || lower.length > 30) return false;
  return CEMENT_COMPANIES.some((c) =>
    c.aliases.some((a) => a.toLowerCase() === lower || lower === a.toLowerCase() + " cement")
  );
}

function isCementRecommend(text: string): boolean {
  return inList(text, CEMENT_RECOMMEND_MARKERS);
}

function cementCompanyReply(company: (typeof CEMENT_COMPANIES)[0], lang: AssistantLanguage): string {
  const followup = lang === "Hindi" ? CEMENT_FOLLOWUP_HINDI : CEMENT_FOLLOWUP_ENGLISH;
  const lines: string[] = [];
  if (lang === "Hindi") {
    lines.push(`🏗️ ${company.name} — सामान्य जानकारी`);
    lines.push(``);
    lines.push(`✅ फायदे (Benefits):`);
    company.benefits.forEach((b) => lines.push(`• ${b}`));
    lines.push(``);
    lines.push(`🛠️ उपयोग (Applications):`);
    company.applications.forEach((a) => lines.push(`• ${a}`));
    if (company.products.length) {
      lines.push(``);
      lines.push(`📦 उत्पाद (Products):`);
      company.products.forEach((p) => lines.push(`• ${p}`));
    }
    lines.push(``);
    lines.push(`💡 उपयोग टिप्स (Usage):`);
    company.usage.forEach((u) => lines.push(`• ${u}`));
    lines.push(``);
    lines.push(`ℹ️ सही cement type/grade को structural/project requirement के अनुसार engineer से confirm करें।`);
  } else {
    lines.push(`🏗️ ${company.name} — General Information`);
    lines.push(``);
    lines.push(`✅ Benefits:`);
    company.benefits.forEach((b) => lines.push(`• ${b}`));
    lines.push(``);
    lines.push(`🛠️ Applications:`);
    company.applications.forEach((a) => lines.push(`• ${a}`));
    if (company.products.length) {
      lines.push(``);
      lines.push(`📦 Products:`);
      company.products.forEach((p) => lines.push(`• ${p}`));
    }
    lines.push(``);
    lines.push(`💡 Usage Tips:`);
    company.usage.forEach((u) => lines.push(`• ${u}`));
    lines.push(``);
    lines.push(`ℹ️ Confirm the right cement type/grade with your engineer per structural/project requirements.`);
  }
  lines.push(``);
  lines.push(followup);
  return lines.join("\n");
}

function cementRecommendReply(text: string, lang: AssistantLanguage): string {
  const app = CEMENT_APPLICATION_MARKERS.find((a) => text.toLowerCase().includes(a.toLowerCase()));
  const followup = lang === "Hindi" ? CEMENT_FOLLOWUP_HINDI : CEMENT_FOLLOWUP_ENGLISH;
  const examples = CEMENT_COMPANIES.slice(0, 5).map((c) => c.name).join(", ") + ", ...";
  if (lang === "Hindi") {
    const appLine = app
      ? `आपने ${app} के लिए cement पूछा है।`
      : "Cement का चुनाव specific product/type और structural/project requirement पर निर्भर करता है।";
    return [
      `🧱 Cement चुनाव के बारे में:`,
      ``,
      appLine,
      ``,
      `सामान्य तौर पर OPC 53 उन जगहों के लिए अच्छा है जहाँ ज्यादा strength चाहिए (slab, columns), और PPC/OPC 43 plaster, masonry और सामान्य काम के लिए उपयुक्त रहता है।`,
      ``,
      `लेकिन सही grade आपके structural design और engineer की सलाह से तय होगा।`,
      ``,
      `कुछ लोकप्रिय cement company हैं: ${examples}`,
      ``,
      followup,
    ].join("\n");
  }
  const appLine = app
    ? `You asked about cement for ${app}.`
    : "Cement selection depends on the specific product/type and structural/project requirements.";
  return [
    `🧱 About choosing cement:`,
    ``,
    appLine,
    ``,
    `In general, OPC 53 is suited where higher strength is specified (slab, columns), while PPC/OPC 43 works well for plaster, masonry and general work.`,
    ``,
    `The right grade should be confirmed by your structural design and engineer.`,
    ``,
    `Some popular cement companies: ${examples}`,
    ``,
    followup,
  ].join("\n");
}

function cementOfferReply(lang: AssistantLanguage): string {
  const offer = lang === "Hindi" ? CEMENT_OFFER_HINDI : CEMENT_OFFER_ENGLISH;
  const examples = CEMENT_COMPANIES.map((c) => c.name).join(", ");
  return `${offer}\n\nAvailable in my local dataset:\n${examples}`;
}

// ---------------------------------------------------------------------------
// Detect material quantity
// ---------------------------------------------------------------------------
function detectMaterialQuantity(text: string): string | null {
  const lower = text.toLowerCase();
  const entries: [string, string[]][] = Object.entries(MATERIAL_QUANTITY_KEYWORDS);
  for (const [id, kws] of entries) {
    if (kws.some((k) => lower.includes(k.toLowerCase()))) return id;
  }
  if (inList(lower, ["cement", "सीमेंट"])) return "cement";
  if (inList(lower, ["सरिया", "steel", "स्टील", "sariya", "लोहा"])) return "steel";
  if (inList(lower, ["ईंट", "brick"])) return "bricks";
  if (inList(lower, ["रेत", "sand"])) return "sand";
  if (inList(lower, ["गिट्टी", "aggregate", "बजरी"])) return "aggregate";
  return null;
}

function materialHiName(id: string): string {
  const names: Record<string, string> = {
    cement: "सीमेंट",
    steel: "सरिया/स्टील",
    bricks: "ईंट",
    sand: "रेत",
    aggregate: "गिट्टी",
  };
  return names[id] ?? id;
}

function materialEnName(id: string): string {
  const names: Record<string, string> = {
    cement: "cement",
    steel: "steel",
    bricks: "bricks",
    sand: "sand",
    aggregate: "aggregate",
  };
  return names[id] ?? id;
}

// ---------------------------------------------------------------------------
// Build the full quote (all materials) — used only when the customer asks for
// the full estimate (e.g. "pura estimate", "sab batao").
// ---------------------------------------------------------------------------
function buildFullEstimate(session: SessionData, lang: AssistantLanguage): string {
  const totalArea = getTotalArea(session) ?? session.dimensions!.area;
  const quality = session.quality ?? "normal";
  const est = calculateMaterials(totalArea, quality);
  const disclaimer = lang === "Hindi" ? PRELIMINARY_DISCLAIMER_HINDI : PRELIMINARY_DISCLAIMER_ENGLISH;
  const header = estimateHeader(session, lang);

  if (lang === "Hindi") {
    const lakh = (n: number) => `₹${formatIndianNumber(n / 100000)} लाख`;
    return [
      `${header} rough estimate:`,
      ``,
      `🧱 Cement: लगभग ${formatIndianNumber(est.cementBags)} Bags`,
      `🔩 Steel: लगभग ${est.steelTonnes} Ton`,
      `🧱 Bricks: लगभग ${formatIndianNumber(est.bricks)}`,
      `🏖️ Sand: लगभग ${formatIndianNumber(est.sandCft)} CFT`,
      `🪨 Aggregate: लगभग ${formatIndianNumber(est.aggregateCft)} CFT`,
      `💰 Construction Cost: लगभग ${lakh(est.costMin)}-${lakh(est.costMax)}`,
      ``,
      `ये approximate quantities हैं।`,
      ``,
      `⚠️ ${disclaimer}`,
    ].join("\n");
  }
  const inr = (n: number) => `₹${formatIndianNumber(n)}`;
  return [
    `${header} rough estimate:`,
    ``,
    `🧱 Cement: ~${formatIndianNumber(est.cementBags)} Bags`,
    `🔩 Steel: ~${est.steelTonnes} Ton`,
    `🧱 Bricks: ~${formatIndianNumber(est.bricks)}`,
    `🏖️ Sand: ~${formatIndianNumber(est.sandCft)} CFT`,
    `🪨 Aggregate: ~${formatIndianNumber(est.aggregateCft)} CFT`,
    `💰 Construction Cost: ~${inr(est.costMin)}-${inr(est.costMax)}`,
    ``,
    `These are approximate quantities.`,
    ``,
    `⚠️ ${disclaimer}`,
  ].join("\n");
}

/** Offer a short menu of what we can estimate next (one step at a time). */
function offerMaterialsMenu(lang: AssistantLanguage): string {
  if (lang === "Hindi") {
    return [
      `आप किस जानकारी के बारे में जानना चाहते हैं?`,
      ``,
      `1. Cement requirement`,
      `2. Steel requirement`,
      `3. Brick requirement`,
      `4. Sand requirement`,
      `5. Construction cost`,
      `6. Complete estimate`,
    ].join("\n");
  }
  return [
    `What would you like to know?`,
    ``,
    `1. Cement`,
    `2. Steel`,
    `3. Bricks`,
    `4. Sand`,
    `5. Total cost`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
export function processMessage(session: SessionData, message: string): AssistantResult {
  const lang = session.language;
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  const conversation = () => ({
    length: session.dimensions?.length ?? null,
    width: session.dimensions?.width ?? null,
    area: session.dimensions?.area ?? null,
    floors: session.floors,
    totalArea: getTotalArea(session),
    quality: session.quality,
    location: session.location,
  });

  // -------- Greeting --------
  if (isGreeting(trimmed) && !session.greeted) {
    session.greeted = true;
    return {
      reply: lang === "Hindi" ? WELCOME_HINDI : WELCOME_ENGLISH,
      language: lang,
      conversation: conversation(),
      producedEstimate: false,
      suggestions: SUGGESTED_QUESTIONS.map((s) => s.label),
    };
  }

  // -------- Small talk --------
const smallTalk = findSmallTalk(trimmed);
  if (smallTalk) {
    const pool = lang === "Hindi" ? smallTalk.repliesHi : smallTalk.repliesEn;
    // Deterministic — always the first natural reply for consistency.
    const reply = pool[0];
    return { reply, language: lang, conversation: conversation(), producedEstimate: false };
  }

  // -------- Thanks --------
  if (isThanks(trimmed)) {
    const base = lang === "Hindi" ? "आपका स्वागत है 😊" : "You're welcome 😊";
    const extra = lang === "Hindi"
      ? "\nऔर कुछ पूछना हो तो बताइए!"
      : "\nLet me know if you need anything else!";
    return { reply: base + extra, language: lang, conversation: conversation(), producedEstimate: false };
  }

  // -------- Construction sequence ("ghar banane ka process/sequence") --------
  if (/(sequence|process|process of|order|क्रम|प्रक्रिया|पूरा sequence|kram)/.test(lower) &&
      /(house|ghar|घर|build|construction|बनाने या banane)/.test(lower)) {
    return {
      reply: constructionSequenceReply(lang),
      language: lang,
      conversation: conversation(),
      producedEstimate: false,
    };
  }

  // -------- Detect location --------
  const detectedLoc = findLocation(trimmed);
  if (detectedLoc && inList(trimmed, LOCATION_KEYWORDS)) {
    session.location = detectedLoc.nameEn;
  }

  // -------- Structural safety --------
  if (isStructuralQuestion(trimmed)) {
    return { reply: structuralReply(lang), language: lang, conversation: conversation(), producedEstimate: false };
  }

  // -------- Waterproofing --------
  if (inList(trimmed, WATERPROOFING_KEYWORDS)) {
    session.lastTopic = "waterproofing";
    return { reply: waterproofingReply(lang), language: lang, conversation: conversation(), producedEstimate: false };
  }

  // -------- Steel company / product --------
  const steelInfo = findSteelInfo(trimmed);
  const steelAreaKnown = getTotalArea(session) ?? (session.dimensions ? session.dimensions.area : null);
  const isBareSteelWord = /^(steel|steele|स्टील|सरिया|sariya|लोहा|tmt)$/i.test(trimmed) || /^steel|^स्टील/.test(lower);
  if (steelInfo && /(steel|सरिया|स्टील|sariya|tmt|लोहा)/.test(lower)) {
    const isQty = detectMaterialQuantity(trimmed);
    if ((isQty && /(kitna|how much|कितना|lagega|लगेगा)/.test(lower)) || (isBareSteelWord && steelAreaKnown)) {
      // fall through to quantity below
    } else {
      session.lastTopic = "steel";
      if (lang === "Hindi") {
        return {
          reply: `🔩 ${steelInfo.nameEn} (${steelInfo.nameHi})\n\n${steelInfo.usageHi}\n\n${steelInfo.notesHi.map((n) => `• ${n}`).join("\n")}\n\n⚠️ ${PRELIMINARY_DISCLAIMER_HINDI}`,
          language: lang,
          conversation: conversation(),
          producedEstimate: false,
        };
      }
      return {
        reply: `🔩 ${steelInfo.nameEn}\n\n${steelInfo.usageEn}\n\n${steelInfo.notesEn.map((n) => `• ${n}`).join("\n")}\n\n⚠️ ${PRELIMINARY_DISCLAIMER_ENGLISH}`,
        language: lang,
        conversation: conversation(),
        producedEstimate: false,
      };
    }
  }

  // -------- Roofing product --------
  const roofingInfo = findRoofingInfo(trimmed);
  if (roofingInfo && /(roofing sheet|roof sheet|छत की चादर|रूफिंग शीट|roofing)/.test(lower)) {
    session.lastTopic = "roofing";
    if (lang === "Hindi") {
      return {
        reply: `🏠 ${roofingInfo.nameEn} (${roofingInfo.nameHi})\n\n${roofingInfo.useHi}\n\n${roofingInfo.notesHi.map((n) => `• ${n}`).join("\n")}\n\n⚠️ ${PRELIMINARY_DISCLAIMER_HINDI}`,
        language: lang,
        conversation: conversation(),
        producedEstimate: false,
      };
    }
    return {
      reply: `🏠 ${roofingInfo.nameEn}\n\n${roofingInfo.useEn}\n\n${roofingInfo.notesEn.map((n) => `• ${n}`).join("\n")}\n\n⚠️ ${PRELIMINARY_DISCLAIMER_ENGLISH}`,
      language: lang,
      conversation: conversation(),
      producedEstimate: false,
    };
  }

  // -------- Cement company / product --------
  const isCementQty = inList(trimmed, CEMENT_QUERY_MARKERS) && inList(trimmed, QUANTITY_MARKERS);
  const qtyKnown = getTotalArea(session) ?? (session.dimensions ? session.dimensions.area : null);
  const isBareCementWord = /^(cement|सीमेंट|सिमेंट|simaat|ciment)$/i.test(trimmed) || /^cement|^सीमेंट/.test(lower);
  const mentionedCompany = findCementCompany(trimmed);
  const relatesToCompany = mentionedCompany && /(ke bare|ke baare|about|info|information|jankari|बारे|बारे में|company|product|benefit|f2r|concreto|vistas)/.test(lower);
  if (
    !isCementQty &&
    !(isBareCementWord && qtyKnown) &&
    (inList(trimmed, CEMENT_QUERY_MARKERS) || isCementRecommend(trimmed) || isBareCementCompany(trimmed) || (!!mentionedCompany && !!relatesToCompany))
  ) {
    const company = findCementCompany(trimmed);
    if (company) {
      session.cementProduct = company.name;
      session.lastTopic = "cement";
      return { reply: cementCompanyReply(company, lang), language: lang, conversation: conversation(), producedEstimate: false };
    }
    if (isCementRecommend(trimmed)) {
      session.lastTopic = "cement";
      return { reply: cementRecommendReply(trimmed, lang), language: lang, conversation: conversation(), producedEstimate: false };
    }
    session.lastTopic = "cement";
    return { reply: cementOfferReply(lang), language: lang, conversation: conversation(), producedEstimate: false };
  }

  // -------- Roof / foundation "what materials" --------
  if (inList(trimmed, ROOF_KEYWORDS) && inList(trimmed, WHAT_MATERIAL_MARKERS)) {
    session.lastTopic = "roof";
    return { reply: roofKnowledgeReply(lang), language: lang, conversation: conversation(), producedEstimate: false };
  }
  if (inList(trimmed, FOUNDATION_KEYWORDS) && inList(trimmed, WHAT_MATERIAL_MARKERS)) {
    session.lastTopic = "foundation";
    return { reply: foundationKnowledgeReply(lang), language: lang, conversation: conversation(), producedEstimate: false };
  }

  // -------- Column / beam structural --------
  if (inList(trimmed, COLUMN_KEYWORDS) || inList(trimmed, BEAM_KEYWORDS)) {
    if (inList(trimmed, WHAT_MATERIAL_MARKERS)) {
      const stage = findStage(trimmed);
      if (stage) return { reply: whatMaterialStageReply(stage, lang), language: lang, conversation: conversation(), producedEstimate: false };
    }
    return { reply: structuralReply(lang), language: lang, conversation: conversation(), producedEstimate: false };
  }

  // -------- Kitchen / bathroom "what is required" --------
  if ((inList(trimmed, KITCHEN_KEYWORDS) || inList(trimmed, BATHROOM_KEYWORDS)) && inList(trimmed, WHAT_MATERIAL_MARKERS)) {
    const isKitchen = inList(trimmed, KITCHEN_KEYWORDS);
    const roomStage = CONSTRUCTION_STAGES.find((s) => (isKitchen ? s.id === "kitchen" : s.id === "bathroom"));
    const stage = roomStage ?? findStage(trimmed);
    if (stage) return { reply: whatMaterialStageReply(stage, lang), language: lang, conversation: conversation(), producedEstimate: false };
  }

  // -------- Water tank --------
  if (inList(trimmed, WATER_TANK_KEYWORDS)) {
    const people = extractPeople(trimmed);
    if (people) {
      const cap = waterTankCapacity(people);
      const disc = lang === "Hindi" ? STRUCTURAL_DISCLAIMER_HINDI : STRUCTURAL_DISCLAIMER_ENGLISH;
      return {
        reply: lang === "Hindi"
          ? `💧 ${people} लोगों के लिए अनुमानित पानी की ज़रूरत:\n\nदिनभर: ~${formatIndianNumber(cap.perDay)} लीटर\n2-3 दिन का reserve: ~${formatIndianNumber(cap.litersMin)}-${formatIndianNumber(cap.litersMax)} लीटर\n\n⚠️ ${disc}`
          : `💧 Approx water need for ${people} people:\n\nPer day: ~${formatIndianNumber(cap.perDay)} liters\n2-3 day reserve: ~${formatIndianNumber(cap.litersMin)}-${formatIndianNumber(cap.litersMax)} liters\n\n⚠️ ${disc}`,
        language: lang,
        conversation: conversation(),
        producedEstimate: false,
      };
    }
    return {
      reply: lang === "Hindi"
        ? "❓ कितने लोगों का परिवार है (जैसे 4 या 5)?"
        : "❓ How many people are in the household (e.g. 4 or 5)?",
      language: lang,
      conversation: conversation(),
      producedEstimate: false,
    };
  }

  // -------- Staircase --------
  if (inList(trimmed, STAIRCASE_KEYWORDS)) {
    const disc = lang === "Hindi" ? STRUCTURAL_DISCLAIMER_HINDI : STRUCTURAL_DISCLAIMER_ENGLISH;
    return {
      reply: lang === "Hindi"
        ? `🪜 Staircase के material: Cement, Sand, Aggregate, Steel, Binding wire, Shuttering।\n\nStaircase design floor height, available space और structural design पर निर्भर करता है।\n\n${disc}`
        : `🪜 Staircase materials: Cement, Sand, Aggregate, Steel, Binding wire, Shuttering.\n\nStaircase design depends on floor height, available space and structural design.\n\n${disc}`,
      language: lang,
      conversation: conversation(),
      producedEstimate: false,
    };
  }

  // -------- Electrical --------
  if (inList(trimmed, ELECTRICAL_KEYWORDS)) {
    const est = estimateElectrical({
      rooms: extractNumber(trimmed, "room") ?? undefined,
      fans: extractNumber(trimmed, "fan") ?? undefined,
      lights: extractNumber(trimmed, "light") ?? undefined,
      sockets: extractNumber(trimmed, "socket") ?? undefined,
      acPoints: extractNumber(trimmed, "ac") ?? undefined,
      geyserPoints: extractNumber(trimmed, "geyser") ?? undefined,
    });
    const disc = lang === "Hindi" ? PRELIMINARY_DISCLAIMER_HINDI : PRELIMINARY_DISCLAIMER_ENGLISH;
    return {
      reply: lang === "Hindi"
        ? `⚡ अनुमानित points: ~${est.points}, wire rolls: ~${est.wireRolls}\n\n${est.note}\n\n⚠️ ${disc}`
        : `⚡ Approx points: ~${est.points}, wire rolls: ~${est.wireRolls}\n\nElectrical wiring final quantity is determined after electrical layout.\n\n⚠️ ${disc}`,
      language: lang,
      conversation: conversation(),
      producedEstimate: false,
    };
  }

  // -------- Plumbing --------
  if (inList(trimmed, PLUMBING_KEYWORDS)) {
    const est = estimatePlumbing({
      bathrooms: extractNumber(trimmed, "bathroom") ?? undefined,
      kitchens: extractNumber(trimmed, "kitchen") ?? undefined,
    });
    const disc = lang === "Hindi" ? PRELIMINARY_DISCLAIMER_HINDI : PRELIMINARY_DISCLAIMER_ENGLISH;
    return {
      reply: lang === "Hindi"
        ? `🔧 अनुमानित pipe: ~${est.totalPipeFt} running ft\n\n${est.note}\n\n⚠️ ${disc}`
        : `🔧 Approx pipe: ~${est.totalPipeFt} running ft\n\nPipe quantity is determined after plumbing layout.\n\n⚠️ ${disc}`,
      language: lang,
      conversation: conversation(),
      producedEstimate: false,
    };
  }

  // -------- Paint --------
  if (inList(trimmed, PAINT_KEYWORDS)) {
    const area = getTotalArea(session) ?? (session.dimensions ? session.dimensions.area : null);
    const dimsHere = parseDimensions(trimmed);
    const useArea = dimsHere ? dimsHere.area : area;
    return { reply: paintKnowledgeReply(useArea, lang), language: lang, conversation: conversation(), producedEstimate: false };
  }

  // -------- Tiles / flooring --------
  if (inList(trimmed, FLOORING_KEYWORDS) || inList(trimmed, WALL_TILES_KEYWORDS)) {
    const area = getTotalArea(session) ?? (session.dimensions ? session.dimensions.area : null);
    const dimsHere = parseDimensions(trimmed);
    const useArea = dimsHere ? dimsHere.area : area;
    return { reply: tilesKnowledgeReply(useArea, lang), language: lang, conversation: conversation(), producedEstimate: true };
  }

  // -------- Doors / windows --------
  if (inList(trimmed, DOOR_WINDOW_KEYWORDS)) {
    const count = extractCount(trimmed);
    if (count) {
      const each = count.length * count.width;
      const disc = lang === "Hindi" ? PRELIMINARY_DISCLAIMER_HINDI : PRELIMINARY_DISCLAIMER_ENGLISH;
      return {
        reply: lang === "Hindi"
          ? `🚪 ${count.count} items × ${count.length}x${count.width} ft = ~${formatIndianNumber(each)} sq.ft. कुल area।\n\nMaterial category (wood/UPVC/aluminium) आपकी पसंद के अनुसार चुनें।\n\n⚠️ ${disc}`
          : `🚪 ${count.count} items × ${count.length}x${count.width} ft = ~${formatIndianNumber(each)} sq.ft. total area.\n\nChoose material category (wood/UPVC/aluminium) as per your preference.\n\n⚠️ ${disc}`,
        language: lang,
        conversation: conversation(),
        producedEstimate: false,
      };
    }
  }

  // -------- Cost --------
  if (inList(trimmed, COST_KEYWORDS)) {
    const useArea = getTotalArea(session) ?? (session.dimensions ? session.dimensions.area : null);
    const loc = findLocation(trimmed) ?? (session.location ? findLocation(session.location) : undefined);
    if (useArea) {
      const disc = lang === "Hindi" ? PRELIMINARY_DISCLAIMER_HINDI : PRELIMINARY_DISCLAIMER_ENGLISH;
      if (loc) {
        const c = calculateCostByLocation(useArea, loc.costPerSqft);
        session.lastTopic = "cost";
        return {
          reply: lang === "Hindi"
            ? `💰 ${loc.nameEn} के लिए ${formatIndianNumber(useArea)} sq.ft. का अनुमानित cost:\n\nNormal: ₹${formatIndianNumber(c.costMin)}-₹${formatIndianNumber(c.costMax)}\n\n⚠️ यह configurable अनुमान है, live market price नहीं।\n\n${disc}`
            : `💰 Approx cost for ${formatIndianNumber(useArea)} sq.ft. in ${loc.nameEn}:\n\nNormal: ₹${formatIndianNumber(c.costMin)}-₹${formatIndianNumber(c.costMax)}\n\n⚠️ This is a configurable estimate, not a live market price.\n\n${disc}`,
          language: lang,
          conversation: conversation(),
          producedEstimate: true,
        };
      }
      const band = COST_BANDS.normal;
      const c = calculateCostByLocation(useArea, band);
      session.lastTopic = "cost";
      return {
        reply: lang === "Hindi"
          ? `💰 ${formatIndianNumber(useArea)} sq.ft. का अनुमानित construction cost:\n\nNormal: ₹${formatIndianNumber(c.costMin)}-₹${formatIndianNumber(c.costMax)}\n\n❓ किस शहर/लोकेशन में घर बना रहे हैं?\n\n${disc}`
          : `💰 Approx construction cost for ${formatIndianNumber(useArea)} sq.ft.:\n\nNormal: ₹${formatIndianNumber(c.costMin)}-₹${formatIndianNumber(c.costMax)}\n\n❓ Which city/location are you building in?\n\n${disc}`,
        language: lang,
        conversation: conversation(),
        producedEstimate: true,
      };
    }
return {
      reply: lang === "Hindi"
        ? `❓ कृपया अपने घर का size बताएं (जैसे 40×35) ताकि मैं construction cost का अनुमान निकाल सकूं।`
        : `❓ Please provide your house size (e.g. 40×35) so I can estimate the construction cost.`,
      language: lang,
      conversation: conversation(),
      producedEstimate: false,
    };
  }

  // -------- Material quantity (uses totalArea = area × floors) --------
  const qtyMaterial = detectMaterialQuantity(trimmed);
  if (qtyMaterial) {
    const totalArea = getTotalArea(session) ?? (session.dimensions ? session.dimensions.area : null);
    const dimsHere = parseDimensions(trimmed);
    const useArea = dimsHere ? dimsHere.area : totalArea;
    if (useArea) {
      session.lastTopic = qtyMaterial;
      return {
        reply: materialQuantityReply(qtyMaterial, useArea, lang),
        language: lang,
        conversation: conversation(),
        producedEstimate: true,
        suggestions: [
          ...(qtyMaterial !== "steel" ? ["🔩 Steel estimate"] : []),
          ...(qtyMaterial !== "cement" ? ["🧱 Cement estimate"] : []),
          ...(qtyMaterial !== "bricks" ? ["🧱 Bricks estimate"] : []),
          ...(qtyMaterial !== "sand" ? ["🏖️ Sand estimate"] : []),
          "💰 Construction Cost",
        ],
      };
    }
    session.pendingIntent = qtyMaterial;
    return {
      reply: lang === "Hindi"
        ? `❓ कृपया अपने घर का area बताएं (जैसे 40×35) ताकि मैं ${materialHiName(qtyMaterial)} का अनुमान निकाल सकूं।`
        : `❓ Please provide your house area (e.g. 40×35) so I can estimate ${materialEnName(qtyMaterial)}.`,
      language: lang,
      conversation: conversation(),
      producedEstimate: false,
    };
  }

  // -------- Roof / foundation quantity (needs area) --------
  if (inList(trimmed, FOUNDATION_KEYWORDS) || inList(trimmed, ROOF_KEYWORDS)) {
    const totalArea = getTotalArea(session) ?? (session.dimensions ? session.dimensions.area : null);
    const dimsHere = parseDimensions(trimmed);
    const useArea = dimsHere ? dimsHere.area : totalArea;
    const isRoof = inList(trimmed, ROOF_KEYWORDS);
    if (useArea) {
      const thickness = 5;
      const vol = calculateRoofConcrete(Math.sqrt(useArea), Math.sqrt(useArea), thickness);
      const est = estimateRoofMaterials(vol.volumeCft);
      const disc = lang === "Hindi" ? STRUCTURAL_DISCLAIMER_HINDI : STRUCTURAL_DISCLAIMER_ENGLISH;
      session.lastTopic = isRoof ? "roof" : "foundation";
      return {
        reply: lang === "Hindi"
          ? `${isRoof ? "🏗️ छत" : "निर्माण"} के लिए (उदाहरण 5 inch मोटाई):\n\nConcrete volume: ~${formatIndianNumber(vol.volumeCft)} CFT\nCement: ~${est.cementBags} Bags\nSand: ~${formatIndianNumber(est.sandCft)} CFT\nAggregate: ~${formatIndianNumber(est.aggregateCft)} CFT\nSteel: ~${formatIndianNumber(est.steelKg)} kg\n\n⚠️ Slab thickness structural design से verify करें।\n\n${disc}`
          : `${isRoof ? "🏗️ Roof" : "Construction"} (example 5 inch thickness):\n\nConcrete volume: ~${formatIndianNumber(vol.volumeCft)} CFT\nCement: ~${est.cementBags} Bags\nSand: ~${formatIndianNumber(est.sandCft)} CFT\nAggregate: ~${formatIndianNumber(est.aggregateCft)} CFT\nSteel: ~${formatIndianNumber(est.steelKg)} kg\n\n⚠️ Verify slab thickness by structural design.\n\n${disc}`,
        language: lang,
        conversation: conversation(),
        producedEstimate: true,
      };
    }
    session.pendingIntent = isRoof ? "roof" : "foundation";
    return {
      reply: lang === "Hindi"
        ? `❓ कृपया अपने घर का area बताएं (जैसे 40×35) ताकि मैं ${isRoof ? "छत" : "नींव"} का अनुमान निकाल सकूं।`
        : `❓ Please provide your house area (e.g. 40×35) so I can estimate the ${isRoof ? "roof" : "foundation"}.`,
      language: lang,
      conversation: conversation(),
      producedEstimate: false,
    };
  }

  // -------- General "what material" stage --------
  if (inList(trimmed, WHAT_MATERIAL_MARKERS)) {
    const stage = findStage(trimmed);
    if (stage) {
      session.lastTopic = stage.id;
      return { reply: whatMaterialStageReply(stage, lang), language: lang, conversation: conversation(), producedEstimate: false };
    }
  }

  // -------- Plaster --------
  if (inList(trimmed, PLASTER_KEYWORDS)) {
    const area = getTotalArea(session) ?? (session.dimensions ? session.dimensions.area : null);
    const dimsHere = parseDimensions(trimmed);
    const useArea = dimsHere ? dimsHere.area : area;
    if (useArea) {
      const p = calculatePlaster(useArea, 0.5, [1, 6]);
      const disc = lang === "Hindi" ? PRELIMINARY_DISCLAIMER_HINDI : PRELIMINARY_DISCLAIMER_ENGLISH;
      return {
        reply: lang === "Hindi"
          ? `🧹 ${formatIndianNumber(useArea)} sq.ft. के लिए अनुमानित plaster (0.5 inch example):\n\nCement: ~${p.cementBags} Bags\nSand: ~${formatIndianNumber(p.sandCft)} CFT\n\n⚠️ ${disc}`
          : `🧹 Approx plaster for ${formatIndianNumber(useArea)} sq.ft. (0.5 inch example):\n\nCement: ~${p.cementBags} Bags\nSand: ~${formatIndianNumber(p.sandCft)} CFT\n\n⚠️ ${disc}`,
        language: lang,
        conversation: conversation(),
        producedEstimate: true,
      };
    }
    session.pendingIntent = "plaster";
    return {
      reply: lang === "Hindi"
        ? "❓ कृपया अपने घर का area और plaster thickness बताएं ताकि अनुमान निकाल सकूं।"
        : "❓ Please provide your wall area and plaster thickness so I can estimate.",
      language: lang,
      conversation: conversation(),
      producedEstimate: false,
    };
  }

  // -------- Full estimate request ("pura estimate", "sab batao") --------
  if (/(pura estimate|full estimate|sab batao|sab bata do|पूरा estimate|सब बताओ|complete estimate|all estimate)/.test(lower)) {
    if (session.dimensions) {
      return {
        reply: buildFullEstimate(session, lang),
        language: lang,
        conversation: conversation(),
        producedEstimate: true,
      };
    }
  }

  // -------- If pending intent and user provides dimensions, resolve --------
  if (session.pendingIntent) {
    const dimsHere = parseDimensions(trimmed);
    if (dimsHere) {
      session.dimensions = dimsHere;
      const pending = session.pendingIntent;
      session.pendingIntent = null;
      return resolvePendingIntent(session, pending, lang);
    }
    const floors = extractFloors(trimmed, lang);
    if (floors !== null) session.floors = floors;
    const quality = extractQuality(trimmed, lang);
    if (quality) session.quality = quality;
    if (session.dimensions) {
      const pending = session.pendingIntent;
      session.pendingIntent = null;
      return resolvePendingIntent(session, pending, lang);
    }
  }

  // -------- Main size → floors → quality flow --------
  // 1) Size — also capture floors & quality if provided in the same message.
  if (!session.dimensions) {
    const dims = parseDimensions(trimmed);
    if (dims) {
      session.dimensions = dims;
      const floorsHere = extractFloors(trimmed, lang);
      const qualityHere = extractQuality(trimmed, lang);
      if (floorsHere !== null) session.floors = floorsHere;
      if (qualityHere) session.quality = qualityHere;
      if (session.floors !== null && session.quality !== null) {
        return {
          reply: `${lang === "Hindi"
            ? `बहुत अच्छा 👍 मैं आपके घर (${dims.length}×${dims.width} फीट, ${session.floors}-floor, ${session.quality}) के लिए rough estimate तैयार कर सकता हूँ।`
            : `Great 👍 I can prepare a rough estimate for your ${dims.length}x${dims.width} ft, ${session.floors}-floor, ${session.quality} home.`}\n\n${offerMaterialsMenu(lang)}`,
          language: lang,
          conversation: conversation(),
          producedEstimate: false,
        };
      }
      if (session.floors !== null) {
        return {
          reply: `${lang === "Hindi"
            ? `बहुत अच्छा 👍 आपका ${dims.length}×${dims.width} फीट, ${session.floors}-floor घर लगभग ${formatIndianNumber(dims.area * session.floors)} sq.ft. built-up area का होगा।`
            : `Great 👍 Your ${dims.length}x${dims.width} ft, ${session.floors}-floor home will be about ${formatIndianNumber(dims.area * session.floors)} sq.ft. built-up area.`}\n\n${lang === "Hindi" ? ASK_QUALITY_HINDI : ASK_QUALITY_ENGLISH}`,
          language: lang,
          conversation: conversation(),
          producedEstimate: false,
        };
      }
      return {
        reply: `${lang === "Hindi"
          ? `बहुत अच्छा 👍 आपके ${dims.length}×${dims.width} फीट घर का area लगभग ${formatIndianNumber(dims.area)} sq.ft. है।`
          : `Great 👍 Your ${dims.length}x${dims.width} ft home has an area of about ${formatIndianNumber(dims.area)} sq.ft.`}\n\n${lang === "Hindi" ? ASK_FLOORS_HINDI : ASK_FLOORS_ENGLISH}`,
        language: lang,
        conversation: conversation(),
        producedEstimate: false,
      };
    }
    return {
      reply: lang === "Hindi" ? INVALID_SIZE_HINDI : INVALID_SIZE_ENGLISH,
      language: lang,
      conversation: conversation(),
      producedEstimate: false,
    };
  }

  // 2) Floors
  if (!session.floors) {
    const floors = extractFloors(trimmed, lang);
    if (floors !== null) {
      session.floors = floors;
      return {
        reply: `${lang === "Hindi"
          ? `बहुत अच्छा 👍 तो कुल built-up area लगभग ${formatIndianNumber(session.dimensions.area * floors)} sq.ft. माना जा सकता है।`
          : `Great 👍 So the total built-up area is about ${formatIndianNumber(session.dimensions.area * floors)} sq.ft.`}\n\n${lang === "Hindi" ? ASK_QUALITY_HINDI : ASK_QUALITY_ENGLISH}`,
        language: lang,
        conversation: conversation(),
        producedEstimate: false,
      };
    }
    const dims = parseDimensions(trimmed);
    if (dims) {
      session.dimensions = dims;
      return {
        reply: `${dimSizeReply(dims, lang)}\n\n${lang === "Hindi" ? ASK_FLOORS_HINDI : ASK_FLOORS_ENGLISH}`,
        language: lang,
        conversation: conversation(),
        producedEstimate: false,
      };
    }
    return {
      reply: lang === "Hindi" ? INVALID_FLOOR_HINDI : INVALID_FLOOR_ENGLISH,
      language: lang,
      conversation: conversation(),
      producedEstimate: false,
    };
  }

  // 3) Quality
  if (!session.quality) {
    const quality = extractQuality(trimmed, lang);
    if (quality) {
      session.quality = quality;
      return {
        reply: `${lang === "Hindi"
          ? `समझ गया 👍 मैं आपके लगभग ${formatIndianNumber(getTotalArea(session) ?? session.dimensions.area)} sq.ft. के ${session.floors}-floor ${quality} quality घर का rough material estimate तैयार कर सकता हूँ।`
          : `Got it 👍 I can now prepare a rough material estimate for your ${formatIndianNumber(getTotalArea(session) ?? session.dimensions.area)} sq.ft. ${session.floors}-floor ${quality} quality home.`}\n\n${offerMaterialsMenu(lang)}`,
        language: lang,
        conversation: conversation(),
        producedEstimate: false,
      };
    }
    if (inList(lower, [...YES_HINDI, ...YES_ENGLISH])) {
      session.quality = "normal";
      return {
        reply: `${lang === "Hindi"
          ? `समझ गया 👍 मैं आपके लगभग ${formatIndianNumber(getTotalArea(session) ?? session.dimensions.area)} sq.ft. घर का rough material estimate तैयार कर सकता हूँ।`
          : `Got it 👍 I can prepare a rough material estimate for your ${formatIndianNumber(getTotalArea(session) ?? session.dimensions.area)} sq.ft. home.`}\n\n${offerMaterialsMenu(lang)}`,
        language: lang,
        conversation: conversation(),
        producedEstimate: false,
      };
    }
    return {
      reply: lang === "Hindi" ? INVALID_QUALITY_HINDI : INVALID_QUALITY_ENGLISH,
      language: lang,
      conversation: conversation(),
      producedEstimate: false,
    };
  }

  // -------- Everything known: new size resets --------
  const newDims = parseDimensions(trimmed);
  if (newDims) {
    session.dimensions = newDims;
    session.floors = null;
    session.quality = null;
    return {
      reply: `${dimSizeReply(newDims, lang)}\n\n${lang === "Hindi" ? ASK_FLOORS_HINDI : ASK_FLOORS_ENGLISH}`,
      language: lang,
      conversation: conversation(),
      producedEstimate: false,
    };
  }

  // -------- Fallback: ask what they'd like next --------
  if (session.dimensions && session.floors && session.quality) {
    return {
      reply: `${lang === "Hindi"
        ? `ठीक है 👍 आप किसकी जानकारी चाहते हैं?`
        : `Okay 👍 What would you like to know?`}\n\n${offerMaterialsMenu(lang)}`,
      language: lang,
      conversation: conversation(),
      producedEstimate: false,
    };
  }

  return {
    reply: lang === "Hindi" ? UNKNOWN_HINDI : UNKNOWN_ENGLISH,
    language: lang,
    conversation: conversation(),
    producedEstimate: false,
  };
}

function resolvePendingIntent(session: SessionData, intent: string, lang: AssistantLanguage): AssistantResult {
  const totalArea = getTotalArea(session) ?? (session.dimensions ? session.dimensions.area : null);
  const area = totalArea ?? 0;
  const conversation = () => ({
    length: session.dimensions?.length ?? null,
    width: session.dimensions?.width ?? null,
    area: session.dimensions?.area ?? null,
    floors: session.floors,
    totalArea: getTotalArea(session),
    quality: session.quality,
    location: session.location,
  });
  switch (intent) {
    case "cement":
    case "steel":
    case "bricks":
    case "sand":
    case "aggregate":
      return { reply: materialQuantityReply(intent, area, lang), language: lang, conversation: conversation(), producedEstimate: true };
    case "roof":
    case "foundation": {
      const thickness = 5;
      const vol = calculateRoofConcrete(Math.sqrt(area), Math.sqrt(area), thickness);
      const est = estimateRoofMaterials(vol.volumeCft);
      const disc = lang === "Hindi" ? STRUCTURAL_DISCLAIMER_HINDI : STRUCTURAL_DISCLAIMER_ENGLISH;
      return {
        reply: lang === "Hindi"
          ? `${intent === "roof" ? "🏗️ छत" : "निर्माण"} के लिए (उदाहरण 5 inch मोटाई):\n\nConcrete volume: ~${formatIndianNumber(vol.volumeCft)} CFT\nCement: ~${est.cementBags} Bags\nSand: ~${formatIndianNumber(est.sandCft)} CFT\nAggregate: ~${formatIndianNumber(est.aggregateCft)} CFT\nSteel: ~${formatIndianNumber(est.steelKg)} kg\n\n⚠️ Slab thickness structural design से verify करें।\n\n${disc}`
          : `${intent === "roof" ? "🏗️ Roof" : "Construction"} (example 5 inch thickness):\n\nConcrete volume: ~${formatIndianNumber(vol.volumeCft)} CFT\nCement: ~${est.cementBags} Bags\nSand: ~${formatIndianNumber(est.sandCft)} CFT\nAggregate: ~${formatIndianNumber(est.aggregateCft)} CFT\nSteel: ~${formatIndianNumber(est.steelKg)} kg\n\n⚠️ Verify slab thickness by structural design.\n\n${disc}`,
        language: lang,
        conversation: conversation(),
        producedEstimate: true,
      };
    }
    case "plaster": {
      const p = calculatePlaster(area, 0.5, [1, 6]);
      const disc = lang === "Hindi" ? PRELIMINARY_DISCLAIMER_HINDI : PRELIMINARY_DISCLAIMER_ENGLISH;
      return {
        reply: lang === "Hindi"
          ? `🧹 ${formatIndianNumber(area)} sq.ft. के लिए अनुमानित plaster (0.5 inch example):\n\nCement: ~${p.cementBags} Bags\nSand: ~${formatIndianNumber(p.sandCft)} CFT\n\n⚠️ ${disc}`
          : `🧹 Approx plaster for ${formatIndianNumber(area)} sq.ft. (0.5 inch example):\n\nCement: ~${p.cementBags} Bags\nSand: ~${formatIndianNumber(p.sandCft)} CFT\n\n⚠️ ${disc}`,
        language: lang,
        conversation: conversation(),
        producedEstimate: true,
      };
    }
    default:
      return { reply: lang === "Hindi" ? UNKNOWN_HINDI : UNKNOWN_ENGLISH, language: lang, conversation: conversation(), producedEstimate: false };
  }
}
