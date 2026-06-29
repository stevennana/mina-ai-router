import type { Agent, AgentCapabilityProfile } from "./types";
import { buildCapabilityProfile } from "./capability-profile";

export interface AgentRegistrationOptions {
  capabilitySource?: Agent["capabilitySource"];
  refreshedAt?: string;
}

export interface AgentCapabilityUpdate {
  summary?: string;
  sources?: string;
  source: Agent["capabilitySource"];
  refreshedAt?: string;
  profile?: Partial<AgentCapabilityProfile>;
}

export interface AgentHealthUpdate {
  lastSeenAt?: string;
  lastActivityAt?: string;
}

export class AgentRegistry {
  private readonly agents = new Map<string, Agent>();

  constructor(agents: Agent[] = []) {
    for (const agent of agents) {
      this.register(agent);
    }
  }

  register(agent: Agent, options: AgentRegistrationOptions = {}): Agent {
    const fingerprint = agent.sessionFingerprint;
    const currentById = this.agents.get(agent.id);
    const currentByFingerprint = fingerprint ? this.findBySessionFingerprint(fingerprint) : undefined;
    const current = currentById ?? currentByFingerprint;
    const canonicalId = current?.id ?? agent.id;
    const registrationWarnings = mergeRegistrationWarnings(
      current?.registrationWarnings,
      currentByFingerprint && currentByFingerprint.id !== agent.id
        ? `Registration id "${agent.id}" matched existing session fingerprint for "${currentByFingerprint.id}"; preserved existing agent id.`
        : undefined,
    );
    const next: Agent = {
      ...agent,
      id: canonicalId,
      name: agent.name || current?.name || canonicalId,
      capabilitySummary: agent.capabilitySummary ?? current?.capabilitySummary,
      capabilitySources: agent.capabilitySources ?? current?.capabilitySources,
      capabilitySource: agent.capabilitySource ?? current?.capabilitySource,
      capabilityUpdatedAt: agent.capabilityUpdatedAt ?? current?.capabilityUpdatedAt,
      lastCapabilityRefreshAt: agent.lastCapabilityRefreshAt ?? current?.lastCapabilityRefreshAt,
      capabilityProfile: buildCapabilityProfile({
        capabilitySummary: agent.capabilitySummary ?? current?.capabilitySummary,
        capabilitySources: agent.capabilitySources ?? current?.capabilitySources,
        capabilityProfile: agent.capabilityProfile ?? current?.capabilityProfile,
      }),
      bootstrapStatus: agent.bootstrapStatus ?? current?.bootstrapStatus ?? "ready",
      registrationSource: agent.registrationSource ?? current?.registrationSource ?? "unknown",
      registrationStatus: agent.registrationStatus ?? current?.registrationStatus ?? "confirmed",
      lastRegistrationAttemptAt: agent.lastRegistrationAttemptAt ?? current?.lastRegistrationAttemptAt,
      confirmedByAgentAt: agent.confirmedByAgentAt ?? current?.confirmedByAgentAt,
      sessionFingerprint: agent.sessionFingerprint ?? current?.sessionFingerprint ?? agent.sessionId,
      registrationHistory: appendRegistrationHistory(current?.registrationHistory, agent, canonicalId),
      registrationWarnings,
      permissionProfile: agent.permissionProfile ?? current?.permissionProfile ?? "default",
      permissionProfileStatus: agent.permissionProfileStatus ?? current?.permissionProfileStatus ?? "not-requested",
      permissionProfileDetail: agent.permissionProfileDetail ?? current?.permissionProfileDetail,
      mcpPreflightStatus: agent.mcpPreflightStatus ?? current?.mcpPreflightStatus,
      mcpPreflightDetail: agent.mcpPreflightDetail ?? current?.mcpPreflightDetail,
      mcpSetupCommand: agent.mcpSetupCommand ?? current?.mcpSetupCommand,
      mcpVerifyCommand: agent.mcpVerifyCommand ?? current?.mcpVerifyCommand,
      mcpRemoveCommand: agent.mcpRemoveCommand ?? current?.mcpRemoveCommand,
      mcpUrl: agent.mcpUrl ?? current?.mcpUrl,
      lastSeenAt: agent.lastSeenAt ?? current?.lastSeenAt,
      lastActivityAt: agent.lastActivityAt ?? current?.lastActivityAt,
      activeRequestId: valueOrCurrent(agent, current, "activeRequestId"),
      leaseStatus: valueOrCurrent(agent, current, "leaseStatus"),
      leaseStartedAt: valueOrCurrent(agent, current, "leaseStartedAt"),
      leaseExpiresAt: valueOrCurrent(agent, current, "leaseExpiresAt"),
      leaseReleasedAt: valueOrCurrent(agent, current, "leaseReleasedAt"),
    };

    if ((agent.capabilitySummary !== undefined || agent.capabilitySources !== undefined)
      && (options.capabilitySource !== undefined || options.refreshedAt !== undefined)) {
      const timestamp = options.refreshedAt ?? new Date().toISOString();
      next.capabilitySource = options.capabilitySource ?? agent.capabilitySource ?? current?.capabilitySource;
      next.capabilityUpdatedAt = timestamp;
      if ((options.capabilitySource ?? agent.capabilitySource) === "generated") {
        next.lastCapabilityRefreshAt = timestamp;
      }
    }

    this.agents.set(canonicalId, next);
    return next;
  }

  list(): Agent[] {
    return Array.from(this.agents.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  get(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  findBySessionFingerprint(sessionFingerprint: string): Agent | undefined {
    return this.list().find((agent) => agent.sessionFingerprint === sessionFingerprint);
  }

  unregister(id: string): Agent {
    const agent = this.require(id);
    this.agents.delete(id);
    return agent;
  }

  require(id: string): Agent {
    const agent = this.get(id);

    if (!agent) {
      throw new Error(`Agent "${id}" is not registered.`);
    }

    return agent;
  }

  updateCapabilities(id: string, update: AgentCapabilityUpdate): Agent {
    const agent = this.require(id);
    const timestamp = update.refreshedAt ?? new Date().toISOString();
    const next: Agent = {
      ...agent,
      capabilitySummary: update.summary ?? agent.capabilitySummary,
      capabilitySources: update.sources ?? agent.capabilitySources,
      capabilitySource: update.source,
      capabilityUpdatedAt: timestamp,
      lastCapabilityRefreshAt: update.source === "generated" ? timestamp : agent.lastCapabilityRefreshAt,
      capabilityProfile: buildCapabilityProfile({
        capabilitySummary: update.summary ?? agent.capabilitySummary,
        capabilitySources: update.sources ?? agent.capabilitySources,
        capabilityProfile: update.profile ?? agent.capabilityProfile,
      }),
    };

    this.agents.set(id, next);
    return next;
  }

  updateHealth(id: string, update: AgentHealthUpdate): Agent {
    const agent = this.require(id);
    const next: Agent = {
      ...agent,
      lastSeenAt: update.lastSeenAt ?? agent.lastSeenAt,
      lastActivityAt: update.lastActivityAt ?? agent.lastActivityAt,
    };

    this.agents.set(id, next);
    return next;
  }
}

function appendRegistrationHistory(
  current: Agent["registrationHistory"] = [],
  agent: Agent,
  canonicalId: string,
): Agent["registrationHistory"] {
  const at = agent.confirmedByAgentAt ?? agent.lastRegistrationAttemptAt;
  const source = agent.registrationSource;
  const status = agent.registrationStatus;
  if (!at || !source || !status) {
    return current;
  }

  const event = {
    at,
    source,
    status,
    agentId: canonicalId,
    sessionFingerprint: agent.sessionFingerprint,
  };
  const last = current[current.length - 1];
  if (last
    && last.at === event.at
    && last.source === event.source
    && last.status === event.status
    && last.agentId === event.agentId
    && last.sessionFingerprint === event.sessionFingerprint) {
    return current;
  }

  return [...current, event];
}

function mergeRegistrationWarnings(current: string[] = [], next?: string): string[] | undefined {
  if (!next) {
    return current.length ? current : undefined;
  }

  return current.includes(next) ? current : [...current, next];
}

function valueOrCurrent<K extends keyof Agent>(agent: Agent, current: Agent | undefined, key: K): Agent[K] | undefined {
  return Object.prototype.hasOwnProperty.call(agent, key) ? agent[key] : current?.[key];
}
