"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RadarBlip } from "@/components/Radar";
import type { BusinessSnapshot } from "@/lib/types";

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const pct = (n: number) => `${n >= 0 ? "+" : ""}${n}%`;

export interface OfferState {
  pending: boolean;
  done: boolean;
  offerId?: string;
  nudgeHi?: string;
  nudgeEn?: string;
  audienceSize?: number;
  audience?: string;
  status?: string;
}

export interface OutcomeState {
  offerId: string;
  revenueDelta: number;
  upliftPct: number;
  verdict: string;
  lesson: string;
  measuredFor: string;
}

/**
 * One RADAAR session = snapshot + selection + offer/outcome loop + memory.
 * All three designs render from this identical state, so the evaluation is
 * purely about layout/UX — not wiring.
 */
export function useRadaarSession() {
  const [snap, setSnap] = useState<BusinessSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [offers, setOffers] = useState<Record<string, OfferState>>({});
  const [outcome, setOutcome] = useState<OutcomeState | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [memoryKey, setMemoryKey] = useState(0);

  useEffect(() => {
    fetch("/api/snapshot")
      .then((r) => r.json())
      .then((j: BusinessSnapshot) => {
        setSnap(j);
        setSelectedId(j.cards[0]?.id ?? null);
      })
      .catch(() => setError("Could not reach /api/snapshot — is the dev server running?"));
  }, []);

  const blips: RadarBlip[] = useMemo(() => {
    if (!snap) return [];
    return snap.cards.map((c, i) => ({
      id: c.id,
      angleDeg: -90 + i * (360 / snap.cards.length),
      severity: c.severity,
      active: c.id === selectedId,
    }));
  }, [snap, selectedId]);

  const activeOffer = selectedId ? offers[selectedId] : undefined;

  const createOffer = useCallback(
    async (cardId: string) => {
      if (!snap) return;
      const card = snap.cards.find((c) => c.id === cardId);
      if (!card) return;
      const opp = card.linkedOpportunity ?? snap.opportunities[0];
      setOffers((o) => ({ ...o, [cardId]: { ...(o[cardId] ?? {}), pending: true } }));
      setOutcome(null);
      try {
        const res = await fetch("/api/offer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signal: card.signal,
            why: card.why,
            action: card.action,
            impact: card.impact,
            audience: opp?.type ?? "at_risk",
            audienceSize: opp?.targetSize ?? 100,
            merchant: snap.merchantName,
          }),
        });
        const j = (await res.json()) as {
          ok: boolean;
          offerId?: string;
          nudgeHi?: string;
          nudgeEn?: string;
          status?: string;
          error?: string;
        };
        if (!j.ok || !j.offerId) throw new Error(j.error ?? "offer failed");
        setMemoryKey((k) => k + 1);
        setOffers((o) => ({
          ...o,
          [cardId]: {
            pending: false,
            done: true,
            offerId: j.offerId,
            nudgeHi: j.nudgeHi,
            nudgeEn: j.nudgeEn,
            audienceSize: opp?.targetSize,
            audience: opp?.type,
            status: j.status,
          },
        }));
      } catch (e) {
        setOffers((o) => ({ ...o, [cardId]: { pending: false, done: false } }));
        setError(e instanceof Error ? e.message : "offer failed");
      }
    },
    [snap],
  );

  const measureOutcome = useCallback(
    async (cardId: string) => {
      const offer = offers[cardId];
      if (!offer?.offerId || !snap) return;
      setCelebrate(false);
      try {
        const res = await fetch("/api/outcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offerId: offer.offerId,
            action: snap.cards.find((c) => c.id === cardId)?.action ?? "offer",
            audienceSize: offer.audienceSize ?? 100,
            weeklyRevenue: snap.revenue.thisWeek,
            merchant: snap.merchantName,
          }),
        });
        const j = (await res.json()) as OutcomeState & { ok: boolean; error?: string };
        if (!j.ok) throw new Error(j.error ?? "outcome failed");
        setMemoryKey((k) => k + 1);
        setOutcome(j);
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 8000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "outcome failed");
      }
    },
    [offers, snap],
  );

  const dateLabel = snap
    ? new Date(snap.generatedAt).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
      })
    : "";

  return {
    snap,
    error,
    selectedId,
    setSelectedId,
    offers,
    outcome,
    celebrate,
    memoryKey,
    createOffer,
    measureOutcome,
    blips,
    activeOffer,
    dateLabel,
  };
}
