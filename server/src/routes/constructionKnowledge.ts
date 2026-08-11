import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAdmin } from "../middleware/auth.js";
import { constructionKnowledgeSchema } from "../validators/index.js";
import {
  addKnowledge,
  searchKnowledge,
  getKnowledgeByCategory,
  getKnowledgeByKeyword,
} from "../construction_ai/knowledge/knowledge.service.js";
import { askGroq } from "../construction_ai/groq.js";

const router = Router();

// ------------------------------------------------------------------
// Groq connection test endpoint (verification only).
// GET /api/construction-ai/test-groq
// Sends a test message and reports exact status.
// ------------------------------------------------------------------
const handleGroqTest = asyncHandler(async (_req, res) => {
  const hasKey = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());
  console.log(`[GROQ CHECK]`);
  console.log(`GROQ_API_KEY FOUND: ${hasKey ? "YES" : "NO"}`);
  if (!hasKey) {
    res.status(200).json({ success: false, error: "GROQ_API_KEY missing" });
    return;
  }
  try {
    const { text, model } = await askGroq("Reply only:\nGroq connection successful");
    res.status(200).json({
      success: true,
      provider: "Groq",
      model: model || "llama-3.1-8b-instant",
      response: text.trim(),
    });
  } catch (err: any) {
    const errMsg = err?.message || "Groq server connection failed";
    res.status(200).json({ success: false, error: errMsg });
  }
});

router.get("/test-groq", handleGroqTest);
router.get("/test-grok", handleGroqTest);

// GET /api/construction-ai/knowledge/search?q=ACC%20F2R
// Keyword-based RAG search across the construction knowledge database.
// Supports English and Hindi/Hinglish queries.
router.get(
  "/knowledge/search",
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string | undefined) ?? "";
    if (!q.trim()) {
      res.json({ success: true, query: q, results: [] });
      return;
    }
    const results = await searchKnowledge(q, 10);
    res.json({
      success: true,
      query: q,
      results: results.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        content: r.content,
        materialType: r.materialType,
        companyName: r.companyName,
      })),
    });
  })
);

// GET /api/construction-ai/knowledge?category=cement
// Fetch all knowledge records in a category.
router.get(
  "/knowledge",
  asyncHandler(async (req, res) => {
    const category = (req.query.category as string | undefined)?.trim();
    const keyword = (req.query.keyword as string | undefined)?.trim();

    if (category) {
      const records = await getKnowledgeByCategory(category);
      res.json({
        success: true,
        category,
        results: records.map((r) => ({
          id: r.id,
          title: r.title,
          category: r.category,
          content: r.content,
          materialType: r.materialType,
          companyName: r.companyName,
        })),
      });
      return;
    }

    if (keyword) {
      const records = await getKnowledgeByKeyword(keyword);
      res.json({
        success: true,
        keyword,
        results: records.map((r) => ({
          id: r.id,
          title: r.title,
          category: r.category,
          content: r.content,
          materialType: r.materialType,
          companyName: r.companyName,
        })),
      });
      return;
    }

    res.json({ success: true, results: [] });
  })
);

// POST /api/construction-ai/knowledge
// Admin-only: add a new knowledge record. CSRF is enforced globally for
// /api state-changing routes; requireAdmin protects the endpoint itself.
router.post(
  "/knowledge",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = constructionKnowledgeSchema.parse(req.body);
    const record = await addKnowledge({
      category: body.category,
      title: body.title,
      content: body.content,
      keywords: body.keywords,
      materialType: body.materialType ?? null,
      companyName: body.companyName ?? null,
    });
    res.status(201).json({
      success: true,
      record: {
        id: record.id,
        category: record.category,
        title: record.title,
        content: record.content,
        materialType: record.materialType,
        companyName: record.companyName,
      },
    });
  })
);

export default router;
