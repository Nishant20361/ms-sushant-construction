/**
 * Knowledge Retriever for the RAG pipeline.
 *
 * Searches the existing `ConstructionKnowledge` database (PostgreSQL) and the
 * local Material knowledge module to retrieve relevant construction context
 * for a user question. Pure keyword-based retrieval — no external AI.
 *
 * Supported categories: cement, steel, bricks, sand, aggregate, roofing,
 * waterproofing, finishing, labour, cost, construction stages.
 */
import { searchKnowledge, KnowledgeSearchResult } from "../knowledge/knowledge.service.js";

/** Categories we support for retrieval. */
export type RetrievalCategory =
  | "cement"
  | "steel"
  | "bricks"
  | "sand"
  | "aggregate"
  | "roofing"
  | "waterproofing"
  | "finishing"
  | "labour"
  | "cost"
  | "stages";

export interface RetrievedKnowledge {
  /** The original user question. */
  query: string;
  /** Whether any relevant knowledge was found. */
  found: boolean;
  /** Retrieved knowledge records (already relevance-sorted). */
  results: KnowledgeSearchResult[];
  /** A compact text block combining the retrieved content for the prompt. */
  context: string;
}

/**
 * Minimum relevance score for a retrieved record to be considered a real match.
 *
 * Scored terms: keyword exact +20, keyword contains +10, title +6, content +2.
 * A threshold of 8 means we only trust keyword/title matches or strong
 * multi-term content matches — content-only loose matches (e.g. a random
 * unrelated question hitting a few common words) are dropped so the assistant
 * never fabricates from irrelevant knowledge.
 */
const MIN_RELEVANCE_SCORE = 8;

/**
 * Retrieve the most relevant knowledge for a user question.
 *
 * @param query The raw user question (English or Hindi/Hinglish).
 * @param limit How many records to return (default 4).
 */
export async function retrieveretrieve(query: string, limit = 4): Promise<RetrievedKnowledge> {
  const results = await searchKnowledge(query, limit);

  // Drop low-relevance records so unrelated queries return "not found".
  const relevant = (results || []).filter((r) => r.score >= MIN_RELEVANCE_SCORE);

  if (!relevant || relevant.length === 0) {
    return { query, found: false, results: [], context: "" };
  }

  // Build a compact context block from the retrieved records.
  const context = relevant
    .map((r) => `[${r.category}] ${r.title}\n${r.content}`)
    .join("\n\n---\n\n");

  return { query, found: true, results: relevant, context };
}
