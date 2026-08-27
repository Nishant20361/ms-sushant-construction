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
import { prisma } from "../../db.js";

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
  | "stages"
  | "learned_insights";

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
 * Retrieve dataset context across product_data, material_knowledge, live DB products, and DB learnings.
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
      `[RECOMMENDED PRODUCT DATA: ${p.company} ${p.product}]\n` +
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

  // 3. Search live store inventory from PostgreSQL Product table (M/S Sushant Construction live catalog)
  try {
    const liveProducts = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      include: {
        category: true,
      },
      take: 20,
    });

    const relevantLive = liveProducts.filter((p) => {
      const pName = p.name.toLowerCase();
      const pCat = (p.category?.name || "").toLowerCase();
      const pDesc = (p.description || "").toLowerCase();
      return (
        lower.includes("product") ||
        lower.includes("price") ||
        lower.includes("rate") ||
        lower.includes("store") ||
        lower.includes("cement") ||
        lower.includes("steel") ||
        lower.includes("sand") ||
        lower.includes("sheet") ||
        lower.includes(pName) ||
        pName.split(" ").some((token) => token.length > 2 && lower.includes(token)) ||
        lower.includes(pCat) ||
        pDesc.split(" ").some((token) => token.length > 3 && lower.includes(token))
      );
    });

    if (relevantLive.length > 0) {
      const itemsList = relevantLive
        .slice(0, 6)
        .map(
          (p) =>
            `• ${p.name} (${p.category?.name || "General"}): ₹${p.price} / ${p.unit} (In Stock: ${p.stock} ${p.unit})`
        )
        .join("\n");

      blocks.push(
        `[M/S SUSHANT CONSTRUCTION LIVE STORE INVENTORY & PRODUCTS]\n` +
        `Directly Available at our Store:\n${itemsList}\n` +
        `Note: Recommend these exact store products to the customer with confidence.`
      );
    }
  } catch {
    // Graceful fallback if database is offline
  }

  // 4. Search constructionKnowledge DB + Continuous Learned Insights
  try {
    const dbResults = await searchKnowledge(query, 3);
    for (const r of dbResults) {
      blocks.push(
        `[DATABASE KNOWLEDGE: ${r.title}]\n` +
        `Category: ${r.category}\n` +
        `Content: ${r.content}`
      );
    }

    // Also pull latest learned insights from past user interactions
    const learnedEntries = await prisma.constructionKnowledge.findMany({
      where: {
        category: "learned_insights",
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 4,
    });

    if (learnedEntries.length > 0) {
      const learnedText = learnedEntries
        .map((e) => `• [${e.title}]: ${e.content}`)
        .join("\n");

      blocks.push(
        `[CONTINUOUS LEARNING & PREVIOUS SITE INSIGHTS]\n${learnedText}`
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
