import { execFileSync } from "node:child_process";
import type { Agent } from "../../../core/src";

export interface TmuxClientOptions {
  binary?: string;
  captureLines?: number;
  submitDelayMs?: number;
  submitKey?: string;
  inputChunkSize?: number;
  clearInputKeys?: string[];
  chunkDelayMs?: number;
  maxSubmitDelayMs?: number;
}

export class TmuxClient {
  private readonly binary: string;
  private readonly captureLines: number;
  private readonly submitDelayMs: number;
  private readonly submitKey: string;
  private readonly inputChunkSize: number;
  private readonly clearInputKeys: string[];
  private readonly chunkDelayMs: number;
  private readonly maxSubmitDelayMs: number;

  constructor(options: TmuxClientOptions = {}) {
    this.binary = options.binary ?? process.env.MINA_TMUX_BIN ?? "tmux";
    this.captureLines = options.captureLines ?? 2_000;
    this.submitDelayMs = options.submitDelayMs ?? Number(process.env.MINA_TMUX_SUBMIT_DELAY_MS ?? "350");
    this.submitKey = options.submitKey ?? process.env.MINA_TMUX_SUBMIT_KEY ?? "C-m";
    this.inputChunkSize = options.inputChunkSize ?? Number(process.env.MINA_TMUX_INPUT_CHUNK_SIZE ?? "800");
    this.clearInputKeys = options.clearInputKeys ?? splitKeys(process.env.MINA_TMUX_CLEAR_INPUT_KEYS ?? "C-u");
    this.chunkDelayMs = options.chunkDelayMs ?? Number(process.env.MINA_TMUX_CHUNK_DELAY_MS ?? "50");
    this.maxSubmitDelayMs = options.maxSubmitDelayMs ?? Number(process.env.MINA_TMUX_MAX_SUBMIT_DELAY_MS ?? "5000");
  }

  isAvailable(): boolean {
    try {
      this.run(["-V"]);
      return true;
    } catch {
      return false;
    }
  }

  hasSession(sessionId: string): boolean {
    try {
      this.run(["has-session", "-t", sessionId]);
      return true;
    } catch {
      return false;
    }
  }

  killSession(sessionId: string): void {
    if (!this.hasSession(sessionId)) {
      return;
    }

    this.run(["kill-session", "-t", sessionId]);
  }

  ensureSession(agent: Agent): void {
    if (this.hasSession(agent.sessionId)) {
      return;
    }

    const args = ["new-session", "-d", "-s", agent.sessionId, "-x", "200", "-y", "60", "-c", agent.projectRoot];
    if (agent.startupCommand) {
      args.push(agent.startupCommand);
    }

    this.run(args);
  }

  sendText(target: string, text: string): void {
    this.run(["load-buffer", "-"], text);
    this.run(["paste-buffer", "-t", target, "-d"]);
    this.sleep(this.submitDelayMs);
    this.run(["send-keys", "-t", target, this.submitKey]);
  }

  sendEnter(target: string): void {
    this.run(["send-keys", "-t", target, this.submitKey]);
  }

  sendCodexText(target: string, text: string): void {
    const prompt = asSingleLinePrompt(text);
    for (const key of this.clearInputKeys) {
      this.run(["send-keys", "-t", target, key]);
      this.sleep(this.submitDelayMs);
    }
    this.sleep(this.submitDelayMs);
    for (const chunk of chunks(prompt, this.inputChunkSize)) {
      this.run(["send-keys", "-t", target, "-l", chunk]);
      this.sleep(this.chunkDelayMs);
    }
    this.sleep(submitDelayFor(prompt, this.submitDelayMs, this.maxSubmitDelayMs));
    this.run(["send-keys", "-t", target, this.submitKey]);
  }

  capture(target: string): string {
    return this.run(["capture-pane", "-t", target, "-p", "-J", "-S", `-${this.captureLines}`]);
  }

  attachCommand(agent: Agent): string {
    return `${this.binary} attach -t ${agent.sessionId}`;
  }

  private run(args: string[], input?: string): string {
    try {
      return execFileSync(this.binary, args, {
        encoding: "utf8",
        input,
        stdio: input === undefined ? ["ignore", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`tmux ${args.join(" ")} failed: ${detail}`);
    }
  }

  private sleep(milliseconds: number): void {
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
      return;
    }

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
  }
}

function asSingleLinePrompt(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" | ");
}

function chunks(text: string, chunkSize: number): string[] {
  const size = Number.isFinite(chunkSize) && chunkSize > 0 ? Math.floor(chunkSize) : 800;
  const result: string[] = [];

  for (let index = 0; index < text.length; index += size) {
    result.push(text.slice(index, index + size));
  }

  return result;
}

function splitKeys(value: string): string[] {
  return value
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

function submitDelayFor(text: string, minimumDelayMs: number, maximumDelayMs: number): number {
  const minimum = Number.isFinite(minimumDelayMs) && minimumDelayMs > 0 ? minimumDelayMs : 350;
  const maximum = Number.isFinite(maximumDelayMs) && maximumDelayMs > 0 ? maximumDelayMs : 5_000;
  const proportional = 1_000 + text.length * 3;

  return Math.min(Math.max(minimum, proportional), maximum);
}
