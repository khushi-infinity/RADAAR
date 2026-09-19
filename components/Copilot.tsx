"use client";

import { useEffect, useRef, useState } from "react";
import { blobToWav } from "@/lib/wav";

interface Msg {
  role: "user" | "assistant";
  text: string;
  source?: string;
}

/** Strip markdown decorations the graph models like to emit (**bold**, `code`). */
function stripMd(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(?<![\w*])\*([^*\n]+)\*(?![\w*])/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

export default function Copilot() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Namaste! Main RADAAR hoon — aapka business copilot. Poochiye: revenue, customers, offers — kuch bhi. 🎙️",
      source: "hello",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // MediaRecorder state (Sarvam STT path)
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ── voice input: real mic audio → Sarvam saarika STT ───────────────────────
  async function startListening() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => void finishRecording();
      rec.onerror = () => {
        setMicError("Mic error — try again.");
        setListening(false);
      };
      mediaRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setMicError("Mic permission needed for voice input — typing works everywhere.");
      setListening(false);
    }
  }

  function stopListening() {
    mediaRef.current?.stop();
    setListening(false);
  }

  async function finishRecording() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    const blob = new Blob(chunksRef.current, { type: mediaRef.current?.mimeType || "audio/webm" });
    if (blob.size < 1200) {
      setMicError("Kuch sunayi nahi diya — thoda aur bol ke try karein.");
      return;
    }
    setTranscribing(true);
    try {
      // 1) transcribe with Sarvam saarika (via our API route)
      //    Sarvam accepts wav/mp3/flac — convert the browser's webm/opus client-side
      let upload: Blob = blob;
      if (!blob.type.includes("wav") && !blob.type.includes("mpeg") && !blob.type.includes("mp3")) {
        upload = await blobToWav(blob);
      }
      const fd = new FormData();
      fd.append("audio", upload, upload.type.includes("wav") ? "speech.wav" : "speech.webm");
      const sttRes = await fetch("/api/stt", { method: "POST", body: fd });
      const stt = (await sttRes.json()) as { ok: boolean; transcript?: string; error?: string };
      if (!stt.ok || !stt.transcript) throw new Error(stt.error ?? "STT failed");
      // 2) send the transcript through the normal pipeline
      await send(stt.transcript, true);
    } catch (e) {
      // 3) graceful fallback: browser-native recognition, if available
      const Ctor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (Ctor) {
        setMicError("Sarvam STT par complaint aa gayi — ek baar ke liye on-device speech recognition use kar rahe hain.");
        const rec = new Ctor();
        rec.lang = "hi-IN";
        rec.interimResults = false;
        rec.onresult = (ev: any) => {
          const said = String(ev.results?.[0]?.[0]?.transcript ?? "").trim();
          if (said) void send(said, true);
        };
        rec.onerror = () => setMicError("Voice input is abhi kaam nahi kar raha — typing works perfectly.");
        rec.start();
        return;
      }
      setMicError(
        e instanceof Error && /network|fetch/i.test(e.message)
          ? "Network issue — voice try again karein."
          : "Voice input is abhi kaam nahi kar raha — typing works perfectly.",
      );
    } finally {
      setTranscribing(false);
    }
  }

  function speak(text: string) {
    if (!voiceOn) return;
    audioRef.current?.pause();
    const audio = new Audio(`/api/tts?text=${encodeURIComponent(stripMd(text).slice(0, 400))}`);
    audioRef.current = audio;
    void audio.play().catch(() => {
      /* autoplay blocked until first interaction — fine */
    });
  }

  // ── send ───────────────────────────────────────────────────────────────────
  async function send(text: string, fromVoice = false) {
    const q = text.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { role: "user", text: fromVoice ? `🎙️ ${q}` : q }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      const j = (await res.json()) as { ok: boolean; answer?: string; source?: string; error?: string };
      const answer = j.ok
        ? stripMd(j.answer ?? "…")
        : "Sorry, main abhi thoda busy hoon — ek baar phir try karein.";
      setMessages((m) => [...m, { role: "assistant", text: answer, source: j.source }]);
      speak(answer);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Network error — please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  // chips = one-tap demo questions
  const CHIPS = [
    "Is hafte sabse zyada bike kis din hui?",
    "Why are evening sales low?",
    "Kaunsi offer chalau?",
  ];

  const micLabel = listening
    ? "Recording… tap to stop"
    : transcribing
    ? "Transcribing (Sarvam saarika)…"
    : "Voice input — transcribed by Sarvam STT";

  return (
    <div className="glass flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b chip-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute h-full w-full animate-ping rounded-full bg-paytm-teal opacity-60" />
            <span className="h-2.5 w-2.5 rounded-full bg-paytm-teal" />
          </span>
          <h3 className="font-display text-sm font-bold text-slate-100">RADAAR Copilot</h3>
          <span className="rounded-full bg-overlay px-2 py-0.5 text-[10px] text-slate-400">Hindi · English</span>
        </div>
        <button
          onClick={() => setVoiceOn((v) => !v)}
          title={voiceOn ? "Voice replies on" : "Voice replies off"}
          className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
            voiceOn ? "bg-paytm-blue/15 text-paytm-cyan" : "bg-overlay text-slate-500"
          }`}
        >
          {voiceOn ? "🔊 On" : "🔇 Off"}
        </button>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-md bg-gradient-to-br from-paytm-blue/25 to-paytm-cyan/15 text-slate-100"
                  : "rounded-bl-md bg-overlay text-slate-300"
              }`}
            >
              {m.text}
              {m.source === "memory-graph" && (
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-paytm-teal">
                  ● grounded in memory graph
                </span>
              )}
              {m.source === "live-snapshot" && (
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-signal-warn">
                  ● from live snapshot
                </span>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-overlay px-3.5 py-2.5">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t chip-border px-4 py-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {CHIPS.map((c) => (
            <button
              key={c}
              onClick={() => void send(c)}
              className="rounded-full chip-border bg-overlay px-2.5 py-1 text-[11px] text-slate-400 transition-colors hover:border-paytm-blue/40 hover:text-slate-200"
            >
              {c}
            </button>
          ))}
        </div>
        {micError && <p className="mb-2 text-[11px] text-signal-warn">{micError}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything… ya bol ke poochhein"
            className="min-w-0 flex-1 rounded-xl chip-border bg-ink-900/60 px-3.5 py-2.5 text-[13px] text-slate-200 placeholder:text-slate-500 focus:border-paytm-blue/50 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => (listening ? stopListening() : void startListening())}
            disabled={transcribing}
            title={micLabel}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
              listening
                ? "animate-pulse bg-signal-down/20 text-signal-down shadow-glow"
                : transcribing
                ? "bg-paytm-blue/10 text-paytm-cyan"
                : "bg-overlay text-slate-300 hover:bg-overlay-hover"
            }`}
            aria-label={micLabel}
          >
            {transcribing ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-paytm-cyan/30 border-t-paytm-cyan" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0M12 19v3" strokeLinecap="round" />
              </svg>
            )}
          </button>
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="h-10 shrink-0 rounded-xl bg-gradient-to-r from-paytm-blue to-paytm-cyan px-4 text-[13px] font-bold text-ink-950 disabled:opacity-40"
          >
            Send
          </button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-slate-600">
          voice: Sarvam saarika (STT) + bulbul (TTS) · answers: Cognee memory graph
        </p>
      </div>
    </div>
  );
}
