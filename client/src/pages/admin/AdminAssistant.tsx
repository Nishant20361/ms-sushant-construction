import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { adminAssistantApi, adminApi, ApiRequestError } from "../../lib/api";
import type { AdminAssistantResponse as AssistantResponse } from "../../types";
const shortcuts = [
  ["Customer udhari", "Customer ki udhari dekhni hai"],
  ["Business growth", "Mera business kaise badhaun?"],
  ["Cash flow", "Business ka cash flow kaise manage karun?"],
  ["Help", "help"],
];
type SpeechInstance = {
  lang: string;
  interimResults: boolean;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
};
export default function AdminAssistant() {
  const [messages, setMessages] = useState<
    (AssistantResponse & { role: "user" | "assistant" })[]
  >([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [context, setContext] = useState<string>();
  const [pin, setPin] = useState("");
  const [unlock, setUnlock] = useState(false);
  const [listening, setListening] = useState(false);
  const [language, setLanguage] = useState("hi-IN");
  const speech = useRef<SpeechInstance>();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);
  useEffect(() => () => speech.current?.stop(), []);
  async function send(text = draft, selection?: string) {
    if (busy || !text.trim()) return;
    setBusy(true);
    setError("");
    setDraft("");
    setMessages((m) => [...m, { role: "user", message: text }]);
    try {
      const r = await adminAssistantApi.chat({
        message: text,
        contextToken: context,
        selection,
      });
      setContext(r.contextToken);
      setMessages((m) => [...m, { ...r, role: "assistant" }]);
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 400)
        setContext(undefined);
      if (e instanceof ApiRequestError && e.status === 403) setUnlock(true);
      setError(e instanceof Error ? e.message : "Request failed");
      setDraft(text);
    } finally {
      setBusy(false);
    }
  }
  async function unlockPin() {
    setBusy(true);
    setError("");
    try {
      await adminApi.verifyKhatabookPin(pin);
      setPin("");
      setUnlock(false);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          message:
            "Khatabook unlocked for this session (15 minutes). Ab udhari request dobara bhejein.",
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unlock failed");
    } finally {
      setBusy(false);
    }
  }
  function voice() {
    if (listening) {
      speech.current?.stop();
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechInstance;
      webkitSpeechRecognition?: new () => SpeechInstance;
    };
    const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!C) {
      setError(
        "Voice recognition is unavailable in this browser. Use keyboard dictation or type.",
      );
      return;
    }
    const s = new C();
    s.lang = language;
    s.interimResults = true;
    s.onresult = (e) =>
      setDraft(
        Array.from(e.results)
          .map((r) => r[0].transcript)
          .join(" "),
      );
    s.onend = () => setListening(false);
    s.onerror = () => {
      setListening(false);
      setError("Microphone unavailable. Allow access or type your request.");
    };
    speech.current = s;
    setListening(true);
    try {
      s.start();
    } catch {
      setListening(false);
      setError("Voice could not start. Try again or type your message.");
    }
  }
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="rounded-2xl bg-emerald-950 p-5 text-white">
        <h2 className="text-2xl font-bold">Sushant Business Saathi</h2>
        <p className="mt-2 text-sm text-emerald-100">
          Udhari lookup aur dost jaisi business advice. Hindi • Hinglish •
          English
        </p>
        <p className="mt-2 text-xs">PIN/password chat mein na likhein.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {shortcuts.map(([label, text]) => (
          <button
            key={label}
            disabled={busy}
            className="rounded-xl border bg-white px-3 py-2 text-sm disabled:opacity-50"
            onClick={() => {
              setContext(undefined);
              setDraft(text);
            }}
          >
            {label}
          </button>
        ))}
        <button
          disabled={busy}
          className="rounded-xl border px-3 py-2 text-sm"
          onClick={() => {
            setMessages([]);
            setContext(undefined);
            setError("");
            setDraft("");
          }}
        >
          New conversation
        </button>
        <button
          disabled={busy}
          className="rounded-xl border px-3 py-2 text-sm"
          onClick={() => setUnlock((v) => !v)}
        >
          Unlock Khatabook
        </button>
      </div>
      {unlock && (
        <form
          className="flex flex-wrap gap-2 rounded-xl bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void unlockPin();
          }}
        >
          <input
            aria-label="Khatabook PIN"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="rounded border p-2"
            autoComplete="off"
            placeholder="Khatabook PIN"
          />
          <button
            disabled={busy || !pin}
            className="rounded bg-emerald-800 px-4 text-white"
          >
            Unlock
          </button>
          <Link to="/admin/khatabook" className="p-2 underline">
            Set up / reset PIN
          </Link>
        </form>
      )}
      <div
        className="max-h-[60vh] space-y-4 overflow-y-auto rounded-2xl border bg-slate-50 p-4"
        aria-live="polite"
      >
        {!messages.length && (
          <p>
            Namaste! “Raju ka kitna udhar hai?” ya “Mere kapde ke business ko
            kaise badhaun?” poochhein.
          </p>
        )}
        {messages.map((m, index) => (
          <div
            key={index}
            className={`rounded-xl p-4 ${m.role === "user" ? "ml-8 bg-emerald-100" : "mr-2 bg-white shadow-sm"}`}
          >
            <p className="mb-1 text-xs font-bold text-emerald-800">
              {m.role === "user" ? "You" : "Admin Assistant"}
            </p>
            <p className="whitespace-pre-wrap">{m.message}</p>
            {m.options && (
              <div className="mt-3 flex flex-wrap gap-2">
                {m.options.map((o) => (
                  <button
                    disabled={busy || context !== m.contextToken}
                    key={o.value}
                    className="rounded-lg border px-3 py-3 disabled:opacity-40"
                    onClick={() => void send(o.label, o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <p>Jawab tayyar ho raha hai…</p>}
        <div ref={end} />
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">
          {error}
        </p>
      )}
      <form
        className="flex flex-wrap items-end gap-2 rounded-2xl border bg-white p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          aria-label="Admin assistant message"
          value={draft}
          maxLength={2000}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
          placeholder="Bolkar ya likhkar batayein…"
          className="min-h-14 min-w-48 flex-1 resize-y rounded-xl border p-3"
        />
        <select
          aria-label="Voice language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded border p-2"
        >
          <option value="hi-IN">Hindi voice</option>
          <option value="en-IN">English voice</option>
        </select>
        <button
          type="button"
          disabled={busy}
          onClick={voice}
          className="rounded-xl border px-3 py-3"
        >
          {listening ? "Stop mic" : "🎤 Voice"}
        </button>
        <button
          disabled={busy || !draft.trim() || listening}
          className="rounded-xl bg-emerald-800 px-4 py-3 text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
      <p className="text-xs text-slate-500">
        Voice text review/edit karke Send karein. Udhari live records se aati
        hai. Business advice general guidance hai.
      </p>
    </div>
  );
}
