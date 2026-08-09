/**
 * Standalone verification of PART 2 (Phases 11-30) conversational abilities.
 * Run with: npx tsx verify_assistant_part2.ts
 * No DB required — exercises the rule-based engine directly.
 */
import {
  processMessage,
  createInitialSession,
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

console.log("=== PART 2: Test conversations 1-20 ===");

// Test 1: Consultation mode — roof construction
{
  const s = createInitialSession("Hindi");
  const r = processMessage(s, "roof banana hai");
  check("T1 roof consultation", r.reply, "छत", "size");
}

// Test 2: Foundation consultation
{
  const s = createInitialSession("Hindi");
  const r = processMessage(s, "foundation banana hai");
  check("T2 foundation consultation", r.reply, "नींव", "size");
}

// Test 3: Boundary wall consultation
{
  const s = createInitialSession("Hindi");
  const r = processMessage(s, "boundary wall banana hai");
  check("T3 boundary wall", r.reply, "बाउंड्री");
}

// Test 4: Room-based estimation
{
  const s = createInitialSession("English");
  const r = processMessage(s, "3 room 1 kitchen 2 bathroom");
  check("T4 room-based area", r.reply, "sq.ft");
}

// Test 5: Why question — why steel in roof
{
  const s = createInitialSession("English");
  const r = processMessage(s, "why steel in roof?");
  check("T5 why steel", r.reply, "tensile");
}

// Test 6: Why wet cement / curing
{
  const s = createInitialSession("Hindi");
  const r = processMessage(s, "cement ko wet kyu karte hain?");
  check("T6 why wet cement", r.reply, "hydration", "curing");
}

// Test 7: Comparison — OPC vs PPC
{
  const s = createInitialSession("English");
  const r = processMessage(s, "OPC vs PPC which is better?");
  check("T7 OPC vs PPC", r.reply, "OPC", "PPC");
}

// Test 8: Comparison — M-Sand vs River Sand
{
  const s = createInitialSession("English");
  const r = processMessage(s, "M sand vs river sand difference");
  check("T8 M-Sand vs River", r.reply, "M-Sand", "River");
}

// Test 9: Benefit of AAC block
{
  const s = createInitialSession("English");
  const r = processMessage(s, "AAC block benefits");
  check("T9 AAC benefit", r.reply, "lightweight", "insulation");
}

// Test 10: Cost breakdown
{
  const s = createInitialSession("English");
  let r = processMessage(s, "40x35 house");
  r = processMessage(s, "2 floor");
  r = processMessage(s, "normal");
  r = processMessage(s, "cost breakdown");
  check("T10 cost breakdown", r.reply, "Material", "Labour");
}

// Test 11: Material checklist
{
  const s = createInitialSession("English");
  const r = processMessage(s, "material list for building a house");
  check("T11 material list", r.reply, "FOUNDATION", "ROOF");
}

// Test 12: Stage guide — how a house is built
{
  const s = createInitialSession("Hindi");
  const r = processMessage(s, "ghar kaise banta hai?");
  check("T12 stage guide", r.reply, "foundation", "roof");
}

// Test 13: Product lookup — ACC F2R
{
  const s = createInitialSession("Hindi");
  const r = processMessage(s, "ACC F2R ke bare me batao");
  check("T13 ACC F2R product", r.reply, "ACC", "F2R");
}

// Test 14: Steel selection guidance
{
  const s = createInitialSession("English");
  const r = processMessage(s, "konsa sariya use karein?");
  check("T14 steel selection", r.reply, "Fe500", "structural");
}

// Test 15: Incomplete question
{
  const s = createInitialSession("English");
  const r = processMessage(s, "cement?");
  check("T15 incomplete", r.reply, "incomplete");
}

// Test 16: Follow-up suggestions after material answer
{
  const s = createInitialSession("English");
  let r = processMessage(s, "40x35 house");
  r = processMessage(s, "2 floor");
  r = processMessage(s, "normal");
  r = processMessage(s, "cement");
  check("T16 material answer", r.reply, "sq.ft");
}

// Test 17: Material alias — "simaat" for cement
{
  const s = createInitialSession("Hindi");
  let r = processMessage(s, "40x35 house");
  r = processMessage(s, "2 floor");
  r = processMessage(s, "normal");
  r = processMessage(s, "simaat kitna lagega");
  check("T17 simaat alias", r.reply, "cement");
}

// Test 18: Smart dimension parse — "40x35h"
{
  const s = createInitialSession("English");
  const r = processMessage(s, "40x35h house");
  check("T18 40x35h", r.reply, "1,400");
}

// Test 19: Roof sheet vs RCC
{
  const s = createInitialSession("English");
  const r = processMessage(s, "RCC roof or sheet which is better?");
  check("T19 RCC vs sheet", r.reply, "RCC", "Roofing");
}

// Test 20: Material knowledge — cement types
{
  const s = createInitialSession("English");
  const r = processMessage(s, "OPC vs PPC cement difference");
  check("T20 cement types", r.reply, "OPC", "PPC");
}

console.log(`\n=== PART 2 RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail === 0 ? 0 : 1);
