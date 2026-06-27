import type {
  JsonValue,
  McpRuntimeProvider,
  McpTool,
  McpToolCallResult,
} from "@minasoft/mcp-runtime";
import type { AgentRegistry, AgentRouter, RequestStore } from "../../core/src";

export interface MinaMcpContext {
  registry: AgentRegistry;
  requestStore: RequestStore;
  router: AgentRouter;
  save(): void;
}

const tools: McpTool[] = [
  {
    name: "list_agents",
    description: "List registered Mina helper agents.",
    inputSchema: {
      type: "object",
      properties: {},
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
        timeoutMs: { type: "number" },
      },
      required: ["target", "task"],
      additionalProperties: false,
    },
  },
  {
    name: "get_request_status",
    description: "Return status for a Mina Agent Router request.",
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

export function createMinaMcpProvider(context: MinaMcpContext): McpRuntimeProvider {
  return {
    serverInfo: {
      name: "mina-agent-router",
      version: "0.1.0",
    },
    tools: {
      async list() {
        return { items: tools };
      },
      async call({ name, arguments: args }) {
        return callTool(context, name, args ?? {});
      },
    },
  };
}

async function callTool(
  context: MinaMcpContext,
  name: string,
  args: Record<string, JsonValue>,
): Promise<McpToolCallResult> {
  switch (name) {
    case "list_agents": {
      const agents = await context.router.listAgentStatuses();
      return jsonToolResult({ agents });
    }
    case "call_agent": {
      const target = typeof args.target === "string" ? args.target : "";
      const task = typeof args.task === "string" ? args.task : "";
      const timeoutMs = typeof args.timeoutMs === "number" ? args.timeoutMs : undefined;

      if (!target || !task) {
        return { kind: "invalid_params", message: "call_agent requires string target and task." };
      }

      try {
        const response = await context.router.callAgent({ target, task, timeoutMs });
        return jsonToolResult(response);
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

function jsonToolResult(value: unknown): McpToolCallResult {
  const text = JSON.stringify(value, null, 2);
  return {
    kind: "success",
    content: [{ type: "text", text }],
    structuredContent: value as Record<string, JsonValue>,
  };
}
