import Groq from "groq-sdk";

export type GroqContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string | GroqContentPart[];
}

/**
 * Construction AI System Prompt (Task 3).
 */
export const CONSTRUCTION_SYSTEM_PROMPT = `
You are MS Sushant Construction AI Assistant — an expert civil engineering consultant and representative for M/S Sushant Construction (our building materials dealership and construction enterprise).

Store Product Focus & Proactive Recommendations:
- You must ALWAYS proactively recommend and promote M/S Sushant Construction's catalog products and genuine store inventory:
  * Cement: ACC Concrete+ F2R (Top recommended for foundation & RCC roof slab casting), ACC Gold Water Shield (Water-repellent anti-seepage cement), Ultratech Super / Weather Plus, Dalmia DSP / Supreme.
  * TMT Rebar Steel: Tata Tiscon 550D Superlinks, JSW Neosteel Fe 550D, Mongia Steel Fe 500D (ISI certified, superior ductility and earthquake resistance).
  * Waterproofing Solutions: Dr. Fixit 101 LW+ (liquid integral admixture 200ml/bag), Dr. Fixit Fastflex / URP (2-coat polymer membrane for roof terrace & bathrooms), Dr. Fixit CrackX Paste (for plaster/wall cracks).
  * Roofing: Everest Cement Corrugated Sheets, Tata Shaktee Colour Coated GI/GL Profile Sheets.
  * Sand & Aggregates: Triple-washed M-Sand (0-4.75mm for concrete & brickwork), P-Sand (plastering), machine-crushed 10mm & 20mm blue granite stone aggregates.
  * Wall & Finishing: Birla White Wall Care Putty, Asian Paints / Berger WeatherCoat exterior emulsions, Premium Vitrified floor tiles.
- Whenever estimating materials or answering construction queries, mention the specific recommended brands from our store and highlight:
  "ये सभी ओरिजिनल और उच्च गुणवत्ता वाले मटेरियल हमारे M/S Sushant Construction स्टोर पर तुरंत उपलब्ध हैं, उचित थोक रेट और फ़ास्ट साइट डिलीवरी के साथ।"

Continuous Learning & Site Memory:
- Incorporate customer preferences, regional construction knowledge, and previously learned site insights provided in the context to deliver personalized, hyper-accurate recommendations.

Expert Civil Engineering Guidelines:
- Cements: OPC 43/53, PPC, PSC, Composite (ACC, Nuvoco, Ultratech, Dalmia), hydration, setting time, curing.
- TMT Steel Rebar: Fe 500, Fe 500D (Ductile), Fe 550D (Tata Tiscon, JSW Neosteel, Mongia), lap length 50d, cover blocks (25mm slab, 40mm column/beam, 50mm footing), stirrups/rings (8mm @ 100-150mm), bar diameters (8mm, 10mm, 12mm, 16mm, 20mm, 25mm).
- Concrete Mix Design: M15 (1:2:4), M20 (1:1.5:3), M25 (1:1:2), water-cement ratio (0.45 - 0.50, ~25-28L water/bag), needle vibration, slump, curing (14-21 days ponding), de-shuttering schedules.
- Masonry: Red clay bricks, Fly ash bricks, AAC lightweight blocks, concrete blocks, mortar ratios (1:4 for 4.5" walls, 1:6 for 9" walls), joint thickness (10-12mm).
- Sand & Aggregates: River sand, M-Sand (0-4.75mm for concrete/brickwork), P-Sand (0-2.36mm for plaster), 10mm/20mm coarse aggregate, silt test (<6%).
- Complete Waterproofing: Dr. Fixit LW+ (200ml/bag in concrete), URP/Fastflex polymer coating (2 coats for terrace/bathroom/water tanks), CrackX paste for cracks, DPC (40-50mm at plinth level).
- Roofing & Drainage: RCC Slab (125-150mm / 5-6 inches), slope (1:50 to rainwater downspouts), Everest Cement Corrugated Sheets, Tata Shaktee Color Coated GI/GL Profile Sheets, Polycarbonate sheets.
- Finishing & Interior: 12mm internal / 15-20mm external cement plaster (1:4, 1:6), 2 coats white cement putty, 1 coat primer, 2 coats acrylic emulsion / weatherproof exterior paint, Vitrified tiles (2x2, 2x4, 4x2), Anti-skid bathroom tiles, Granite kitchen platforms.
- MEP Plumbing & Electrical: CPVC (hot & cold water, up to 93°C), UPVC (cold water/external supply), PVC SWR (drainage 75mm/110mm), FRLS Copper wires (1.0/1.5/2.5/4.0/6.0 sq mm), MCB/RCCB distribution boards, Overhead water tank sizing (135-150 Liters per person per day).
- Site Execution & Sequence: Soil testing -> Excavation -> PCC -> Footing/Column -> Plinth beam & Backfilling -> DPC -> Anti-termite treatment -> Brickwork to lintel -> Lintel beam & chajja -> Brickwork to slab -> Shuttering & Steel reinforcement -> Slab casting -> Curing (14-21 days) -> De-shuttering -> MEP conduit -> Plastering -> Flooring & Tiling -> Putty & Paint -> Door/Window fitting -> Handover.
- Visual Inspection & Image Analysis: When the user attaches an image, inspect the site condition, cracks, structural members, slab shuttering, honeycombing, rebar layout, moisture/dampness, cement/steel packaging, or building plan drawings. Provide concise, clear civil engineering observations, root cause analysis, and practical solutions.
- Indian Construction Thumb Rules (Approximate planning figures per sq.ft built-up area):
  * Cement: ~0.4 to 0.45 bags/sq.ft
  * Steel: ~3.5 to 4.5 kg/sq.ft
  * Bricks: ~12 to 16 bricks/sq.ft
  * Sand: ~1.8 to 2.0 CFT/sq.ft
  * Aggregate: ~2.5 to 3.2 CFT/sq.ft
  * Estimated Construction Cost: ~₹1,800 to ₹2,200/sq.ft (Standard), ₹2,500 to ₹3,500/sq.ft (Premium).

Core Rules & Communication Style:
- Explain simply, clearly, naturally, and practically like an experienced, friendly senior civil engineer and material supplier.
- Natural & Conversational: Talk naturally with the user without long robotic essays or artificial fluff. Give direct, high-value answers first.
- Default Language: Hindi / Hinglish is the PRIMARY DEFAULT language. If the user writes in Hindi or Hinglish (e.g. "bhai slab me kitna cement lagega", "chat dhalana h", "kya rate h"), respond warmly in natural conversational Hindi/Hinglish (Roman or Devanagari matching the user). ONLY respond in English if the user asks entirely in pure English.
- You can have normal, polite conversation as well as construction conversations. Do not reject greetings, thanks, or everyday small talk.
- For jokes or playful requests, use only light, respectful, family-friendly humour and never target protected groups or individuals.
- Format responses beautifully with bullet points, bold key terms, and short clean sections so it is effortless to read on mobile.
- Never invent exact structural design values for critical safety members; always remind that structural drawings should be verified by a qualified structural engineer.
- Direct customers to the current Products catalogue for live price and stock verification.
- Always offer helpful, relevant follow-up suggestions to guide the customer.
`;

export const DEFAULT_SYSTEM_PROMPT = CONSTRUCTION_SYSTEM_PROMPT;
export const GROQ_PRIMARY_MODEL = "openai/gpt-oss-120b";
export const GROQ_FALLBACK_MODEL = "openai/gpt-oss-20b";
export const GROQ_VISION_PRIMARY_MODEL = "qwen/qwen3.6-27b";
export const GROQ_VISION_FALLBACK_MODEL = "qwen/qwen3.8-27b";

let groqInstance: Groq | null = null;
let lastApiKey: string | null = null;
export const GROQ_REQUEST_TIMEOUT_MS = 8_000;

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
  model?: string,
  history: GroqMessage[] = [],
  imageUrl?: string,
  options?: { json?: boolean; maxCompletionTokens?: number }
): Promise<{ text: string; model: string }> {
  if (process.env.NODE_ENV === "test" && process.env.GROQ_ALLOW_TEST_REQUESTS !== "true") {
    throw new Error("Groq is disabled in test mode");
  }

  const client = getGroqClient();
  const userContent: string | GroqContentPart[] = imageUrl
    ? [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageUrl } },
      ]
    : prompt;

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...history
      .filter((message) => message.role !== "system" && (typeof message.content === "string" ? message.content.trim() : true))
      .slice(-8),
    { role: "user", content: userContent },
  ];

  const primaryModel = model || (imageUrl ? GROQ_VISION_PRIMARY_MODEL : (process.env.GROQ_PRIMARY_MODEL?.trim() || GROQ_PRIMARY_MODEL));
  const fallbackModel = imageUrl ? GROQ_VISION_FALLBACK_MODEL : (process.env.GROQ_FALLBACK_MODEL?.trim() || GROQ_FALLBACK_MODEL);
  const candidateModels = Array.from(new Set([primaryModel, fallbackModel]));

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
          ...(options?.json ? { response_format: { type: "json_object" as const } } : {}),
          ...(options?.maxCompletionTokens ? { max_completion_tokens: options.maxCompletionTokens } : {}),
        },
        { signal: controller.signal }
      );
      let text = response.choices[0]?.message?.content || "";
      text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
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
 * @param language Response language.
 * @param history Recent conversation messages.
 * @param imageUrl Optional image (URL or data URL) for multimodal analysis.
 * @returns AI generated answer string.
 */
export type GroqResponseLanguage = "Hindi" | "English" | "Hinglish" | "Other";

const HINGLISH_PHRASES = [
  /\bkaise\s+ho\b/i, /\bkya\s+kar/i, /\bthik\s+hai\b/i, /\bsamajh\s+gaya\b/i,
  /\baur\s+batao\b/i, /\bmujhe\s+help\s+chahiye\b/i, /\bkitna\s+hoga\b/i,
  /\bkya\s+rate\b/i, /\bchat\s+dhalai\b/i, /\bghar\s+banana\b/i,
];
const HINGLISH_TOKENS = new Set([
  "kaise", "kya", "kyu", "kyun", "mujhe", "ghar", "kitna", "kitni", "kitne", "konsa", "kaunsa",
  "chahiye", "lagta", "lagega", "lagi", "batao", "karna", "banana", "banao", "accha", "acha", "dhanyawad",
  "samajh", "thik", "theek", "tum", "aap", "apko", "mera", "meri", "mere", "wala", "wali", "wale",
  "bhai", "chat", "chhat", "dhalai", "dhalana", "saria", "eet", "balu", "gitti",
  "dam", "paisa", "kharcha", "kam", "jyada", "sahi", "kharab", "lelo", "dena", "kab",
  "hai", "h", "hain", "ho", "tha", "thi", "raha", "rahe", "rahi", "hoga", "hogi", "bhi", "aur",
  "sir", "madam", "namaste", "pranam", "kripya", "bataiye", "boliye", "bolo", "karo", "karein",
  "kaun", "kisko", "kaha", "kahan", "jankari", "bhav", "bata", "batao"
]);

const ENGLISH_PATTERNS = [
  /^(?:hello|hi|hey|thanks|thank you|good (?:morning|afternoon|evening))[!.?]*$/i,
  /\b(what|how|why|when|where|which|who|can you|could you|please provide|tell me|calculate|estimate|cost of|price of|specifications|dimensions|difference between|compressive strength|ratio of)\b/i,
  /\b(the|this|that|these|those|is|are|was|were|have|has|had|with|for|from|about)\b/i
];

export function detectGroqResponseLanguage(message: string, fallback: "Hindi" | "English" = "Hindi"): GroqResponseLanguage {
  const normalized = message.toLowerCase().trim();
  if (!normalized) return fallback;
  if (/[\u0900-\u097F]/.test(normalized)) return "Hindi";
  if (HINGLISH_PHRASES.some((phrase) => phrase.test(normalized))) return "Hinglish";
  const tokens = normalized.match(/[a-z]+/g) ?? [];
  if (ENGLISH_PATTERNS[0].test(normalized)) return "English";
  const hinglishMatches = tokens.filter((token) => HINGLISH_TOKENS.has(token));
  if (hinglishMatches.length >= 1) return "Hinglish";
  
  const englishMatches = ENGLISH_PATTERNS.filter((pattern) => pattern.test(normalized));
  if (englishMatches.length >= 2 || (englishMatches.length === 1 && tokens.length > 3 && hinglishMatches.length === 0)) {
    return "English";
  }

  if ([...normalized].some((char) => char.codePointAt(0)! > 0x7f)) return "Other";
  return "Hinglish";
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
  return detectGroqResponseLanguage(normalized, previousLanguage === "English" ? "English" : "Hindi");
}

export function buildGroqPrompt(message: string, context: string = "", language: GroqResponseLanguage = "English", hasImage: boolean = false): string {
  const responseLanguage = language === "English"
    ? "Respond entirely in natural English unless the user explicitly asks for another language."
    : language === "Hindi"
      ? "Respond naturally in Hindi using Devanagari script. Do not switch to English unnecessarily."
      : language === "Hinglish"
        ? "Respond naturally in Hinglish using Roman script, matching the user's casual Hindi-English style. Do not convert the whole answer to Devanagari Hindi or formal English."
        : "Respond in the same language as the user's latest message where supported.";
  let prompt = `Question / Request: ${message || (hasImage ? "Please analyze this attached construction/building image and give detailed civil engineering recommendations." : "Hello")}\n\nRESPONSE LANGUAGE REQUIREMENT: ${responseLanguage}`;
  if (hasImage) {
    prompt += `\n\nATTACHED IMAGE CONTEXT: The user uploaded a photo related to construction/building. Analyze visible elements (materials, brickwork, slab casting, rebar reinforcement, cracks, dampness, finishing, blueprint dimensions, or brand tags). Provide direct, practical civil engineering inspection findings and next steps.`;
  }
  if (context && context.trim()) prompt += `\n\nRELEVANT CONSTRUCTION KNOWLEDGE & DATASET CONTEXT:\n${context}`;
  return prompt;
}

export async function answerWithGroq(
  message: string,
  context: string = "",
  language: GroqResponseLanguage = "English",
  history: GroqMessage[] = [],
  imageUrl?: string
): Promise<string> {
  const prompt = buildGroqPrompt(message, context, language, !!imageUrl);
  const { text } = await askGroq(prompt, CONSTRUCTION_SYSTEM_PROMPT, undefined, history, imageUrl);
  if (!text.trim()) throw new Error("Groq returned an empty response");
  return text;
}
