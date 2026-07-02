import type { Agent, AgentMcpPreflightStatus } from "./types";

export interface McpPreflightInput {
  agentType: string;
  mcpUrl: string;
  mcpName?: string;
  configuredUrl?: string;
  configured?: boolean;
}

export interface McpPreflightResult extends Pick<
  Agent,
  "mcpPreflightStatus" | "mcpPreflightDetail" | "mcpSetupCommand" | "mcpVerifyCommand" | "mcpRemoveCommand" | "mcpUrl"
> {
  status: AgentMcpPreflightStatus;
  nextAction: string;
  canSendSelfRegistrationPrompt: boolean;
}

export function buildMcpPreflight(input: McpPreflightInput): McpPreflightResult {
  const mcpName = input.mcpName?.trim() || "mina-ai-router";
  const mcpUrl = input.mcpUrl;
  const commands = commandsFor(input.agentType, mcpName, mcpUrl);

  if (!commands) {
    return result({
      status: "unsupported",
      mcpUrl,
      detail: `MCP preflight does not yet support agent type "${input.agentType}".`,
      nextAction: "Configure this client manually before asking it to self-register with Mina AI Router.",
      canSendSelfRegistrationPrompt: false,
    });
  }

  if (input.configured === true || input.configuredUrl === mcpUrl) {
    return result({
      status: "configured",
      mcpUrl,
      detail: `${input.agentType} MCP appears configured for ${mcpUrl}.`,
      nextAction: "MCP preflight is configured; Mina may send the self-registration prompt.",
      canSendSelfRegistrationPrompt: true,
      ...commands,
    });
  }

  if (input.configuredUrl && input.configuredUrl !== mcpUrl) {
    return result({
      status: "stale",
      mcpUrl,
      detail: `${input.agentType} MCP points at ${input.configuredUrl}, but Mina is serving ${mcpUrl}.`,
      nextAction: `Run: ${commands.setupCommand}`,
      canSendSelfRegistrationPrompt: false,
      ...commands,
    });
  }

  return result({
    status: "missing",
    mcpUrl,
    detail: `${input.agentType} MCP setup is not confirmed for ${mcpUrl}.`,
    nextAction: `Run: ${commands.setupCommand}`,
    canSendSelfRegistrationPrompt: false,
    ...commands,
  });
}

function commandsFor(agentType: string, mcpName: string, mcpUrl: string) {
  if (agentType === "codex") {
    return {
      setupCommand: `codex mcp add ${shellQuote(mcpName)} --url ${shellQuote(mcpUrl)}`,
      verifyCommand: `codex mcp get ${shellQuote(mcpName)}`,
      removeCommand: `codex mcp remove ${shellQuote(mcpName)}`,
    };
  }

  if (agentType === "claude") {
    return {
      setupCommand: `claude mcp add --transport http ${shellQuote(mcpName)} ${shellQuote(mcpUrl)}`,
      verifyCommand: `claude mcp get ${shellQuote(mcpName)}`,
      removeCommand: `claude mcp remove ${shellQuote(mcpName)}`,
    };
  }

  return null;
}

function result(input: {
  status: AgentMcpPreflightStatus;
  mcpUrl: string;
  detail: string;
  nextAction: string;
  canSendSelfRegistrationPrompt: boolean;
  setupCommand?: string;
  verifyCommand?: string;
  removeCommand?: string;
}): McpPreflightResult {
  return {
    status: input.status,
    mcpPreflightStatus: input.status,
    mcpPreflightDetail: input.detail,
    mcpSetupCommand: input.setupCommand,
    mcpVerifyCommand: input.verifyCommand,
    mcpRemoveCommand: input.removeCommand,
    mcpUrl: input.mcpUrl,
    nextAction: input.nextAction,
    canSendSelfRegistrationPrompt: input.canSendSelfRegistrationPrompt,
  };
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, "'\\''")}'`;
}
