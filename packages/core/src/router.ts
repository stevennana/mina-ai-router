import { createRequestId } from "./ids";
import { buildPromptEnvelope } from "./prompt-envelope";
import { parseMarkedResponse } from "./response-parser";
import type { AgentRequest, AgentResponse, CallAgentInput, TransportRegistry } from "./types";
import { AgentRegistry } from "./registry";
import { RequestStore } from "./request-store";

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
    });
    this.persistState();

    const transport = this.transports.get(target.transport);
    const prompt = buildPromptEnvelope(request, target);

    try {
      await transport.send(target, prompt, request.id);
      this.requestStore.updateStatus(request.id, "sent");
      this.persistState();
      this.requestStore.updateStatus(request.id, "waiting");
      this.persistState();

      const output = await transport.waitForResponse(
        target,
        request.id,
        input.timeoutMs ?? this.defaultTimeoutMs,
      );
      const answer = parseMarkedResponse(output, request.id);
      this.requestStore.updateStatus(request.id, "answered", { answer });
      this.persistState();

      return {
        requestId: request.id,
        target: target.id,
        answer,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = /time(?:d)?\s*out|timeout/i.test(message) ? "timeout" : "failed";
      this.requestStore.updateStatus(request.id, status, { error: message });
      this.persistState();
      throw error;
    } finally {
      this.busyAgents.delete(target.id);
    }
  }

  private persistState(): void {
    this.onStateChanged?.();
  }
}
