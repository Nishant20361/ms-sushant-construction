import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { constructionChatSchema } from "../validators/index.js";
import {
  processMessage,
  createInitialSession,
  SessionData,
} from "../construction_ai/assistant.js";
import { isCalculatorQuestion } from "../construction_ai/rag/intentDetector.js";
import { getRelevantContext } from "../construction_ai/rag/knowledgeRetriever.js";
import { answerWithGroq, resolveGroqResponseLanguage, type GroqMessage, type GroqResponseLanguage } from "../construction_ai/groq.js";
import { isAbusiveMessage, respectfulBoundaryReply } from "../construction_ai/conversationSafety.js";
import { processAdvancedCalculator } from "../construction_ai/calculators/index.js";
import { assistantLimiter } from "../middleware/rateLimit.js";

const router = Router();

// ------------------------------------------------------------------
// Lightweight in-memory session store so the conversation can remember
// size → floors → quality across turns. Expired/old entries are pruned.
// ------------------------------------------------------------------
interface StoredSession {
  data: SessionData;
  history: GroqMessage[];
  responseLanguage?: GroqResponseLanguage;
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
  const data = createInitialSession(languageHint === "Hindi" ? "Hindi" : "English");
  const id = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  sessions.set(id, { data, history: [], responseLanguage: languageHint as GroqResponseLanguage | undefined, updatedAt: Date.now() });
  return { id, data };
}

// POST /api/construction-assistant/chat
// Body: { message: string, sessionId?: string, language?: "Hindi"|"English"|"Hinglish"|"Other" }
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

    // The latest message controls response style; session language is used only
    // by the local fallback engine and never overrides a clear latest message.
    const storedBeforeReply = sessions.get(sessionId);
    const messageLanguage = resolveGroqResponseLanguage(message, storedBeforeReply?.responseLanguage);
    data.language = messageLanguage === "English" ? "English" : "Hindi";
    if (storedBeforeReply) storedBeforeReply.responseLanguage = messageLanguage;

    // Keep abuse handling deterministic instead of relying on the provider to
    // choose a suitable tone. The response is calm, language-aware and does
    // not send the abusive message to Groq or construction retrieval.
    if (isAbusiveMessage(message)) {
      const reply = respectfulBoundaryReply(messageLanguage);
      const stored = sessions.get(sessionId);
      if (stored) {
        const nextHistory: GroqMessage[] = [...stored.history, { role: "user", content: message }, { role: "assistant", content: reply }];
        stored.history = nextHistory.slice(-8);
        stored.updatedAt = Date.now();
      }
      try {
        await prisma.constructionQuery.create({
          data: { customerMessage: message.slice(0, 2000), language: messageLanguage, assistantReply: reply },
        });
      } catch (err) {
        console.error("[construction-assistant] Failed to persist query:", err);
      }
      res.json({ reply, language: messageLanguage, sessionId });
      return;
    }

    // Keep the existing local engine for deterministic calculations, session-state
    // extraction, and provider-outage fallback. Normal online replies always go
    // through Groq, with local results supplied as authoritative calculation context.
    const local = processMessage(data, message);
    const advanced = processAdvancedCalculator(message);
    const fallback = advanced.type && advanced.result
      ? { reply: advanced.formattedText, language: data.language, producedEstimate: true }
      : local;
    const stored = sessions.get(sessionId);
    let retrievedContext = "";
    try {
      retrievedContext = await getRelevantContext(message);
    } catch (error) {
      console.warn("[constructionAssistant] Knowledge retrieval failed; continuing with Groq conversation:", error);
    }
    const calculatorContext = advanced.type && advanced.result
      ? `[EXACT ADVANCED CALCULATOR RESULT]\n${advanced.formattedText}`
      : isCalculatorQuestion(message)
        ? `[LOCAL CALCULATION / SESSION CONTEXT]\n${local.reply}`
        : "";
    const context = [calculatorContext, retrievedContext].filter(Boolean).join("\n\n");
    let result: {
      reply: string;
      language: "Hindi" | "English" | "Hinglish" | "Other";
      conversation?: import("../construction_ai/assistant.js").AssistantResult["conversation"];
      suggestions?: string[];
      producedEstimate?: boolean;
    };

    try {
      const reply = await answerWithGroq(message, context, messageLanguage, stored?.history ?? []);
      result = {
        reply,
        language: messageLanguage,
        conversation: local.conversation,
        producedEstimate: advanced.type && advanced.result ? true : local.producedEstimate,
      };
    } catch (error) {
      console.error("[constructionAssistant] Groq call failed, using local fallback:", error);
      result = { ...fallback, language: messageLanguage };
    }

    if (stored) {
      const nextHistory: GroqMessage[] = [...stored.history, { role: "user", content: message }, { role: "assistant", content: result.reply }];
      stored.history = nextHistory.slice(-8);
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
