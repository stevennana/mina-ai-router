export type AgentStatus = "available" | "busy" | "missing" | "unknown" | string;
export type RequestStatus = "created" | "sent" | "waiting" | "answered" | "failed" | "timeout" | "cancelled" | "archived" | string;
export type RequestDiagnosticStatus =
  | "pending"
  | "answered"
  | "timeout"
  | "cancelled"
  | "archived"
  | "parse_failure"
  | "transport_failure"
  | "unknown_failure"
  | string;

export type ResponseParserDiagnostics = {
  kind: "parsed" | "missing_markers" | "missing_start_marker" | "placeholder_only" | string;
  requestId: string;
  message: string;
  startMarkerFound: boolean;
  endMarkerFound: boolean;
  candidateCount: number;
  placeholderCount: number;
  answerLength?: number;
};

export type RequestRawEvidence = {
  kind: "transport_capture" | string;
  capturedAt: string;
  characterCount: number;
  excerpt: string;
  truncated: boolean;
};

export type RouterAgent = {
  id: string;
  name?: string;
  agentType: string;
  transport: string;
  sessionId: string;
  projectRoot?: string;
  tmuxTarget?: string;
  capabilitySummary?: string;
  capabilitySources?: string;
  detail?: string;
  status: AgentStatus;
  lastRequestStatus?: string;
};

export type RouterRequest = {
  id: string;
  sourceAgent?: string;
  targetAgent: string;
  task: string;
  status: RequestStatus;
  answer?: string;
  error?: string;
  diagnosticStatus?: RequestDiagnosticStatus;
  parserDiagnostics?: ResponseParserDiagnostics;
  rawEvidence?: RequestRawEvidence;
  createdAt?: string;
  updatedAt?: string;
};

export type UiState = {
  statePath: string;
  mcpUrl: string;
  agents: RouterAgent[];
  requests: RouterRequest[];
};

export type HealthState = {
  ok: boolean;
  agents: {
    total: number;
    available: number;
    busy: number;
    missing: number;
    unknown: number;
  };
  requests: {
    total: number;
    open: number;
    waiting: number;
    answered: number;
    failed: number;
    archived: number;
  };
};

export type DirectoryEntry = {
  name: string;
  path: string;
};

export type DirectoryListing = {
  path: string;
  parent: string;
  home: string;
  entries: DirectoryEntry[];
};

export type ModalState =
  | { kind: "none" }
  | { kind: "connect" }
  | { kind: "create-agent" }
  | { kind: "details"; agentId: string }
  | { kind: "history"; agentId: string }
  | { kind: "ask"; agentId: string }
  | { kind: "attach"; agentId: string }
  | { kind: "terminal"; agentId: string }
  | { kind: "request"; requestId: string }
  | { kind: "developer" };

export type MenuState =
  | { kind: "none" }
  | { kind: "agent"; agentId: string; x: number; y: number }
  | { kind: "flow"; x: number; y: number };
