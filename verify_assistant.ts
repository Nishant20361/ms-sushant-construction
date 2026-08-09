/**
 * Standalone verification of the conversational assistant logic.
 * Run with: npx tsx verify_assistant.ts
 * No DB required — exercises the rule-based engine directly.
 */
import {
  processMessage,
  createInitialSession,
  detectLanguage,
} from "./server/src/construction_ai/assistant.js";

let pass = 0;
let fail = 0;

function check(label: string, actual: string, ...mustContain: string[]): void {
  const lower = actual.toLowerCase();
  const missing = mustContain.filter((m) => !lower.includes(m.toLowerCase()));
  if (missing.length === 0) {
    pass++;
    console.log(`✅ ${label}`);
  } else {
    fail++;
    console.log(`❌ ${label} — missing: ${missing.join(", ")}`);
    console.log(`   reply: ${actual.replace(/\n/g, " | ")}`);
  }
}

console.log("=== Language detection ===");
console.log("Hindi(Devanagari):", detectLanguage("मुझे घर बनाना है"));
console.log("Hinglish:", detectLanguage("ghar banana hai"));
console.log("English:", detectLanguage("I want to build a house"));

console.log("\n=== Scenario 1: Natural greeting flow (Hindi) ===");
{
  const s = createInitialSession("Hindi");
let r = processMessage(s, "Hello");
  check("greeting welcomes", r.reply, "नमस्ते", "स्वागत", "जानकारी");
  r = processMessage(s, "ghar banana hai");
  check("asks size", r.reply, "size", "बता");
r = processMessage(s, "40x35");
  check("confirms 1400 sqft", r.reply, "1,400", "sq.ft");
  r = processMessage(s, "2 floor");
  check("computes 2800 and asks quality", r.reply, "2,800", "quality");
  r = processMessage(s, "normal");
  check("offers material menu", r.reply, "Cement", "Steel", "Cost");
r = processMessage(s, "cement");
  check("cement for 2800 -> 1120", r.reply, "1,120");
  r = processMessage(s, "steel");
  check("steel for 2800 -> 11.2", r.reply, "11.2");
}

console.log("\n=== Scenario 2: Context memory (cement/steel/cost use total area) ===");
{
  const s = createInitialSession("English");
  let r = processMessage(s, "40x35 house");
  r = processMessage(s, "2 floor");
  r = processMessage(s, "normal");
r = processMessage(s, "cement");
  check("cement uses 2800", r.reply, "1,120");
  r = processMessage(s, "steel");
  check("steel uses 2800", r.reply, "11.2");
  r = processMessage(s, "cost");
  check("cost uses 2800", r.reply, "sq.ft");
}

console.log("\n=== Scenario 3: Small talk ===");
{
  const s = createInitialSession("Hindi");
let r = processMessage(s, "kaise ho");
  check("how are you", r.reply, "बढ़िया");
  r = processMessage(s, "accha");
  check("acknowledgement", r.reply, "size");
}

console.log("\n=== Scenario 4: Complex single-message intent ===");
{
  const s = createInitialSession("English");
  const r = processMessage(s, "40x35 2 floor normal quality");
  check("complex captures all", r.reply, "Cement", "Steel", "Cost");
}

console.log("\n=== Scenario 5: Product knowledge (no hallucination) ===");
{
  const s = createInitialSession("Hindi");
const r = processMessage(s, "ACC F2R ke bare me batao");
  check("ACC company info", r.reply, "ACC", "फायदे");
}

console.log("\n=== Scenario 6: Knowledge queries ===");
{
  const s = createInitialSession("English");
  let r = processMessage(s, "foundation me kya kya lagega");
  check("foundation materials", r.reply, "Excavation", "PCC");
  r = processMessage(s, "roof banane me kya chahiye");
  check("roof materials", r.reply, "Cement", "TMT steel");
  r = processMessage(s, "waterproofing kaise karein");
  check("waterproofing", r.reply, "Waterproofing");
r = processMessage(s, "construction cost kitni aayegi");
  check("cost asks area", r.reply, "size");
}

console.log("\n=== Scenario 7: Structural safety (no invented dims) ===");
{
  const s = createInitialSession("English");
  const r = processMessage(s, "column size kya rakhe?");
  check("structural engineer disclaimer", r.reply, "structural engineer");
}

console.log("\n=== Scenario 8: Construction sequence ===");
{
  const s = createInitialSession("Hindi");
  const r = processMessage(s, "ghar banane ka sequence kya hai");
  check("sequence", r.reply, "foundation", "roof");
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail === 0 ? 0 : 1);
