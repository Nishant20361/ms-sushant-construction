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

    const result = processMessage(data, message);

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
    });
  })
);

export default router;

