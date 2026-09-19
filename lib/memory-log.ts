import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Memory audit log — a local outbox of the exact facts this server has written
 * to the Cognee graph. This is NOT mock data: every entry records a real
 * dispatched offer or measured outcome from the live app. It exists because
 * Cognee's chunk search returns LLM-processed summaries rather than raw stored
 * text, and the "What RADAAR remembers" panel must show ground truth.
 *
 * Written to .data/memory-log.jsonl (gitignored) — append-only, survives restarts.
 */

const DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "memory-log.jsonl");

export interface MemoryEntry {
  ts: number;
  kind: "INSIGHT" | "OFFER_DISPATCHED" | "OFFER_OUTCOME" | "MERCHANT_PROFILE";
  fact: string;
}

export async function appendMemoryFact(kind: MemoryEntry["kind"], fact: string): Promise<void> {
  try {
    await mkdir(DIR, { recursive: true });
    const entry: MemoryEntry = { ts: Date.now(), kind, fact };
    await appendFile(FILE, JSON.stringify(entry) + "\n", "utf8");
  } catch {
    // logging must never break the pipeline
  }
}

export async function readMemoryFacts(limit = 12): Promise<MemoryEntry[]> {
  try {
    const text = await readFile(FILE, "utf8");
    const lines = text.split("\n").filter(Boolean);
    const out: MemoryEntry[] = [];
    for (const line of lines.reverse()) {
      // newest first
      try {
        out.push(JSON.parse(line) as MemoryEntry);
      } catch {
        // skip malformed lines
      }
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}
