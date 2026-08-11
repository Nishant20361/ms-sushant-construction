import Groq from "groq-sdk";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Construction AI System Prompt (Task 3).
 */
export const CONSTRUCTION_SYSTEM_PROMPT = `
You are MS Sushant Construction AI Assistant.

Help customers with:
- Cement
- Steel
- Bricks
- Sand
- Aggregate
- Roofing
- Waterproofing
- Construction cost
- Material selection

Rules:
- Explain simply like a friendly construction expert.
- Reply in Hindi if the user question is in Hindi or Hinglish.
- Reply in English if the user question is in English.
- Support Hinglish naturally.
- Never invent exact structural engineering values (column sizes, beam sizes, exact rebar layouts).
- Give approximate information or general rules of thumb.
- Always include a recommendation to consult a qualified structural engineer for structural design.
- Ask useful follow-up questions to assist the customer further.
`;

export const DEFAULT_SYSTEM_PROMPT = CONSTRUCTION_SYSTEM_PROMPT;

let groqInstance: Groq | null = null;

function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY missing");
  }
  if (!groqInstance) {
    groqInstance = new Groq({ apiKey });
  }
  return groqInstance;
}

export function categorizeGroqError(err: any): Error {
  const status = err?.status || err?.statusCode;
  const msg = err?.message || String(err);

  if (msg.includes("GROQ_API_KEY missing") || msg.includes("missing or empty")) {
    return new Error("GROQ_API_KEY missing");
  }
  if (
    status === 401 ||
    msg.includes("invalid_api_key") ||
    msg.includes("Invalid API Key") ||
    msg.includes("Unauthorized") ||
    msg.includes("401")
  ) {
    return new Error("Invalid Groq API key");
  }
  if (
    status === 429 ||
    msg.includes("rate_limit") ||
    msg.includes("Rate limit") ||
    msg.includes("429")
  ) {
    return new Error("Groq rate limit exceeded");
  }
  return new Error("Groq server connection failed");
}

export async function askGroq(
  prompt: string,
  systemPrompt: string = DEFAULT_SYSTEM_PROMPT,
  model: string = "llama-3.1-8b-instant"
): Promise<{ text: string; model: string }> {
  try {
    const client = getGroqClient();
    const messages: GroqMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ];

    try {
      const response = await client.chat.completions.create({
        model,
        messages,
      });
      return {
        text: response.choices[0]?.message?.content || "",
        model,
      };
    } catch (err: any) {
      // Model fallback if primary model fails with model error
      if (
        model === "llama-3.1-8b-instant" &&
        (err?.status === 404 || err?.status === 400 || err?.message?.includes("model"))
      ) {
        console.warn(`[Groq] Model ${model} failed, retrying with fallback llama-3.3-70b-versatile...`);
        const fallbackModel = "llama-3.3-70b-versatile";
        const response = await client.chat.completions.create({
          model: fallbackModel,
          messages,
        });
        return {
          text: response.choices[0]?.message?.content || "",
          model: fallbackModel,
        };
      }
      throw err;
    }
  } catch (err: any) {
    throw categorizeGroqError(err);
  }
}

/**
 * Generate AI answer using Groq Llama with optional dataset context (Task 2).
 *
 * @param message User question.
 * @param context Retrieved knowledge / dataset context.
 * @returns AI generated answer string.
 */
export async function answerWithGroq(
  message: string,
  context: string = ""
): Promise<string> {
  let prompt = `Question: ${message}`;
  if (context && context.trim()) {
    prompt += `\n\nRELEVANT CONSTRUCTION KNOWLEDGE & DATASET CONTEXT:\n${context}`;
  }

  const { text } = await askGroq(prompt, CONSTRUCTION_SYSTEM_PROMPT);
  return text;
}


