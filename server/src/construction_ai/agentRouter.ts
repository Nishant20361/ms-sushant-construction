/**
 * AgentRouter Multimodal AI Service
 *
 * Integrates AgentRouter frontier models (GPT-5.6, Claude Opus, DeepSeek v4, GLM-5.3)
 * for advanced vision, image recognition, and high-speed civil engineering reasoning.
 */

export const DEFAULT_AGENTROUTER_API_KEY = process.env.AGENTROUTER_API_KEY?.trim() || "";

export const AGENTROUTER_BASE_URL =
  process.env.AGENTROUTER_BASE_URL || "https://agentrouter.org/v1";

// Best fast vision and multimodal models on AgentRouter
export const AGENTROUTER_VISION_PRIMARY = "gemini-2.0-flash";
export const AGENTROUTER_VISION_FALLBACK = "gpt-4o-mini";

// Best ultra-fast conversational models on AgentRouter (no long thinking pauses)
export const AGENTROUTER_TEXT_PRIMARY = "gemini-2.0-flash";
export const AGENTROUTER_TEXT_FALLBACK = "gpt-4o-mini";

export interface AgentRouterMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }>;
}

export interface AgentRouterResult {
  text: string;
  model: string;
}

const REQUEST_TIMEOUT_MS = 8_000;

/**
 * Execute chat completion on AgentRouter with client authorization headers.
 */
export async function callAgentRouter(
  model: string,
  messages: AgentRouterMessage[],
  apiKey: string = DEFAULT_AGENTROUTER_API_KEY
): Promise<string> {
  if (process.env.NODE_ENV === "test" || !apiKey.trim()) {
    throw new Error("AgentRouter is not configured or is disabled in test mode");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${AGENTROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
        "User-Agent": "MS-Sushant-Construction/1.0",
      },
      body: JSON.stringify({
        model,
        messages,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`AgentRouter error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as any;
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("AgentRouter returned an empty message content");
    }

    return content.trim();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * High-level helper to query AgentRouter with automatic primary -> fallback model failover.
 */
export async function askAgentRouter(
  prompt: string,
  systemPrompt: string,
  history: Array<{ role: string; content: any }> = [],
  imageUrl?: string,
  apiKey: string = DEFAULT_AGENTROUTER_API_KEY
): Promise<AgentRouterResult> {
  const isVision = Boolean(imageUrl && imageUrl.trim());
  const primaryModel = isVision ? AGENTROUTER_VISION_PRIMARY : AGENTROUTER_TEXT_PRIMARY;
  const fallbackModel = isVision ? AGENTROUTER_VISION_FALLBACK : AGENTROUTER_TEXT_FALLBACK;

  const effectiveSystemPrompt = isVision
    ? "You are MS Sushant Construction AI Assistant — an advanced multimodal civil engineering consultant and visual perception AI. Analyze any attached image with high visual intelligence. If it is a person/selfie, compliment and converse warmly. If it is a construction photo (slab, rebar, crack, dampness, wall, brick, foundation, paint, material bag, blueprint), provide expert civil engineering inspection and practical remedies. If the user asks in Hindi or Hinglish, provide your detailed response in friendly natural Hinglish/Hindi."
    : systemPrompt;

  const messages: AgentRouterMessage[] = [{ role: "system", content: effectiveSystemPrompt }];

  // Format past history
  for (const h of history) {
    if (h.role === "user" || h.role === "assistant") {
      messages.push({
        role: h.role,
        content: typeof h.content === "string" ? h.content : JSON.stringify(h.content),
      });
    }
  }

  // Format current user message with image if present
  if (isVision) {
    const visionUserText = prompt && prompt.trim()
      ? `User Question / Request: ${prompt.trim()}\n\nPlease inspect this attached image thoroughly and answer.`
      : "Please inspect this attached photo in detail and provide your observations, analysis, and recommendations.";

    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: visionUserText,
        },
        {
          type: "image_url",
          image_url: { url: imageUrl! },
        },
      ],
    });
  } else {
    messages.push({
      role: "user",
      content: prompt,
    });
  }

  // 1. Attempt primary model
  try {
    const text = await callAgentRouter(primaryModel, messages, apiKey);
    return { text, model: primaryModel };
  } catch (primaryError: any) {
    console.warn(`[AgentRouter] Primary model ${primaryModel} failed: ${primaryError.message}. Trying fallback ${fallbackModel}...`);
  }

  // 2. Attempt fallback model
  try {
    const text = await callAgentRouter(fallbackModel, messages, apiKey);
    return { text, model: fallbackModel };
  } catch (fallbackError: any) {
    console.error(`[AgentRouter] Fallback model ${fallbackModel} also failed: ${fallbackError.message}`);
    throw fallbackError;
  }
}
