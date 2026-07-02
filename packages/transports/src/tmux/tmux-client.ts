import { execFileSync } from "node:child_process";
import type { Agent, AgentPermissionPrompt } from "../../../core/src";

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

  sendInterrupt(target: string): void {
    this.run(["send-keys", "-t", target, "C-c"]);
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

export function detectAgentPermissionPrompt(agent: Agent, capture: string): AgentPermissionPrompt | undefined {
  const prompt = detectAgentBootstrapPrompt(agent, capture);
  return prompt?.kind === "client-update"
    ? undefined
    : prompt;
}

export function detectAgentBootstrapPrompt(agent: Agent, capture: string): AgentPermissionPrompt | undefined {
  const promptWindow = recentPromptWindow(capture);
  const latestSegment = latestInteractiveSegment(promptWindow);
  const normalized = latestSegment.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return undefined;
  }

  if (agent.agentType === "codex" && hasActiveCodexUpdatePrompt(latestSegment)) {
    return {
      client: "codex",
      kind: "client-update",
      message: "Codex is waiting at an update prompt before Mina can continue registration.",
      action: `Attach with "tmux attach -t ${agent.sessionId}" and choose a safe update option, or use Mina's Skip Codex Update action when available.`,
      evidence: promptEvidence(latestSegment, [codexUpdateBannerPattern, ...codexUpdateChoicePatterns]),
    };
  }

  if (agent.agentType === "codex" && hasCodexMcpRegistrationApproval(normalized, agent)) {
    return {
      client: "codex",
      kind: "codex-mcp-registration-approval",
      message: "Codex is waiting for approval of a Mina MCP registration or verification call.",
      action: `Review the Mina MCP call, then approve option 1 in Mina or attach with "tmux attach -t ${agent.sessionId}".`,
      evidence: promptEvidence(latestSegment, codexMcpApprovalPatterns),
    };
  }

  if (agent.agentType === "codex" && hasCodexTrustPrompt(normalized)) {
    return {
      client: "codex",
      kind: "directory-trust",
      message: "Codex is waiting for directory trust approval before it can work in this project.",
      action: `Review the project directory, then attach with "tmux attach -t ${agent.sessionId}" or press Send Enter in Mina to approve the prompt.`,
      evidence: promptEvidence(promptWindow, codexTrustPatterns),
    };
  }

  if (agent.agentType === "claude" && hasClaudeMcpRegistrationApproval(normalized, agent)) {
    return {
      client: "claude",
      kind: "mcp-registration-approval",
      message: "Claude is waiting for approval of a Mina MCP registration or verification call.",
      action: `Review the Mina MCP call, then approve option 1 in Mina or attach with "tmux attach -t ${agent.sessionId}".`,
      evidence: promptEvidence(latestSegment, claudeMcpApprovalPatterns),
    };
  }

  if (agent.agentType === "claude" && hasClaudeFolderTrustPrompt(normalized, agent.projectRoot)) {
    return {
      client: "claude",
      kind: "claude-folder-trust",
      message: "Claude is waiting for trust approval of this project folder.",
      action: `Review the folder path, then approve option 1 in Mina or attach with "tmux attach -t ${agent.sessionId}".`,
      evidence: promptEvidence(latestSegment, claudeFolderTrustPatterns),
    };
  }

  if (agent.agentType === "claude" && hasClaudeScopedRegistrationApproval(normalized, agent.projectRoot)) {
    return {
      client: "claude",
      kind: "scoped-command-approval",
      message: "Claude is waiting for approval of a Mina registration command scoped to this project.",
      action: `Review the scoped command, then approve it in Mina or attach with "tmux attach -t ${agent.sessionId}".`,
      evidence: promptEvidence(promptWindow, claudeScopedRegistrationApprovalPatterns),
    };
  }

  if (agent.agentType === "claude" && hasClaudePermissionPrompt(normalized)) {
    return {
      client: "claude",
      kind: "permission-approval",
      message: "Claude is waiting for a permission or trust approval before it can work in this project.",
      action: `Review the project directory, then attach with "tmux attach -t ${agent.sessionId}" and approve the Claude prompt.`,
      evidence: promptEvidence(promptWindow, claudePermissionPatterns),
    };
  }

  return undefined;
}

function hasCodexTrustPrompt(value: string): boolean {
  return codexTrustPatterns.some((pattern) => pattern.test(value));
}

function hasActiveCodexUpdatePrompt(value: string): boolean {
  const lines = promptLines(value);
  const latestNormalPromptIndex = lastIndexWhere(lines, (line) => codexNormalPromptPattern.test(line));
  const latestUpdateChoiceIndex = lastIndexWhere(lines, (line) => codexUpdateChoiceLinePatterns.some((pattern) => pattern.test(line)));
  if (latestNormalPromptIndex > latestUpdateChoiceIndex) {
    return false;
  }

  return codexUpdateBannerPattern.test(value)
    && codexUpdateChoicePatterns.every((pattern) => pattern.test(value));
}

function hasClaudePermissionPrompt(value: string): boolean {
  return claudePermissionPatterns.some((pattern) => pattern.test(value));
}

function hasClaudeScopedRegistrationApproval(value: string, projectRoot: string): boolean {
  if (!projectRoot || !claudeScopedRegistrationApprovalPatterns.some((pattern) => pattern.test(value))) {
    return false;
  }

  const tmuxContextProbe = /tmux\s+display-message\s+-p/i.test(value)
    && /\bpwd\b/i.test(value);
  if (tmuxContextProbe) {
    return true;
  }

  if (unsafeShellCommandPatterns.some((pattern) => pattern.test(value))) {
    return false;
  }

  const projectScopedRead = includesProjectRoot(value, projectRoot)
    && claudeReadOnlyRegistrationCommandPatterns.some((pattern) => pattern.test(value));
  const cwdScopedRead = !absolutePathPattern.test(value)
    && claudeReadOnlyRegistrationCommandPatterns.some((pattern) => pattern.test(value));

  return projectScopedRead || cwdScopedRead;
}

function hasCodexMcpRegistrationApproval(value: string, agent: Agent): boolean {
  if (!codexMcpApprovalPatterns.every((pattern) => pattern.test(value))) {
    return false;
  }
  return hasCodexRegisterAgentApproval(value, agent)
    || hasCodexListAgentsApproval(value, agent);
}

function hasClaudeMcpRegistrationApproval(value: string, agent: Agent): boolean {
  if (!claudeMcpApprovalPatterns.every((pattern) => pattern.test(value))) {
    return false;
  }
  return hasClaudeRegisterAgentApproval(value, agent)
    || hasClaudeListAgentsApproval(value, agent);
}

function hasCodexRegisterAgentApproval(value: string, agent: Agent): boolean {
  return /mina-ai-router\.register_agent/i.test(value)
    && /run tool ["“]register_agent["”]\?/i.test(value)
    && value.includes(agent.id)
    && value.includes(agent.sessionId)
    && includesProjectRoot(value, agent.projectRoot);
}

function hasCodexListAgentsApproval(value: string, agent: Agent): boolean {
  return /mina-ai-router\.list_agents/i.test(value)
    && /run tool ["“]list_agents["”]\?/i.test(value)
    && value.includes(agent.id)
    && value.includes(agent.sessionFingerprint ?? agent.sessionId);
}

function hasClaudeRegisterAgentApproval(value: string, agent: Agent): boolean {
  return /mina-ai-router\s+-\s+register_agent/i.test(value)
    && value.includes(agent.id)
    && value.includes(agent.sessionId)
    && includesProjectRoot(value, agent.projectRoot);
}

function hasClaudeListAgentsApproval(value: string, agent: Agent): boolean {
  return /mina-ai-router\s+-\s+list_agents/i.test(value)
    && (
      includesProjectRoot(value, agent.projectRoot)
      || value.includes(agent.id)
      || value.includes(agent.sessionFingerprint ?? agent.sessionId)
    );
}

function hasClaudeFolderTrustPrompt(value: string, projectRoot: string): boolean {
  return claudeFolderTrustPatterns.every((pattern) => pattern.test(value))
    && includesProjectRoot(value, projectRoot);
}

const codexUpdateBannerPattern = /update available!\s+\S+\s*->\s*\S+/i;

const codexUpdateChoicePatterns = [
  /(?:^|\s)1[.)]?\s*update now/i,
  /(?:^|\s)2[.)]?\s*skip(?:\s|$)/i,
];

const codexUpdateChoiceLinePatterns = [
  /^[›>\s]*1[.)]?\s*update now/i,
  /^[›>\s]*2[.)]?\s*skip(?:\s|$)/i,
  /^[›>\s]*3[.)]?\s*skip until next version/i,
];

const codexNormalPromptPattern = /^›\s+(?!1[.)]?\s*update now|2[.)]?\s*skip(?:\s|$)|3[.)]?\s*skip until next version).+/i;

const codexTrustPatterns = [
  /do you trust the contents of this directory\?/i,
  /yes,\s*continue/i,
  /codex.+(?:trust|permission|approval)/i,
];

const claudePermissionPatterns = [
  /claude.+(?:permission|approval|trust)/i,
  /(?:allow|approve).+claude/i,
  /do you trust.+(?:folder|directory|workspace|project)/i,
  /do you want to proceed\?/i,
  /permission.+(?:press enter|continue|approve|allow)/i,
];

const claudeFolderTrustPatterns = [
  /accessing workspace:/i,
  /yes,\s*i trust this folder/i,
  /enter to confirm/i,
];

const claudeMcpApprovalPatterns = [
  /mina-ai-router\s+-\s+(?:register_agent|list_agents)/i,
  /do you want to proceed\?/i,
  /1\.\s*yes/i,
  /\(mcp\)/i,
];

const codexMcpApprovalPatterns = [
  /mina-ai-router\.(?:register_agent|list_agents)/i,
  /allow the mina-ai-router mcp server to run tool ["“](?:register_agent|list_agents)["”]\?/i,
  /1[.)]\s*allow/i,
  /enter to submit/i,
];

const claudeScopedRegistrationApprovalPatterns = [
  /bash command/i,
  /(?:manual approval required|compound command contains cd|contains simple_expansion|this command requires approval|uses shell operators that require approval)/i,
];

const claudeReadOnlyRegistrationCommandPatterns = [
  /mina-ai-router-agent/i,
  /mina ai router/i,
  /register_agent/i,
  /list_agents/i,
  /\bls\s+-la\b/i,
  /\bpwd\b/i,
  /tmux\s+display-message\s+-p/i,
  /\b(?:cat|head|find|rg)\b/i,
];

const unsafeShellCommandPatterns = [
  /\brm\s+-/i,
  /\bsudo\b/i,
  /\bchmod\b/i,
  /\bchown\b/i,
  /\b(?:cp|mv|touch|mkdir|rmdir)\b/i,
  /\bcurl\b/i,
  /\bwget\b/i,
  /\bnpm\s+(?:install|i)\b/i,
  /\bpnpm\s+(?:install|add)\b/i,
  /\byarn\s+add\b/i,
  /(?:^|\s)\.\.(?:\/|\s|$)/i,
  />\s*(?:\/|~|\.)/i,
];

const absolutePathPattern = /(?:^|[\s"'])(?:\/|~\/)/;

function recentPromptWindow(capture: string): string {
  return capture
    .split(/\r?\n/)
    .slice(-80)
    .join("\n");
}

function latestInteractiveSegment(capture: string): string {
  const lines = capture.split(/\r?\n/);
  const trimmed = lines.map((line) => line.trim());
  const latestCompletionIndex = lastIndexWhere(trimmed, (line) =>
    /^(ready|trusted-|approved-|codex prompt ready|selected:)/i.test(line));
  const latestPromptishIndex = lastIndexWhere(trimmed, (line) =>
    /^›\s+/.test(line)
    || /do you want to proceed\?/i.test(line)
    || /quick safety check:/i.test(line)
    || /bash command/i.test(line)
    || /update available!/i.test(line)
    || /do you trust the contents of this directory\?/i.test(line));
  if (latestCompletionIndex > latestPromptishIndex) {
    return lines.slice(latestCompletionIndex).join("\n");
  }

  const latestNormalPromptIndex = lastIndexWhere(trimmed, (line) => codexNormalPromptPattern.test(line));
  const latestUpdateChoiceIndex = lastIndexWhere(trimmed, (line) => codexUpdateChoiceLinePatterns.some((pattern) => pattern.test(line)));
  const latestUpdateBannerIndex = lastIndexWhere(trimmed, (line) => codexUpdateBannerPattern.test(line));
  const latestCodexMcpToolIndex = lastIndexWhere(trimmed, (line) => /mina-ai-router\.(?:register_agent|list_agents)/i.test(line));
  if (latestCodexMcpToolIndex >= 0) {
    const callingIndex = lastIndexWhere(trimmed.slice(0, latestCodexMcpToolIndex + 1), (line) => /calling/i.test(line));
    return lines.slice(Math.max(0, callingIndex >= 0 ? callingIndex : latestCodexMcpToolIndex)).join("\n");
  }

  if (latestNormalPromptIndex > latestUpdateChoiceIndex && latestNormalPromptIndex > latestUpdateBannerIndex) {
    return lines.slice(latestNormalPromptIndex).join("\n");
  }

  const latestMcpToolIndex = lastIndexWhere(trimmed, (line) => /mina-ai-router\s+-\s+(?:register_agent|list_agents)/i.test(line));
  if (latestMcpToolIndex >= 0) {
    const toolUseIndex = lastIndexWhere(trimmed.slice(0, latestMcpToolIndex + 1), (line) => /tool use/i.test(line));
    return lines.slice(Math.max(0, toolUseIndex >= 0 ? toolUseIndex : latestMcpToolIndex)).join("\n");
  }

  const latestWorkspaceIndex = lastIndexWhere(trimmed, (line) => /accessing workspace:/i.test(line));
  if (latestWorkspaceIndex >= 0) {
    return lines.slice(latestWorkspaceIndex).join("\n");
  }

  const latestBashIndex = lastIndexWhere(trimmed, (line) => /bash command/i.test(line));
  if (latestBashIndex >= 0) {
    return lines.slice(latestBashIndex).join("\n");
  }

  if (latestUpdateBannerIndex >= 0) {
    return lines.slice(latestUpdateBannerIndex).join("\n");
  }

  return capture;
}

function promptLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function lastIndexWhere<T>(values: T[], predicate: (value: T) => boolean): number {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (predicate(values[index])) {
      return index;
    }
  }
  return -1;
}

function includesProjectRoot(value: string, projectRoot: string): boolean {
  return projectRootAliases(projectRoot).some((alias) => value.includes(alias));
}

function projectRootAliases(projectRoot: string): string[] {
  const aliases = new Set([projectRoot]);
  if (projectRoot.startsWith("/tmp/")) {
    aliases.add(`/private${projectRoot}`);
  }
  if (projectRoot.startsWith("/var/")) {
    aliases.add(`/private${projectRoot}`);
  }
  if (projectRoot.startsWith("/private/tmp/")) {
    aliases.add(projectRoot.replace(/^\/private/, ""));
  }
  if (projectRoot.startsWith("/private/var/")) {
    aliases.add(projectRoot.replace(/^\/private/, ""));
  }
  return [...aliases].filter(Boolean);
}

function promptEvidence(capture: string, patterns: RegExp[]): string {
  const lines = capture
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const matched = lines.find((line) => patterns.some((pattern) => pattern.test(line)));
  return (matched ?? lines.slice(-1)[0] ?? "").slice(0, 240);
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
