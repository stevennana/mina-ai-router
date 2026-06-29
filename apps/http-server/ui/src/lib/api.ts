import type { DirectoryListing, HealthState, RouterAgent, UiState } from "../domain/types";

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || res.statusText);
  return json as T;
}

export const routerApi = {
  state: () => api<UiState>("/api/state"),
  health: () => api<HealthState>("/api/health"),
  directories: (path?: string) => api<DirectoryListing>("/api/fs/directories", {
    method: "POST",
    body: JSON.stringify(path === "__HOME__" || !path ? {} : { path }),
  }),
  updateAgent: (id: string, body: Pick<RouterAgent, "capabilitySummary" | "capabilitySources">) =>
    api<{ agent: RouterAgent; state: UiState }>(`/api/agents/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteAgent: (id: string) => api<{ agent: RouterAgent; state: UiState }>(`/api/agents/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }),
  restartAgent: (id: string) => api<{ agent: RouterAgent; state: UiState }>(`/api/agents/${encodeURIComponent(id)}/restart`, {
    method: "POST",
  }),
  createTmuxAgent: (body: { agentType: string; projectRoot: string; id?: string; sessionId?: string; permissionProfile?: string }) =>
    api<{ agent: RouterAgent; state: UiState; existed: boolean; registration: string; nextAction: string; attachCommand: string; mairAttachCommand: string; permissionProfile: Pick<RouterAgent, "permissionProfile" | "permissionProfileStatus" | "permissionProfileDetail">; mcpPreflight: Pick<RouterAgent, "mcpPreflightStatus" | "mcpPreflightDetail" | "mcpSetupCommand" | "mcpVerifyCommand" | "mcpRemoveCommand" | "mcpUrl"> & { status: string; nextAction: string; canSendSelfRegistrationPrompt: boolean } }>("/api/agents/create-tmux", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  ask: (target: string, task: string) => api<{ result: unknown; state: UiState }>("/api/ask", {
    method: "POST",
    body: JSON.stringify({ target, task, timeoutMs: 300000 }),
  }),
  requestAction: (requestId: string, action: "retry" | "cancel" | "archive" | "unarchive") =>
    api<{ result: { requestId?: string; targetAgent?: string }; state: UiState }>(`/api/requests/${encodeURIComponent(requestId)}/${action}`, {
      method: "POST",
    }),
  archiveStale: () => api<{ archived: unknown[]; state: UiState }>("/api/requests/archive-stale", {
    method: "POST",
    body: JSON.stringify({ olderThanMs: 30 * 60 * 1000 }),
  }),
  terminal: (agentId: string) => api<{ terminal: { text: string; trustPrompt: boolean; permissionPrompt?: RouterAgent["permissionPrompt"]; pendingRegistration: boolean } }>(`/api/agents/${encodeURIComponent(agentId)}/terminal`),
  terminalInput: (agentId: string, text: string, enter: boolean) =>
    api<{ registration: string; terminal: { text: string; trustPrompt: boolean; permissionPrompt?: RouterAgent["permissionPrompt"]; pendingRegistration: boolean } }>(`/api/agents/${encodeURIComponent(agentId)}/terminal/input`, {
      method: "POST",
      body: JSON.stringify({ text, enter }),
    }),
  setupPair: () => api<{ helper: RouterAgent }>("/api/setup-codex-pair", {
    method: "POST",
    body: JSON.stringify({
      helperRoot: "/Users/stevenna/PycharmProjects/mina-ralph-loop-bootstrap-nextjs",
      helperId: "ralph",
      sessionId: "mina-ralph-codex",
    }),
  }),
};

export async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement("textarea");
  input.value = value;
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}
