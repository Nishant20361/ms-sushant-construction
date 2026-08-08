import { useEffect, useRef, useState } from "react";
import { publicApi } from "../lib/api";
import type {
  AssistantLanguage,
  ConstructionChatResponse,
} from "../types";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
  fromVoice?: boolean;
}

// --- Web Speech API type declarations (not in TS DOM by default) ---
interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResultItem {
  isFinal: boolean;
  length: number;
  0: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionErrorEvent {
  error: string;
}
interface WebSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type WebSpeechRecognitionConstructor = new () => WebSpeechRecognition;

// Declare the global constructors the browser exposes on `window`.
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

function getSpeechRecognitionCtor(): WebSpeechRecognitionConstructor | null {
  const w = window as unknown as {
    SpeechRecognition?: WebSpeechRecognitionConstructor;
    webkitSpeechRecognition?: WebSpeechRecognitionConstructor;
  };
  return (
    w.SpeechRecognition ||
    w.webkitSpeechRecognition ||
    (globalThis as any)?.SpeechRecognition ||
    (globalThis as any)?.webkitSpeechRecognition || null
  );
}

function getSpeechRecognition(): WebSpeechRecognition | null {
  const Ctor = getSpeechRecognitionCtor();
  return Ctor ? new Ctor() : null;
}

const WELCOME_HINDI = "नमस्ते! मैं आपका 🏠 Construction Assistant हूं। मुझे अपने घर का आकार बताएं, जैसे 40x35 फीट।";
const WELCOME_ENGLISH = "Namaste! I'm your 🏠 Construction Assistant. Tell me your house size, e.g. 40x35 feet.";

let msgSeq = 0;

export default function ConstructionAssistant() {
  const [language, setLanguage] = useState<AssistantLanguage>("Hindi");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [supportsVoice] = useState<boolean>(() => !!getSpeechRecognition());

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const languageRef = useRef<AssistantLanguage>(language);

  useEffect(() => {
    languageRef.current = language;
    // System greeting reflects the UI language.
    const greeting =
      language === "Hindi" ? WELCOME_HINDI : WELCOME_ENGLISH;
    setMessages((prev) => (prev.length === 0 ? [{ id: ++msgSeq, role: "assistant", text: greeting }] : prev));
  }, [language]);

  // Scroll only the chat message container, never the whole page.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  // Cleanup recognition on unmount.
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  const addMessage = (role: ChatMessage["role"], text: string, fromVoice = false) =>
    setMessages((prev) => [...prev, { id: ++msgSeq, role, text, fromVoice }]);

  const handleSend = async (text: string) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;
    setInput("");
    addMessage("user", trimmed);
    setLoading(true);
    setVoiceError(null);
    try {
      const res: ConstructionChatResponse =
        await publicApi.constructionAssistantChat({
          message: trimmed,
          sessionId: sessionId || undefined,
          language: languageRef.current,
        });
      setSessionId(res.sessionId ?? "");
      addMessage("assistant", res.reply);
      // Follow the assistant's resolved language for consistency.
      if (res.language) setLanguage(res.language);
    } catch (e: any) {
      addMessage(
        "assistant",
        languageRef.current === "Hindi"
          ? "क्षमा करें, कुछ गलत हो गया। कृपया फिर से प्रयास करें 🙏"
          : "Sorry, something went wrong. Please try again 🙏"
      );
    } finally {
      setLoading(false);
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
    setListening(false);
  };

  const handleMicClick = () => {
    if (!supportsVoice) {
      setVoiceError(
        languageRef.current === "Hindi"
          ? "आपका ब्राउज़र वॉइस इनपुट सपोर्ट नहीं करता। कृपया Chrome या Edge का उपयोग करें।"
          : "Your browser doesn't support voice input. Please use Chrome or Edge."
      );
      return;
    }
    if (listening) {
      stopListening();
      return;
    }

    const RecognitionCtor = getSpeechRecognitionCtor();
    if (!RecognitionCtor) {
      setVoiceError(
        languageRef.current === "Hindi"
          ? "वॉइस इनपुट उपलब्ध नहीं है।"
          : "Voice input is not available."
      );
      return;
    }

    setVoiceError(null);
    const rec = new RecognitionCtor();
    rec.lang = languageRef.current === "Hindi" ? "hi-IN" : "en-IN";
    // Single-utterance recognition stops automatically after the user stops
    // speaking, avoiding the "continuous" mode issues where a generic error
    // surfaces without producing any transcript.
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setListening(true);
    };
    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    // Expose via ref so we can stop from elsewhere.
    recognitionRef.current = rec;

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      setListening(false);
      recognitionRef.current = null;
      const code = e?.error ?? "unknown";
      let msg: string;
      if (code === "not-allowed" || code === "service-not-allowed" || code === "permission-denied" || code === "audio-capture") {
        msg =
          languageRef.current === "Hindi"
            ? "🎤 माइक्रोफ़ोन की अनुमति नहीं मिली। कृपया ब्राउज़र में माइक्रोफ़ोन अनुमति दें।"
            : "🎤 Microphone permission was denied. Please allow microphone access in your browser.";
      } else if (code === "no-speech") {
        msg =
          languageRef.current === "Hindi"
            ? "मुझे कुछ सुनाई नहीं दिया। कृपया फिर से बोलें 🎤"
            : "I didn't hear anything. Please speak again 🎤";
      } else if (code === "network") {
        msg =
          languageRef.current === "Hindi"
            ? "नेटवर्क समस्या के कारण वॉइस रिकग्निशन रुक गया। कृपया इंटरनेट जांच कर फिर प्रयास करें।"
            : "Voice recognition stopped due to a network issue. Please check your internet and try again.";
      } else if (code === "aborted") {
        msg = "";
      } else {
        msg =
          languageRef.current === "Hindi"
            ? "वॉइस रिकग्निशन में समस्या आई। कृपया फिर से प्रयास करें।"
            : "There was an issue with voice recognition. Please try again.";
      }
      if (msg) setVoiceError(msg);
    };

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const list = e.results;
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = 0; i < list.length; i++) {
        const result = list[i];
        if (!result[0]) continue;
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      const text = (finalTranscript || interimTranscript).trim();
      if (text) {
        // Show the converted text in the input box for the user to edit.
        setInput(text);
      }
      // Once the utterance is final, stop listening so the user can edit/send.
      if (finalTranscript) {
        stopListening();
      }
    };

    try {
      rec.start();
    } catch {
      setListening(false);
      recognitionRef.current = null;
      setVoiceError(
        languageRef.current === "Hindi"
          ? "माइक्रोफ़ोन शुरू नहीं हो सका। कृपया फिर से प्रयास करें।"
          : "Couldn't start the microphone. Please try again."
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend(input);
  };

  const inputDisabled = loading;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="card overflow-hidden !bg-slate-900 text-white">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-700/60 bg-slate-800/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-xl">
              🏠
            </div>
            <div>
              <p className="font-bold text-white">Construction Assistant</p>
              <p className="text-xs text-slate-300">
                {listening ? "🎤 सुन रहा हूँ… / Listening…" : "AI सहायक · भाषा बदलें / Switch language"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-slate-700/60 p-1">
            <button
              onClick={() => setLanguage("Hindi")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                language === "Hindi" ? "bg-brand-600 text-white" : "text-slate-300 hover:text-white"
              }`}
            >
              हिंदी
            </button>
            <button
              onClick={() => setLanguage("English")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                language === "English" ? "bg-brand-600 text-white" : "text-slate-300 hover:text-white"
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          className="max-h-[500px] min-h-[320px] space-y-3 overflow-y-auto bg-slate-900 p-5"
        >
          {messages.map((m) => (
            <div key={m.id} className={`flex items-end gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              {m.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm">
                  🏗️
                </div>
              )}
              <div
                className={`max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "rounded-br-sm bg-brand-600 text-white"
                    : "rounded-bl-sm bg-slate-800 text-slate-100"
                }`}
              >
                {m.fromVoice && (
                  <span className="mr-1" title="Voice input">🎤</span>
                )}
                {m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-end gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm">
                🏗️
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-slate-800 px-4 py-3">
                <span className="typing-dots" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Voice error banner */}
        {voiceError && (
          <div className="mx-5 mb-2 rounded-lg bg-amber-500/15 px-4 py-2.5 text-sm text-amber-200">
            {voiceError}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-700/60 bg-slate-800/70 p-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleMicClick}
              disabled={inputDisabled}
              title={
                !supportsVoice
                  ? "Voice not supported"
                  : listening
                    ? "Stop listening"
                    : "Speak to type"
              }
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl transition ${
                listening
                  ? "animate-pulse bg-red-600 text-white"
                  : supportsVoice
                    ? "bg-slate-700 text-white hover:bg-brand-600"
                    : "cursor-not-allowed bg-slate-700/40 text-slate-500"
              }`}
            >
              🎤
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                language === "Hindi"
                  ? "अपना घर का आकार लिखें, जैसे 40x35…"
                  : "Type your house size, e.g. 40x35…"
              }
              className="input flex-1 !bg-slate-700 !border-slate-600 !text-white placeholder:!text-slate-400"
              aria-label="Chat message"
            />
            <button
              onClick={() => handleSend(input)}
              disabled={inputDisabled || !input.trim()}
              className="btn-primary flex h-11 w-11 shrink-0 items-center justify-center !rounded-full !p-0 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send"
            >
              {loading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" />
                </svg>
              )}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-slate-400">
            <span>
              {language === "Hindi"
                ? "🎤 बोलें: “मुझे 40 बाई 35 का मकान बनाना है”"
                : "🎤 Try speaking: “I need a 30 by 40 house”"}
            </span>
            <span>{supportsVoice ? "hi-IN / en-IN" : "Voice unavailable"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

