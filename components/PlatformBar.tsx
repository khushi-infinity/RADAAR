"use client";

import { useEffect, useState } from "react";

interface PlatformInfo {
  n8n: { url: string; host: string };
  cognee: { tenantHost: string; dataset: string };
  sarvam: { chat: string; tts: string; stt: string };
}

export default function PlatformBar({ compact = false }: { compact?: boolean }) {
  const [info, setInfo] = useState<PlatformInfo | null>(null);

  useEffect(() => {
    fetch("/api/platforms")
      .then((r) => r.json())
      .then((j) => (j.ok ? setInfo(j as PlatformInfo & { ok: boolean }) : null))
      .catch(() => null);
  }, []);

  if (!info) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-[10.5px]">
        <a
          href={info.n8n.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 rounded-full border border-signal-up/25 bg-signal-up/5 px-2 py-0.5 font-semibold text-signal-up"
          title="Open the live n8n instance"
        >
          <span className="h-1 w-1 animate-pulse rounded-full bg-signal-up" />n8n ↗
        </a>
        <span className="flex items-center gap-1 rounded-full border border-paytm-teal/25 bg-paytm-teal/5 px-2 py-0.5 font-semibold text-paytm-teal" title={`Cognee · ${info.cognee.dataset}`}>
          <span className="h-1 w-1 rounded-full bg-paytm-teal" />Cognee
        </span>
        <span className="flex items-center gap-1 rounded-full border border-paytm-blue/25 bg-paytm-blue/5 px-2 py-0.5 font-semibold text-paytm-blue" title={`Sarvam: ${info.sarvam.chat} / ${info.sarvam.tts} / ${info.sarvam.stt}`}>
          <span className="h-1 w-1 rounded-full bg-paytm-blue" />Sarvam
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      <span className="text-slate-500">Running on</span>
      <a
        href={info.n8n.url}
        target="_blank"
        rel="noreferrer"
        className="group flex items-center gap-1.5 rounded-full border border-signal-up/25 bg-signal-up/5 px-2.5 py-1 font-semibold text-signal-up transition-colors hover:bg-signal-up/10"
        title="Open the live n8n instance — workflows deployed & activated by RADAAR"
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-up" />
        n8n · live workflows ↗
      </a>
      <span
        className="flex items-center gap-1.5 rounded-full border border-paytm-teal/25 bg-paytm-teal/5 px-2.5 py-1 font-semibold text-paytm-teal"
        title={`Cognee memory graph · dataset ${info.cognee.dataset}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-paytm-teal" />
        Cognee · {info.cognee.tenantHost.split(".")[0]}
      </span>
      <span
        className="flex items-center gap-1.5 rounded-full border border-paytm-blue/25 bg-paytm-blue/5 px-2.5 py-1 font-semibold text-paytm-blue"
        title={`Sarvam: chat ${info.sarvam.chat} · TTS ${info.sarvam.tts} · STT ${info.sarvam.stt}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-paytm-blue" />
        Sarvam · voice + chat
      </span>
      <span className="rounded-full chip-border bg-overlay px-2.5 py-1 font-semibold text-slate-400">
        synthetic Paytm-style data · nothing hardcoded
      </span>
    </div>
  );
}
