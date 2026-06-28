import { createRequestId } from "./ids";
import { buildPromptEnvelope } from "./prompt-envelope";
import { inspectMarkedResponse, ResponseParseError } from "./response-parser";
import type {
  AgentRequest,
  AgentResponse,
  CallAgentInput,
  RequestRawEvidence,
  TransportRegistry,
} from "./types";
import { AgentRegistry } from "./registry";
import { RequestStore } from "./request-store";

const rawEvidenceExcerptLimit = 4_000;

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
  onStateChanged?: () => void;
}

export class AgentRouter {
  private readonly registry: AgentRegistry;
  private readonly requestStore: RequestStore;
  private readonly transports: TransportRegistry;
  private readonly defaultSourceAgent: string;
  private readonly defaultTimeoutMs: number;
  private readonly onStateChanged?: () => void;
  private readonly busyAgents = new Set<string>();

  constructor(options: AgentRouterOptions) {
    this.registry = options.registry;
    this.requestStore = options.requestStore;
    this.transports = options.transports;
    this.defaultSourceAgent = options.defaultSourceAgent ?? "main";
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 300_000;
    this.onStateChanged = options.onStateChanged;
  }

  listAgents() {
    return this.registry.list();
  }

  listRequests() {
    return this.requestStore.list();
  }

  async listAgentStatuses() {
    const requests = this.requestStore.list();
    return Promise.all(
      this.registry.list().map(async (agent) => {
        const agentRequests = requests.filter((request) => request.targetAgent === agent.id);
        const lastRequest = agentRequests[agentRequests.length - 1];
        const transport = this.transports.get(agent.transport);
        const status = transport.status
          ? await transport.status(agent)
          : { status: "unknown" as const };

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
          status: this.busyAgents.has(agent.id) ? "busy" as const : status.status,
          detail: status.detail,
          lastRequestStatus: lastRequest?.status,
        };
      }),
    );
  }

  getRequest(requestId: string) {
    return this.requestStore.require(requestId);
  }

  async callAgent(input: CallAgentInput): Promise<AgentResponse> {
    const target = this.registry.require(input.target);
    if (this.busyAgents.has(target.id)) {
      throw new Error(`Agent "${target.id}" is busy with another request.`);
    }

    this.busyAgents.add(target.id);
    const now = new Date().toISOString();
    const request: AgentRequest = this.requestStore.create({
      id: createRequestId(),
      sourceAgent: input.sourceAgent ?? this.defaultSourceAgent,
      targetAgent: target.id,
      task: input.task,
      status: "created",
      createdAt: now,
      updatedAt: now,
      retryOfRequestId: input.retryOfRequestId,
    });
    this.persistState();

    const transport = this.transports.get(target.transport);
    const prompt = buildPromptEnvelope(request, target);
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
      });
      this.persistState();

      return {
        requestId: request.id,
        target: target.id,
        answer,
      };
    } catch (error) {
      if (error instanceof RequestNoLongerOpenError) {
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
      });
      if (!updated) {
        throw new RequestNoLongerOpenError(this.requestStore.require(request.id));
      }
      this.persistState();
      throw error;
    } finally {
      this.busyAgents.delete(target.id);
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

function rawEvidenceFromOutput(output: string): RequestRawEvidence {
  const excerpt = output.slice(-rawEvidenceExcerptLimit);
  return {
    kind: "transport_capture",
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
