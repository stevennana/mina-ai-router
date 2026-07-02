import type { Agent, AgentTransport, AgentTransportStatus } from "../../../core/src";
import { parseMarkedResponse } from "../../../core/src";
import { detectAgentBootstrapPrompt, TmuxClient } from "./tmux-client";

const pollIntervalMs = 500;

export class TmuxTransport implements AgentTransport {
  constructor(private readonly client = new TmuxClient()) {}

  async send(agent: Agent, input: string): Promise<void> {
    this.client.ensureSession(agent);
    if (agent.agentType === "codex") {
      this.client.sendCodexText(targetFor(agent), input);
      return;
    }

    this.client.sendText(targetFor(agent), input);
  }

  async capture(agent: Agent): Promise<string> {
    this.client.ensureSession(agent);
    return this.client.capture(targetFor(agent));
  }

  async waitForResponse(agent: Agent, requestId: string, timeoutMs: number): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    let lastOutput = "";

    while (Date.now() < deadline) {
      lastOutput = await this.capture(agent);

      try {
        parseMarkedResponse(lastOutput, requestId);
        return lastOutput;
      } catch {
        await sleep(pollIntervalMs);
      }
    }

    throw new Error(`Timed out waiting for response markers for ${requestId}. Last capture:\n${lastOutput}`);
  }

  async status(agent: Agent): Promise<AgentTransportStatus> {
    if (!this.client.isAvailable()) {
      return { status: "missing", detail: "tmux binary is not available" };
    }

    if (!this.client.hasSession(agent.sessionId)) {
      return { status: "missing", detail: `tmux session "${agent.sessionId}" does not exist` };
    }

    const capture = this.client.capture(targetFor(agent));
    const bootstrapPrompt = detectAgentBootstrapPrompt(agent, capture);
    if (bootstrapPrompt) {
      return {
        status: "needs-attention",
        detail: `${bootstrapPrompt.message} ${bootstrapPrompt.action}`,
        bootstrapStatus: bootstrapPrompt.kind === "client-update" ? "client-update-required" : "permission-required",
        permissionPrompt: bootstrapPrompt,
      };
    }

    return { status: "available", detail: this.client.attachCommand(agent) };
  }
}

function targetFor(agent: Agent): string {
  return agent.tmuxTarget ?? agent.sessionId;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
