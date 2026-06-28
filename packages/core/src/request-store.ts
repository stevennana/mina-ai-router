import type { AgentRequest, RequestDiagnosticStatus, RequestStatus } from "./types";

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
      diagnosticStatus: patch.diagnosticStatus ?? diagnosticStatusFor(status),
      updatedAt: new Date().toISOString(),
    };
    this.requests.set(id, updated);
    return updated;
  }

  patch(id: string, patch: Partial<AgentRequest>): AgentRequest {
    const current = this.require(id);
    const updated: AgentRequest = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.requests.set(id, updated);
    return updated;
  }
}

function diagnosticStatusFor(status: RequestStatus): RequestDiagnosticStatus {
  switch (status) {
    case "created":
    case "sent":
    case "waiting":
      return "pending";
    case "answered":
      return "answered";
    case "timeout":
      return "timeout";
    case "cancelled":
      return "cancelled";
    case "archived":
      return "archived";
    case "failed":
      return "unknown_failure";
    default:
      return "unknown_failure";
  }
}
