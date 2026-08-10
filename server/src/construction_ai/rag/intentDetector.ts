/**
 * Intent Detector for the RAG layer.
 *
 * Used by the chat route to decide which engine handles a message:
 *  - Calculator (existing rule-based assistant): house size, material
 *    quantity, cost, estimates, floors, quality, etc.
 *  - RAG (Groq + retrieved knowledge): product questions, comparisons,
 *    benefits, why-questions, construction advice.
 *  - Otherwise: falls through to the existing rule-based assistant.
 */

/** Keywords that indicate a pure calculator/estimate question. */
const CALCULATOR_MARKERS = [
  // size / dimensions
  "x35", "x36", "x40", "x30", "x50", "by 35", "by 40", "बाई", "गुणा",
  // quantity
  "kitna", "kitni", "kitne", "how much", "how many", "कितना", "कितनी", "कितने",
  "lagega", "लगेगा", "chahiye", "चाहिए", "quantity", "requirement", "bags",
  // cost / estimate
  "cost", "price", "लागत", "खर्च", "कीमत", "estimate", "budget", "rate",
  // floors / quality
  "floor", "floors", "मंजिल", "फर्श", "quality", "normal", "premium",
  "sq.ft", "sqft", "square feet",
];

/** Keywords that indicate a product/comparison/benefit/why/advice question. */
const RAG_MARKERS = [
  // product / brand
  "f2r", "concreto", "vistas", "ultratech", "acc", "nuvoco", "ambuja",
  "dalmia", "tata", "mongia", "fe500", "fe550", "fe 500", "fe 550",
  "m sand", "m-sand", "fly ash", "aac", "gitti", "सरिया", "सीमेंट",
  // comparison
  " vs ", "versus", "better", "behtar", "बेहतर", "difference", "antar",
  "फर्क", "comparison", "comparing", "konsa achha", "कौन सा अच्छा",
  "better hai ya", "sahi", "best", "good",
  // benefit / loss
  "fayde", "fayeda", "benefit", "फायदे", "advantages", "kia fayda",
  "loss", "nuksan", "नुकसान", "downside",
  // why
  "why", "kyu", "क्यों", "kya reason", "cause", "kis liye", "किस लिए",
  // advice / recommend
  "konsa", "which", "recommend", "suggest", "lena chahiye", "कौन सा",
  "advice", "salaah", "सलाह", "kya use karein", "kya lagayein",
  // construction advice / stages
  "kaise banta hai", "ghar kaise", "kaise banaye", "process", "steps",
];

function hasAny(text: string, list: string[]): boolean {
  const lower = text.toLowerCase();
  return list.some((m) => lower.includes(m.toLowerCase()));
}

/**
 * True when the message should be handled by the existing calculator /
 * rule-based assistant (house size, quantities, cost, estimates).
 */
export function isCalculatorQuestion(message: string): boolean {
  const lower = message.toLowerCase();
  // A dimension pair (e.g. "40x35", "40 by 35") is a strong calculator signal.
  if (/(\d+)\s*[x×*]\s*(\d+)/.test(lower)) return true;
  if (/(\d+)\s*(by|बाई|बाइ)\s*(\d+)/.test(lower)) return true;
  return hasAny(message, CALCULATOR_MARKERS);
}

/**
 * True when the message should be handled by RAG (Groq + retrieved knowledge):
 * product questions, comparisons, benefits, why-questions, construction advice.
 */
export function isRAGQuestion(message: string): boolean {
  return hasAny(message, RAG_MARKERS);
}
