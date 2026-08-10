/**
 * RAG verification script for the construction assistant.
 *
 * Tests the retrieval + Groq pipeline used by the chat route.
 * Run with: npx tsx verify_rag.ts
 *
 * Requires:
 *  - A running database (PostgreSQL) with the ConstructionKnowledge seed.
 *  - GROQ_API_KEY set in server/.env.
 */
import { retrieveretrieve } from "./server/src/construction_ai/rag/knowledgeRetriever.js";
import { answerWithRAG } from "./server/src/construction_ai/rag/ragService.js";
import { isCalculatorQuestion, isRAGQuestion } from "./server/src/construction_ai/rag/intentDetector.js";

let pass = 0;
let fail = 0;

function check(label: string, ok: boolean, detail = ""): void {
  if (ok) {
    pass++;
    console.log(`✅ ${label}`);
  } else {
    fail++;
    console.log(`❌ ${label} ${detail}`);
  }
}

async function main() {
  console.log("=== Intent detector ===");
  check("40x35 -> calculator", isCalculatorQuestion("40x35 ka ghar") && !isRAGQuestion("40x35 ka ghar"));
  check("cement kitna -> calculator", isCalculatorQuestion("cement kitna lagega") && !isRAGQuestion("cement kitna lagega"));
  check("ACC F2R fayde -> RAG", isRAGQuestion("ACC F2R ke fayde") && !isCalculatorQuestion("ACC F2R ke fayde"));
  check("OPC vs PPC -> RAG", isRAGQuestion("OPC vs PPC") && !isCalculatorQuestion("OPC vs PPC"));
  check("Fe500 vs Fe550 -> RAG", isRAGQuestion("Fe500 aur Fe550 difference") && !isCalculatorQuestion("Fe500 aur Fe550 difference"));
  check("ghar ki chhat me kya lagega -> calculator", isCalculatorQuestion("ghar ki chhat me kya lagega") || !isRAGQuestion("ghar ki chhat me kya lagega"));

  console.log("=== Knowledge retrieval (requires DB) ===");
  const queries = [
    "ACC F2R ke fayde",
    "Fe500 aur Fe550 difference",
    "ghar ki chhat me kya lagega",
    "RCC roof better hai ya sheet",
    "konsa cement achha hai",
  ];
  for (const q of queries) {
    const r = await retrieveretrieve(q, 3);
    check(
      `retrieve: "${q}" -> ${r.found ? `${r.results.length} result(s)` : "not found"}`,
      r.found,
      `| context head: ${r.context.slice(0, 80).replace(/\n/g, " ")}`
    );
  }

  console.log("=== RAG answers (Groq) ===");
  const ragQueries = [
    "ACC F2R ke fayde",
    "Fe500 aur Fe550 difference",
    "RCC roof better hai ya sheet",
    "konsa cement achha hai",
  ];
  for (const q of ragQueries) {
    try {
      const a = await answerWithRAG(q);
      check(`answer: "${q}" -> ${a.answer.slice(0, 60).replace(/\n/g, " ")}...`, !!a.answer);
    } catch (e) {
      check(`answer: "${q}"`, false, `| error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log("=== No-knowledge fallback (no hallucination) ===");
  const unknown = await answerWithRAG("what is the meaning of a quantum wormhole?");
  // The assistant must NOT fabricate a construction/structural answer for an
  // unrelated question. It should explicitly say it lacks the information and
  // steer back to construction.
  const plain = unknown.answer.toLowerCase();
  const noFabrication =
    /don't have|i don't know|no information|not able|can't|lack|nahi hai|nahi sakta|nhi de sakta|nahi maloom|not familiar|unrelated|physics|not in my|knowledge base/i.test(plain);
  check("unknown -> no hallucination", noFabrication, `| got: ${unknown.answer}`);

  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
