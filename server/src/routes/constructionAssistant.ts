import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { constructionChatSchema } from "../validators/index.js";
import {
  processMessage,
  createInitialSession,
  detectLanguage,
  SessionData,
} from "../construction_ai/assistant.js";
import { isCalculatorQuestion } from "../construction_ai/rag/intentDetector.js";
import { getRelevantContext } from "../construction_ai/rag/knowledgeRetriever.js";
import { answerWithGroq } from "../construction_ai/groq.js";
import { processAdvancedCalculator } from "../construction_ai/calculators/index.js";
import { assistantLimiter } from "../middleware/rateLimit.js";

const router = Router();

// ------------------------------------------------------------------
// Lightweight in-memory session store so the conversation can remember
// size → floors → quality across turns. Expired/old entries are pruned.
// ------------------------------------------------------------------
interface StoredSession {
  data: SessionData;
  updatedAt: number;
}

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour
const sessions = new Map<string, StoredSession>();

function pruneSessions(): void {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.updatedAt > SESSION_TTL_MS) sessions.delete(id);
  }
}

function getOrCreateSession(rawId: string | undefined, languageHint?: string): { id: string; data: SessionData } {
  pruneSessions();
  if (rawId) {
    const existing = sessions.get(rawId);
    if (existing) {
      existing.updatedAt = Date.now();
      return { id: rawId, data: existing.data };
    }
  }
  const data = createInitialSession(languageHint === "Hindi" || languageHint === "English" ? languageHint : "English");
  const id = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  sessions.set(id, { data, updatedAt: Date.now() });
  return { id, data };
}

// POST /api/construction-assistant/chat
// Body: { message: string, sessionId?: string, language?: "Hindi"|"English" }
router.post(
  "/construction-assistant/chat",
  assistantLimiter,
  asyncHandler(async (req, res) => {
    const body = constructionChatSchema.parse(req.body);
    const message = body.message.trim();
    if (!message) {
      res.status(200).json({
        reply: body.language === "Hindi"
          ? "कृपया कुछ टाइप करें… 😊"
          : "Please type something… 😊",
        language: body.language === "Hindi" ? "Hindi" : "English",
        sessionId: body.sessionId ?? "",
      });
      return;
    }

    // Resolve session (and a preferred language).
    const { id: sessionId, data } = getOrCreateSession(
      body.sessionId,
      body.language ?? undefined
    );

    // If the user didn't specify a language but this is the first message,
    // detect it from the text.
    if (!data.dimensions && !data.floors && !data.quality) {
      const detected = detectLanguage(message);
      if (body.language && (body.language === "Hindi" || body.language === "English")) {
        data.language = body.language;
      } else if (detected) {
        data.language = detected;
      }
    }

// Decide which engine handles this message.
//
// Strategy: the existing rule-based assistant is the primary engine. It already
// handles house size, material quantity, cost, floors, quality, estimates,
// comparisons, checklists, why-questions, cost breakdown, room-based estimation,
// product lookup and construction stage guides using its large local dataset.
//
// RAG (Groq + retrieved local knowledge) is used ONLY as a complement: when the
// rule-based assistant doesn't have a confident answer (returns its generic
// "didn't understand" fallback), we consult RAG for product/comparison/benefit/
// advice questions and returned retrieved knowledge.
const COMPUTE_UNKNOWN_REPLY =
  data.language === "Hindi"
    ? "मुझे समझ नहीं आया"
    : "I didn't quite get that";

let result: {
  reply: string;
  language: "Hindi" | "English";
  conversation?: import("../construction_ai/assistant.js").AssistantResult["conversation"];
  suggestions?: string[];
  producedEstimate?: boolean;
};

// 1. Check specialized advanced calculators first (slab, column, brickwall, paint, tile)
const advCalc = processAdvancedCalculator(message);

if (advCalc.type && advCalc.result) {
  try {
    const datasetContext = await getRelevantContext(message);
    const combinedContext = `[EXACT ADVANCED CALCULATOR RESULT]\n${advCalc.formattedText}\n\n${datasetContext}`;
    const groqReply = await answerWithGroq(message, combinedContext);
    const detectedLang = detectLanguage(message);
    result = {
      reply: groqReply,
      language: detectedLang === "Hindi" || data.language === "Hindi" ? "Hindi" : "English",
      producedEstimate: true,
    };
  } catch (err) {
    console.warn("[constructionAssistant] Groq explanation failed, returning calculator summary directly:", err);
    result = {
      reply: advCalc.formattedText,
      language: detectLanguage(message) === "Hindi" || data.language === "Hindi" ? "Hindi" : "English",
      producedEstimate: true,
    };
  }
} else {
  // 2. Check general house dimension calculator vs knowledge questions
  const isCalc = isCalculatorQuestion(message);

  if (isCalc) {
    const local = processMessage(data, message);
    const ruleBasedUnderstood =
      !local.reply.includes(COMPUTE_UNKNOWN_REPLY) &&
      !local.reply.includes("समझ नहीं आया") &&
      !local.reply.includes("didn't quite get");

    if (ruleBasedUnderstood) {
      result = local;
    } else {
      try {
        const context = await getRelevantContext(message);
        const groqReply = await answerWithGroq(message, context);
        const detectedLang = detectLanguage(message);
        result = {
          reply: groqReply,
          language: detectedLang === "Hindi" || data.language === "Hindi" ? "Hindi" : "English",
          producedEstimate: false,
        };
      } catch {
        result = local;
      }
    }
  } else {
    try {
      const context = await getRelevantContext(message);
      const groqReply = await answerWithGroq(message, context);
      const detectedLang = detectLanguage(message);
      result = {
        reply: groqReply,
        language: detectedLang === "Hindi" || data.language === "Hindi" ? "Hindi" : "English",
        producedEstimate: false,
      };
    } catch (err) {
      console.error("[constructionAssistant] Groq call failed, using local fallback:", err);
      result = processMessage(data, message);
    }
  }
}

    // Persist the assistant reply + customer message to the database.
    // Queries are saved only after the response is generated.
    try {
      await prisma.constructionQuery.create({
        data: {
          customerMessage: message.slice(0, 2000),
          language: result.language,
          assistantReply: result.reply.slice(0, 10000),
        },
      });
    } catch (err) {
      // Never fail the chat because logging to DB failed.
      console.error("[construction-assistant] Failed to persist query:", err);
    }

    // Update timestamp to keep session alive.
    const stored = sessions.get(sessionId);
    if (stored) stored.updatedAt = Date.now();

res.json({
      reply: result.reply,
      language: result.language,
      sessionId,
      ...(result.conversation
        ? {
            conversation: {
              length: result.conversation.length,
              width: result.conversation.width,
              area: result.conversation.area,
              floors: result.conversation.floors,
              totalArea: result.conversation.totalArea,
              quality: result.conversation.quality,
              location: result.conversation.location,
            },
          }
        : {}),
      ...(result.suggestions ? { suggestions: result.suggestions } : {}),
      producedEstimate: result.producedEstimate ?? false,
    });
  })
);

export default router;
