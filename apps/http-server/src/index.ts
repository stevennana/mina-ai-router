#!/usr/bin/env node
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { AgentNotRouteReadyError, AgentRegistry, AgentRouter, buildMcpPreflight, FileState, RequestStore, type Agent, type AgentCapabilityProfile, type TransportType } from "../../../packages/core/src";
import { createMinaMcpProvider } from "../../../packages/mcp/src/provider";
import { DefaultTransportRegistry, detectAgentPermissionPrompt, HeadlessTransport, TmuxClient, TmuxTransport, ZmuxTransport } from "../../../packages/transports/src";
import type { McpFetchHandler, McpRuntimeProvider } from "@minasoft/mcp-runtime";

type RuntimeModule = typeof import("@minasoft/mcp-runtime");

declare const __dirname: string;

const importEsm = new Function("specifier", "return import(specifier)") as (
  specifier: string,
) => Promise<RuntimeModule>;
const runtimeModuleUrl = pathToFileURL(
  join(__dirname, "../../../../node_modules/@minasoft/mcp-runtime/dist/index.js"),
).href;

const port = Number(process.env.PORT ?? process.env.MINA_HTTP_PORT ?? 3333);
const host = process.env.HOST ?? process.env.MINA_HTTP_HOST ?? "127.0.0.1";
const statePath = process.env.MINA_ROUTER_STATE ?? join(process.cwd(), "data", "router-state.json");
const agentStaleAfterMs = Number(process.env.MINA_AGENT_STALE_AFTER_MS ?? 15 * 60 * 1000);
const context = createContext();
let mcpHandlerPromise: Promise<McpFetchHandler> | undefined;

function createContext() {
  const fileState = new FileState(statePath);
  const state = fileState.load();
  const registry = new AgentRegistry(state.agents);
  const requestStore = new RequestStore(state.requests);
  const transports = new DefaultTransportRegistry()
    .register("mock", new HeadlessTransport())
    .register("headless", new HeadlessTransport())
    .register("tmux", new TmuxTransport())
    .register("zmux", new ZmuxTransport());
  const baseContext = {
    fileState,
    registry,
    requestStore,
    save: () =>
      fileState.save({
        agents: registry.list(),
        requests: requestStore.list(),
      }),
  };
  const router = new AgentRouter({
    registry,
    requestStore,
    transports,
    agentStaleAfterMs,
    onStateChanged: baseContext.save,
  });

  return {
    ...baseContext,
    transports,
    router,
  };
}

const server = createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  });
});

(server as unknown as { on(event: "error", listener: (error: unknown) => void): void }).on("error", (error) => {
  console.error(`Mina AI Router HTTP server failed to start: ${error instanceof Error ? error.message : String(error)}`);
  throw error instanceof Error ? error : new Error(String(error));
});

server.listen(port, host, () => {
  console.log(`Mina AI Router HTTP server`);
  console.log(`UI:  http://${host}:${port}/`);
  console.log(`MCP: http://${host}:${port}/mcp`);
  console.log(`State: ${statePath}`);
});

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);

  if (request.method === "OPTIONS") {
    sendOptions(response);
    return;
  }

  if (url.pathname === "/" && request.method === "GET") {
    sendHtml(response, renderAppHtml());
    return;
  }

  if (url.pathname.startsWith("/assets/") && request.method === "GET") {
    sendStaticAsset(response, url.pathname);
    return;
  }

  if (url.pathname === "/favicon.ico" && request.method === "GET") {
    response.statusCode = 204;
    response.end();
    return;
  }

  if (url.pathname === "/mcp" && request.method === "POST") {
    await handleMcp(request, response, url);
    return;
  }

  if (url.pathname === "/api/state" && request.method === "GET") {
    sendJson(response, 200, await getUiState());
    return;
  }

  if (url.pathname === "/api/health" && request.method === "GET") {
    sendJson(response, 200, await getHealth());
    return;
  }

  if (url.pathname === "/api/fs/directories" && request.method === "POST") {
    const body = await readJsonBody(request);
    sendJson(response, 200, listDirectories(body));
    return;
  }

  if (url.pathname === "/api/register" && request.method === "POST") {
    const body = await readJsonBody(request);
    const agent = registerAgent(body);
    sendJson(response, 200, { agent, state: await getUiState() });
    return;
  }

  const agentCapabilityRefreshMatch = url.pathname.match(/^\/api\/agents\/([^/]+)\/refresh-capabilities$/);
  if (agentCapabilityRefreshMatch && request.method === "POST") {
    const body = await readJsonBody(request);
    const result = await refreshAgentCapabilities(decodeURIComponent(agentCapabilityRefreshMatch[1]), body);
    sendJson(response, 200, { ...result, state: await getUiState() });
    return;
  }

  const agentDeleteMatch = url.pathname.match(/^\/api\/agents\/([^/]+)$/);
  if (agentDeleteMatch && request.method === "PATCH") {
    const body = await readJsonBody(request);
    const agent = updateAgent(decodeURIComponent(agentDeleteMatch[1]), body);
    sendJson(response, 200, { agent, state: await getUiState() });
    return;
  }

  if (agentDeleteMatch && request.method === "DELETE") {
    const agent = context.registry.unregister(decodeURIComponent(agentDeleteMatch[1]));
    context.save();
    sendJson(response, 200, { agent, state: await getUiState() });
    return;
  }

  const agentRestartMatch = url.pathname.match(/^\/api\/agents\/([^/]+)\/restart$/);
  if (agentRestartMatch && request.method === "POST") {
    const agent = restartAgent(decodeURIComponent(agentRestartMatch[1]));
    sendJson(response, 200, { agent, state: await getUiState() });
    return;
  }

  const agentTerminalMatch = url.pathname.match(/^\/api\/agents\/([^/]+)\/terminal$/);
  if (agentTerminalMatch && request.method === "GET") {
    sendJson(response, 200, captureAgentTerminal(decodeURIComponent(agentTerminalMatch[1])));
    return;
  }

  const agentTerminalInputMatch = url.pathname.match(/^\/api\/agents\/([^/]+)\/terminal\/input$/);
  if (agentTerminalInputMatch && request.method === "POST") {
    const body = await readJsonBody(request);
    sendJson(response, 200, sendAgentTerminalInput(decodeURIComponent(agentTerminalInputMatch[1]), body));
    return;
  }

  if (url.pathname === "/api/agents/create-tmux" && request.method === "POST") {
    const body = await readJsonBody(request);
    const result = createTmuxAgent(body);
    sendJson(response, 200, { ...result, state: await getUiState() });
    return;
  }

  if (url.pathname === "/api/ask" && request.method === "POST") {
    const body = await readJsonBody(request);
    const target = typeof body.target === "string" ? body.target : "";
    const task = typeof body.task === "string" ? body.task : "";
    const timeoutMs = typeof body.timeoutMs === "number" ? body.timeoutMs : 300_000;

    if (!target || !task) {
      sendJson(response, 400, { error: "target and task are required" });
      return;
    }

    try {
      const result = await context.router.callAgent({ target, task, timeoutMs });
      context.save();
      sendJson(response, 200, { result, state: await getUiState() });
    } catch (error) {
      context.save();
      sendJson(response, error instanceof AgentNotRouteReadyError ? 409 : 500, {
        error: error instanceof Error ? error.message : String(error),
        state: await getUiState(),
      });
    }
    return;
  }

  const requestActionMatch = url.pathname.match(/^\/api\/requests\/([^/]+)\/(retry|cancel|archive|unarchive|interrupt|recover)$/);
  if (requestActionMatch && request.method === "POST") {
    const requestId = decodeURIComponent(requestActionMatch[1]);
    const action = requestActionMatch[2];
    try {
      const result = await handleRequestAction(requestId, action);
      sendJson(response, 200, { result, state: await getUiState() });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : String(error),
        state: await getUiState(),
      });
    }
    return;
  }

  if (url.pathname === "/api/requests/archive-stale" && request.method === "POST") {
    const body = await readJsonBody(request);
    const olderThanMs = typeof body.olderThanMs === "number" ? body.olderThanMs : 30 * 60 * 1000;
    const archived = archiveStaleRequests(olderThanMs);
    sendJson(response, 200, { archived, state: await getUiState() });
    return;
  }

  if (url.pathname === "/api/setup-codex-pair" && request.method === "POST") {
    const body = await readJsonBody(request);
    const result = setupCodexPair(body);
    sendJson(response, 200, result);
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

function archiveStaleRequests(olderThanMs: number) {
  const staleStatuses = new Set(["created", "sent", "waiting"]);
  const cutoff = Date.now() - olderThanMs;
  const archived = [];

  for (const request of context.requestStore.list()) {
    if (!staleStatuses.has(request.status)) {
      continue;
    }

    const updatedAt = Date.parse(request.updatedAt);
    if (Number.isFinite(updatedAt) && updatedAt > cutoff) {
      continue;
    }

    const archivedRequest = context.requestStore.updateStatus(request.id, "archived", {
      archivedAt: new Date().toISOString(),
      archivedFromStatus: request.status,
      error: request.error ?? "Archived as stale by operator.",
      leaseStatus: request.leaseStatus === "active" ? "released" : request.leaseStatus,
      leaseReleasedAt: request.leaseStatus === "active" ? new Date().toISOString() : request.leaseReleasedAt,
    });
    clearAgentLeaseForRequest(archivedRequest);
    archived.push(archivedRequest);
  }

  if (archived.length > 0) {
    context.save();
  }

  return archived;
}

async function handleRequestAction(requestId: string, action: string) {
  const request = context.requestStore.require(requestId);

  if (action === "retry") {
    context.requestStore.assertActionAllowed(request, "retry");
    const result = await context.router.callAgent({
      sourceAgent: request.sourceAgent,
      target: request.targetAgent,
      task: request.task,
      retryOfRequestId: request.id,
    });
    context.requestStore.recordRetry(request.id, result.requestId);
    context.save();
    return result;
  }

  if (action === "cancel") {
    const updated = context.requestStore.cancel(requestId, "Cancelled by operator from Mina AI Router UI.", "ui");
    clearAgentLeaseForRequest(updated);
    context.save();
    return updated;
  }

  if (action === "interrupt") {
    const updated = interruptRequest(requestId, "ui");
    context.save();
    return updated;
  }

  if (action === "recover") {
    const updated = context.router.recoverRequestLease(
      requestId,
      "ui",
      "Marked recovered by operator from Mina AI Router UI.",
    );
    return updated;
  }

  if (action === "archive") {
    return context.router.archiveRequest(requestId, "ui", "Archived by operator from Mina AI Router UI.");
  }

  if (action === "unarchive") {
    const updated = context.requestStore.unarchive(requestId);
    context.save();
    return updated;
  }

  throw new Error(`Unsupported request action "${action}".`);
}

function interruptRequest(requestId: string, source: "cli" | "http" | "ui") {
  const request = context.requestStore.require(requestId);
  context.requestStore.assertActionAllowed(request, "interrupt");
  const agentId = request.leaseOwnerAgentId ?? request.targetAgent;
  const agent = context.registry.require(agentId);
  if (agent.transport !== "tmux") {
    throw new Error(`Request "${requestId}" targets ${agent.transport}, not tmux; open the session manually.`);
  }

  const target = agent.tmuxTarget ?? agent.sessionId;
  new TmuxClient().sendInterrupt(target);
  return context.requestStore.recordInterrupt(requestId, {
    source,
    terminalTarget: target,
    message: `Terminal interrupt sent to ${target}.`,
  });
}

function clearAgentLeaseForRequest(request: { leaseOwnerAgentId?: string; id: string }) {
  if (!request.leaseOwnerAgentId) {
    return;
  }

  const agent = context.registry.get(request.leaseOwnerAgentId);
  if (!agent || agent.activeRequestId !== request.id) {
    return;
  }

  context.registry.register({
    ...agent,
    activeRequestId: undefined,
    leaseStatus: "released",
    leaseReleasedAt: new Date().toISOString(),
  });
}

async function handleMcp(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
): Promise<void> {
  const handler = await getMcpHandler();
  const body = await readRawBody(request);
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      headers.set(key, value.join(", "));
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  const fetchRequest = new Request(url.href, {
    method: request.method,
    headers,
    body,
  });
  const fetchResponse = await handler(fetchRequest);
  response.statusCode = fetchResponse.status;
  fetchResponse.headers.forEach((value, key) => {
    response.setHeader(key, value);
  });
  response.end(Buffer.from(await fetchResponse.arrayBuffer()));
}

async function getMcpHandler(): Promise<McpFetchHandler> {
  if (mcpHandlerPromise) {
    return mcpHandlerPromise;
  }

  mcpHandlerPromise = importEsm(runtimeModuleUrl).then((runtime) => {
    const provider: McpRuntimeProvider = createMinaMcpProvider(context);
    return runtime.createMcpFetchHandler(provider, {
      cors: {
        allowedOrigins: ["*"],
      },
      async context(request) {
        return {
          requestId: request.headers.get("x-request-id") ?? undefined,
        };
      },
    });
  });

  return mcpHandlerPromise;
}

async function getUiState() {
  hydratePendingCapabilityNotices();
  return {
    statePath,
    mcpUrl: `http://${host}:${port}/mcp`,
    agents: await context.router.listAgentStatuses(),
    requests: context.router.listRequests(),
  };
}

async function getHealth() {
  const agents = await context.router.listAgentStatuses();
  const requests = context.router.listRequests();
  const openRequests = requests.filter((request) => ["created", "sent", "waiting"].includes(request.status));

  return {
    ok: agents.every((agent) => !["missing", "stale", "needs-attention"].includes(agent.status)),
    statePath,
    mcpUrl: `http://${host}:${port}/mcp`,
    agents: {
      total: agents.length,
      available: agents.filter((agent) => agent.status === "available").length,
      busy: agents.filter((agent) => agent.status === "busy").length,
      stale: agents.filter((agent) => agent.status === "stale").length,
      missing: agents.filter((agent) => agent.status === "missing").length,
      needsAttention: agents.filter((agent) => agent.status === "needs-attention").length,
      unknown: agents.filter((agent) => agent.status === "unknown").length,
    },
    requests: {
      total: requests.length,
      open: openRequests.length,
      waiting: requests.filter((request) => request.status === "waiting").length,
      answered: requests.filter((request) => request.status === "answered").length,
      failed: requests.filter((request) => ["failed", "timeout", "cancelled"].includes(request.status)).length,
      archived: requests.filter((request) => request.status === "archived").length,
    },
  };
}

function registerAgent(body: Record<string, unknown>): Agent {
  const id = requiredString(body.id, "id");
  const projectRoot = stringValue(body.projectRoot) ?? process.cwd();
  const capabilityNotice = inferCapabilityNotice(projectRoot);
  const now = new Date().toISOString();
  const agent: Agent = {
    id,
    name: stringValue(body.name) ?? id,
    agentType: stringValue(body.agentType) ?? "codex",
    transport: (stringValue(body.transport) ?? "tmux") as TransportType,
    sessionId: stringValue(body.sessionId) ?? id,
    projectRoot,
    tmuxTarget: stringValue(body.tmuxTarget),
    startupCommand: stringValue(body.startupCommand),
    capabilitySummary: stringValue(body.capabilitySummary) ?? capabilityNotice.summary,
    capabilitySources: stringValue(body.capabilitySources) ?? capabilityNotice.sources,
    capabilityProfile: capabilityProfileValue(body.capabilityProfile),
    bootstrapStatus: stringValue(body.bootstrapStatus) ?? "ready",
    registrationSource: stringValue(body.registrationSource) ?? "manual",
    registrationStatus: stringValue(body.registrationStatus) ?? "confirmed",
    lastRegistrationAttemptAt: stringValue(body.lastRegistrationAttemptAt) ?? now,
    confirmedByAgentAt: stringValue(body.confirmedByAgentAt) ?? now,
    sessionFingerprint: stringValue(body.sessionFingerprint) ?? stringValue(body.sessionId) ?? id,
    permissionProfile: stringValue(body.permissionProfile) ?? "default",
    permissionProfileStatus: stringValue(body.permissionProfileStatus) ?? "not-requested",
    permissionProfileDetail: stringValue(body.permissionProfileDetail),
    mcpPreflightStatus: stringValue(body.mcpPreflightStatus),
    mcpPreflightDetail: stringValue(body.mcpPreflightDetail),
    mcpSetupCommand: stringValue(body.mcpSetupCommand),
    mcpVerifyCommand: stringValue(body.mcpVerifyCommand),
    mcpRemoveCommand: stringValue(body.mcpRemoveCommand),
    mcpUrl: stringValue(body.mcpUrl),
  };

  const registered = context.registry.register(agent, {
    capabilitySource: agent.capabilitySummary || agent.capabilitySources ? "generated" : undefined,
  });
  context.save();
  return registered;
}

function capabilityProfileValue(value: unknown): Agent["capabilityProfile"] | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  return {
    projectPurpose: stringValue(record.projectPurpose),
    primaryLanguages: stringArrayValue(record.primaryLanguages),
    keyAreas: stringArrayValue(record.keyAreas),
    canAnswer: stringArrayValue(record.canAnswer),
    cannotAnswerYet: stringArrayValue(record.cannotAnswerYet),
    evidence: stringArrayValue(record.evidence),
    quality: "missing",
  };
}

function stringArrayValue(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const values = value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .map((item) => item.trim());
  return values.length ? values : undefined;
}

function updateAgent(id: string, body: Record<string, unknown>): Agent {
  const current = context.registry.require(id);
  const capabilitySummary = stringFieldValue(body, "capabilitySummary");
  const capabilitySources = stringFieldValue(body, "capabilitySources");
  const next: Agent = {
    ...current,
    name: stringValue(body.name) ?? current.name,
  };

  context.registry.register(next);
  const updated = capabilitySummary !== undefined || capabilitySources !== undefined
    ? context.registry.updateCapabilities(id, {
      summary: capabilitySummary,
      sources: capabilitySources,
      source: "manual",
    })
    : context.registry.require(id);
  context.save();
  return updated;
}

async function refreshAgentCapabilities(id: string, body: Record<string, unknown>) {
  const agent = context.registry.require(id);
  const response = await context.router.callAgent({
    target: id,
    task: buildCapabilityRefreshTask(agent),
    timeoutMs: typeof body.timeoutMs === "number" ? body.timeoutMs : undefined,
  });
  const notice = parseCapabilityRefreshAnswer(response.answer);
  const refreshedAt = new Date().toISOString();
  const updated = context.registry.updateCapabilities(id, {
    summary: notice.capabilitySummary,
    sources: notice.capabilitySources,
    source: "generated",
    refreshedAt,
    profile: notice.capabilityProfile,
  });
  context.save();

  return {
    agent: updated,
    refresh: {
      requestId: response.requestId,
      refreshedAt,
      capabilitySource: updated.capabilitySource,
    },
  };
}

function buildCapabilityRefreshTask(agent: Agent): string {
  return [
    "Refresh your Mina AI Router capability registration for this visible local agent.",
    "",
    "Inspect local project docs and metadata before answering.",
    "Prefer capability docs in this order when present: CLAUDE.md/claude.md, AGENTS.md/agents.md, agent.md, README.md.",
    "If those files are missing, inspect package metadata and the project file tree.",
    "",
    "Return only JSON with these string fields:",
    "{",
    '  "capabilitySummary": "2-5 short bullets or one short paragraph under 800 characters",',
    '  "capabilitySources": "comma-separated file paths or project signals used",',
    '  "capabilityProfile": {',
    '    "projectPurpose": "what this project implements",',
    '    "primaryLanguages": ["TypeScript"],',
    '    "keyAreas": ["router", "MCP endpoint"],',
    '    "canAnswer": ["specific question domains this agent can answer"],',
    '    "cannotAnswerYet": ["known limits"],',
    '    "evidence": ["README.md", "package.json", "src/..."]',
    "  }",
    "}",
    "",
    "Do not include markdown fences or extra commentary in the JSON body.",
    "",
    "Registration context:",
    `- id: ${agent.id}`,
    `- agentType: ${agent.agentType}`,
    `- transport: ${agent.transport}`,
    `- sessionId: ${agent.sessionId}`,
    `- projectRoot: ${agent.projectRoot}`,
  ].join("\n");
}

function parseCapabilityRefreshAnswer(answer: string): { capabilitySummary: string; capabilitySources: string; capabilityProfile?: Partial<AgentCapabilityProfile> } {
  const trimmed = answer.trim();
  const jsonText = trimmed.startsWith("{") ? trimmed : trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1);

  if (!jsonText || !jsonText.startsWith("{") || !jsonText.endsWith("}")) {
    throw new Error("Capability refresh response did not contain a JSON object.");
  }

  const parsed = JSON.parse(jsonText) as {
    capabilitySummary?: unknown;
    capabilitySources?: unknown;
    capabilityProfile?: unknown;
  };
  const capabilitySummary = typeof parsed.capabilitySummary === "string" ? parsed.capabilitySummary.trim() : "";
  const capabilitySources = typeof parsed.capabilitySources === "string" ? parsed.capabilitySources.trim() : "";

  if (!capabilitySummary || !capabilitySources) {
    throw new Error("Capability refresh JSON requires non-empty capabilitySummary and capabilitySources strings.");
  }

  if (capabilitySummary.length > 800) {
    throw new Error("Capability refresh JSON capabilitySummary must be under 800 characters.");
  }

  return {
    capabilitySummary,
    capabilitySources,
    capabilityProfile: capabilityProfileValue(parsed.capabilityProfile),
  };
}

function listDirectories(body: Record<string, unknown>) {
  const home = process.env.HOME ?? process.cwd();
  const requestedPath = stringValue(body.path) ?? home;
  const directoryPath = resolve(requestedPath);
  if (!existsSync(directoryPath)) {
    throw new Error(`Directory does not exist: ${directoryPath}`);
  }

  if (!statSync(directoryPath).isDirectory()) {
    throw new Error(`Path is not a directory: ${directoryPath}`);
  }

  const showHidden = body.showHidden === true;
  const entries = readdirSync(directoryPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => showHidden || !entry.name.startsWith("."))
    .map((entry) => ({
      name: entry.name,
      path: join(directoryPath, entry.name),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    path: directoryPath,
    parent: dirname(directoryPath),
    home,
    entries,
  };
}

function restartAgent(id: string): Agent {
  const agent = context.registry.require(id);
  if (agent.transport !== "tmux") {
    throw new Error(`Agent "${id}" uses transport "${agent.transport}", not tmux.`);
  }

  const tmux = new TmuxClient();
  tmux.killSession(agent.sessionId);
  tmux.ensureSession(agent);
  context.save();
  return agent;
}

function captureAgentTerminal(id: string) {
  const agent = context.registry.require(id);
  if (agent.transport !== "tmux") {
    throw new Error(`Agent "${id}" uses transport "${agent.transport}", not tmux.`);
  }

  const tmux = new TmuxClient({ captureLines: 120 });
  const text = tmux.capture(agent.tmuxTarget ?? agent.sessionId);
  const permissionPrompt = detectAgentPermissionPrompt(agent, text);
  const nextAgent = permissionPrompt
    ? context.registry.register({
      ...agent,
      bootstrapStatus: "permission-required",
    })
    : agent;
  if (permissionPrompt) {
    context.save();
  }

  return {
    agent: nextAgent,
    terminal: {
      text,
      capturedAt: new Date().toISOString(),
      trustPrompt: Boolean(permissionPrompt),
      permissionPrompt,
      pendingRegistration: isPendingUiRegistration(agent),
    },
  };
}

function sendAgentTerminalInput(id: string, body: Record<string, unknown>) {
  const agent = context.registry.require(id);
  if (agent.transport !== "tmux") {
    throw new Error(`Agent "${id}" uses transport "${agent.transport}", not tmux.`);
  }

  const target = agent.tmuxTarget ?? agent.sessionId;
  const text = stringValue(body.text);
  const enter = body.enter === true;
  const tmux = new TmuxClient({ captureLines: 120 });

  if (text) {
    if (agent.agentType === "codex") {
      tmux.sendCodexText(target, text);
    } else {
      tmux.sendText(target, text);
    }
  } else if (enter) {
    tmux.sendEnter(target);
  }

  let registration = "unchanged";
  if (enter && !text && isPendingUiRegistration(agent)) {
    sleep(1_200);
    const capture = tmux.capture(target);
    if (!detectAgentPermissionPrompt(agent, capture)) {
      if (agent.agentType === "codex") {
        tmux.sendCodexText(target, buildSelfRegistrationPrompt(agent));
      } else {
        tmux.sendText(target, buildSelfRegistrationPrompt(agent));
      }
      registration = "registration prompt sent to agent";
    }
  }

  return {
    ok: true,
    registration,
    ...captureAgentTerminal(id),
  };
}

function createTmuxAgent(body: Record<string, unknown>) {
  const agentType = stringValue(body.agentType) ?? "codex";
  if (agentType !== "codex" && agentType !== "claude") {
    throw new Error("agentType must be codex or claude.");
  }

  const projectRoot = requiredString(body.projectRoot, "projectRoot");
  if (!existsSync(projectRoot)) {
    throw new Error(`Project root does not exist: ${projectRoot}`);
  }

  const projectName = stringValue(body.name) ?? basename(projectRoot);
  const id = stringValue(body.id) ?? sanitizeName(projectName);
  const sessionId = stringValue(body.sessionId) ?? `${agentType}-${sanitizeName(projectName)}`;
  const startupCommand = stringValue(body.startupCommand)
    ?? (agentType === "codex" ? "codex --no-alt-screen" : "claude");
  const now = new Date().toISOString();
  const permissionProfile = resolvePermissionProfile(agentType, stringValue(body.permissionProfile) ?? "default", projectRoot);
  const mcpPreflight = buildMcpPreflight({
    agentType,
    mcpUrl: `http://${host}:${port}/mcp`,
    mcpName: stringValue(body.mcpName),
    configured: body.mcpConfigured === true,
    configuredUrl: stringValue(body.mcpConfiguredUrl),
  });
  const command = startupCommand.split(/\s+/)[0];
  assertCommandAvailable("tmux");
  assertCommandAvailable(command);

  const agent: Agent = {
    id,
    name: id,
    agentType,
    transport: "tmux",
    sessionId,
    projectRoot,
    startupCommand,
    bootstrapStatus: "created",
    registrationSource: "web-ui",
    registrationStatus: "pending",
    lastRegistrationAttemptAt: now,
    sessionFingerprint: sessionId,
    permissionProfile: permissionProfile.permissionProfile,
    permissionProfileStatus: permissionProfile.permissionProfileStatus,
    permissionProfileDetail: permissionProfile.permissionProfileDetail,
    mcpPreflightStatus: mcpPreflight.mcpPreflightStatus,
    mcpPreflightDetail: mcpPreflight.mcpPreflightDetail,
    mcpSetupCommand: mcpPreflight.mcpSetupCommand,
    mcpVerifyCommand: mcpPreflight.mcpVerifyCommand,
    mcpRemoveCommand: mcpPreflight.mcpRemoveCommand,
    mcpUrl: mcpPreflight.mcpUrl,
    ...uiCreatedCapabilityNotice(projectRoot),
  };

  const tmux = new TmuxClient();
  const existed = tmux.hasSession(sessionId);
  tmux.ensureSession(agent);
  let registeredAgent = context.registry.register(agent);
  context.save();

  const sendRegistrationPrompt = body.sendRegistrationPrompt !== false;
  let registration = "registration prompt skipped";
  let nextAction: string | undefined;
  if (sendRegistrationPrompt) {
    const delayMs = typeof body.registerDelayMs === "number" ? body.registerDelayMs : 4_000;
    sleep(delayMs);
    const capture = tmux.capture(sessionId);
    const permissionPrompt = detectAgentPermissionPrompt(agent, capture);
    if (permissionPrompt) {
      registration = "waiting for permission approval";
      nextAction = permissionPrompt.action;
      registeredAgent = context.registry.register({
        ...agent,
        bootstrapStatus: "permission-required",
      });
      context.save();
    } else if (!mcpPreflight.canSendSelfRegistrationPrompt) {
      registration = "waiting for MCP setup";
      nextAction = mcpPreflight.nextAction;
      registeredAgent = context.registry.register({
        ...agent,
        bootstrapStatus: "mcp-configuring",
      });
      context.save();
    } else {
      const prompt = buildSelfRegistrationPrompt(agent);
      if (agentType === "codex") {
        tmux.sendCodexText(sessionId, prompt);
      } else {
        tmux.sendText(sessionId, prompt);
      }
      registration = "registration prompt sent to agent";
    }
  }

  return {
    agent: registeredAgent,
    existed,
    registration,
    nextAction,
    permissionProfile,
    mcpPreflight,
    attachCommand: `tmux attach -t ${sessionId}`,
    mairAttachCommand: `mair attach ${id}`,
  };
}

function resolvePermissionProfile(
  agentType: string,
  requestedProfile: string,
  projectRoot: string,
): Pick<Agent, "permissionProfile" | "permissionProfileStatus" | "permissionProfileDetail"> {
  if (requestedProfile !== "direct-workspace-read") {
    return {
      permissionProfile: "default",
      permissionProfileStatus: "not-requested",
      permissionProfileDetail: "Default CLI startup. Mina will surface permission prompts instead of hiding them.",
    };
  }

  return {
    permissionProfile: "direct-workspace-read",
    permissionProfileStatus: "unsupported",
    permissionProfileDetail: `No known ${agentType} startup flag in Mina is both direct-read and scoped only to ${projectRoot}. Mina will start the default command and surface permission prompts.`,
  };
}

function setupCodexPair(body: Record<string, unknown>) {
  const mainRoot = stringValue(body.mainRoot) ?? "/Users/stevenna/WebstormProjects/minasoftai";
  const helperRoot = stringValue(body.helperRoot) ?? "/Users/stevenna/PycharmProjects/mina-ralph-loop-bootstrap-nextjs";
  const helperId = stringValue(body.helperId) ?? "ralph";
  const sessionId = stringValue(body.sessionId) ?? "mina-ralph-codex";
  const agent: Agent = {
    id: helperId,
    name: helperId,
    agentType: "codex",
    transport: "tmux",
    sessionId,
    projectRoot: helperRoot,
    startupCommand: stringValue(body.startupCommand) ?? "codex --no-alt-screen",
  };

  new TmuxClient().ensureSession(agent);
  context.registry.register(agent);
  context.save();

  return {
    statePath,
    mainRoot,
    helper: agent,
    mcpUrl: `http://${host}:${port}/mcp`,
    codexMcpAdd: `codex mcp add mina-ai-router --url http://${host}:${port}/mcp`,
    startMainCodex: `cd ${mainRoot} && codex --no-alt-screen`,
    attachHelper: `tmux attach -t ${sessionId}`,
  };
}

function buildSelfRegistrationPrompt(agent: Agent): string {
  return [
    "Use Mina AI Router MCP register_agent to register this visible CLI session.",
    "Collect any missing context yourself when possible, but use these values as authoritative:",
    `- id: ${agent.id}`,
    `- name: ${agent.name}`,
    `- agentType: ${agent.agentType}`,
    `- transport: ${agent.transport}`,
    `- sessionId: ${agent.sessionId}`,
    `- sessionFingerprint: ${agent.sessionFingerprint ?? agent.sessionId}`,
    `- projectRoot: ${agent.projectRoot}`,
    `- startupCommand: ${agent.startupCommand ?? ""}`,
    "",
    "If Mina already created this agent record, confirm and update that existing id. Do not create a new id for the same session.",
    "",
    "Before registering, create a concise capability notice for this session:",
    "- Prefer capability docs in this order when present: CLAUDE.md/claude.md, AGENTS.md/agents.md, agent.md, README.md.",
    "- If those files are missing, inspect package metadata and the project file tree to infer what this project/agent can help with.",
    "- Set register_agent capabilitySummary to 2-5 short bullets or one short paragraph under 800 characters.",
    "- Set register_agent capabilitySources to a comma-separated list of the files or project signals you used.",
    "- Set register_agent sessionFingerprint to the value above.",
    "After registering, call list_agents and confirm this agent is available.",
  ].join("\n");
}

function hydratePendingCapabilityNotices(): void {
  let changed = false;
  for (const agent of context.registry.list()) {
    if (agent.capabilitySummary === "Pending self-registration capability notice."
      && agent.capabilitySources === "created from Mina UI") {
      const notice = uiCreatedCapabilityNotice(agent.projectRoot);
      context.registry.register({
        ...agent,
        capabilitySummary: notice.capabilitySummary,
        capabilitySources: notice.capabilitySources,
      });
      changed = true;
    }
  }

  if (changed) {
    context.save();
  }
}

function uiCreatedCapabilityNotice(projectRoot: string): Pick<Agent, "capabilitySummary" | "capabilitySources"> {
  const notice = inferCapabilityNotice(projectRoot);
  return {
    capabilitySummary: notice.summary,
    capabilitySources: `created from Mina UI; ${notice.sources}`,
  };
}

function inferCapabilityNotice(projectRoot: string): { summary: string; sources: string } {
  const root = resolve(projectRoot);
  const docCandidates = [
    "CLAUDE.md",
    "claude.md",
    "AGENTS.md",
    "agents.md",
    "agent.md",
    "README.md",
  ];

  for (const candidate of docCandidates) {
    const filePath = join(root, candidate);
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      continue;
    }

    const summary = summarizeMarkdown(readSmallText(filePath), basename(root));
    if (summary) {
      return {
        summary,
        sources: `inferred from ${candidate}`,
      };
    }
  }

  const packagePath = join(root, "package.json");
  if (existsSync(packagePath) && !statSync(packagePath).isDirectory()) {
    try {
      const packageJson = JSON.parse(readSmallText(packagePath)) as {
        name?: unknown;
        description?: unknown;
        scripts?: unknown;
        dependencies?: unknown;
        devDependencies?: unknown;
      };
      const name = typeof packageJson.name === "string" ? packageJson.name : basename(root);
      const description = typeof packageJson.description === "string" && packageJson.description.trim()
        ? packageJson.description.trim()
        : "JavaScript/TypeScript project";
      const scripts = packageJson.scripts && typeof packageJson.scripts === "object"
        ? Object.keys(packageJson.scripts).slice(0, 5)
        : [];
      const deps = {
        ...objectValue(packageJson.dependencies),
        ...objectValue(packageJson.devDependencies),
      };
      const frameworks = Object.keys(deps)
        .filter((dependency) => ["next", "react", "vue", "svelte", "express", "fastify", "nestjs", "vite", "typescript"].includes(dependency))
        .slice(0, 5);
      return {
        summary: [
          `${name}: ${description}.`,
          frameworks.length ? `Stack signals: ${frameworks.join(", ")}.` : "",
          scripts.length ? `Useful scripts: ${scripts.join(", ")}.` : "",
        ].filter(Boolean).join(" "),
        sources: "inferred from package.json",
      };
    } catch {
      return {
        summary: `${basename(root)} appears to be a JavaScript/TypeScript project. Use project files to answer implementation, test, and architecture questions.`,
        sources: "inferred from package.json",
      };
    }
  }

  const pyprojectPath = join(root, "pyproject.toml");
  if (existsSync(pyprojectPath) && !statSync(pyprojectPath).isDirectory()) {
    const text = readSmallText(pyprojectPath);
    const name = text.match(/^name\s*=\s*"([^"]+)"/m)?.[1] ?? basename(root);
    const description = text.match(/^description\s*=\s*"([^"]+)"/m)?.[1] ?? "Python project";
    return {
      summary: `${name}: ${description}. Use this agent for Python implementation, tests, CLI/runtime questions, and project-specific debugging.`,
      sources: "inferred from pyproject.toml",
    };
  }

  const entries = safeDirectoryEntries(root)
    .filter((entry) => !entry.startsWith("."))
    .slice(0, 8);
  return {
    summary: `${basename(root)} project agent. Use it for questions about this repository's files, structure, implementation details, and local test workflow.${entries.length ? ` Top-level entries: ${entries.join(", ")}.` : ""}`,
    sources: "inferred from project directory",
  };
}

function summarizeMarkdown(text: string, fallbackName: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^#+\s*/, "").replace(/^[-*]\s+/, "").trim())
    .filter((line) => line && !line.startsWith("```") && !line.startsWith("|"));
  const useful = lines
    .filter((line) => !/^#{1,6}\s*$/.test(line))
    .slice(0, 5)
    .join(" ");
  return truncateText(useful || `${fallbackName} project agent. Use it for project-specific implementation, debugging, testing, and architecture questions.`, 800);
}

function readSmallText(filePath: string): string {
  return readFileSync(filePath, "utf8").slice(0, 12_000);
}

function safeDirectoryEntries(directoryPath: string): string[] {
  try {
    return readdirSync(directoryPath).sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function truncateText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1).trim()}...` : normalized;
}

function isPendingUiRegistration(agent: Agent): boolean {
  return agent.capabilitySources?.startsWith("created from Mina UI") ?? false;
}

function assertCommandAvailable(command: string): void {
  try {
    execFileSync("which", [command], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(`Required command "${command}" is not available on PATH.`);
  }
}

function sanitizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "agent";
}

function sleep(milliseconds: number): void {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return;
  }

  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required`);
  }

  return value.trim();
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stringFieldValue(body: Record<string, unknown>, field: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(body, field) && typeof body[field] === "string"
    ? body[field].trim()
    : undefined;
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const raw = await readRawBody(request);
  if (!raw.trim()) {
    return {};
  }

  return JSON.parse(raw) as Record<string, unknown>;
}

function readRawBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function sendOptions(response: ServerResponse): void {
  response.statusCode = 204;
  setCors(response);
  response.end();
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value, null, 2);
  response.statusCode = status;
  setCors(response);
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(body);
}

function sendHtml(response: ServerResponse, body: string): void {
  response.statusCode = 200;
  response.setHeader("content-type", "text/html; charset=utf-8");
  response.end(body);
}

function setCors(response: ServerResponse): void {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,DELETE,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type,mcp-protocol-version,x-request-id");
}

function renderAppHtml(): string {
  const builtPath = join(__dirname, "public", "index.html");
  if (!existsSync(builtPath)) {
    throw new Error("React UI build is missing. Run `npm run build:ui` before starting the HTTP server.");
  }

  return readFileSync(builtPath, "utf8");
}

function sendStaticAsset(response: ServerResponse, pathname: string): void {
  const publicRoot = join(__dirname, "public");
  const filePath = resolve(publicRoot, `.${pathname}`);

  if (!filePath.startsWith(publicRoot) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    sendJson(response, 404, { error: "Asset not found" });
    return;
  }

  response.statusCode = 200;
  response.setHeader("content-type", contentTypeFor(filePath));
  response.end(readFileSync(filePath));
}

function contentTypeFor(filePath: string): string {
  const ext = extname(filePath);
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".woff2") return "font/woff2";
  return "application/octet-stream";
}
