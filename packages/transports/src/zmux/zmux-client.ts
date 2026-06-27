export interface ZmuxJsonRpcClientOptions {
  endpoint?: string;
}

export class ZmuxJsonRpcClient {
  constructor(private readonly options: ZmuxJsonRpcClientOptions = {}) {}

  async sendPrompt(sessionId: string, prompt: string): Promise<void> {
    void sessionId;
    void prompt;
    throw new Error(
      `Zmux JSON-RPC client is not wired yet${this.options.endpoint ? ` for ${this.options.endpoint}` : ""}.`,
    );
  }

  async capture(sessionId: string): Promise<string> {
    void sessionId;
    throw new Error(
      `Zmux JSON-RPC client is not wired yet${this.options.endpoint ? ` for ${this.options.endpoint}` : ""}.`,
    );
  }
}
