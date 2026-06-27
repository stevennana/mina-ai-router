import type { AgentRequest, RequestStatus } from "./types";

export class RequestStore {
  private readonly requests = new Map<string, AgentRequest>();

  constructor(requests: AgentRequest[] = []) {
    for (const request of requests) {
      this.requests.set(request.id, request);
    }
  }

  create(request: AgentRequest): AgentRequest {
    this.requests.set(request.id, request);
    return request;
  }

  list(): AgentRequest[] {
    return Array.from(this.requests.values()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
  }

  get(id: string): AgentRequest | undefined {
    return this.requests.get(id);
  }

  require(id: string): AgentRequest {
    const request = this.get(id);

    if (!request) {
      throw new Error(`Request "${id}" was not found.`);
    }

    return request;
  }

  updateStatus(id: string, status: RequestStatus, patch: Partial<AgentRequest> = {}): AgentRequest {
    const current = this.require(id);
    const updated: AgentRequest = {
      ...current,
      ...patch,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.requests.set(id, updated);
    return updated;
  }
}
