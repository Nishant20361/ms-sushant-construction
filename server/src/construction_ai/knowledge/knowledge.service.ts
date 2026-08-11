/**
 * Construction Knowledge service (Phase 5 — RAG retrieval).
 *
 * Reads/writes the `ConstructionKnowledge` table in PostgreSQL. Search is
 * keyword-based and fully local (no external AI API). It supports English and
 * Hindi/Hinglish queries by normalizing filler/stop words and matching against
 * the stored `keywords` array plus title/content text.
 */
import { prisma } from "../../db.js";
import type { ConstructionKnowledge } from "@prisma/client";

export type KnowledgeCategory =
  | "cement"
  | "steel"
  | "bricks"
  | "sand"
  | "aggregate"
  | "roofing"
  | "finishing";

export interface KnowledgeInput {
  category: string;
  title: string;
  content: string;
  keywords: string[];
  materialType?: string | null;
  companyName?: string | null;
}

export interface KnowledgeSearchResult {
  id: number;
  category: string;
  title: string;
  content: string;
  materialType: string | null;
  companyName: string | null;
  score: number;
}

// ---------------------------------------------------------------------------
// Query normalization (English + Hindi/Hinglish)
// ---------------------------------------------------------------------------

/** Common filler / question words that should not affect matching. */
const STOP_DOWN = [
  "ke fayde", "ke fayede", "ke bare", "ke baare", "ke baare me", "ke bare",
  "kya hai", "kya hota", "kya chahiye", "kya lena chahiye", "konsa achha",
  "konsa sahi", "better hai ya", "better", "behtar", "benefits", "benefit",
  "about", "what is", "tell me", "info", "information", "please", "plz",
  "the", "a", "an", "of", "for", "and", "or", "hai", "ya", "ke", "me",
  "के फायदे", "के बारे में", "क्या है", "क्या होता है", "क्या चाहिए",
  "कौन सा अच्छा", "कौन सा सही", "कौन सा", "बेहतर", "बताओ", "बताइए",
];

/**
 * Normalize a raw user query into a compact set of meaningful terms.
 * Lowercases, drops filler words, and keeps the remaining tokens.
 */
export function normalizeQuery(raw: string): string[] {
  let text = raw.toLowerCase().trim();
  // Normalize common Hinglish/typo variants.
  text = text
    .replace(/fayede/g, "fayde")
    .replace(/baare/g, "bare")
    .replace(/konsa/g, "konsa")
    .replace(/achha/g, "achha")
    .replace(/sahi/g, "sahi");
  // Remove punctuation.
  text = text.replace(/[?!.,;:'"()]/g, " ");
  // Drop stop phrases first (longest match), then stop words.
  for (const stop of STOP_DOWN) {
    text = text.split(stop).join(" ");
  }
  const words = text.split(/\s+/).filter(Boolean);
  const stopSet = new Set(STOP_DOWN.map((s) => s.trim()));
  return words.filter((w) => w.length > 1 && !stopSet.has(w));
}

/** Score a record against a set of query terms. Higher = better match. */
function scoreRecord(record: ConstructionKnowledge, terms: string[]): number {
  if (terms.length === 0) return 0;
  const title = record.title.toLowerCase();
  const content = record.content.toLowerCase();
  const keywords = (record.keywords || []).map((k) => k.toLowerCase());
  let score = 0;

  for (const term of terms) {
    // Exact keyword match is the strongest signal.
    if (keywords.some((k) => k === term)) score += 20;
    // Keyword contains the term (e.g. "acc" in "acc f2r").
    if (keywords.some((k) => k.includes(term))) score += 10;
    // Title match.
    if (title.includes(term)) score += 6;
    // Content match.
    if (content.includes(term)) score += 2;
  }

  // Boost exact title equality (e.g. "ACC F2R").
  if (title.includes(terms.join(" "))) score += 15;
  return score;
}

// ---------------------------------------------------------------------------
// Public service functions
// ---------------------------------------------------------------------------

/** Insert a new knowledge record. Returns the created record. */
export async function addKnowledge(input: KnowledgeInput): Promise<ConstructionKnowledge> {
  return prisma.constructionKnowledge.create({
    data: {
      category: input.category,
      title: input.title,
      content: input.content,
      keywords: input.keywords,
      materialType: input.materialType ?? null,
      companyName: input.companyName ?? null,
    },
  });
}

/**
 * Keyword-based search. Returns records sorted by relevance (best match first).
 * Supports English ("ACC F2R", "cement benefits", "steel grade") and
 * Hindi/Hinglish ("ACC F2R ke fayde", "सीमेंट कौन सा अच्छा है",
 * "सरिया कौन सा लेना चाहिए", "RCC roof better hai ya sheet?").
 */
export async function searchKnowledge(query: string, limit = 10): Promise<KnowledgeSearchResult[]> {
  const q = (query || "").trim();
  if (!q) return [];

  const terms = normalizeQuery(q);
  if (terms.length === 0) {
    // Fall back to a raw contains search on the whole query.
    const records = await prisma.constructionKnowledge.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
          { keywords: { has: q } },
        ],
      },
      take: limit,
    });
    return records.map((r) => toSearchResult(r, 1));
  }

  // Fetch candidates and score them locally (simple, deterministic keyword RAG).
  try {
    const records = await prisma.constructionKnowledge.findMany({ take: 500 });
    const scored = records
      .map((r) => ({ r, score: scoreRecord(r, terms) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map((x) => toSearchResult(x.r, x.score));
  } catch (err) {
    console.warn("[searchKnowledge] DB query failed, falling back to empty knowledge:", err instanceof Error ? err.message : String(err));
    return [];
  }
}

/** Fetch all records in a category, ordered by title. */
export async function getKnowledgeByCategory(category: string): Promise<ConstructionKnowledge[]> {
  return prisma.constructionKnowledge.findMany({
    where: {
      category: {
        equals: category,
        mode: "insensitive",
      },
    },
    orderBy: { title: "asc" },
  });
}

/** Fetch records matching a specific keyword (case-insensitive). */
export async function getKnowledgeByKeyword(keyword: string): Promise<ConstructionKnowledge[]> {
  const k = (keyword || "").trim().toLowerCase();
  if (!k) return [];
  const records = await prisma.constructionKnowledge.findMany({ take: 500 });
  return records.filter((r) =>
    (r.keywords || []).some((kw) => kw.toLowerCase() === k)
  );
}

function toSearchResult(r: ConstructionKnowledge, score: number): KnowledgeSearchResult {
  return {
    id: r.id,
    category: r.category,
    title: r.title,
    content: r.content,
    materialType: r.materialType,
    companyName: r.companyName,
    score,
  };
}
