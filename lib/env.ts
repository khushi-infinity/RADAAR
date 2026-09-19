import { readFileSync } from "node:fs";

let loaded = false;

/** Load .env once (Next.js API routes don't auto-load it when run via tsx-less dev). */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  try {
    const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch {
    // .env optional if vars are exported in the shell
  }
}

export function env(name: string): string {
  loadEnv();
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} — check .env`);
  return v.trim();
}

export function tryEnv(name: string): string | undefined {
  loadEnv();
  return process.env[name]?.trim() || undefined;
}
