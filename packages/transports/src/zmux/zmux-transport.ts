import type { Agent, AgentTransport } from "../../../core/src";
import { parseMarkedResponse } from "../../../core/src";
import { ZmuxJsonRpcClient } from "./zmux-client";

const pollIntervalMs = 500;

export class ZmuxTransport implements AgentTransport {
  constructor(private readonly client = new ZmuxJsonRpcClient()) {}

  async send(agent: Agent, input: string): Promise<void> {
    await this.client.sendPrompt(agent.sessionId, input);
  }

  async capture(agent: Agent): Promise<string> {
    return this.client.capture(agent.sessionId);
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
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
