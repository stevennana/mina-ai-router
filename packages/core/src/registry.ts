import type { Agent } from "./types";

export class AgentRegistry {
  private readonly agents = new Map<string, Agent>();

  constructor(agents: Agent[] = []) {
    for (const agent of agents) {
      this.register(agent);
    }
  }

  register(agent: Agent): Agent {
    this.agents.set(agent.id, agent);
    return agent;
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
}
