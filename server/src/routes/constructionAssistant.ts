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
    const imageUrl = body.imageUrl?.trim();
    let message = body.message.trim();
    if (!message && !imageUrl) {
      res.status(200).json({
        reply: body.language === "Hindi"
          ? "कृपया कुछ टाइप करें या फोटो अपलोड करें… 😊"
          : "Please type a message or upload a photo… 😊",
        language: body.language === "Hindi" ? "Hindi" : "English",
        sessionId: body.sessionId ?? "",
      });
      return;
    }
    if (!message && imageUrl) {
      message = body.language === "Hindi"
        ? "कृपया इस फोटो का निरीक्षण करके निर्माण संबंधी सुझाव दें।"
        : "Please analyze this construction photo and provide engineering recommendations.";
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
    const fallbackReply = imageUrl
      ? (messageLanguage === "Hindi"
          ? "📸 आपकी निर्माण फोटो प्राप्त हो गई है।\n\n• यदि यह **छत/ढलाई (RCC Slab)** है: सरिया की स्पेसिंग, 25mm कवर ब्लॉक और वाइब्रेटर का सही उपयोग जांचें। ढलाई के बाद 14-21 दिन तराई (Curing) अवश्य करें।\n• यदि यह **दीवार/क्रैक (Cracks/Dampness)** है: बारीक हेयरलाइन क्रैक के लिए Dr. Fixit CrackX पेस्ट लगाएं और सीलन वाले हिस्से में 2 कोट वॉटरप्रूफिंग पॉलीमर लगाएं।\n• यदि यह **मटेरियल या बिल** है: सही ब्रांड (ACC, Dalmia, UltraTech, Tata Tiscon) और ISI मार्क अवश्य चेक करें।\n\nआप इस बारे में विशेष सवाल भी पूछ सकते हैं!"
          : "📸 Construction photo received.\n\n• For **RCC Slab / Concrete**: Ensure proper rebar spacing, 25mm cover blocks, uniform vibration, and minimum 14–21 days pond curing.\n• For **Cracks / Moisture**: Treat hairline shrinkage cracks with Dr. Fixit CrackX paste; apply polymer waterproofing coating for seepage.\n• For **Materials / Bills**: Verify ISI certification, brand packaging, and test certificates.\n\nFeel free to ask any specific question about this photo!")
      : (advanced.type && advanced.result ? advanced.formattedText : local.reply);

    const fallback = { reply: fallbackReply, language: data.language, producedEstimate: !imageUrl && (advanced.type && advanced.result ? true : local.producedEstimate) };
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
      const reply = await answerWithGroq(message, context, messageLanguage, stored?.history ?? [], imageUrl);
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
      const userEntryContent = imageUrl
        ? [{ type: "text" as const, text: message }, { type: "image_url" as const, image_url: { url: imageUrl } }]
        : message;
      const nextHistory: GroqMessage[] = [...stored.history, { role: "user", content: userEntryContent }, { role: "assistant", content: result.reply }];
      stored.history = nextHistory.slice(-8);
    }

    // Persist the assistant reply + customer message to the database.
    // Queries are saved only after the response is generated.
    try {
      await prisma.constructionQuery.create({
        data: {
          customerMessage: (message + (imageUrl ? " [Photo Attached]" : "")).slice(0, 2000),
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
