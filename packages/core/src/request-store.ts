import type { AgentRequest, RequestDiagnosticStatus, RequestStatus } from "./types";

export type RequestAction = "retry" | "cancel" | "archive" | "unarchive";

const openStatuses = new Set<RequestStatus>(["created", "sent", "waiting"]);

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

  cancel(id: string, reason = "Cancelled by operator."): AgentRequest {
    const current = this.require(id);
    this.assertActionAllowed(current, "cancel");
    return this.updateStatus(id, "cancelled", {
      error: reason,
    });
  }

  archive(id: string, reason?: string): AgentRequest {
    const current = this.require(id);
    this.assertActionAllowed(current, "archive");
    return this.updateStatus(id, "archived", {
      archivedAt: new Date().toISOString(),
      archivedFromStatus: current.status,
      error: current.error ?? reason,
    });
  }

  unarchive(id: string): AgentRequest {
    const current = this.require(id);
    this.assertActionAllowed(current, "unarchive");
    const restoredStatus = current.archivedFromStatus ?? "answered";
    return this.updateStatus(id, restoredStatus, {
      archivedAt: undefined,
      archivedFromStatus: undefined,
    });
  }

  recordRetry(originalRequestId: string, retryRequestId: string): AgentRequest {
    const original = this.require(originalRequestId);
    return this.patch(original.id, {
      retriedByRequestId: retryRequestId,
    });
  }

  assertActionAllowed(request: AgentRequest, action: RequestAction): void {
    const validActions = this.validActions(request);
    if (!validActions.includes(action)) {
      throw new Error(
        `Cannot ${action} request "${request.id}" while it is ${request.status}. Valid actions: ${validActions.join(", ") || "none"}.`,
      );
    }
  }

  validActions(request: AgentRequest): RequestAction[] {
    if (request.status === "archived") {
      return ["retry", "unarchive"];
    }

    if (openStatuses.has(request.status)) {
      return ["cancel"];
    }

    return ["retry", "archive"];
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
