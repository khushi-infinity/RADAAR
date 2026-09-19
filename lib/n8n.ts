/**
 * n8n Cloud API client — minimal typed wrapper around the public API v1.
 * Docs: https://docs.n8n.io/api/
 *
 * Auth: `X-N8N-API-KEY` header (created in n8n UI → Settings → n8n API).
 */

export interface N8nNode {
  parameters: Record<string, unknown>;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  webhookId?: string;
}

export interface N8nWorkflowDef {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, { main: Array<Array<{ node: string; type: string; index: number }>> }>;
  settings: Record<string, unknown>;
}

export interface N8nWorkflow extends N8nWorkflowDef {
  id: string;
  active: boolean;
}

function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} — check .env`);
  return v.trim();
}

export function n8nConfig() {
  const base = reqEnv("N8N_BASE_URL").replace(/\/+$/, "");
  const key = reqEnv("N8N_API_KEY");
  return { base, key };
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { base, key } = n8nConfig();
  const res = await fetch(`${base}/api/v1${path}`, {
    ...init,
    headers: { "X-N8N-API-KEY": key, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`n8n ${init.method ?? "GET"} ${path} → ${res.status}: ${body.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function listWorkflows(): Promise<{ data: N8nWorkflow[] }> {
  return api("/workflows?limit=100");
}

export function createWorkflow(wf: N8nWorkflowDef): Promise<N8nWorkflow> {
  return api("/workflows", { method: "POST", body: JSON.stringify(wf) });
}

export function deleteWorkflow(id: string): Promise<void> {
  return api(`/workflows/${id}`, { method: "DELETE" });
}

export async function deactivateWorkflow(id: string): Promise<void> {
  try {
    await api(`/workflows/${id}/deactivate`, { method: "POST" });
  } catch {
    // already inactive — fine
  }
}

export function activateWorkflow(id: string): Promise<N8nWorkflow> {
  return api(`/workflows/${id}/activate`, { method: "POST" });
}

/** Production webhook URL for an active workflow's webhook node path. */
export function webhookUrl(path: string): string {
  return `${n8nConfig().base}/webhook/${path}`;
}

export interface N8nExecution {
  id: string;
  workflowId: string;
  status: string;
  startedAt?: string;
  stoppedAt?: string;
}

export function listExecutions(limit = 5): Promise<{ data: N8nExecution[] }> {
  return api(`/executions?limit=${limit}`);
}

/**
 * Idempotent deploy: replace any previous workflow with the same name,
 * create fresh, and activate. Returns the activated workflow + webhook base.
 */
export async function upsertWorkflow(wf: N8nWorkflowDef): Promise<{ id: string; active: boolean }> {
  const existing = await listWorkflows();
  for (const old of existing.data) {
    if (old.name === wf.name) {
      await deactivateWorkflow(old.id);
      await deleteWorkflow(old.id);
    }
  }
  const created = await createWorkflow(wf);
  const activated = await activateWorkflow(created.id);
  return { id: activated.id, active: activated.active };
}
