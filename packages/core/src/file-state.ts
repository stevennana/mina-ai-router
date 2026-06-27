import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Agent, AgentRequest } from "./types";

export interface RouterState {
  agents: Agent[];
  requests: AgentRequest[];
}

const emptyState: RouterState = {
  agents: [],
  requests: [],
};

export class FileState {
  constructor(private readonly filePath: string) {}

  load(): RouterState {
    if (!existsSync(this.filePath)) {
      return { ...emptyState };
    }

    const raw = readFileSync(this.filePath, "utf8").trim();
    if (!raw) {
      return { ...emptyState };
    }

    const parsed = JSON.parse(raw) as Partial<RouterState>;
    return {
      agents: parsed.agents ?? [],
      requests: parsed.requests ?? [],
    };
  }

  save(state: RouterState): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, `${JSON.stringify(state, null, 2)}\n`);
  }
}
