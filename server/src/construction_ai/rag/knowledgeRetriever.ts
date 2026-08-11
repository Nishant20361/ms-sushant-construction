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
import { PRODUCTS } from "../product_data.js";
import { MATERIAL_KNOWLEDGE } from "../material_knowledge.js";

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

const MIN_RELEVANCE_SCORE = 8;

/**
 * Retrieve dataset context across product_data, material_knowledge, and DB.
 */
export async function getRelevantContext(query: string): Promise<string> {
  const lower = query.toLowerCase();
  const blocks: string[] = [];

  // 1. Search local product_data
  const matchedProducts = PRODUCTS.filter((p) =>
    p.keywords.some((kw) => lower.includes(kw.toLowerCase())) ||
    lower.includes(p.company.toLowerCase()) ||
    lower.includes(p.product.toLowerCase())
  );

  for (const p of matchedProducts) {
    blocks.push(
      `[PRODUCT DATA: ${p.company} ${p.product}]\n` +
      `Category: ${p.category}\n` +
      `Benefits (Hindi): ${p.benefitsHi.join("; ")}\n` +
      `Benefits (English): ${p.benefitsEn.join("; ")}\n` +
      `Suitable for (Hindi): ${p.suitableForHi.join("; ")}\n` +
      `Not ideal for (Hindi): ${p.notIdealForHi.join("; ")}\n` +
      `Notes: ${p.notesHi.join("; ")}`
    );
  }

  // 2. Search local material_knowledge
  const matchedMaterials = MATERIAL_KNOWLEDGE.filter((m) =>
    m.keywords.some((kw) => lower.includes(kw.toLowerCase())) ||
    lower.includes(m.nameEn.toLowerCase()) ||
    lower.includes(m.nameHi.toLowerCase()) ||
    (m.category && lower.includes(m.category.toLowerCase()))
  );

  for (const m of matchedMaterials.slice(0, 3)) {
    blocks.push(
      `[MATERIAL KNOWLEDGE: ${m.nameEn} / ${m.nameHi}]\n` +
      `Category: ${m.category}\n` +
      `Benefits (Hindi): ${m.benefitsHi.join("; ")}\n` +
      `Usage (Hindi): ${m.usageHi.join("; ")}\n` +
      `Notes: ${m.notesHi.join("; ")}`
    );
  }

  // 3. Search constructionKnowledge DB
  try {
    const dbResults = await searchKnowledge(query, 3);
    for (const r of dbResults) {
      blocks.push(
        `[DATABASE KNOWLEDGE: ${r.title}]\n` +
        `Category: ${r.category}\n` +
        `Content: ${r.content}`
      );
    }
  } catch {
    // Database fallback
  }

  return blocks.join("\n\n---\n\n");
}

/**
 * Retrieve the most relevant knowledge for a user question.
 */
export async function retrieveretrieve(query: string, limit = 4): Promise<RetrievedKnowledge> {
  const context = await getRelevantContext(query);
  const dbResults = await searchKnowledge(query, limit);
  const relevant = (dbResults || []).filter((r) => r.score >= MIN_RELEVANCE_SCORE);

  return {
    query,
    found: context.length > 0 || relevant.length > 0,
    results: relevant,
    context,
  };
}
