export type AgentType = "codex" | "claude" | "gemini" | "unknown" | string;

export type TransportType = "mock" | "headless" | "tmux" | "zmux" | string;

export type RequestStatus =
  | "created"
  | "sent"
  | "waiting"
  | "answered"
  | "failed"
  | "timeout"
  | "cancelled"
  | "archived";

export type RequestDiagnosticStatus =
  | "pending"
  | "answered"
  | "timeout"
  | "cancelled"
  | "archived"
  | "parse_failure"
  | "transport_failure"
  | "unknown_failure";

export type ResponseParserDiagnosticKind =
  | "parsed"
  | "missing_markers"
  | "missing_start_marker"
  | "placeholder_only";

export interface ResponseParserDiagnostics {
  kind: ResponseParserDiagnosticKind;
  requestId: string;
  message: string;
  startMarkerFound: boolean;
  endMarkerFound: boolean;
  candidateCount: number;
  placeholderCount: number;
  answerLength?: number;
}

export interface RequestRawEvidence {
  kind: "transport_capture";
  capturedAt: string;
  characterCount: number;
  excerpt: string;
  truncated: boolean;
}

export interface Agent {
  id: string;
  name: string;
  agentType: AgentType;
  projectRoot: string;
  transport: TransportType;
  sessionId: string;
  tmuxTarget?: string;
  startupCommand?: string;
  capabilitySummary?: string;
  capabilitySources?: string;
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
  retryOfRequestId?: string;
  retriedByRequestId?: string;
  archivedAt?: string;
  archivedFromStatus?: RequestStatus;
  diagnosticStatus?: RequestDiagnosticStatus;
  parserDiagnostics?: ResponseParserDiagnostics;
  rawEvidence?: RequestRawEvidence;
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
  retryOfRequestId?: string;
}

export interface AgentStatus {
  id: string;
  name: string;
  agentType: AgentType;
  transport: TransportType;
  sessionId: string;
  projectRoot: string;
  capabilitySummary?: string;
  capabilitySources?: string;
  status: "available" | "missing" | "unknown" | "busy";
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
