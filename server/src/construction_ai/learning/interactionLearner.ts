/**
 * Continuous AI Interaction Learner
 *
 * Automatically captures useful customer queries, site requirements,
 * contractor tips, and civil engineering QA patterns from live chats,
 * saving them into persistent database memory (ConstructionKnowledge)
 * so the AI assistant continuously gets smarter and learns over time.
 */
import { prisma } from "../../db.js";
import { normalizeQuery } from "../knowledge/knowledge.service.js";

// In-memory cache of learned insights for fast recall
const memoryLearnedCache: Array<{ title: string; content: string; keywords: string[] }> = [];

/**
 * Checks whether a message contains substantive civil engineering or construction knowledge.
 */
function isSubstantiveInteraction(customerMessage: string, assistantReply: string): boolean {
  const msg = customerMessage.trim().toLowerCase();
  const reply = assistantReply.trim();

  // Skip short trivial messages, single words or greetings
  if (msg.length < 10 || reply.length < 30) return false;
  if (/^(hi|hello|namaste|hey|ok|theek|thanks|shukriya|bye)\b/i.test(msg) && msg.length < 20) {
    return false;
  }

  // Check for relevant keywords indicating construction topics
  const hasConstructionKeywords =
    /cement|steel|saria|rebar|concrete|slab|dhalai|roof|foundation|neev|pillar|column|beam|brick|eent|sand|balu|m-sand|plaster|waterproofing|seepage|dampness|dr\.?\s*fixit|acc|tiscon|paint|putty|tile|cost|estimate|sqft|cft|kg|bag/i.test(
      msg
    );

  return hasConstructionKeywords;
}

/**
 * Record and persist a learned insight from a successful chat interaction.
 */
export async function recordInteractionLearning(
  customerMessage: string,
  assistantReply: string,
  language: string = "Hindi"
): Promise<void> {
  try {
    if (!isSubstantiveInteraction(customerMessage, assistantReply)) return;

    // Clean user query for title
    const cleanQuery = customerMessage
      .replace(/[\n\r]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const title = cleanQuery.length > 80 ? cleanQuery.slice(0, 77) + "…" : cleanQuery;

    // Extract first 2-3 key takeaway sentences from assistant reply
    const cleanReply = assistantReply
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, "")
      .replace(/\s+/g, " ")
      .trim();

    const sentences = cleanReply.split(/(?<=[.!?।\n])\s+/).filter((s) => s.length > 15);
    const content = sentences.slice(0, 3).join(" ").slice(0, 500);

    if (!content) return;

    // Extract normalized search keywords
    const keywords = Array.from(
      new Set([
        ...normalizeQuery(customerMessage),
        ...normalizeQuery(content.slice(0, 150)),
        language.toLowerCase(),
        "learned",
        "site_qa",
      ])
    ).slice(0, 15);

    // Save to memory cache
    memoryLearnedCache.unshift({ title, content, keywords });
    if (memoryLearnedCache.length > 50) memoryLearnedCache.pop();

    // Check if duplicate already exists in DB
    const existing = await prisma.constructionKnowledge.findFirst({
      where: {
        category: "learned_insights",
        title: {
          contains: title.slice(0, 30),
          mode: "insensitive",
        },
      },
    });

    if (!existing) {
      await prisma.constructionKnowledge.create({
        data: {
          category: "learned_insights",
          title: `[Learned QA] ${title}`,
          content: `Q: ${cleanQuery}\nA / Solution: ${content}`,
          keywords,
          materialType: "site_experience",
          companyName: "M/S SUSHANT CONSTRUCTION",
        },
      });
    }
  } catch (err) {
    // Non-blocking: background learning should never fail the main request
  }
}

/**
 * Get in-memory learned insights for fast fallback.
 */
export function getInMemoryLearnedInsights(): Array<{ title: string; content: string }> {
  return memoryLearnedCache.slice(0, 5);
}
