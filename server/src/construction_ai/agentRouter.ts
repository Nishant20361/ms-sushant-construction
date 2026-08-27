/**
 * AgentRouter Multimodal AI Service
 *
 * Integrates AgentRouter frontier models (GPT-5.6, Claude Opus, DeepSeek v4, GLM-5.3)
 * for advanced vision, image recognition, and high-speed civil engineering reasoning.
 */

export const DEFAULT_AGENTROUTER_API_KEY =
  process.env.AGENTROUTER_API_KEY ||
  "sk-ZPgFFgNbZisONeXoJ4pl6E566s8R5Ja3SbZhHeKVMcDpbA82";

export const AGENTROUTER_BASE_URL =
  process.env.AGENTROUTER_BASE_URL || "https://agentrouter.org/v1";

// Best vision models on AgentRouter
export const AGENTROUTER_VISION_PRIMARY = "gpt-5.6-sol";
export const AGENTROUTER_VISION_FALLBACK = "claude-opus-4-8";

// Best high-speed text and reasoning models on AgentRouter
export const AGENTROUTER_TEXT_PRIMARY = "deepseek-v4-flash";
export const AGENTROUTER_TEXT_FALLBACK = "gpt-5.6-sol";

export interface AgentRouterMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }>;
}

export interface AgentRouterResult {
  text: string;
  model: string;
}

const REQUEST_TIMEOUT_MS = 25_000;

/**
 * Execute chat completion on AgentRouter with client authorization headers.
 */
export async function callAgentRouter(
  model: string,
  messages: AgentRouterMessage[],
  apiKey: string = DEFAULT_AGENTROUTER_API_KEY
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${AGENTROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
        "User-Agent": "RooCode/3.34.8",
        "X-Title": "Roo Code",
        "HTTP-Referer": "https://github.com/RooVetGit/Roo-Cline",
      },
      body: JSON.stringify({
        model,
        messages,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

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

  const messages: AgentRouterMessage[] = [{ role: "system", content: systemPrompt }];

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
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text:
            prompt ||
            "Please analyze this image thoroughly. If it is a construction/building photo, inspect materials, cracks, structural members, or blueprints. If it is a person, selfie, document, object, or scene, describe what you see accurately and converse naturally.",
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
