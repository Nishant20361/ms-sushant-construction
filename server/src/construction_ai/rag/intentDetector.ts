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

export function isCalculatorQuestion(message: string): boolean {
  const lower = message.toLowerCase();
  // 1. Dimension pair (e.g. "40x35", "40 by 35", "30*40")
  if (/(\d+)\s*[x×*]\s*(\d+)/.test(lower)) return true;
  if (/(\d+)\s*(by|बाई|बाइ)\s*(\d+)/.test(lower)) return true;

  // 2. Specific floor selection input (e.g., "1 floor", "2 floor", "3 floors")
  if (/(\d+)\s*(floor|floors|मंजिल)/.test(lower)) return true;

  // 3. Specific area input (e.g., "1200 sqft", "1500 sq ft", "1000 square feet")
  if (/(\d+)\s*(sqft|sq\.ft|sq ft|square feet)/.test(lower)) return true;

  return false;
}

/**
 * True when the message should be handled by RAG (Groq + retrieved knowledge):
 * product questions, comparisons, benefits, why-questions, construction advice.
 */
export function isRAGQuestion(message: string): boolean {
  return hasAny(message, RAG_MARKERS);
}
