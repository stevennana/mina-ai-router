#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { appendFileSync } from "node:fs";
import { AgentRegistry, AgentRouter, FileState, RequestStore, defaultRouterStatePath, packageVersion, type Agent, type TransportType } from "../../../packages/core/src";
import { DefaultTransportRegistry, HeadlessTransport, TmuxTransport, ZmuxTransport } from "../../../packages/transports/src";
import type {
  JsonValue,
  McpJsonRpcMessageResult,
  McpRuntimeProvider,
  McpTool,
  McpToolCallResult,
} from "@minasoft/mcp-runtime";

type RuntimeModule = typeof import("@minasoft/mcp-runtime");

declare const __dirname: string;
declare const require: { resolve(specifier: string): string };

const importEsm = new Function("specifier", "return import(specifier)") as (
  specifier: string,
) => Promise<RuntimeModule>;
const runtimeModuleUrl = pathToFileURL(require.resolve("@minasoft/mcp-runtime")).href;

interface JsonRpcMessage {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: unknown;
}

const statePath = process.env.MINA_ROUTER_STATE ?? defaultRouterStatePath();
const logPath = process.env.MINA_MCP_LOG;
const context = createContext();
let inputBuffer = Buffer.alloc(0);
let runtimePromise: Promise<RuntimeModule> | undefined;
let providerPromise: Promise<McpRuntimeProvider> | undefined;

process.stdin.on("data", (chunk: Buffer) => {
  debugLog(`stdin data bytes=${chunk.length}`);
  debugLog(`stdin raw=${JSON.stringify(chunk.toString("utf8"))}`);
  inputBuffer = Buffer.concat([inputBuffer, chunk]);
  readFrames().catch((error) => {
    debugLog(`readFrames error=${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    sendFallbackError(undefined, error instanceof Error ? error.message : String(error));
  });
});

debugLog(`startup cwd=${process.cwd()} statePath=${statePath} runtime=${runtimeModuleUrl}`);

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

async function readFrames(): Promise<void> {
  while (true) {
    const headerEnd = inputBuffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      return;
    }

    const header = inputBuffer.slice(0, headerEnd).toString("utf8");
    const lengthMatch = /Content-Length:\s*(\d+)/i.exec(header);
    if (!lengthMatch) {
      throw new Error("Missing Content-Length header.");
    }

    const contentLength = Number(lengthMatch[1]);
    const frameStart = headerEnd + 4;
    const frameEnd = frameStart + contentLength;

    if (inputBuffer.length < frameEnd) {
      return;
    }

    const body = inputBuffer.slice(frameStart, frameEnd).toString("utf8");
    inputBuffer = inputBuffer.slice(frameEnd);
    debugLog(`frame body=${body}`);
    await handleMessage(JSON.parse(body) as JsonRpcMessage);
  }
}

async function handleMessage(message: JsonRpcMessage): Promise<void> {
  const runtime = await loadRuntime();
  const provider = await createProvider();
  debugLog(`handle method=${message.method} id=${String(message.id ?? "")}`);
  const result = await runtime.handleMcpJsonRpcMessage(message, provider, {
    context: { requestId: String(message.id ?? "") },
  });

  debugLog(`result kind=${result.kind}`);
  sendRuntimeResult(result);
}

async function loadRuntime(): Promise<RuntimeModule> {
  runtimePromise ??= importEsm(runtimeModuleUrl);
  return runtimePromise;
}

async function createProvider(): Promise<McpRuntimeProvider> {
  if (providerPromise) {
    return providerPromise;
  }

  const tools: McpTool[] = [
    {
      name: "list_agents",
      description: "List registered Mina helper agents.",
      inputSchema: {
        type: "object",
        properties: {
          callerAgentId: { type: "string" },
          sourceAgent: { type: "string" },
          callerSessionFingerprint: { type: "string" },
        },
        additionalProperties: false,
      },
    },
    {
      name: "register_agent",
      description: "Register or update an agent in Mina AI Router. Use this from a visible project Codex session to connect itself to the router.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          agentType: { type: "string" },
          transport: { type: "string" },
          sessionId: { type: "string" },
          sessionFingerprint: { type: "string" },
          projectRoot: { type: "string" },
          tmuxTarget: { type: "string" },
          startupCommand: { type: "string" },
          capabilitySummary: { type: "string" },
          capabilitySources: { type: "string" },
          capabilitySource: { type: "string" },
          capabilityUpdatedAt: { type: "string" },
          lastCapabilityRefreshAt: { type: "string" },
        },
        required: ["id", "agentType", "transport", "sessionId", "projectRoot"],
        additionalProperties: false,
      },
    },
    {
      name: "call_agent",
      description: "Send a task to a registered helper agent and wait for a marker-wrapped response.",
      inputSchema: {
        type: "object",
        properties: {
          target: { type: "string" },
          task: { type: "string" },
          sourceAgent: { type: "string" },
          callerAgentId: { type: "string" },
          callerSessionFingerprint: { type: "string" },
          allowSelfCall: { type: "boolean" },
          timeoutMs: { type: "number" },
        },
        required: ["target", "task"],
        additionalProperties: false,
      },
    },
    {
      name: "get_request_status",
      description: "Return status for a Mina AI Router request.",
      inputSchema: {
        type: "object",
        properties: {
          requestId: { type: "string" },
        },
        required: ["requestId"],
        additionalProperties: false,
      },
    },
  ];

  providerPromise = Promise.resolve({
    serverInfo: {
      name: "mina-ai-router",
      version: packageVersion(),
    },
    tools: {
      async list() {
        return { items: tools };
      },
      async call({ name, arguments: args }) {
        return callTool(name, args ?? {});
      },
    },
  });

  return providerPromise;
}

async function callTool(name: string, args: Record<string, JsonValue>): Promise<McpToolCallResult> {
  switch (name) {
    case "list_agents": {
      const caller = resolveCallerAgent(args);
      const agents = await context.router.listAgentStatuses({ callerAgentId: caller?.id });
      return jsonToolResult({ agents });
    }
    case "register_agent": {
      try {
        const agent = agentFromArgs(args);
        const now = new Date().toISOString();
        const registered = context.registry.register({
          ...agent,
          bootstrapStatus: "ready",
          registrationSource: "mcp",
          registrationStatus: "confirmed",
          lastRegistrationAttemptAt: now,
          confirmedByAgentAt: now,
          sessionFingerprint: agent.sessionFingerprint ?? agent.sessionId,
        }, {
          capabilitySource: agent.capabilitySummary || agent.capabilitySources ? "generated" : undefined,
        });
        context.save();
        const agents = await context.router.listAgentStatuses();
        return jsonToolResult({ agent: registered, agents });
      } catch (error) {
        return {
          kind: "invalid_params",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }
    case "call_agent": {
      const target = typeof args.target === "string" ? args.target : "";
      const task = typeof args.task === "string" ? args.task : "";
      const timeoutMs = typeof args.timeoutMs === "number" ? args.timeoutMs : undefined;
      const caller = resolveCallerAgent(args);
      const allowSelfCall = args.allowSelfCall === true;

      if (!target || !task) {
        return { kind: "invalid_params", message: "call_agent requires string target and task." };
      }

      try {
        const response = await context.router.callAgent({
          sourceAgent: caller?.id,
          target,
          task,
          timeoutMs,
          allowSelfCall,
        });
        return jsonToolResult(response as unknown);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          kind: "tool_error",
          content: [{ type: "text", text: message }],
          structuredContent: { error: message },
        };
      } finally {
        context.save();
      }
    }
    case "get_request_status": {
      const requestId = typeof args.requestId === "string" ? args.requestId : "";

      if (!requestId) {
        return { kind: "invalid_params", message: "get_request_status requires string requestId." };
      }

      try {
        const found = context.router.getRequest(requestId);
        return jsonToolResult({
          requestId: found.id,
          status: found.status,
          error: found.error,
        });
      } catch {
        return { kind: "not_found", message: `Request "${requestId}" was not found.` };
      }
    }
    default:
      return { kind: "not_found", message: `Unknown tool "${name}".` };
  }
}

function resolveCallerAgent(args: Record<string, JsonValue>): Agent | undefined {
  const callerAgentId = stringValue(args.callerAgentId) ?? stringValue(args.sourceAgent);
  if (callerAgentId) {
    return context.registry.get(callerAgentId);
  }

  const fingerprint = stringValue(args.callerSessionFingerprint);
  return fingerprint ? context.registry.findBySessionFingerprint(fingerprint) : undefined;
}

function agentFromArgs(args: Record<string, JsonValue>): Agent {
  const id = requiredString(args.id, "id");
  return {
    id,
    name: stringValue(args.name) ?? id,
    agentType: requiredString(args.agentType, "agentType"),
    transport: requiredString(args.transport, "transport") as TransportType,
    sessionId: requiredString(args.sessionId, "sessionId"),
    sessionFingerprint: stringValue(args.sessionFingerprint) ?? stringValue(args.sessionId),
    projectRoot: requiredString(args.projectRoot, "projectRoot"),
    tmuxTarget: stringValue(args.tmuxTarget),
    startupCommand: stringValue(args.startupCommand),
    capabilitySummary: stringValue(args.capabilitySummary),
    capabilitySources: stringValue(args.capabilitySources),
    capabilitySource: capabilitySourceValue(args.capabilitySource),
    capabilityUpdatedAt: stringValue(args.capabilityUpdatedAt),
    lastCapabilityRefreshAt: stringValue(args.lastCapabilityRefreshAt),
  };
}

function requiredString(value: JsonValue | undefined, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`register_agent requires string ${field}.`);
  }

  return value.trim();
}

function stringValue(value: JsonValue | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function capabilitySourceValue(value: JsonValue | undefined): Agent["capabilitySource"] | undefined {
  return value === "manual" || value === "generated" ? value : undefined;
}

function jsonToolResult(value: unknown): McpToolCallResult {
  const text = JSON.stringify(value, null, 2);
  return {
    kind: "success",
    content: [{ type: "text", text }],
    structuredContent: value as Record<string, JsonValue>,
  };
}

function sendRuntimeResult(result: McpJsonRpcMessageResult): void {
  if (result.kind === "accepted") {
    debugLog("send accepted/no-response");
    return;
  }

  if (result.kind === "raw") {
    debugLog(`send raw bytes=${Buffer.byteLength(result.body)}`);
    process.stdout.write(`Content-Length: ${Buffer.byteLength(result.body)}\r\n\r\n`);
    process.stdout.write(result.body);
    return;
  }

  const body = JSON.stringify(result.body);
  debugLog(`send json body=${body}`);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n`);
  process.stdout.write(body);
}

function sendFallbackError(id: number | string | null | undefined, message: string): void {
  if (id === undefined) {
    return;
  }

  const body = JSON.stringify({
    jsonrpc: "2.0",
    id,
    error: { code: -32603, message },
  });
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n`);
  process.stdout.write(body);
}

function debugLog(message: string): void {
  if (!logPath) {
    return;
  }

  try {
    appendFileSync(logPath, `${new Date().toISOString()} ${message}\n`);
  } catch {
    // Never break MCP startup because logging failed.
  }
}
