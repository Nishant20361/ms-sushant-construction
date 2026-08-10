import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Default system prompt describing the construction assistant personality.
 */
export const DEFAULT_SYSTEM_PROMPT = `
You are MS Sushant Construction AI Assistant.

You are a professional civil engineer and helpful construction-material expert.

Rules:
- Speak like a helpful construction expert.
- Reply in Hindi if the user uses Hindi.
- Reply in English if the user uses English.
- Explain simply and clearly.
- Ask a useful follow-up question when it helps continue the conversation.
- Never invent exact structural dimensions (column/beam/slab sizes, reinforcement).
- Give approximate estimates only.
- Suggest consulting a qualified structural engineer for final design.
- Never claim live market prices.

Help with:
cement, steel, brick, sand, aggregate, roof, foundation, waterproofing, construction cost, house planning, materials.
`;

export async function askGroq(
  prompt: string,
  systemPrompt: string = DEFAULT_SYSTEM_PROMPT
): Promise<string> {
  const messages: GroqMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages,
  });

  return response.choices[0].message.content || "";
}
