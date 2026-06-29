import { createRequestId } from "./ids";
import { buildPromptEnvelope } from "./prompt-envelope";
import { inspectMarkedResponse, ResponseParseError } from "./response-parser";
import type {
  AgentRequest,
  AgentResponse,
  AgentStatus,
  CallAgentInput,
  RequestRawEvidence,
  TransportRegistry,
} from "./types";
import { AgentRegistry } from "./registry";
import { RequestStore } from "./request-store";

const rawEvidenceExcerptLimit = 4_000;
const defaultAgentStaleAfterMs = 15 * 60 * 1000;

class RequestNoLongerOpenError extends Error {
  constructor(readonly request: AgentRequest) {
    super(`Request "${request.id}" is ${request.status} and can no longer be updated by the active router call.`);
  }
}

export interface AgentRouterOptions {
  registry: AgentRegistry;
  requestStore: RequestStore;
  transports: TransportRegistry;
  defaultSourceAgent?: string;
  defaultTimeoutMs?: number;
  agentStaleAfterMs?: number;
  onStateChanged?: () => void;
}

export class AgentRouter {
  private readonly registry: AgentRegistry;
  private readonly requestStore: RequestStore;
  private readonly transports: TransportRegistry;
  private readonly defaultSourceAgent: string;
  private readonly defaultTimeoutMs: number;
  private readonly agentStaleAfterMs: number;
  private readonly onStateChanged?: () => void;
  private readonly busyAgents = new Set<string>();

  constructor(options: AgentRouterOptions) {
    this.registry = options.registry;
    this.requestStore = options.requestStore;
    this.transports = options.transports;
    this.defaultSourceAgent = options.defaultSourceAgent ?? "main";
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 300_000;
    this.agentStaleAfterMs = options.agentStaleAfterMs ?? defaultAgentStaleAfterMs;
    this.onStateChanged = options.onStateChanged;
  }

  listAgents() {
    return this.registry.list();
  }

  listRequests() {
    return this.requestStore.list();
  }

  async listAgentStatuses(options: { callerAgentId?: string } = {}) {
    const requests = this.requestStore.list();
    const checkedAt = new Date().toISOString();
    let healthChanged = false;
    return Promise.all(
      this.registry.list().map(async (agent) => {
        const agentRequests = requests.filter((request) => request.targetAgent === agent.id);
        const lastRequest = agentRequests[agentRequests.length - 1];
        const transport = this.transports.get(agent.transport);
        const status = transport.status
          ? await transport.status(agent)
          : { status: "unknown" as const };
        const bootstrapStatus = status.bootstrapStatus ?? agent.bootstrapStatus;
        if (status.bootstrapStatus && status.bootstrapStatus !== agent.bootstrapStatus) {
          this.registry.register({
            ...agent,
            bootstrapStatus: status.bootstrapStatus,
          });
          healthChanged = true;
        }
        const lastActivityAt = lastRequest?.updatedAt ?? agent.lastActivityAt;
        const lastSeenAt = status.status === "available" ? checkedAt : agent.lastSeenAt;
        const healthStatus = classifyAgentHealth({
          transportStatus: status.status,
          busy: this.busyAgents.has(agent.id),
          lastSeenAt,
          lastActivityAt,
          lastRequest,
          checkedAt,
          staleAfterMs: this.agentStaleAfterMs,
        });

        if (lastSeenAt !== agent.lastSeenAt || lastActivityAt !== agent.lastActivityAt) {
          this.registry.updateHealth(agent.id, { lastSeenAt, lastActivityAt });
          healthChanged = true;
        }

        return {
          id: agent.id,
          name: agent.name,
          agentType: agent.agentType,
          transport: agent.transport,
          sessionId: agent.sessionId,
          projectRoot: agent.projectRoot,
          capabilitySummary: agent.capabilitySummary,
          capabilitySources: agent.capabilitySources,
          capabilitySource: agent.capabilitySource,
          capabilityUpdatedAt: agent.capabilityUpdatedAt,
          lastCapabilityRefreshAt: agent.lastCapabilityRefreshAt,
          capabilityProfile: agent.capabilityProfile,
          bootstrapStatus,
          registrationSource: agent.registrationSource,
          registrationStatus: agent.registrationStatus,
          lastRegistrationAttemptAt: agent.lastRegistrationAttemptAt,
          confirmedByAgentAt: agent.confirmedByAgentAt,
          sessionFingerprint: agent.sessionFingerprint,
          registrationHistory: agent.registrationHistory,
          registrationWarnings: agent.registrationWarnings,
          permissionProfile: agent.permissionProfile,
          permissionProfileStatus: agent.permissionProfileStatus,
          permissionProfileDetail: agent.permissionProfileDetail,
          permissionPrompt: status.permissionPrompt,
          mcpPreflightStatus: agent.mcpPreflightStatus,
          mcpPreflightDetail: agent.mcpPreflightDetail,
          mcpSetupCommand: agent.mcpSetupCommand,
          mcpVerifyCommand: agent.mcpVerifyCommand,
          mcpRemoveCommand: agent.mcpRemoveCommand,
          mcpUrl: agent.mcpUrl,
          lastSeenAt,
          lastActivityAt,
          activeRequestId: agent.activeRequestId,
          leaseStatus: agent.leaseStatus,
          leaseStartedAt: agent.leaseStartedAt,
          leaseExpiresAt: agent.leaseExpiresAt,
          leaseReleasedAt: agent.leaseReleasedAt,
          healthCheckedAt: checkedAt,
          staleAfterMs: this.agentStaleAfterMs,
          status: healthStatus.status,
          detail: healthStatus.detail ?? status.detail,
          lastRequestStatus: lastRequest?.status,
          isSelf: options.callerAgentId === agent.id || undefined,
        };
      }),
    ).finally(() => {
      if (healthChanged) {
        this.persistState();
      }
    });
  }

  getRequest(requestId: string) {
    return this.requestStore.require(requestId);
  }

  async callAgent(input: CallAgentInput): Promise<AgentResponse> {
    const target = this.registry.require(input.target);
    if (input.sourceAgent && input.sourceAgent === target.id && !input.allowSelfCall) {
      throw new Error(`Refusing self-call from agent "${target.id}" to itself. Choose another target from list_agents or pass allowSelfCall: true for diagnostics.`);
    }

    if (this.busyAgents.has(target.id)) {
      throw new Error(`Agent "${target.id}" is busy with another request.`);
    }

    this.busyAgents.add(target.id);
    const now = new Date().toISOString();
    const timeoutMs = input.timeoutMs ?? this.defaultTimeoutMs;
    const leaseExpiresAt = new Date(Date.now() + timeoutMs).toISOString();
    this.registry.register({
      ...target,
      activeRequestId: undefined,
      leaseStatus: undefined,
      leaseStartedAt: undefined,
      leaseExpiresAt: undefined,
      leaseReleasedAt: undefined,
      lastActivityAt: now,
    });
    const request: AgentRequest = this.requestStore.create({
      id: createRequestId(),
      sourceAgent: input.sourceAgent ?? this.defaultSourceAgent,
      targetAgent: target.id,
      task: input.task,
      status: "created",
      createdAt: now,
      updatedAt: now,
      retryOfRequestId: input.retryOfRequestId,
      leaseStatus: "active",
      leaseStartedAt: now,
      leaseExpiresAt,
      leaseOwnerAgentId: target.id,
      leaseTargetSessionId: target.sessionId,
      leaseTargetSessionFingerprint: target.sessionFingerprint,
    });
    this.registry.register({
      ...target,
      activeRequestId: request.id,
      leaseStatus: "active",
      leaseStartedAt: now,
      leaseExpiresAt,
      leaseReleasedAt: undefined,
      lastActivityAt: now,
    });
    this.persistState();

    const transport = this.transports.get(target.transport);
    const prompt = buildPromptEnvelope(request, target);
    this.requestStore.patch(request.id, {
      promptEvidence: rawEvidenceFromOutput(prompt, "prompt_envelope"),
    });
    let output = "";

    try {
      await transport.send(target, prompt, request.id);
      this.updateOpenRequestStatus(request.id, "sent");
      this.persistState();
      this.updateOpenRequestStatus(request.id, "waiting");
      this.persistState();

      output = await transport.waitForResponse(
        target,
        request.id,
        input.timeoutMs ?? this.defaultTimeoutMs,
      );
      const parsed = inspectMarkedResponse(output, request.id);

      if (!parsed.ok) {
        throw new ResponseParseError(parsed.diagnostics);
      }

      const answer = parsed.answer;
      this.updateOpenRequestStatus(request.id, "answered", {
        answer,
        diagnosticStatus: "answered",
        parserDiagnostics: parsed.diagnostics,
        rawEvidence: rawEvidenceFromOutput(output),
        ...releasedLeasePatch(),
      });
      this.releaseAgentLease(target.id, request.id);
      this.persistState();

      return {
        requestId: request.id,
        target: target.id,
        answer,
      };
    } catch (error) {
      if (error instanceof RequestNoLongerOpenError) {
        this.releaseAgentLease(target.id, request.id);
        this.persistState();
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      const status = /time(?:d)?\s*out|timeout/i.test(message) ? "timeout" : "failed";
      const capturedOutput = output || extractLastCapture(message);
      const updated = this.requestStore.updateOpenStatus(request.id, status, {
        error: message,
        diagnosticStatus: diagnosticStatusForError(error, status),
        parserDiagnostics: error instanceof ResponseParseError ? error.diagnostics : undefined,
        rawEvidence: capturedOutput ? rawEvidenceFromOutput(capturedOutput) : undefined,
        ...(status === "timeout" ? orphanedLeasePatch() : releasedLeasePatch()),
      });
      if (!updated) {
        this.releaseAgentLease(target.id, request.id);
        throw new RequestNoLongerOpenError(this.requestStore.require(request.id));
      }
      if (status === "timeout") {
        this.orphanAgentLease(target.id, request.id);
      } else {
        this.releaseAgentLease(target.id, request.id);
      }
      this.persistState();
      throw error;
    } finally {
      const current = this.registry.get(target.id);
      if (current?.activeRequestId !== request.id) {
        this.busyAgents.delete(target.id);
      }
    }
  }

  private updateOpenRequestStatus(
    requestId: string,
    status: AgentRequest["status"],
    patch: Partial<AgentRequest> = {},
  ): AgentRequest {
    const updated = this.requestStore.updateOpenStatus(requestId, status, patch);
    if (!updated) {
      throw new RequestNoLongerOpenError(this.requestStore.require(requestId));
    }

    return updated;
  }

  private persistState(): void {
    this.onStateChanged?.();
  }

  private releaseAgentLease(agentId: string, requestId: string): void {
    const current = this.registry.get(agentId);
    if (!current || current.activeRequestId !== requestId) {
      this.busyAgents.delete(agentId);
      return;
    }

    this.registry.register({
      ...current,
      activeRequestId: undefined,
      leaseStatus: "released",
      leaseReleasedAt: new Date().toISOString(),
    });
    this.busyAgents.delete(agentId);
  }

  private orphanAgentLease(agentId: string, requestId: string): void {
    const current = this.registry.get(agentId);
    if (!current || current.activeRequestId !== requestId) {
      return;
    }

    this.registry.register({
      ...current,
      activeRequestId: requestId,
      leaseStatus: "orphaned",
    });
  }
}

function releasedLeasePatch(): Partial<AgentRequest> {
  return {
    leaseStatus: "released",
    leaseReleasedAt: new Date().toISOString(),
  };
}

function orphanedLeasePatch(): Partial<AgentRequest> {
  return {
    leaseStatus: "orphaned",
  };
}

function diagnosticStatusForError(
  error: unknown,
  status: "failed" | "timeout",
): AgentRequest["diagnosticStatus"] {
  if (status === "timeout") {
    return "timeout";
  }

  if (error instanceof ResponseParseError) {
    return "parse_failure";
  }

  return "transport_failure";
}

function classifyAgentHealth(input: {
  transportStatus: AgentStatus["status"];
  busy: boolean;
  lastSeenAt?: string;
  lastActivityAt?: string;
  lastRequest?: AgentRequest;
  checkedAt: string;
  staleAfterMs: number;
}): Pick<AgentStatus, "status" | "detail"> {
  if (input.lastRequest?.leaseStatus === "orphaned") {
    return { status: "busy", detail: `Request "${input.lastRequest.id}" timed out in the router, but the target session lease is still attached for recovery.` };
  }

  if (input.busy) {
    return { status: "busy", detail: "Agent is currently handling a routed request." };
  }

  if (input.transportStatus === "missing") {
    return { status: "missing" };
  }

  if (input.transportStatus === "needs-attention") {
    return { status: "needs-attention" };
  }

  const attentionStatuses = new Set<AgentRequest["status"]>(["failed", "timeout"]);
  if (input.lastRequest && attentionStatuses.has(input.lastRequest.status)) {
    return {
      status: "needs-attention",
      detail: input.lastRequest.error
        ? `Last request ${input.lastRequest.status}: ${input.lastRequest.error}`
        : `Last request is ${input.lastRequest.status}.`,
    };
  }

  const staleReference = input.lastSeenAt ?? input.lastActivityAt;
  if (staleReference && isOlderThan(staleReference, input.checkedAt, input.staleAfterMs)) {
    return {
      status: "stale",
      detail: `No confirmed agent reachability within ${Math.round(input.staleAfterMs / 1000)} seconds.`,
    };
  }

  if (input.transportStatus === "available") {
    return { status: "available" };
  }

  if (input.transportStatus === "stale") {
    return { status: input.transportStatus };
  }

  return { status: "unknown" };
}

function isOlderThan(timestamp: string, now: string, staleAfterMs: number): boolean {
  const timestampMs = Date.parse(timestamp);
  const nowMs = Date.parse(now);
  return Number.isFinite(timestampMs)
    && Number.isFinite(nowMs)
    && nowMs - timestampMs > staleAfterMs;
}

function rawEvidenceFromOutput(output: string, kind: RequestRawEvidence["kind"] = "transport_capture"): RequestRawEvidence {
  const excerpt = output.slice(-rawEvidenceExcerptLimit);
  return {
    kind,
    capturedAt: new Date().toISOString(),
    characterCount: output.length,
    excerpt,
    truncated: output.length > excerpt.length,
  };
}

function extractLastCapture(message: string): string | undefined {
  const marker = "Last capture:\n";
  const index = message.indexOf(marker);

  if (index === -1) {
    return undefined;
  }

  return message.slice(index + marker.length);
}
