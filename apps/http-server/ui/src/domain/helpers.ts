import type { RouterAgent, RouterRequest } from "./types";

const capabilityFreshnessWindowMs = 7 * 24 * 60 * 60 * 1000;

export type CapabilityFreshness = {
  state: "missing" | "manual" | "fresh" | "stale";
  label: string;
  detail: string;
  timestampLabel: string;
  sourceLabel: string;
};

export function displayAgentName(agent: RouterAgent): string {
  return `${capitalize(agent.agentType || "agent")} ${agent.id}`;
}

export function displaySource(sourceAgent?: string): string {
  return !sourceAgent || sourceAgent === "main" ? "direct" : sourceAgent;
}

export function attachCommand(agent: RouterAgent): string {
  if (agent.transport !== "tmux") return "not available for non-tmux agents";
  return `tmux attach -t ${agent.sessionId}`;
}

export function mairAttachCommand(agent: RouterAgent): string {
  if (agent.transport !== "tmux") return "not available for non-tmux agents";
  return `mair attach ${agent.id}`;
}

export function mairRefreshCapabilitiesCommand(agent: RouterAgent): string {
  return `mair agent refresh-capabilities ${agent.id}`;
}

export function healthMessage(agent: RouterAgent): string {
  if (agent.status === "available") return "Agent session is reachable. It can receive routed requests.";
  if (agent.status === "busy") return "Agent is currently handling a routed request.";
  if (agent.status === "stale") {
    return agent.detail || `No confirmed agent reachability since ${formatDateTime(agent.lastSeenAt || agent.lastActivityAt)}. Refresh or restart before routing important work.`;
  }
  if (agent.status === "missing") {
    return agent.detail || `tmux session "${agent.sessionId}" is missing. Restart the session or re-register the agent.`;
  }
  if (agent.status === "needs-attention") {
    return agent.detail || "The last routed request failed or timed out. Inspect the request before sending more work.";
  }
  if (agent.status === "unknown") {
    return "This transport does not expose a live health check yet. Calls may still work if the transport is headless or mock.";
  }
  return "Agent status needs operator attention.";
}

export function latestRequestFor(agentId: string, requests: RouterRequest[]): RouterRequest | undefined {
  return requests.slice().reverse().find((request) => request.targetAgent === agentId);
}

export function agentRequests(agentId: string, requests: RouterRequest[]): RouterRequest[] {
  return requests.filter((request) => request.targetAgent === agentId || request.sourceAgent === agentId);
}

export function requestForLine(agentId: string, selectedRequestId: string, requests: RouterRequest[]): RouterRequest | undefined {
  const selected = requests.find((request) => request.id === selectedRequestId);
  if (selected?.targetAgent === agentId) return selected;
  return latestRequestFor(agentId, requests);
}

export function answeredCount(requests: RouterRequest[]): number {
  return requests.filter((request) => request.status === "answered").length;
}

export function waitingCount(requests: RouterRequest[]): number {
  return requests.filter((request) => ["created", "sent", "waiting"].includes(request.status)).length;
}

export function lastRequestLabel(agent: RouterAgent, latest?: RouterRequest): string {
  if (latest) return `${latest.status}: ${latest.task}`;
  return agent.lastRequestStatus ? `last: ${agent.lastRequestStatus}` : "no recent request";
}

export function shortCapability(agent: RouterAgent): string {
  const text = agent.capabilitySummary || "capability not registered";
  return text.length > 88 ? `${text.slice(0, 85)}...` : text;
}

export function capabilityFreshness(agent: RouterAgent, now = Date.now()): CapabilityFreshness {
  const hasSummary = Boolean(agent.capabilitySummary?.trim());
  const hasSources = Boolean(agent.capabilitySources?.trim());
  const updatedAt = agent.capabilityUpdatedAt || agent.lastCapabilityRefreshAt;
  const timestampLabel = formatDateTime(updatedAt);
  const sourceLabel = capabilitySourceLabel(agent);

  if (!hasSummary && !hasSources) {
    return {
      state: "missing",
      label: "Missing",
      detail: "No capability summary has been registered for this agent.",
      timestampLabel,
      sourceLabel,
    };
  }

  if (agent.capabilitySource === "manual") {
    return {
      state: "manual",
      label: "Manual",
      detail: "This capability card was edited by an operator and is not agent-generated.",
      timestampLabel,
      sourceLabel,
    };
  }

  const refreshTime = Date.parse(agent.lastCapabilityRefreshAt || agent.capabilityUpdatedAt || "");
  if (!Number.isFinite(refreshTime)) {
    return {
      state: "stale",
      label: "Stale",
      detail: "Generated capability metadata has no refresh timestamp.",
      timestampLabel,
      sourceLabel,
    };
  }

  const isStale = now - refreshTime > capabilityFreshnessWindowMs;
  return {
    state: isStale ? "stale" : "fresh",
    label: isStale ? "Stale" : "Fresh",
    detail: isStale
      ? "Generated capability metadata is older than 7 days."
      : "Generated capability metadata was refreshed within 7 days.",
    timestampLabel,
    sourceLabel,
  };
}

export function latencyLabel(request: RouterRequest): string {
  const start = Date.parse(request.createdAt || "");
  const end = Date.parse(request.updatedAt || "");
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "-";
  const ms = end - start;
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function formatTime(value?: string): string {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatDateTime(value?: string): string {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isPendingUiRegistration(agent: RouterAgent): boolean {
  return agent.capabilitySummary === "Pending self-registration capability notice."
    && agent.capabilitySources === "created from Mina UI";
}

export function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function capabilitySourceLabel(agent: RouterAgent): string {
  if (agent.capabilitySource === "manual") return "manual edit";
  if (agent.capabilitySource === "generated") return "agent-generated";
  return "unknown source";
}
