/**
 * RAG Service — orchestrates the retrieval-augmented generation answer.
 *
 * Flow:
 *   1. Detect language
 *   2. Retrieve relevant knowledge from the ConstructionKnowledge DB
 *   3. Build the prompt (system + user with context)
 *   4. Send to Groq Llama
 *   5. Return the generated answer
 *
 * If no knowledge is found, we do NOT hallucinate — we return a safe fallback
 * asking the user for more detail.
 */
import { askGroq } from "../groq.js";
import { retrieveretrieve } from "./knowledgeRetriever.js";
import { buildPrompt } from "./promptBuilder.js";

export interface RAGResult {
  /** The generated answer text. */
  answer: string;
  /** Whether the answer came from Groq (true) or a local fallback (false). */
  usedAI: boolean;
  /** Whether relevant knowledge was retrieved. */
  knowledgeFound: boolean;
  /** The detected language (if any). */
  language: string | null;
}

/** Fallback reply when no knowledge is found (no hallucination). */
const FALLBACK_HINDI =
  "Iske liye mujhe exact information nahi mili. Aap thoda aur detail bata sakte hain?";
const FALLBACK_ENGLISH =
  "I don't have exact information about that yet. Could you share a little more detail?";

/**
 * Answer a customer question using retrieval + Groq.
 *
 * @param message The customer's question.
 * @returns A RAGResult with the generated answer.
 */
export async function answerWithRAG(message: string): Promise<RAGResult> {
  const trimmed = (message || "").trim();
  if (!trimmed) {
    return {
      answer: FALLBACK_ENGLISH,
      usedAI: false,
      knowledgeFound: false,
      language: null,
    };
  }

  // 1) Retrieve relevant knowledge.
  const retrieved = await retrieveretrieve(trimmed, 4);
  const knowledgeFound = retrieved.found;

  // 2) Build the prompt.
  const prompt = buildPrompt(trimmed, retrieved.context, knowledgeFound);

  // 3) Send to Groq with the retrieved context (or general civil engineering prompt).
  try {
    const { text: answer } = await askGroq(prompt.user, prompt.system);
    return {
      answer,
      usedAI: true,
      knowledgeFound,
      language: prompt.language,
    };
  } catch (err) {
    console.error("[RAG] Groq call failed:", err instanceof Error ? err.message : String(err));
    // Safe local fallback — do not crash.
    const fallback = prompt.language === "Hindi" ? FALLBACK_HINDI : FALLBACK_ENGLISH;
    return {
      answer: fallback,
      usedAI: false,
      knowledgeFound,
      language: prompt.language,
    };
  }
}
