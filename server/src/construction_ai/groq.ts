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
- You can have normal, polite conversation as well as construction conversations. Do not reject greetings, thanks, or everyday small talk.
- Match the user's latest message language and style whenever practical: English in English, Hindi in Hindi, Hinglish in natural Roman-script Hinglish, and other supported languages in that language.
- For a simple greeting or thanks, respond warmly and naturally before offering help; do not assume the customer has started a construction project.
- Never claim to see the customer or make comments about their appearance unless they provide relevant visual information.
- Never invent exact structural engineering values (column sizes, beam sizes, exact rebar layouts).
- Never invent current shop prices or stock. Direct customers to the current Products catalogue unless authoritative context explicitly provides them.
- Give approximate information or general rules of thumb.
- For estimates or structural-design questions, clearly state that quantities are approximate and recommend a qualified structural engineer for final structural decisions.
- Ask useful follow-up questions to assist the customer further.
`;

export const DEFAULT_SYSTEM_PROMPT = CONSTRUCTION_SYSTEM_PROMPT;

let groqInstance: Groq | null = null;
export const GROQ_REQUEST_TIMEOUT_MS = 20_000;

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
  model: string = "llama-3.1-8b-instant",
  history: GroqMessage[] = []
): Promise<{ text: string; model: string }> {
  // Tests must be deterministic and must not spend provider quota or depend
  // on external network availability. Callers already fall back to local data.
  if (process.env.NODE_ENV === "test") {
    throw new Error("Groq is disabled in test mode");
  }

  try {
    const client = getGroqClient();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GROQ_REQUEST_TIMEOUT_MS);
    const messages: GroqMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.filter((message) => message.role !== "system" && message.content.trim()).slice(-8),
      { role: "user", content: prompt },
    ];

    try {
      const response = await client.chat.completions.create({
        model,
        messages,
      }, { signal: controller.signal });
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
        }, { signal: controller.signal });
        return {
          text: response.choices[0]?.message?.content || "",
          model: fallbackModel,
        };
      }
      throw err;
    } finally {
      clearTimeout(timeout);
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
export type GroqResponseLanguage = "Hindi" | "English" | "Hinglish" | "Other";

const HINGLISH_PHRASES = [
  /\bkaise\s+ho\b/i, /\bkya\s+kar/i, /\bthik\s+hai\b/i, /\bsamajh\s+gaya\b/i,
  /\baur\s+batao\b/i, /\bmujhe\s+help\s+chahiye\b/i,
];
const HINGLISH_TOKENS = new Set([
  "kaise", "kya", "kyu", "kyun", "mujhe", "ghar", "kitna", "kitni", "konsa", "kaunsa",
  "chahiye", "lagta", "lagega", "batao", "karna", "banana", "accha", "acha", "dhanyawad",
  "samajh", "thik", "tum", "aap", "apko", "mera", "meri", "mere", "wala", "wali",
]);

export function detectGroqResponseLanguage(message: string, _fallback?: "Hindi" | "English"): GroqResponseLanguage {
  const normalized = message.toLowerCase().trim();
  if (/[\u0900-\u097F]/.test(normalized)) return "Hindi";
  if (HINGLISH_PHRASES.some((phrase) => phrase.test(normalized))) return "Hinglish";
  const tokens = normalized.match(/[a-z]+/g) ?? [];
  const hinglishScore = new Set(tokens.filter((token) => HINGLISH_TOKENS.has(token))).size;
  if (hinglishScore >= 1) return "Hinglish";
  if (/[^\x00-\x7F]/.test(normalized)) return "Other";
  return "English";
}

export function buildGroqPrompt(message: string, context: string = "", language: GroqResponseLanguage = "English"): string {
  const responseLanguage = language === "English"
    ? "Respond entirely in natural English unless the user explicitly asks for another language."
    : language === "Hindi"
      ? "Respond naturally in Hindi using Devanagari script. Do not switch to English unnecessarily."
      : language === "Hinglish"
        ? "Respond naturally in Hinglish using Roman script, matching the user's casual Hindi-English style. Do not convert the whole answer to Devanagari Hindi or formal English."
        : "Respond in the same language as the user's latest message where supported.";
  let prompt = `Question: ${message}\n\nRESPONSE LANGUAGE REQUIREMENT: ${responseLanguage}`;
  if (context && context.trim()) prompt += `\n\nRELEVANT CONSTRUCTION KNOWLEDGE & DATASET CONTEXT:\n${context}`;
  return prompt;
}

export async function answerWithGroq(
  message: string,
  context: string = "",
  language: GroqResponseLanguage = "English",
  history: GroqMessage[] = []
): Promise<string> {
  const prompt = buildGroqPrompt(message, context, language);
  const { text } = await askGroq(prompt, CONSTRUCTION_SYSTEM_PROMPT, "llama-3.1-8b-instant", history);
  if (!text.trim()) throw new Error("Groq returned an empty response");
  return text;
}
