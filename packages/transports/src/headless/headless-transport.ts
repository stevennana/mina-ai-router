import type { Agent, AgentTransport } from "../../../core/src";

export class HeadlessTransport implements AgentTransport {
  private readonly buffers = new Map<string, string>();

  async send(agent: Agent, input: string): Promise<void> {
    this.buffers.set(agent.id, input);
  }

  async capture(agent: Agent): Promise<string> {
    return this.buffers.get(agent.id) ?? "";
  }

  async waitForResponse(agent: Agent, requestId: string): Promise<string> {
    const prompt = this.buffers.get(agent.id) ?? "";
    const answer = [
      `Headless response from ${agent.id}.`,
      "",
      "This transport is for local POC testing only.",
      "It proves the router envelope, request lifecycle, and response parser without a live CLI session.",
      "",
      `Received ${prompt.length} prompt characters for request ${requestId}.`,
    ].join("\n");

    return [
      `<<<MINA_AGENT_RESPONSE_START ${requestId}>>>`,
      answer,
      `<<<MINA_AGENT_RESPONSE_END ${requestId}>>>`,
    ].join("\n");
  }
}
