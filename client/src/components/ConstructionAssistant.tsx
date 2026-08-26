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
  imageUrl?: string;
  fromVoice?: boolean;
}

interface SelectedImageState {
  file: File;
  dataUrl: string;
  name: string;
  sizeFormatted: string;
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

// Helper to strip markdown, special characters and emojis for clean, natural speech pronunciation
function cleanTextForSpeech(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/^[\s*->•\d.]+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, "")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Find Aditi or best available Indian female voice in browser speech synthesis.
 */
function getAditiIndianVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Explicit voice containing "Aditi" (Google Aditi, Microsoft Aditi, etc.)
  const aditi = voices.find((v) => /aditi/i.test(v.name));
  if (aditi) return aditi;

  // 2. Hindi female voices
  const hiFemale = voices.find(
    (v) =>
      (v.lang.startsWith("hi") || /hindi/i.test(v.name)) &&
      /female|lekha|swara|kavya|kalpana|priya|google/i.test(v.name)
  );
  if (hiFemale) return hiFemale;

  // 3. Indian English female voices
  const enInFemale = voices.find(
    (v) =>
      (v.lang.includes("en-IN") || v.lang.includes("en_IN") || /india/i.test(v.name)) &&
      /female|heera|veena|neerja|pooja|raveena|google/i.test(v.name)
  );
  if (enInFemale) return enInFemale;

  // 4. Any Hindi voice
  const anyHi = voices.find((v) => v.lang.startsWith("hi") || /hindi/i.test(v.name));
  if (anyHi) return anyHi;

  // 5. Any Indian English voice
  const anyEnIn = voices.find((v) => v.lang.includes("en-IN") || v.lang.includes("en_IN") || /india/i.test(v.name));
  if (anyEnIn) return anyEnIn;

  // 6. Any female voice or default
  const anyFemale = voices.find((v) => /female|woman/i.test(v.name));
  return anyFemale || voices[0] || null;
}

// Friendly bilingual welcome messages.
const WELCOME_HINDI =
  "नमस्ते 😊 M/S Sushant Construction में आपका स्वागत है।\nमैं घर बनाने, material, cost, cement, steel, roof और foundation की जानकारी दे सकता हूँ। आप कोई निर्माण फोटो (जैसे साइट, सरिया, क्रैक या प्लान) भी अपलोड कर सकते हैं!";
const WELCOME_ENGLISH =
  "Hello 😊 Welcome to M/S Sushant Construction.\nI can help you with house building, materials, cost, cement, steel, roof and foundation. You can also upload construction photos (site, rebar, cracks, or plans) for instant AI analysis!";

// Suggested questions (bilingual-friendly: the assistant auto-detects).
const SUGGESTED_QUESTIONS: { label: string; message: string }[] = [
  { label: "🏠 40×35 घर का estimate", message: "40x35 ka ghar ka estimate do" },
  { label: "🧱 Cement कितना लगेगा?", message: "cement kitna lagega" },
  { label: "🔩 Steel कितना चाहिए?", message: "steel kitna lagega" },
  { label: "🏗️ Foundation में क्या लगता है?", message: "foundation me kya kya lagega" },
  { label: "🏠 Roof के लिए क्या चाहिए?", message: "roof banane me kya kya chahiye" },
  { label: "💧 Waterproofing कैसे करें?", message: "waterproofing kaise karein" },
  { label: "🧱 ACC F2R के बारे में बताओ", message: "ACC F2R ke bare me batao" },
  { label: "💰 Construction cost कितनी?", message: "construction cost kitni aayegi" },
  // ---- PART 2 suggested questions (Phases 11-30) ----
  { label: "🏠 Rooms से area निकालें", message: "3 room 1 kitchen 2 bathroom" },
  { label: "⚖️ OPC vs PPC", message: "OPC vs PPC which is better?" },
  { label: "⚖️ M-Sand vs River Sand", message: "M sand vs river sand difference" },
  { label: "📋 Material checklist", message: "material list for building a house" },
  { label: "💰 Cost breakdown", message: "cost breakdown" },
  { label: "❓ Steel क्यों लगता है?", message: "why steel in roof?" },
  { label: "🏠 RCC या Sheet roof?", message: "RCC roof or sheet which is better?" },
  { label: "🏗️ घर कैसे बनता है?", message: "ghar kaise banta hai?" },
];

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
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Audio Speech Synthesis state (Aditi Indian Female Voice)
  const [speakingMsgId, setSpeakingMsgId] = useState<number | null>(null);

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<SelectedImageState | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const languageRef = useRef<AssistantLanguage>(language);
  const sessionIdRef = useRef<string>("");

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Preload voices for speech synthesis
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Stop speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Greeting reflects the UI language.
  useEffect(() => {
    const greeting = language === "Hindi" ? WELCOME_HINDI : WELCOME_ENGLISH;
    setMessages((prev) =>
      prev.length === 0
        ? [{ id: ++msgSeq, role: "assistant", text: greeting }]
        : prev
    );
  }, [language]);

  // Scroll ONLY the chat message container, never the whole page.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
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

  const addMessage = (
    role: ChatMessage["role"],
    text: string,
    imageUrl?: string,
    fromVoice = false
  ) =>
    setMessages((prev) => [
      ...prev,
      { id: ++msgSeq, role, text, imageUrl, fromVoice },
    ]);

  const handleStopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMsgId(null);
  };

  const handleToggleSpeak = (msgId: number, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setVoiceError(
        languageRef.current === "Hindi"
          ? "आपका ब्राउज़र स्पीच ऑडियो सपोर्ट नहीं करता।"
          : "Your browser doesn't support speech synthesis."
      );
      return;
    }

    if (speakingMsgId === msgId) {
      handleStopSpeaking();
      return;
    }

    window.speechSynthesis.cancel();

    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) return;

    const utterance = new SpeechSynthesisUtterance(cleaned);
    const aditiVoice = getAditiIndianVoice();

    if (aditiVoice) {
      utterance.voice = aditiVoice;
      utterance.lang = aditiVoice.lang || (languageRef.current === "Hindi" ? "hi-IN" : "en-IN");
    } else {
      utterance.lang = languageRef.current === "Hindi" ? "hi-IN" : "en-IN";
    }

    utterance.pitch = 1.05;
    utterance.rate = 0.96;

    utterance.onstart = () => {
      setSpeakingMsgId(msgId);
    };
    utterance.onend = () => {
      setSpeakingMsgId(null);
    };
    utterance.onerror = (e) => {
      if (e.error !== "canceled" && e.error !== "interrupted") {
        console.warn("[TTS] Speech error:", e);
      }
      setSpeakingMsgId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setVoiceError(
        languageRef.current === "Hindi"
          ? "कृपया केवल फोटो (JPEG, PNG, WebP) अपलोड करें।"
          : "Please upload an image file (JPEG, PNG, WebP) only."
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setVoiceError(
        languageRef.current === "Hindi"
          ? "फोटो का साइज 10MB से कम होना चाहिए।"
          : "Image size must be less than 10MB."
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const sizeKb = Math.round(file.size / 1024);
      setSelectedImage({
        file,
        dataUrl,
        name: file.name,
        sizeFormatted: file.size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`,
      });
      setVoiceError(null);
    };
    reader.onerror = () => {
      setVoiceError(
        languageRef.current === "Hindi"
          ? "फोटो लोड करने में समस्या आई।"
          : "Failed to read image file."
      );
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
    e.target.value = "";
  };

  const handleSend = async (textToSend?: string) => {
    const trimmed = (textToSend ?? input).trim();
    const currentImage = selectedImage;

    if (!trimmed && !currentImage) return;
    if (loading) return;

    handleStopSpeaking();
    setInput("");
    setSelectedImage(null);

    const promptText =
      trimmed ||
      (currentImage
        ? languageRef.current === "Hindi"
          ? "कृपया इस फोटो का निरीक्षण करके निर्माण संबंधी सुझाव दें।"
          : "Please analyze this construction photo and provide guidance."
        : "");

    addMessage("user", promptText, currentImage?.dataUrl);
    setShowSuggestions(false);
    setLoading(true);
    setVoiceError(null);

    try {
      const res: ConstructionChatResponse =
        await publicApi.constructionAssistantChat({
          message: promptText,
          sessionId: sessionIdRef.current || undefined,
          imageUrl: currentImage?.dataUrl,
        });

      setSessionId(res.sessionId ?? "");
      addMessage("assistant", res.reply);

      if (res.language) setLanguage(res.language);

      if (res.suggestions && res.suggestions.length > 0) {
        setShowSuggestions(true);
      } else if (messages.length === 0) {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
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

    recognitionRef.current = rec;

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      setListening(false);
      recognitionRef.current = null;
      const code = e?.error ?? "unknown";
      let msg: string;
      if (code === "not-allowed" || code === "service-not-allowed" || code === "permission-denied" || code === "audio-capture") {
        msg =
          languageRef.current === "Hindi"
            ? "🎤 Microphone permission नहीं मिली। Browser settings में microphone permission allow करके फिर try करें।"
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
        setInput(text);
      }
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
    if (e.key === "Enter") handleSend();
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  const inputDisabled = loading;
  const isSpeakingAny = speakingMsgId !== null;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`card relative overflow-hidden !bg-slate-900 text-white transition-all ${
          isDragging ? "ring-2 ring-brand-400 ring-offset-2 ring-offset-slate-900" : ""
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-700/60 bg-slate-800/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-xl shadow-md shadow-brand-500/20">
              🏠
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-white">AI Construction Assistant</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {listening
                  ? "🎤 सुन रहा हूँ… / Listening…"
                  : isSpeakingAny
                    ? "🔊 Aditi आवाज़ में बोल रही हूँ…"
                    : "हिंदी • English • Hinglish · Aditi Voice 🔊 · Photo Upload 📷"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSpeakingAny && (
              <button
                onClick={handleStopSpeaking}
                className="flex items-center gap-1.5 rounded-full bg-red-600/80 px-3 py-1 text-xs font-semibold text-white transition hover:bg-red-600 animate-pulse shadow-sm"
                title="Stop Audio"
              >
                <span>⏹️</span>
                <span>Stop</span>
              </button>
            )}
            <div className="flex items-center gap-1 rounded-full bg-slate-700/60 p-1">
              <button
                onClick={() => setLanguage("Hindi")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  language === "Hindi"
                    ? "bg-brand-600 text-white shadow"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                हिंदी
              </button>
              <button
                onClick={() => setLanguage("English")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  language === "English"
                    ? "bg-brand-600 text-white shadow"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div
          ref={scrollContainerRef}
          className="max-h-[520px] min-h-[320px] space-y-4 overflow-y-auto bg-slate-900 p-5 scroll-smooth"
        >
          {messages.map((m) => {
            const isSpeakingThis = speakingMsgId === m.id;
            return (
              <div
                key={m.id}
                className={`flex items-end gap-2 ${
                  m.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                {m.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm shadow">
                    🏗️
                  </div>
                )}
                <div
                  className={`group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? "rounded-br-sm bg-brand-600 text-white"
                      : "rounded-bl-sm bg-slate-800 text-slate-100 border border-slate-700/60"
                  }`}
                >
                  {/* User Uploaded Image Thumbnail */}
                  {m.imageUrl && (
                    <div className="mb-2.5 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                      <div
                        className="relative group/img cursor-pointer"
                        onClick={() => setEnlargedImage(m.imageUrl!)}
                      >
                        <img
                          src={m.imageUrl}
                          alt="Uploaded construction file"
                          className="max-h-56 w-full object-cover transition-transform duration-200 group-hover/img:scale-[1.02]"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover/img:opacity-100">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-black/70 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                            🔍 बड़ा करके देखें
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Message Text */}
                  <div className="whitespace-pre-line">
                    {m.fromVoice && (
                      <span className="mr-1 inline-block" title="Voice input">
                        🎤
                      </span>
                    )}
                    {m.text}
                  </div>

                  {/* Assistant TTS Listen Button (Aditi Voice) */}
                  {m.role === "assistant" && (
                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-700/50 pt-2 text-xs">
                      <button
                        onClick={() => handleToggleSpeak(m.id, m.text)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition ${
                          isSpeakingThis
                            ? "bg-brand-500 text-white ring-2 ring-brand-300/40 shadow-sm"
                            : "bg-slate-700/70 text-slate-300 hover:bg-brand-600 hover:text-white"
                        }`}
                        title={
                          isSpeakingThis
                            ? "ऑडियो रोकें (Stop audio)"
                            : "Aditi की आवाज़ में सुनें (Listen with Aditi Voice)"
                        }
                      >
                        {isSpeakingThis ? (
                          <>
                            <span className="inline-flex items-center gap-0.5">
                              <span className="h-3 w-0.5 bg-white animate-[pulse_0.4s_ease-in-out_infinite]" />
                              <span className="h-4 w-0.5 bg-white animate-[pulse_0.6s_ease-in-out_infinite]" />
                              <span className="h-2 w-0.5 bg-white animate-[pulse_0.3s_ease-in-out_infinite]" />
                            </span>
                            <span className="text-[11px] font-bold">Stop Audio</span>
                          </>
                        ) : (
                          <>
                            <span className="text-sm">🔊</span>
                            <span className="text-[11px]">Aditi Voice में सुनें</span>
                          </>
                        )}
                      </button>

                      <span className="text-[10px] text-slate-400">
                        {isSpeakingThis ? "Speaking…" : "Aditi (Female Voice)"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-end gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm">
                🏗️
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-slate-800 px-4 py-3 border border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="typing-dots" />
                  <span className="text-xs text-slate-400">
                    {selectedImage
                      ? "Analyzing image & preparing civil engineering advice…"
                      : language === "Hindi"
                        ? "सोच रहा हूँ…"
                        : "Thinking…"}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions */}
        {showSuggestions && !loading && (
          <div className="border-t border-slate-700/60 bg-slate-800/40 px-4 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {language === "Hindi" ? "सुझाए गए सवाल" : "Suggested questions"}
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q.message}
                  onClick={() => handleSend(q.message)}
                  className="rounded-full border border-slate-600 bg-slate-700/60 px-3 py-1.5 text-xs text-slate-200 transition hover:border-brand-400 hover:bg-brand-600 hover:text-white"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Voice or Image error banner */}
        {voiceError && (
          <div className="mx-5 my-2 flex items-center justify-between rounded-lg bg-amber-500/15 px-4 py-2.5 text-sm text-amber-200 border border-amber-500/30">
            <span>{voiceError}</span>
            <button
              onClick={() => setVoiceError(null)}
              className="text-amber-300 hover:text-white font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Drag and drop overlay indicator */}
        {isDragging && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm border-2 border-dashed border-brand-400">
            <div className="text-4xl mb-2">📷</div>
            <p className="text-lg font-bold text-white">फोटो यहाँ छोड़ें (Drop photo here)</p>
            <p className="text-xs text-slate-300 mt-1">
              साइट, ढलाई, क्रैक, सरिया या नक्शे की फोटो
            </p>
          </div>
        )}

        {/* Image Preview before sending */}
        {selectedImage && (
          <div className="border-t border-slate-700/60 bg-slate-800/90 px-4 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div
                  className="relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-600"
                  onClick={() => setEnlargedImage(selectedImage.dataUrl)}
                >
                  <img
                    src={selectedImage.dataUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white">
                    {selectedImage.name}
                  </p>
                  <p className="text-[11px] text-emerald-400">
                    ✓ तैयार है ({selectedImage.sizeFormatted}) · AI द्वारा विश्लेषण होगा
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs text-slate-300 transition hover:bg-red-600 hover:text-white"
                title="हटाएँ (Remove)"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="border-t border-slate-700/60 bg-slate-800/70 p-3">
          <div className="flex items-center gap-2">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Photo / Image Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={inputDisabled}
              title={
                language === "Hindi"
                  ? "फोटो अपलोड करें (साइट, सरिया, क्रैक, सीमेंट, बिल)"
                  : "Upload photo (site, rebar, crack, cement, bill)"
              }
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg transition ${
                selectedImage
                  ? "bg-emerald-600 text-white ring-2 ring-emerald-400/40"
                  : "bg-slate-700 text-slate-200 hover:bg-brand-600 hover:text-white"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              📷
            </button>

            {/* Mic Button for Speech-to-Text */}
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

            {/* Text Input Box */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedImage
                  ? language === "Hindi"
                    ? "फोटो के बारे में सवाल लिखें (या सीधे Send दबाएं)…"
                    : "Ask something about the photo (or click Send)…"
                  : language === "Hindi"
                    ? "अपना सवाल लिखें, जैसे 40×35 घर का estimate…"
                    : "Type your message, e.g. 40×35 house estimate…"
              }
              className="input flex-1 !bg-slate-700 !border-slate-600 !text-white placeholder:!text-slate-400"
              aria-label="Chat message"
            />

            {/* Send Button */}
            <button
              onClick={() => handleSend()}
              disabled={inputDisabled || (!input.trim() && !selectedImage)}
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
                ? "💡 फोटो अपलोड करें (📷) या बोलें (🎤): “छत ढलाई में कितना सीमेंट लगेगा?”"
                : "💡 Upload photo (📷) or speak (🎤): “Estimate for 30x40 house”"}
            </span>
            <span className="flex items-center gap-2">
              <span>🔊 Aditi Voice</span>
              <span>•</span>
              <span>📷 Vision AI</span>
            </span>
          </div>
        </div>
      </div>

      {/* Enlarged Image Lightbox Modal */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setEnlargedImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
              <p className="text-sm font-semibold text-white">Construction Photo Preview</p>
              <button
                onClick={() => setEnlargedImage(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-2">
              <img
                src={enlargedImage}
                alt="Enlarged preview"
                className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
