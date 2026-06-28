#!/usr/bin/env node
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { AgentRegistry, AgentRouter, FileState, RequestStore, type Agent, type TransportType } from "../../../packages/core/src";
import { createMinaMcpProvider } from "../../../packages/mcp/src/provider";
import { DefaultTransportRegistry, HeadlessTransport, TmuxClient, TmuxTransport, ZmuxTransport } from "../../../packages/transports/src";
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

server.listen(port, host, () => {
  console.log(`Mina Agent Router HTTP server`);
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

  if (url.pathname === "/api/register" && request.method === "POST") {
    const body = await readJsonBody(request);
    const agent = registerAgent(body);
    sendJson(response, 200, { agent, state: await getUiState() });
    return;
  }

  const agentDeleteMatch = url.pathname.match(/^\/api\/agents\/([^/]+)$/);
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
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : String(error),
        state: await getUiState(),
      });
    }
    return;
  }

  const requestActionMatch = url.pathname.match(/^\/api\/requests\/([^/]+)\/(retry|cancel|archive)$/);
  if (requestActionMatch && request.method === "POST") {
    const requestId = decodeURIComponent(requestActionMatch[1]);
    const action = requestActionMatch[2];
    const result = await handleRequestAction(requestId, action);
    sendJson(response, 200, { result, state: await getUiState() });
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

    archived.push(context.requestStore.updateStatus(request.id, "archived", {
      error: request.error ?? "Archived as stale by operator.",
    }));
  }

  if (archived.length > 0) {
    context.save();
  }

  return archived;
}

async function handleRequestAction(requestId: string, action: string) {
  const request = context.requestStore.require(requestId);

  if (action === "retry") {
    return context.router.callAgent({
      sourceAgent: request.sourceAgent,
      target: request.targetAgent,
      task: request.task,
    });
  }

  if (action === "cancel") {
    const updated = context.requestStore.updateStatus(requestId, "cancelled", {
      error: "Cancelled by operator from Mina Agent Router UI.",
    });
    context.save();
    return updated;
  }

  if (action === "archive") {
    const updated = context.requestStore.updateStatus(requestId, "archived");
    context.save();
    return updated;
  }

  throw new Error(`Unsupported request action "${action}".`);
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
    ok: agents.every((agent) => agent.status !== "missing"),
    statePath,
    mcpUrl: `http://${host}:${port}/mcp`,
    agents: {
      total: agents.length,
      available: agents.filter((agent) => agent.status === "available").length,
      busy: agents.filter((agent) => agent.status === "busy").length,
      missing: agents.filter((agent) => agent.status === "missing").length,
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
  const agent: Agent = {
    id,
    name: stringValue(body.name) ?? id,
    agentType: stringValue(body.agentType) ?? "codex",
    transport: (stringValue(body.transport) ?? "tmux") as TransportType,
    sessionId: stringValue(body.sessionId) ?? id,
    projectRoot: stringValue(body.projectRoot) ?? process.cwd(),
    tmuxTarget: stringValue(body.tmuxTarget),
    startupCommand: stringValue(body.startupCommand),
    capabilitySummary: stringValue(body.capabilitySummary),
    capabilitySources: stringValue(body.capabilitySources),
  };

  context.registry.register(agent);
  context.save();
  return agent;
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
    codexMcpAdd: `codex mcp add mina-agent-router --url http://${host}:${port}/mcp`,
    startMainCodex: `cd ${mainRoot} && codex --no-alt-screen`,
    attachHelper: `tmux attach -t ${sessionId}`,
  };
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
  const builtPath = join(__dirname, "ui.html");
  if (existsSync(builtPath)) {
    return readFileSync(builtPath, "utf8");
  }

  return readFileSync(join(process.cwd(), "apps", "http-server", "src", "ui.html"), "utf8");
}
