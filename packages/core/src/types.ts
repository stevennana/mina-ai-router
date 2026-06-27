export type AgentType = "codex" | "claude" | "gemini" | "unknown" | string;

export type TransportType = "mock" | "headless" | "tmux" | "zmux" | string;

export type RequestStatus =
  | "created"
  | "sent"
  | "waiting"
  | "answered"
  | "failed"
  | "timeout";

export interface Agent {
  id: string;
  name: string;
  agentType: AgentType;
  projectRoot: string;
  transport: TransportType;
  sessionId: string;
  tmuxTarget?: string;
  startupCommand?: string;
}

export interface AgentRequest {
  id: string;
  sourceAgent: string;
  targetAgent: string;
  task: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
  answer?: string;
}

export interface AgentResponse {
  requestId: string;
  target: string;
  answer: string;
}

export interface CallAgentInput {
  sourceAgent?: string;
  target: string;
  task: string;
  timeoutMs?: number;
}

export interface AgentStatus {
  id: string;
  name: string;
  agentType: AgentType;
  transport: TransportType;
  sessionId: string;
  projectRoot: string;
  status: "available" | "missing" | "unknown";
  detail?: string;
  lastRequestStatus?: RequestStatus;
}

export interface AgentTransport {
  send(agent: Agent, input: string, requestId: string): Promise<void>;
  capture(agent: Agent): Promise<string>;
  waitForResponse(
    agent: Agent,
    requestId: string,
    timeoutMs: number,
  ): Promise<string>;
  status?(agent: Agent): Promise<{ status: AgentStatus["status"]; detail?: string }>;
}

export interface TransportRegistry {
  get(type: TransportType): AgentTransport;
}
