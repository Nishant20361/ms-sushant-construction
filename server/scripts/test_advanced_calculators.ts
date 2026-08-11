import "../src/config.js";
import { processAdvancedCalculator } from "../src/construction_ai/calculators/index.js";
import { isCalculatorQuestion } from "../src/construction_ai/rag/intentDetector.js";
import { getRelevantContext } from "../src/construction_ai/rag/knowledgeRetriever.js";
import { answerWithGroq } from "../src/construction_ai/groq.js";
import { processMessage, createInitialSession } from "../src/construction_ai/assistant.js";

async function run10CalculationTests() {
  const questions = [
    { id: 1, q: "1000 sq ft ki chhat dalni hai", desc: "Slab Calculator (1000 sq ft)" },
    { id: 2, q: "20 column me kitna sariya lagega", desc: "Column Calculator (20 pillars)" },
    { id: 3, q: "ghar me paint kitna lagega (1000 sq ft)", desc: "Paint Calculator (1000 sq ft)" },
    { id: 4, q: "500 sq ft wall me kitna itta lagega", desc: "Brick Wall Calculator (500 sq ft)" },
    { id: 5, q: "1200 sq ft flooring ke liye kitna tile lagega", desc: "Tile Calculator (1200 sq ft)" },
    { id: 6, q: "1500 sq ft slab dhalai material", desc: "Slab Calculator (1500 sq ft)" },
    { id: 7, q: "15 pillar me kitna sariya lagega", desc: "Column Calculator (15 pillars)" },
    { id: 8, q: "40x35 ka ghar banana hai", desc: "Existing House Dimension Calculator (1400 sq ft)" },
    { id: 9, q: "ACC F2R cement ke fayde batao", desc: "Product Advice (ACC F2R)" },
    { id: 10, q: "RCC roof better hai ya sheet?", desc: "Comparison (RCC Roof vs Sheet)" },
  ];

  console.log("==================================================");
  console.log("TESTING 10 ADVANCED CONSTRUCTION AI CALCULATIONS");
  console.log("==================================================\n");

  for (const item of questions) {
    console.log(`--------------------------------------------------`);
    console.log(`TEST ${item.id}: "${item.q}" (${item.desc})`);

    const advCalc = processAdvancedCalculator(item.q);

    if (advCalc.type && advCalc.result) {
      console.log(`[ADVANCED CALCULATOR TYPE MATCH]: ${advCalc.type.toUpperCase()}`);
      console.log(`[RAW CALCULATOR NUMBERS]:\n${advCalc.formattedText}\n`);

      try {
        const datasetContext = await getRelevantContext(item.q);
        const combinedContext = `[EXACT ADVANCED CALCULATOR RESULT]\n${advCalc.formattedText}\n\n${datasetContext}`;
        const groqReply = await answerWithGroq(item.q, combinedContext);
        console.log(`[GROQ AI NATURAL EXPLANATION]:\n${groqReply.trim()}\n`);
      } catch (err: any) {
        console.log(`[FALLBACK SUMMARY]:\n${advCalc.formattedText}\n`);
      }
    } else {
      const isCalc = isCalculatorQuestion(item.q);
      if (isCalc) {
        const session = createInitialSession("Hindi");
        const local = processMessage(session, item.q);
        console.log(`[ENGINE]: Rule-Based House Calculator`);
        console.log(`[RESPONSE]:\n${local.reply.trim()}\n`);
      } else {
        const datasetContext = await getRelevantContext(item.q);
        const groqReply = await answerWithGroq(item.q, datasetContext);
        console.log(`[ENGINE]: Groq Llama AI`);
        console.log(`[RESPONSE]:\n${groqReply.trim()}\n`);
      }
    }
  }
}

run10CalculationTests().catch(console.error);
