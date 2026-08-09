/**
 * PART 2 — Consultation handlers (Phases 11-30).
 *
 * This module contains the "brain" for the new consultation abilities:
 *  - Consultation mode (roof RCC/sheet, foundation, boundary wall, rooms)
 *  - Room-based estimation
 *  - Material knowledge lookups
 *  - Why-questions
 *  - Benefit/loss & comparisons
 *  - Location-aware & cost breakdown
 *  - Stage guide & material checklist
 *  - Incomplete-question handling & smart corrections
 *  - Product lookups & data confidence
 *
 * Everything is rule-based and local. No external AI. Returns either a
 * Part2Result (reply + optional suggestions) or null when not applicable,
 * so the caller can fall back to the existing Part 1 engine.
 */
import { SessionData, AssistantLanguage, getTotalArea } from "./conversation_memory.js";
import { formatIndianNumber, estimateAreaFromRooms, RoomComposition } from "./calculator.js";
import { findMaterialKnowledge } from "./material_knowledge.js";
import { findWhyRule } from "./why_questions.js";
import { findComparison, COMPARISONS } from "./comparisons.js";
import { buildChecklistReply } from "./material_checklist.js";
import { costBreakdown } from "./cost_breakdown.js";
import { findProduct } from "./product_data.js";
import {
  WHY_MARKERS,
  COMPARISON_MARKERS,
  BENEFIT_MARKERS,
  LOSS_MARKERS,
  CHECKLIST_MARKERS,
  STAGE_GUIDE_MARKERS,
  INCOMPLETE_WORDS,
  INTENT_BUILD_HOUSE,
  INTENT_RENOVATE,
  INTENT_CONSTRUCT_ROOF,
  INTENT_CONSTRUCT_FOUNDATION,
  INTENT_BOUNDARY_WALL,
  INTENT_MAKE_ROOM,
  INTENT_MAKE_KITCHEN,
  INTENT_MAKE_BATHROOM,
  INTENT_MAKE_STAIRCASE,
  INTENT_RCC_SLAB,
  INTENT_REPAIR_ROOF,
  INTENT_WATERPROOFING,
  INTENT_PLASTERING,
  INTENT_FLOORING,
  INTENT_PAINTING,
  INTENT_BRICKWORK,
  INTENT_CONCRETE_WORK,
  INTENT_ELECTRICAL,
  INTENT_PLUMBING,
  INTENT_MATERIAL_SELECTION,
  INTENT_CEMENT_SELECTION,
  INTENT_STEEL_SELECTION,
INTENT_COST_ESTIMATION,
  INTENT_QUANTITY_ESTIMATION,
} from "./part2_keywords.js";
import { constructionSequenceReply } from "./conversation_data.js";

export interface Part2Result {
  reply: string;
  suggestions?: string[];
  producedEstimate?: boolean;
}

const PRELIMINARY_DISCLAIMER_HINDI =
  "यह केवल अनुमान है। वास्तविक मात्रा structural design, soil condition, slab design, column spacing, wall thickness, local material और engineer के design के अनुसार बदल सकती है।";
const PRELIMINARY_DISCLAIMER_ENGLISH =
  "This is only a preliminary estimate. Actual quantities may vary based on structural design, soil condition, slab design, column spacing, wall thickness, local materials and the engineer's design.";

function matchAny(text: string, list: string[]): boolean {
  const lower = text.toLowerCase();
  return list.some((w) => lower.includes(w.toLowerCase()));
}

function consultIntentLabel(intent: string, lang: AssistantLanguage): string {
  const map: Record<string, string> = {
    build_new_house: lang === "Hindi" ? "नया घर बनाना" : "building a new house",
    renovate: lang === "Hindi" ? "रेनोवेशन / नया कराना" : "renovation",
    roof: lang === "Hindi" ? "छत बनाना" : "roof construction",
    foundation: lang === "Hindi" ? "नींव बनाना" : "foundation construction",
    boundary_wall: lang === "Hindi" ? "बाउंड्री वॉल" : "boundary wall",
    room: lang === "Hindi" ? "कमरा बनाना" : "room construction",
    kitchen: lang === "Hindi" ? "रसोई बनाना" : "kitchen construction",
    bathroom: lang === "Hindi" ? "बाथरूम बनाना" : "bathroom construction",
    staircase: lang === "Hindi" ? "सीढ़ी बनाना" : "staircase construction",
    rcc_slab: lang === "Hindi" ? "RCC स्लैब" : "RCC slab",
    repair_roof: lang === "Hindi" ? "छत मरम्मत" : "roof repair",
    waterproofing: lang === "Hindi" ? "वॉटरप्रूफिंग" : "waterproofing",
    plastering: lang === "Hindi" ? "प्लास्टर" : "plastering",
    flooring: lang === "Hindi" ? "फर्श" : "flooring",
    painting: lang === "Hindi" ? "पेंटिंग" : "painting",
    brickwork: lang === "Hindi" ? "चिनाई" : "brickwork",
    concrete_work: lang === "Hindi" ? "कंक्रीट का काम" : "concrete work",
    electrical: lang === "Hindi" ? "बिजली का काम" : "electrical work",
    plumbing: lang === "Hindi" ? "प्लंबिंग" : "plumbing",
    material_selection: lang === "Hindi" ? "material चयन" : "material selection",
    cement_selection: lang === "Hindi" ? "सीमेंट चयन" : "cement selection",
    steel_selection: lang === "Hindi" ? "सरिया चयन" : "steel selection",
    cost_estimation: lang === "Hindi" ? "लागत अनुमान" : "cost estimation",
    quantity_estimation: lang === "Hindi" ? "मात्रा अनुमान" : "quantity estimation",
  };
  return map[intent] ?? intent;
}

function detectConsultIntent(text: string): string | null {
  const lower = text.toLowerCase();
  if (matchAny(lower, INTENT_BUILD_HOUSE)) return "build_new_house";
  if (matchAny(lower, INTENT_RENOVATE)) return "renovate";
  if (matchAny(lower, INTENT_CONSTRUCT_ROOF)) return "roof";
  if (matchAny(lower, INTENT_CONSTRUCT_FOUNDATION)) return "foundation";
  if (matchAny(lower, INTENT_BOUNDARY_WALL)) return "boundary_wall";
  if (matchAny(lower, INTENT_MAKE_ROOM)) return "room";
  if (matchAny(lower, INTENT_MAKE_KITCHEN)) return "kitchen";
  if (matchAny(lower, INTENT_MAKE_BATHROOM)) return "bathroom";
  if (matchAny(lower, INTENT_MAKE_STAIRCASE)) return "staircase";
  if (matchAny(lower, INTENT_RCC_SLAB)) return "rcc_slab";
  if (matchAny(lower, INTENT_REPAIR_ROOF)) return "repair_roof";
  if (matchAny(lower, INTENT_WATERPROOFING)) return "waterproofing";
  if (matchAny(lower, INTENT_PLASTERING)) return "plastering";
  if (matchAny(lower, INTENT_FLOORING)) return "flooring";
  if (matchAny(lower, INTENT_PAINTING)) return "painting";
  if (matchAny(lower, INTENT_BRICKWORK)) return "brickwork";
  if (matchAny(lower, INTENT_CONCRETE_WORK)) return "concrete_work";
  if (matchAny(lower, INTENT_ELECTRICAL)) return "electrical";
  if (matchAny(lower, INTENT_PLUMBING)) return "plumbing";
  if (matchAny(lower, INTENT_MATERIAL_SELECTION)) return "material_selection";
  if (matchAny(lower, INTENT_CEMENT_SELECTION)) return "cement_selection";
if (matchAny(lower, INTENT_STEEL_SELECTION)) return "steel_selection";
  if (matchAny(lower, INTENT_COST_ESTIMATION)) return "cost_estimation";
  // Quantity estimation uses a nested map (material id -> keywords).
  if (Object.values(INTENT_QUANTITY_ESTIMATION).some((kws) => kws.some((k) => lower.includes(k.toLowerCase())))) {
    return "quantity_estimation";
  }
  return null;
}

function detectRoomComposition(text: string): RoomComposition | null {
  const lower = text.toLowerCase();
  const hasRoomWord = /(room|rooms|kamra|kamre|कमरा|कमरे|bedroom|bedrooms)/.test(lower);
  if (!hasRoomWord) return null;

  const comp: RoomComposition = {};
  const numBefore = (pat: RegExp): number | null => {
    const m = pat.exec(lower);
    if (m) {
      const n = Number(m[1]);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    return null;
  };

  const bedrooms = numBefore(/(\d+)\s*(?:bedroom|bedrooms|kamra|कमरा|room|rooms)/);
  const kitchens = numBefore(/(\d+)\s*(?:kitchen|kitchens|रसोई)/);
  const bathrooms = numBefore(/(\d+)\s*(?:bathroom|bathrooms|washroom|बाथरूम)/);
  const halls = numBefore(/(\d+)\s*(?:hall|halls|drawing|living)/);
  const stores = numBefore(/(\d+)\s*(?:store|stores|storeroom|गोदाम)/);
  const balconies = numBefore(/(\d+)\s*(?:balcony|balconies|बालकनी)/);
  const verandas = numBefore(/(\d+)\s*(?:veranda|verandah|बरामदा)/);
  const staircases = numBefore(/(\d+)\s*(?:staircase|stair|stairs|सीढ़ी)/);

  if (bedrooms !== null || kitchens !== null || bathrooms !== null || halls !== null) {
    if (bedrooms) comp.bedrooms = bedrooms;
    if (kitchens) comp.kitchens = kitchens;
    if (bathrooms) comp.bathrooms = bathrooms;
    if (halls) comp.halls = halls;
    if (stores) comp.stores = stores;
    if (balconies) comp.balconies = balconies;
    if (verandas) comp.verandas = verandas;
    if (staircases) comp.staircases = staircases;
    return comp;
  }
  return null;
}

function roomBasedReply(session: SessionData, comp: RoomComposition, lang: AssistantLanguage): Part2Result {
  const area = estimateAreaFromRooms(comp);
  session.roomBased = true;
  session.bedrooms = comp.bedrooms ?? null;
  session.halls = comp.halls ?? null;
  session.rooms = comp.bedrooms ?? null;
  session.kitchens = comp.kitchens ?? null;
  session.bathrooms = comp.bathrooms ?? null;
  session.stores = comp.stores ?? null;
  session.balconies = comp.balconies ?? null;
  session.verandas = comp.verandas ?? null;
  session.staircases = comp.staircases ?? null;
  if (area > 0) {
    const side = Math.sqrt(area);
    session.dimensions = { length: Math.round(side), width: Math.round(side), area, raw: `${Math.round(side)}x${Math.round(side)}` };
  }
  const askFloors = lang === "Hindi"
    ? "घर कितने floor का बनाना है?\nExample:\n1 floor\n2 floor\n3 floor"
    : "How many floors do you want?\nExample:\n1 floor\n2 floor\n3 floor";
  return {
    reply: lang === "Hindi"
      ? `बहुत अच्छा 👍 ${area > 0 ? `आपके rooms के आधार पर लगभग ${formatIndianNumber(area)} sq.ft. का area माना जा सकता है।` : "आपके rooms के आधार पर area का अनुमान लगाया जा सकता है।"}\n\n${askFloors}`
      : `Great 👍 ${area > 0 ? `Based on your rooms, I estimate about ${formatIndianNumber(area)} sq.ft.` : "Based on your rooms, I can estimate the area."}\n\n${askFloors}`,
  };
}

function materialKnowledgeReply(items: ReturnType<typeof findMaterialKnowledge>, lang: AssistantLanguage): string {
  const disc = lang === "Hindi" ? PRELIMINARY_DISCLAIMER_HINDI : PRELIMINARY_DISCLAIMER_ENGLISH;
  const lines: string[] = [];
  for (const item of items.slice(0, 2)) {
    if (lang === "Hindi") {
      lines.push(`🧱 ${item.nameHi}`);
      lines.push(``);
      lines.push(`✅ फायदे:`);
      item.benefitsHi.forEach((b) => lines.push(`• ${b}`));
      lines.push(``);
      lines.push(`🛠️ उपयोग:`);
      item.usageHi.forEach((u) => lines.push(`• ${u}`));
    } else {
      lines.push(`🧱 ${item.nameEn}`);
      lines.push(``);
      lines.push(`✅ Benefits:`);
      item.benefitsEn.forEach((b) => lines.push(`• ${b}`));
      lines.push(``);
      lines.push(`🛠️ Usage:`);
      item.usageEn.forEach((u) => lines.push(`• ${u}`));
    }
    lines.push(``);
  }
  lines.push(`⚠️ ${disc}`);
  return lines.join("\n");
}

function comparisonReply(comp: (typeof COMPARISONS)[number], lang: AssistantLanguage): string {
  const lines: string[] = [];
  if (lang === "Hindi") {
    lines.push(`⚖️ ${comp.a.nameHi} vs ${comp.b.nameHi}`);
    lines.push(``);
    lines.push(`${comp.a.nameHi}:`);
    comp.a.pointsHi.forEach((p) => lines.push(`• ${p}`));
    lines.push(``);
    lines.push(`${comp.b.nameHi}:`);
    comp.b.pointsHi.forEach((p) => lines.push(`• ${p}`));
    if (comp.followupHi) {
      lines.push(``);
      lines.push(`❓ ${comp.followupHi}`);
    }
  } else {
    lines.push(`⚖️ ${comp.a.nameEn} vs ${comp.b.nameEn}`);
    lines.push(``);
    lines.push(`${comp.a.nameEn}:`);
    comp.a.pointsEn.forEach((p) => lines.push(`• ${p}`));
    lines.push(``);
    lines.push(`${comp.b.nameEn}:`);
    comp.b.pointsEn.forEach((p) => lines.push(`• ${p}`));
    if (comp.followupEn) {
      lines.push(``);
      lines.push(`❓ ${comp.followupEn}`);
    }
  }
  return lines.join("\n");
}

function productReply(product: ReturnType<typeof findProduct>, lang: AssistantLanguage): string {
  if (!product) return "";
  const lines: string[] = [];
  if (lang === "Hindi") {
    lines.push(`🏗️ ${product.company} — ${product.product}`);
    lines.push(``);
    lines.push(`✅ फायदे:`);
    product.benefitsHi.forEach((b) => lines.push(`• ${b}`));
    if (product.suitableForHi.length) {
      lines.push(``);
      lines.push(`✔️ इसके लिए उपयुक्त:`);
      product.suitableForHi.forEach((s) => lines.push(`• ${s}`));
    }
    if (product.notIdealForHi.length) {
      lines.push(``);
      lines.push(`⚠️ इसके लिए उपयुक्त नहीं:`);
      product.notIdealForHi.forEach((s) => lines.push(`• ${s}`));
    }
    lines.push(``);
    lines.push(`💡 नोट:`);
    product.notesHi.forEach((n) => lines.push(`• ${n}`));
  } else {
    lines.push(`🏗️ ${product.company} — ${product.product}`);
    lines.push(``);
    lines.push(`✅ Benefits:`);
    product.benefitsEn.forEach((b) => lines.push(`• ${b}`));
    if (product.suitableForEn.length) {
      lines.push(``);
      lines.push(`✔️ Suitable for:`);
      product.suitableForEn.forEach((s) => lines.push(`• ${s}`));
    }
    if (product.notIdealForEn.length) {
      lines.push(``);
      lines.push(`⚠️ Not ideal for:`);
      product.notIdealForEn.forEach((s) => lines.push(`• ${s}`));
    }
    lines.push(``);
    lines.push(`💡 Notes:`);
    product.notesEn.forEach((n) => lines.push(`• ${n}`));
  }
  return lines.join("\n");
}

function costBreakdownReply(session: SessionData, lang: AssistantLanguage): string {
  const area = getTotalArea(session) ?? (session.dimensions ? session.dimensions.area : 0);
  if (area <= 0) {
    return lang === "Hindi"
      ? "❓ कृपया अपने घर का size बताएं (जैसे 40×35) ताकि मैं cost breakdown निकाल सकूं।"
      : "❓ Please provide your house size (e.g. 40×35) so I can give a cost breakdown.";
  }
  const quality = session.quality ?? "normal";
  const bd = costBreakdown(area, quality);
  const disc = lang === "Hindi" ? PRELIMINARY_DISCLAIMER_HINDI : PRELIMINARY_DISCLAIMER_ENGLISH;
  const lines: string[] = [];
  if (lang === "Hindi") {
    lines.push(`💰 ${formatIndianNumber(area)} sq.ft. का अनुमानित cost breakdown (${quality}):`);
    lines.push(``);
    lines.push(`कुल: ₹${formatIndianNumber(bd.totalMin)}-₹${formatIndianNumber(bd.totalMax)}`);
    lines.push(``);
    for (const c of bd.categories) {
      lines.push(`• ${c.category.nameHi}: ₹${formatIndianNumber(c.min)}-₹${formatIndianNumber(c.max)} (${c.category.percent}%)`);
    }
    lines.push(``);
    lines.push(`⚠️ यह configurable अनुमान है, live market price नहीं।`);
  } else {
    lines.push(`💰 Approx cost breakdown for ${formatIndianNumber(area)} sq.ft. (${quality}):`);
    lines.push(``);
    lines.push(`Total: ₹${formatIndianNumber(bd.totalMin)}-₹${formatIndianNumber(bd.totalMax)}`);
    lines.push(``);
    for (const c of bd.categories) {
      lines.push(`• ${c.category.nameEn}: ₹${formatIndianNumber(c.min)}-₹${formatIndianNumber(c.max)} (${c.category.percent}%)`);
    }
    lines.push(``);
    lines.push(`⚠️ This is a configurable estimate, not a live market price.`);
  }
  lines.push(`⚠️ ${disc}`);
  return lines.join("\n");
}

function incompleteReply(lang: AssistantLanguage): string {
  return lang === "Hindi"
    ? "आपका सवाल अधूरा लग रहा है 😊 कृपया पूरा बताएं, जैसे “कितना cement चाहिए”, “घर का size”, या “कौन सा material”।"
    : "Your question seems incomplete 😊 Could you tell me more, e.g. “how much cement”, “house size”, or “which material”.";
}

function followupSuggestions(lastTopic: string | null): string[] {
  const s: string[] = [];
  if (lastTopic !== "cement") s.push("🧱 Cement estimate");
  if (lastTopic !== "steel") s.push("🔩 Steel estimate");
  if (lastTopic !== "bricks") s.push("🧱 Bricks estimate");
  s.push("💰 Cost breakdown");
  s.push("📋 Material checklist");
  return s;
}

function isComparisonIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return COMPARISON_MARKERS.some((m) => lower.includes(m.toLowerCase()));
}

function isWhyIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return WHY_MARKERS.some((m) => lower.includes(m.toLowerCase()));
}

function isIncomplete(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (lower.length > 2 && lower.length <= 12 && INCOMPLETE_WORDS.includes(lower)) return true;
  if (/^(cement|roof|steel|bathroom|foundation|waterproofing|brick|sand|paint|tiles|cost|price|kitchen)\?*$/i.test(lower)) return true;
  return false;
}

/**
 * Main Part 2 handler. Returns a Part2Result when the message matches a
 * Part 2 ability, otherwise null so the Part 1 engine can handle it.
 */
export function handlePart2(session: SessionData, message: string): Part2Result | null {
  const lang = session.language;
  const lower = message.toLowerCase();
  const trimmed = message.trim();

  // -------- Stage guide / construction process --------
  if (matchAny(trimmed, STAGE_GUIDE_MARKERS)) {
    return { reply: constructionSequenceReply(lang === "Hindi" ? "Hindi" : "English") };
  }

  // -------- Material checklist --------
  if (matchAny(trimmed, CHECKLIST_MARKERS)) {
    return { reply: buildChecklistReply(lang === "Hindi" ? "Hindi" : "English") };
  }

  // -------- Why questions --------
  if (isWhyIntent(trimmed)) {
    const why = findWhyRule(trimmed);
    if (why) {
      return { reply: lang === "Hindi" ? why.replyHi : why.replyEn };
    }
  }

// -------- Comparison --------
  if (isComparisonIntent(trimmed)) {
    let comp = findComparison(trimmed);
    // Fallback: "RCC roof or sheet which is better?" — map to the rcc_vs_sheet comparison.
    if (!comp && /(rcc|slab|छत)/.test(lower) && /(sheet|चादर)/.test(lower)) {
      comp = COMPARISONS.find((c) => c.id === "rcc_vs_sheet") ?? null;
    }
    // Fallback: "OPC or PPC cement" style.
    if (!comp && /(opc|ppc)/.test(lower)) {
      comp = COMPARISONS.find((c) => c.id === "opc_vs_ppc") ?? null;
    }
    if (!comp && /(m ?sand|msand|एम सैंड)/.test(lower) && /(river|रेत)/.test(lower)) {
      comp = COMPARISONS.find((c) => c.id === "msand_vs_river") ?? null;
    }
    if (comp) {
      return { reply: comparisonReply(comp, lang) };
    }
  }

// -------- Benefit/loss questions --------
  if (matchAny(trimmed, [...BENEFIT_MARKERS, ...LOSS_MARKERS])) {
    const items = findMaterialKnowledge(trimmed);
    if (items.length > 0) {
      return { reply: materialKnowledgeReply(items, lang) };
    }
  }

  // -------- Material knowledge (benefits/usage) — only on explicit queries --------
  // Only trigger when the user explicitly asks about a material's use/selection
  // (e.g. "roof insulation kya hai", "which cement", "OPC kya hai"), NOT for
  // bare material words, quantity, or "what materials" questions that Part 1
  // already handles better.
  const isExplicitKnowledgeQuery =
    matchAny(trimmed, BENEFIT_MARKERS) ||
    matchAny(trimmed, LOSS_MARKERS) ||
    /(kya hai|kya hota|kya use|used for|use hota|kis liye|ke liye|selection|choose|choose|kis kaam|kaise chune|which |konsa |कौन सा|किसके लिए|किसलिए|क्या होता|क्या काम)/.test(lower);
  const isQuantityQuery = /(kitna|kitni|how much|how many|कितना|कितनी|कितने|quantity|lagega|लगेगा|chahiye|चाहिए|kya chahiye|kya lagega)/.test(lower);
  const isWhatMaterials = matchAny(trimmed, [
    "kya kya chahiye", "kya kya lagega", "kya chahiye", "kya lagega", "what material",
    "me kya kya", "ke liye kya", "के लिए क्या", "क्या क्या चाहिए", "क्या क्या लगेगा",
  ]);
  const materialHits = findMaterialKnowledge(trimmed);
  if (materialHits.length > 0 && isExplicitKnowledgeQuery && !isQuantityQuery && !isWhatMaterials) {
    return { reply: materialKnowledgeReply(materialHits, lang), suggestions: followupSuggestions(session.lastTopic) };
  }

  // -------- Product lookup (Phase 27) --------
  const product = findProduct(trimmed);
  if (product && /(batao|bata|ke bare|ke baare|about|info|information|jankari|बारे|f2r|concreto|vistas|product|explain|maloom|kya hai)/.test(lower)) {
    session.lastProduct = product.id;
    return {
      reply: productReply(product, lang),
      suggestions: [`⚖️ ${product.company} vs another brand`, "💰 Cost breakdown"],
    };
  }

  // -------- Cost breakdown --------
  if (/cost breakdown|cost detail|breakdown|लागत breakdown|cost ka detail|kharcha ka detail|pura cost/.test(lower)) {
    return { reply: costBreakdownReply(session, lang), producedEstimate: true };
  }

// -------- Incomplete question --------
  if (isIncomplete(trimmed)) {
    // If the user just typed a material word but we already know the area,
    // let Part 1 handle the quantity instead of treating it as incomplete.
    const knownArea = getTotalArea(session) ?? (session.dimensions ? session.dimensions.area : null);
    const isBareMaterial = /^(cement|roof|steel|bathroom|foundation|waterproofing|brick|sand|paint|tiles|cost|price|kitchen)\?*$/i.test(trimmed) ||
      /^(cement|सीमेंट|roof|छत|steel|सरिया|brick|ईंट|sand|रेत|paint|पेंट|tiles|टाइल|cost|कीमत)$/.test(trimmed);
    if (!(isBareMaterial && knownArea)) {
      return { reply: incompleteReply(lang) };
    }
  }

// -------- Room-based estimation --------
  if (!session.dimensions) {
    const comp = detectRoomComposition(trimmed);
    if (comp) {
      return roomBasedReply(session, comp, lang);
    }
  }

  // -------- Consultation intent (roof/foundation/boundary/room/etc.) --------
  // Guard: do NOT treat "what materials" or quantity queries as consult intents —
  // those are handled better by Part 1. Only fire on construction phrasing
  // ("banana", "bana", "banani", "dalna", "banane", "kaam", "banwana").
  const isConstructionRequest =
    /(banana|bana hai|banani|banane|banwana|banwa|dalna|daliye|kaam karwana|karwana|karana|banaoge|banti)/.test(lower) ||
    /(बनाना|बनानी|बनवाना|बनवानी|डालना|करना|कराना)/.test(lower);
  const isWhatMaterialsAsk =
    matchAny(trimmed, [
      "kya kya chahiye", "kya kya lagega", "kya chahiye", "kya lagega", "what material",
      "me kya kya", "ke liye kya", "के लिए क्या", "क्या क्या चाहिए", "क्या क्या लगेगा",
    ]);
  const isQuantityAsk = /(kitna|kitni|how much|how many|कितना|कितनी|कितने|quantity|lagega|लगेगा|chahiye|चाहिए)/.test(lower);

  const consultIntent = detectConsultIntent(trimmed);
  if (consultIntent && (isConstructionRequest || consultIntent === "boundary_wall")) {
    // Skip if it's a what-materials or quantity query (Part 1 handles them).
    if (!isWhatMaterialsAsk && !isQuantityAsk) {
      session.consultIntent = consultIntent;
      const label = consultIntentLabel(consultIntent, lang);

    // Roof type detail (RCC vs sheet)
    if (consultIntent === "roof" || consultIntent === "rcc_slab") {
      if (/(sheet|shutter|चादर|tin)/.test(lower) && /(rcc|slab|छत|roof)/.test(lower)) {
        session.roofTypeDetail = "sheet";
      } else if (/(rcc|slab|स्लैब|छत डाल)/.test(lower)) {
        session.roofTypeDetail = "rcc";
      }
    }

    // Boundary wall
    if (consultIntent === "boundary_wall") session.boundaryWall = true;

    // If they already gave a size, produce a tailored reply based on the intent.
    const area = getTotalArea(session) ?? (session.dimensions ? session.dimensions.area : null);

    if (consultIntent === "roof" || consultIntent === "rcc_slab") {
      if (session.roofTypeDetail === "sheet") {
        return {
          reply: lang === "Hindi"
            ? `🏠 आपने sheet roofing के बारे में पूछा है। Sheet roof lightweight और तेजी से install होता है, पर घर की permanent structure के लिए RCC slab अधिक उपयुक्त रहता है।\n\nCement, steel, waterproofing की मात्रा structural design और size पर निर्भर करती है।\n\n⚠️ ${PRELIMINARY_DISCLAIMER_HINDI}`
            : `🏠 You asked about sheet roofing. Sheet roof is lightweight and fast to install, but for a permanent structure RCC slab is more suitable.\n\nCement, steel and waterproofing quantities depend on the structural design and size.\n\n⚠️ ${PRELIMINARY_DISCLAIMER_ENGLISH}`,
        };
      }
      if (area) {
        return {
          reply: lang === "Hindi"
            ? `🏗️ ${formatIndianNumber(area)} sq.ft. के ${label} के लिए: Cement, Sand, Aggregate, TMT steel, Binding wire, Shuttering, Waterproofing और curing water लगते हैं।\n\nSlab thickness और reinforcement structural engineer verify करें।\n\n⚠️ ${PRELIMINARY_DISCLAIMER_HINDI}`
            : `🏗️ For ${formatIndianNumber(area)} sq.ft. ${label}: Cement, Sand, Aggregate, TMT steel, Binding wire, Shuttering, Waterproofing and curing water are needed.\n\nSlab thickness and reinforcement must be verified by a structural engineer.\n\n⚠️ ${PRELIMINARY_DISCLAIMER_ENGLISH}`,
          suggestions: followupSuggestions(session.lastTopic),
        };
      }
      return {
        reply: lang === "Hindi"
          ? `🏗️ ${label} के लिए मुझे घर का size बताएं (जैसे 40×35) ताकि material का rough estimate दे सकूं।\n\nSlab thickness और reinforcement structural engineer verify करें।`
          : `🏗️ For ${label}, please share the house size (e.g. 40×35) so I can give a rough material estimate.\n\nSlab thickness and reinforcement must be verified by a structural engineer.`,
      };
    }

    if (consultIntent === "foundation") {
      if (area) {
        return {
          reply: lang === "Hindi"
            ? `🏗️ ${formatIndianNumber(area)} sq.ft. के ${label} के लिए: Excavation, PCC bed, Reinforcement steel, Cement, Sand, Aggregate, Waterproofing/DPC और Backfilling लगते हैं।\n\nFoundation soil type, floors, load, footing type, column spacing और water table पर निर्भर करता है।\n\n⚠️ ${PRELIMINARY_DISCLAIMER_HINDI}`
            : `🏗️ For ${formatIndianNumber(area)} sq.ft. ${label}: Excavation, PCC bed, Reinforcement steel, Cement, Sand, Aggregate, Waterproofing/DPC and Backfilling are needed.\n\nFoundation depends on soil type, floors, load, footing type, column spacing and water table.\n\n⚠️ ${PRELIMINARY_DISCLAIMER_ENGLISH}`,
          suggestions: followupSuggestions(session.lastTopic),
        };
      }
      return {
        reply: lang === "Hindi"
          ? `🏗️ ${label} के लिए मुझे घर का size बताएं (जैसे 40×35) ताकि material का rough estimate दे सकूं।\n\nFoundation soil और structural design पर निर्भर करता है।`
          : `🏗️ For ${label}, please share the house size (e.g. 40×35) so I can give a rough material estimate.\n\nFoundation depends on soil and structural design.`,
      };
    }

    if (consultIntent === "boundary_wall") {
      return {
        reply: lang === "Hindi"
          ? `🏛️ बाउंड्री वॉल के लिए: Bricks/blocks, Cement, Sand, Steel (for pillars/columns) और flooring लगते हैं।\n\nबाउंड्री की लंबाई और ऊंचाई बताएं ताकि मैं rough estimate निकाल सकूं।`
          : `🏛️ For a boundary wall: Bricks/blocks, Cement, Sand, Steel (for pillars/columns) and a top coping are needed.\n\nPlease share the wall length and height so I can give a rough estimate.`,
      };
    }

    if (consultIntent === "kitchen" || consultIntent === "bathroom" || consultIntent === "room" || consultIntent === "staircase") {
      return {
        reply: lang === "Hindi"
          ? `🏠 ${label} के लिए: tiles, waterproofing, plumbing, electrical और finishing material लगते हैं।\n\nइस काम का size/dimensions बताएं ताकि मैं area और material का rough estimate निकाल सकूं।`
          : `🏠 For ${label}: tiles, waterproofing, plumbing, electrical and finishing materials are needed.\n\nPlease share the size/dimensions so I can estimate area and materials.`,
      };
    }

    if (consultIntent === "build_new_house" || consultIntent === "renovate") {
      // Fall through to the size→floors→quality flow handled by Part 1.
      // Just set the intent and let Part 1 proceed.
      session.consultIntent = consultIntent;
      return null;
    }

// Other consult intents (plastering/flooring/painting/etc.) — fall back to Part 1.
    return null;
    }
  }

  // -------- Steel / cement / general material selection (Phase 11 intent) --------
  if (detectConsultIntent(trimmed) === "steel_selection") {
    return {
      reply: lang === "Hindi"
        ? `🔩 सरिया के grade (जैसे Fe500/Fe550D) और diameter आपके structural design के अनुसार तय होते हैं।\n\nसामान्य residential RCC के लिए Fe500 common है, लेकिन सही चुनाव engineer की structural drawings से ही होगा।\n\n⚠️ ${PRELIMINARY_DISCLAIMER_HINDI}`
        : `🔩 Steel grade (e.g. Fe500/Fe550D) and diameter are decided by your structural design.\n\nFe500 is common for general residential RCC, but the right choice comes from the engineer's structural drawings.\n\n⚠️ ${PRELIMINARY_DISCLAIMER_ENGLISH}`,
    };
  }

  return null;
}
