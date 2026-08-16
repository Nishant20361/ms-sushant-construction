import { useCallback, useEffect, useRef, useState } from "react";
import { onlineManager } from "@tanstack/react-query";
import { ApiError, NetworkError, TimeoutError } from "@/services/apiClient";
import { publicApi } from "@/services/publicApi";
import type { AssistantResponse } from "@/types/api";
import type { ChatMessage } from "../types";
import { assistantErrorMessage } from "../utils/assistantErrors";

let sequence = 0;
const messageId = (role: "user" | "assistant") => `${role}-${Date.now().toString(36)}-${(++sequence).toString(36)}`;

export function useAssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string>();
  const [sending, setSending] = useState(false);
  const controller = useRef<AbortController | undefined>(undefined);
  const sendingRef = useRef(false);
  const conversationVersion = useRef(0);

  const submit = useCallback(async (rawQuestion: string, appendUser = true) => {
    const question = rawQuestion.trim();
    if (!question || question.length > 2000 || sendingRef.current) return;
    if (appendUser) setMessages((current) => [...current, { id: messageId("user"), role: "user", content: question, createdAt: Date.now(), status: "sent" }]);
    if (!onlineManager.isOnline()) {
      setMessages((current) => [...current, { id: messageId("assistant"), role: "assistant", content: assistantErrorMessage(new NetworkError(), question), createdAt: Date.now(), status: "failed", retryQuestion: question }]);
      return;
    }
    sendingRef.current = true; setSending(true);
    const version = conversationVersion.current;
    const request = new AbortController(); controller.current = request;
    try {
      const response: AssistantResponse = await publicApi.sendConstructionAssistantMessage({ message: question, sessionId }, request.signal);
      if (!response.reply?.trim() || !response.sessionId?.trim()) throw new Error("Malformed assistant response");
      if (conversationVersion.current !== version) return;
      setSessionId(response.sessionId);
      setMessages((current) => [...current, { id: messageId("assistant"), role: "assistant", content: response.reply.trim(), createdAt: Date.now(), status: "sent" }]);
    } catch (error) {
      if (conversationVersion.current !== version) return;
      if (error instanceof Error && error.name === "AbortError") {
        setMessages((current) => [...current, { id: messageId("assistant"), role: "assistant", content: "Request cancelled. You can retry when you're ready.", createdAt: Date.now(), status: "failed", retryQuestion: question }]);
        return;
      }
      if (__DEV__) {
        const kind = error instanceof TimeoutError ? "TIMEOUT" : error instanceof NetworkError ? "NETWORK_ERROR" : error instanceof ApiError ? "BACKEND_ERROR" : "INVALID_RESPONSE";
        console.warn(`[ASSISTANT] ${kind}`);
      }
      setMessages((current) => [...current, { id: messageId("assistant"), role: "assistant", content: assistantErrorMessage(error, question), createdAt: Date.now(), status: "failed", retryQuestion: question }]);
    } finally { if (controller.current === request) { controller.current = undefined; sendingRef.current = false; setSending(false); } }
  }, [sessionId]);

  const retry = useCallback((failedId: string, question: string) => { setMessages((current) => current.filter((message) => message.id !== failedId)); void submit(question, false); }, [submit]);
  const cancel = useCallback(() => controller.current?.abort(), []);
  const clear = useCallback(() => { conversationVersion.current += 1; controller.current?.abort(); controller.current = undefined; sendingRef.current = false; setMessages([]); setSessionId(undefined); setSending(false); }, []);
  useEffect(() => () => { conversationVersion.current += 1; controller.current?.abort(); controller.current = undefined; }, []);
  return { messages, sending, submit, retry, cancel, clear };
}
