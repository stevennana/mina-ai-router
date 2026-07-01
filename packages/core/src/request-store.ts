import type {
  AgentRequest,
  RequestDiagnosticStatus,
  RequestRecoveryEvent,
  RequestRecoverySource,
  RequestStatus,
} from "./types";

export type RequestAction = "retry" | "cancel" | "archive" | "unarchive" | "interrupt" | "recover";

const openStatuses = new Set<RequestStatus>(["created", "sent", "waiting"]);
const archiveOnlyErrorPrefixes = [
  "Archived by operator",
  "Archived orphaned request",
];

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

  updateOpenStatus(id: string, status: RequestStatus, patch: Partial<AgentRequest> = {}): AgentRequest | undefined {
    const current = this.require(id);
    if (!openStatuses.has(current.status)) {
      return undefined;
    }

    return this.updateStatus(id, status, patch);
  }

  cancel(id: string, reason = "Cancelled by operator.", source: RequestRecoverySource = "system"): AgentRequest {
    const current = this.require(id);
    this.assertActionAllowed(current, "cancel");
    const now = new Date().toISOString();
    return this.updateStatus(id, "cancelled", {
      error: reason,
      leaseStatus: "released",
      leaseReleasedAt: now,
      recoveryEvents: appendRecoveryEvent(current, {
        at: now,
        action: "cancel",
        source,
        message: reason,
        previousLeaseStatus: current.leaseStatus,
        activeRequestId: current.id,
      }),
    });
  }

  archive(id: string, reason?: string, source: RequestRecoverySource = "system"): AgentRequest {
    const current = this.require(id);
    this.assertActionAllowed(current, "archive");
    const now = new Date().toISOString();
    const releasesLease = current.leaseStatus === "active" || current.leaseStatus === "orphaned";
    const archiveReason = current.error ?? reason;
    return this.updateStatus(id, "archived", {
      archivedAt: now,
      archivedFromStatus: current.status,
      error: archiveReason,
      leaseStatus: releasesLease ? "released" : current.leaseStatus,
      leaseReleasedAt: releasesLease ? now : current.leaseReleasedAt,
      recoveryStatus: current.leaseStatus === "orphaned" ? "recovered" : current.recoveryStatus,
      recoveredAt: current.leaseStatus === "orphaned" ? now : current.recoveredAt,
      recoveryEvents: current.leaseStatus === "orphaned"
        ? appendRecoveryEvent(current, {
          at: now,
          action: "archive",
          source,
          message: reason ?? "Archived orphaned request and released lease.",
          previousLeaseStatus: current.leaseStatus,
          activeRequestId: current.id,
        })
        : current.recoveryEvents,
    });
  }

  unarchive(id: string): AgentRequest {
    const current = this.require(id);
    this.assertActionAllowed(current, "unarchive");
    const restoredStatus = current.archivedFromStatus ?? "answered";
    const shouldClearArchiveError = current.error
      && restoredStatus !== "failed"
      && restoredStatus !== "timeout"
      && archiveOnlyErrorPrefixes.some((prefix) => current.error?.startsWith(prefix));
    return this.updateStatus(id, restoredStatus, {
      archivedAt: undefined,
      archivedFromStatus: undefined,
      error: shouldClearArchiveError ? undefined : current.error,
    });
  }

  recordRetry(originalRequestId: string, retryRequestId: string): AgentRequest {
    const original = this.require(originalRequestId);
    return this.patch(original.id, {
      retriedByRequestId: retryRequestId,
    });
  }

  recordInterrupt(
    id: string,
    options: { source: RequestRecoverySource; message?: string; terminalTarget?: string },
  ): AgentRequest {
    const current = this.require(id);
    this.assertActionAllowed(current, "interrupt");
    const now = new Date().toISOString();
    return this.patch(current.id, {
      recoveryStatus: "interrupted",
      interruptedAt: now,
      recoveryEvents: appendRecoveryEvent(current, {
        at: now,
        action: "interrupt",
        source: options.source,
        message: options.message ?? "Terminal interrupt sent by operator.",
        previousLeaseStatus: current.leaseStatus,
        activeRequestId: current.id,
        terminalTarget: options.terminalTarget,
      }),
    });
  }

  markRecovered(id: string, source: RequestRecoverySource, message = "Marked recovered by operator."): AgentRequest {
    const current = this.require(id);
    this.assertActionAllowed(current, "recover");
    const now = new Date().toISOString();
    return this.patch(current.id, {
      leaseStatus: "released",
      leaseReleasedAt: now,
      recoveryStatus: "recovered",
      recoveredAt: now,
      recoveryEvents: appendRecoveryEvent(current, {
        at: now,
        action: "recover",
        source,
        message,
        previousLeaseStatus: current.leaseStatus,
        activeRequestId: current.id,
      }),
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

    if (request.leaseStatus === "orphaned") {
      const recoveryActions: RequestAction[] = request.recoveryStatus === "interrupted"
        ? ["recover"]
        : ["interrupt", "recover"];
      return [...recoveryActions, "retry", "archive"];
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

function appendRecoveryEvent(request: AgentRequest, event: RequestRecoveryEvent): RequestRecoveryEvent[] {
  return [...(request.recoveryEvents ?? []), event];
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
