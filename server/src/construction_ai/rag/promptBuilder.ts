/**
 * Prompt Builder for the RAG pipeline.
 *
 * Builds the system prompt and the user prompt given retrieved construction
 * knowledge. The model is instructed to answer ONLY from the retrieved
 * context (plus general safe construction knowledge) and to never invent
 * structural dimensions or fake product claims.
 */
import { DEFAULT_SYSTEM_PROMPT } from "../groq.js";
import { detectLanguage, AssistantLanguage } from "../assistant.js";

export interface BuiltPrompt {
  system: string;
  user: string;
  language: AssistantLanguage | null;
}

/**
 * Build the prompt pair for a RAG answer.
 *
 * @param userQuestion The customer's raw question.
 * @param context Retrieved knowledge context (may be empty).
 * @param hasContext Whether any knowledge was found.
 */
export function buildPrompt(
  userQuestion: string,
  context: string,
  hasContext: boolean
): BuiltPrompt {
  const language = detectLanguage(userQuestion);

  // Start from the default professional system prompt.
  let system = DEFAULT_SYSTEM_PROMPT;

  // Add a retrieval-awareness instruction.
  system += `
RETRIEVAL INSTRUCTIONS:
- Use the provided "CONSTRUCTION KNOWLEDGE" context below to answer accurately.
- If the context contains the answer, base your reply on it.
- If no relevant context is provided, say you don't have exact information and ask a brief follow-up question.
- Do NOT invent facts, company claims, or structural dimensions that are not present.
- Mention approximate guidance only and recommend consulting a structural engineer for final design.
`;

  // Build the user prompt with the context block (if any).
  const contextBlock = hasContext
    ? `\n\nCONSTRUCTION KNOWLEDGE:\n${context}`
    : "";

  const user = `Question: ${userQuestion}${contextBlock}`;

  return { system, user, language };
}
