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
// TEMPORARY Groq / Grok connection test endpoint (verification only).
// GET /api/construction-ai/test-grok
// Sends a simple test message and reports whether the Groq API responds.
// ------------------------------------------------------------------
router.get(
  "/test-grok",
  asyncHandler(async (_req, res) => {
    const hasKey = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());
    console.log(`[GROQ TEST] API KEY FOUND: ${hasKey ? "YES" : "NO"}`);
    if (!hasKey) {
      console.log("[GROQ TEST] REQUEST SENT: NO");
      console.log("[GROQ TEST] RESPONSE RECEIVED: NO");
      res.status(200).json({ success: false, error: "Grok API key missing" });
      return;
    }
    console.log("[GROQ TEST] REQUEST SENT: YES");
    try {
      const response = await askGroq("Hello Grok, are you connected successfully?");
      console.log("[GROQ TEST] RESPONSE RECEIVED: YES");
      res.status(200).json({
        success: true,
        provider: "Grok",
        message: "Grok API is working",
        response,
      });
    } catch (err) {
      console.log("[GROQ TEST] RESPONSE RECEIVED: NO");
      console.error("[GROQ TEST] error:", err instanceof Error ? err.message : String(err));
      res.status(200).json({ success: false, error: "Grok connection failed" });
    }
  })
);

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
