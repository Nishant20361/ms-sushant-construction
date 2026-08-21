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
- Sound human and helpful: acknowledge the exact question first, then give a direct practical answer. Do not sound like a textbook, chatbot template, or sales script.
- You may use light, warm, family-friendly humour when the user is chatting casually or invites a joke. Keep it short and natural; one small smile/emoticon is enough.
- Never joke about safety incidents, injuries, money stress, delays, defective work, a customer's identity, religion, caste, gender, language, or an abusive message. If the question is technical, urgent, or safety-related, be calm and direct instead of funny.
- Do not make up claims, prices, product availability, or work results just to be humorous. Acknowledge uncertainty honestly.
- Keep simple questions concise. For a bigger house-planning or material decision, use short headings or bullets and ask only the one or two missing details that genuinely change the answer.
- In Hindi, use clear Devanagari with familiar construction words where useful. In Hinglish, use natural Roman Hindi-English such as "aap", "ghar", "slab", and "estimate"; never suddenly switch the whole reply into formal English or Devanagari.
- Respect conversation context: remember sizes, floors, quality and prior choices when present, but ask for confirmation if a detail may have changed.
- Help homeowners, contractors and shop customers with practical planning, work sequence, material selection, storage, quality checks, coordination and budgeting. State clearly when a local engineer, architect, electrician, plumber or approved drawing is needed.
- Never pressure a customer to buy a product. If they ask for stock or price, explain that the current catalogue is the source of truth.
- If a user is abusive, insulting or uses profanity, do not mirror the language or argue. Set one calm boundary, ask them to rephrase respectfully, and offer construction help again in their language.
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
let lastApiKey: string | null = null;
export const GROQ_REQUEST_TIMEOUT_MS = 25_000;

export type GroqErrorCategory =
  | "MISSING_KEY"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "MODEL_NOT_FOUND"
  | "RATE_LIMIT"
  | "PAYLOAD_TOO_LARGE"
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "SERVER_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR";

export class GroqError extends Error {
  public readonly status?: number;
  public readonly code?: string;
  public readonly errorType?: string;
  public readonly model?: string;
  public readonly durationMs?: number;
  public readonly category: GroqErrorCategory;

  constructor(opts: {
    message: string;
    status?: number;
    code?: string;
    errorType?: string;
    model?: string;
    durationMs?: number;
    category: GroqErrorCategory;
  }) {
    super(opts.message);
    this.name = "GroqError";
    this.status = opts.status;
    this.code = opts.code;
    this.errorType = opts.errorType;
    this.model = opts.model;
    this.durationMs = opts.durationMs;
    this.category = opts.category;
  }
}

function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new GroqError({
      message: "GROQ_API_KEY missing",
      category: "MISSING_KEY",
    });
  }
  if (!groqInstance || lastApiKey !== apiKey) {
    groqInstance = new Groq({ apiKey });
    lastApiKey = apiKey;
  }
  return groqInstance;
}

export function categorizeGroqError(err: any, model?: string, durationMs?: number): GroqError {
  if (err instanceof GroqError) return err;

  const status = typeof err?.status === "number" ? err.status : typeof err?.statusCode === "number" ? err.statusCode : undefined;
  const msg = String(err?.message || err || "");
  const code = typeof err?.code === "string" ? err.code : typeof err?.error?.code === "string" ? err.error.code : undefined;
  const errorType = typeof err?.type === "string" ? err.type : typeof err?.error?.type === "string" ? err.error.type : err?.name;

  let category: GroqErrorCategory = "NETWORK_ERROR";
  let safeMessage = "Groq network or connection failed";

  if (msg.includes("GROQ_API_KEY missing") || msg.includes("missing or empty")) {
    category = "MISSING_KEY";
    safeMessage = "GROQ_API_KEY missing";
  } else if (err?.name === "AbortError" || msg.includes("aborted") || msg.includes("timeout")) {
    category = "TIMEOUT";
    safeMessage = "Groq request timed out";
  } else if (status === 401 || msg.includes("invalid_api_key") || msg.includes("Unauthorized")) {
    category = "UNAUTHORIZED";
    safeMessage = "Invalid Groq API key (401)";
  } else if (status === 403 || msg.includes("permission_denied")) {
    category = "FORBIDDEN";
    safeMessage = "Groq access forbidden or restricted (403)";
  } else if (status === 404 || code === "model_not_found" || msg.includes("does not exist") || msg.includes("model_not_found")) {
    category = "MODEL_NOT_FOUND";
    safeMessage = `Groq model '${model || "unknown"}' not found or unavailable (404)`;
  } else if (status === 413 || msg.includes("payload_too_large")) {
    category = "PAYLOAD_TOO_LARGE";
    safeMessage = "Groq request payload too large (413)";
  } else if (status === 422 || msg.includes("validation")) {
    category = "VALIDATION_ERROR";
    safeMessage = "Groq request validation error (422)";
  } else if (status === 429 || msg.includes("rate_limit") || code === "rate_limit_exceeded") {
    category = "RATE_LIMIT";
    safeMessage = "Groq rate limit or quota exceeded (429)";
  } else if (status === 400 || msg.includes("bad_request")) {
    category = "BAD_REQUEST";
    safeMessage = "Groq malformed request (400)";
  } else if (typeof status === "number" && status >= 500) {
    category = "SERVER_ERROR";
    safeMessage = `Groq server error (${status})`;
  }

  // Production-safe diagnostic log: NEVER log GROQ_API_KEY, headers, or prompt text
  console.error("[Groq] request failed", {
    model: model || "unknown",
    status: status ?? null,
    category,
    code: code ?? null,
    errorType: errorType ?? null,
    message: safeMessage,
    durationMs: durationMs ?? null,
  });

  return new GroqError({
    message: safeMessage,
    status,
    code,
    errorType,
    model,
    durationMs,
    category,
  });
}

export async function askGroq(
  prompt: string,
  systemPrompt: string = DEFAULT_SYSTEM_PROMPT,
  model: string = process.env.GROQ_PRIMARY_MODEL?.trim() || "llama-3.1-8b-instant",
  history: GroqMessage[] = []
): Promise<{ text: string; model: string }> {
  if (process.env.NODE_ENV === "test") {
    throw new Error("Groq is disabled in test mode");
  }

  const client = getGroqClient();
  const messages: GroqMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.filter((message) => message.role !== "system" && message.content.trim()).slice(-8),
    { role: "user", content: prompt },
  ];

  const candidateModels = Array.from(
    new Set([
      model,
      process.env.GROQ_FALLBACK_MODEL?.trim() || "groq/compound-mini",
      "llama-3.3-70b-versatile",
      "groq/compound",
    ].filter(Boolean))
  );

  let lastError: any = null;

  for (let i = 0; i < candidateModels.length; i++) {
    const currentModel = candidateModels[i];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GROQ_REQUEST_TIMEOUT_MS);
    const startMs = Date.now();

    try {
      if (i > 0) {
        console.warn(`[Groq] Retrying with fallback model: ${currentModel}...`);
      }
      const response = await client.chat.completions.create(
        {
          model: currentModel,
          messages,
        },
        { signal: controller.signal }
      );
      const text = response.choices[0]?.message?.content || "";
      return { text, model: currentModel };
    } catch (err: any) {
      const durationMs = Date.now() - startMs;
      const categorized = categorizeGroqError(err, currentModel, durationMs);
      lastError = categorized;

      // Non-model errors like missing key or auth failures shouldn't retry other models
      if (categorized.category === "MISSING_KEY" || categorized.category === "UNAUTHORIZED") {
        throw categorized;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
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

// Short acknowledgements do not reliably reveal a language by themselves.
// Keep the language a customer has established in this conversation so “haan”,
// “ok”, or “continue” gets a natural follow-up instead of a sudden switch.
const NEUTRAL_FOLLOW_UP = /^(?:haan|han|ha|hmm|hm|ji|ok|okay|yes|continue|aur\s+batao|theek|thik|acha|achha)$/i;

export function resolveGroqResponseLanguage(
  message: string,
  previousLanguage?: GroqResponseLanguage
): GroqResponseLanguage {
  const normalized = message.trim();
  if (previousLanguage && NEUTRAL_FOLLOW_UP.test(normalized)) return previousLanguage;
  return detectGroqResponseLanguage(normalized);
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
