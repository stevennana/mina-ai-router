import type { Agent } from "./types";

export interface AgentRegistrationOptions {
  capabilitySource?: Agent["capabilitySource"];
  refreshedAt?: string;
}

export interface AgentCapabilityUpdate {
  summary?: string;
  sources?: string;
  source: Agent["capabilitySource"];
  refreshedAt?: string;
}

export class AgentRegistry {
  private readonly agents = new Map<string, Agent>();

  constructor(agents: Agent[] = []) {
    for (const agent of agents) {
      this.register(agent);
    }
  }

  register(agent: Agent, options: AgentRegistrationOptions = {}): Agent {
    const current = this.agents.get(agent.id);
    const next: Agent = {
      ...agent,
      capabilitySummary: agent.capabilitySummary ?? current?.capabilitySummary,
      capabilitySources: agent.capabilitySources ?? current?.capabilitySources,
      capabilitySource: agent.capabilitySource ?? current?.capabilitySource,
      capabilityUpdatedAt: agent.capabilityUpdatedAt ?? current?.capabilityUpdatedAt,
      lastCapabilityRefreshAt: agent.lastCapabilityRefreshAt ?? current?.lastCapabilityRefreshAt,
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

    this.agents.set(agent.id, next);
    return next;
  }

  list(): Agent[] {
    return Array.from(this.agents.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  get(id: string): Agent | undefined {
    return this.agents.get(id);
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
    };

    this.agents.set(id, next);
    return next;
  }
}
