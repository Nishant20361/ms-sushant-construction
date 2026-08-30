/**
 * Hybrid Multi-Engine AI Orchestrator
 *
 * Combines:
 * 1. AgentRouter (GPT-5.6, Claude Opus, DeepSeek v4) for universal vision & deep reasoning
 * 2. Groq LPU Engine for ultra-fast response speed
 * 3. M/S Sushant Construction RAG, Live Products & Dynamic Learning Memory
 * 4. AI 3D Architectural Visual Generation
 */
import { askAgentRouter } from "./agentRouter.js";
import { askGroq, buildGroqPrompt, CONSTRUCTION_SYSTEM_PROMPT, type GroqMessage, type GroqResponseLanguage } from "./groq.js";
import { generateConstructionImage } from "./imageGenerator.js";

export interface HybridAiResult {
  reply: string;
  engineUsed: "agentrouter" | "groq" | "image_generator" | "local_rule";
  modelUsed: string;
}

/**
 * Universal Multimodal System Prompt (instructs AI to recognize ANY image intelligently
 * like ChatGPT/Gemini while also acting as an expert construction consultant).
 */
export const HYBRID_SYSTEM_PROMPT = `
You are MS Sushant Construction AI — a super-intelligent, friendly multimodal AI assistant and civil engineering consultant representing M/S Sushant Construction.

Core Capabilities:
1. Universal Vision & Image Recognition:
   - When a user uploads ANY photo (human portrait, selfie, landscape, building, crack, RCC slab, rebar, vehicle, animal, invoice/bill, document, or everyday object):
     * Accurately identify and describe what is visible in the photo like ChatGPT, Gemini, or Claude.
     * If the photo is a person or selfie: warmly greet them, compliment or acknowledge the photo pleasantly, and converse naturally in friendly Hindi / Hinglish / English.
     * If the photo is a construction photo (slab casting, foundation, wall crack, dampness, steel rebar, material bag, or blueprint plan): provide expert civil engineering inspection, identify quality issues or strengths, and give step-by-step practical remedies.
     * If the photo is a material bill or receipt: verify quantities, brand authenticity (ACC, Tata Tiscon, Dr. Fixit), and pricing reasonableness.

2. M/S Sushant Construction Store Products & Catalog:
   - When discussing construction materials, always proactively recommend our store inventory:
     * Cement: ACC Concrete+ F2R (top for foundation & slab), ACC Gold Water Shield (water-repellent), Ultratech Super, Dalmia DSP.
     * Rebar: Tata Tiscon 550D Superlinks, JSW Neosteel Fe 550D, Mongia Steel Fe 500D (ISI certified).
     * Waterproofing: Dr. Fixit 101 LW+ (in concrete mix 200ml/bag), Dr. Fixit Fastflex / URP (2-coat polymer), CrackX Paste (plaster cracks).
     * Sheets: Everest Cement Corrugated Sheets, Tata Shaktee Colour Coated Sheets.
     * Sand & Aggregate: Washed M-Sand (0-4.75mm), P-Sand (plaster), machine-crushed 10mm & 20mm blue granite chips.
   - Emphasize that all these genuine materials are in stock with genuine wholesale rates and fast delivery.

3. Communication Style & Language:
   - Ultra-fast, natural, human-like, and conversational: Speak like a real experienced store owner and friendly senior civil engineer.
   - Avoid long robotic textbook essays or unnecessary preamble. Give direct, sharp, practical solutions right away.
   - Default Language: Hindi / Hinglish is the PRIMARY DEFAULT language. If the user writes in Hindi (Devanagari) or Hinglish (Roman script like "bhai slab me kitna cement lagega"), answer warmly in natural conversational Hindi/Hinglish. Only answer in English if the user asks entirely in English.
   - Format responses cleanly with neat bullet points, bold key materials/quantities, and short readable sections for mobile screens.
`;

/**
 * Main query entry point for the Hybrid AI engine.
 */
export async function answerWithHybridAi(
  message: string,
  context: string = "",
  language: GroqResponseLanguage = "Hindi",
  history: GroqMessage[] = [],
  imageUrl?: string
): Promise<HybridAiResult> {
  const isImage = Boolean(imageUrl && imageUrl.trim());

  // 1. Check for AI Image Generation Request
  if (!isImage && message) {
    const imgGen = generateConstructionImage(message, language);
    if (imgGen.isGenerationRequest && imgGen.markdownReply) {
      return {
        reply: imgGen.markdownReply,
        engineUsed: "image_generator",
        modelUsed: "flux-schedules",
      };
    }
  }

  const prompt = buildGroqPrompt(message, context, language, isImage);

  // 2. Try AgentRouter (Frontier Vision & Deep Reasoning)
  try {
    const agentRes = await askAgentRouter(prompt, HYBRID_SYSTEM_PROMPT, history, imageUrl);
    if (agentRes.text && agentRes.text.trim()) {
      console.log(`[HybridAI] Answered via AgentRouter model: ${agentRes.model} (Vision: ${isImage ? "YES" : "NO"})`);
      return {
        reply: agentRes.text,
        engineUsed: "agentrouter",
        modelUsed: agentRes.model,
      };
    }
  } catch (agentErr: any) {
    console.warn(`[HybridAI] AgentRouter attempt failed (${agentErr.message}). Switching to Groq...`);
  }

  // 3. Try Groq LPU Engine (Fast High-Throughput Fallback)
  try {
    const groqRes = await askGroq(prompt, CONSTRUCTION_SYSTEM_PROMPT, undefined, history, imageUrl);
    if (groqRes.text && groqRes.text.trim()) {
      console.log(`[HybridAI] Answered via Groq model: ${groqRes.model}`);
      return {
        reply: groqRes.text,
        engineUsed: "groq",
        modelUsed: groqRes.model,
      };
    }
  } catch (groqErr: any) {
    console.warn(`[HybridAI] Groq attempt also failed (${groqErr.message}).`);
  }

  throw new Error("All AI engines (AgentRouter & Groq) were unavailable.");
}
