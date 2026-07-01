export type AgentStatus = "available" | "busy" | "stale" | "missing" | "needs-attention" | "unknown" | string;
export type AgentBootstrapStatus =
  | "created"
  | "starting"
  | "permission-required"
  | "mcp-configuring"
  | "registration-pending"
  | "ready"
  | "failed"
  | "unknown"
  | string;
export type AgentRegistrationSource = "manual" | "mcp" | "web-ui" | "cli" | "system" | "unknown" | string;
export type AgentRegistrationStatus = "placeholder" | "pending" | "confirmed" | "failed" | "unknown" | string;
export type AgentPermissionProfileStatus = "not-requested" | "supported" | "unsupported" | string;
export type AgentMcpPreflightStatus = "configured" | "missing" | "stale" | "unsupported" | string;
export type AgentPermissionPrompt = {
  client: "codex" | "claude" | "unknown" | string;
  kind: "directory-trust" | "permission-approval" | string;
  message: string;
  action: string;
  evidence: string;
};

export type AgentRegistrationEvent = {
  at: string;
  source: AgentRegistrationSource;
  status: AgentRegistrationStatus;
  agentId: string;
  sessionFingerprint?: string;
};

export type AgentCapabilityProfile = {
  projectPurpose?: string;
  primaryLanguages?: string[];
  keyAreas?: string[];
  canAnswer?: string[];
  cannotAnswerYet?: string[];
  evidence?: string[];
  quality: "strong" | "thin" | "missing";
  qualityReasons?: string[];
};
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
  kind: "transport_capture" | "prompt_envelope" | string;
  capturedAt: string;
  characterCount: number;
  excerpt: string;
  truncated: boolean;
};

export type RequestLeaseStatus = "active" | "released" | "orphaned" | string;
export type RequestRecoveryStatus = "interrupted" | "recovered" | string;

export type RequestRecoveryEvent = {
  at: string;
  action: "cancel" | "interrupt" | "recover" | string;
  source: "cli" | "http" | "ui" | "system" | string;
  message: string;
  previousLeaseStatus?: RequestLeaseStatus;
  activeRequestId?: string;
  terminalTarget?: string;
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
  capabilitySource?: "manual" | "generated";
  capabilityUpdatedAt?: string;
  lastCapabilityRefreshAt?: string;
  capabilityProfile?: AgentCapabilityProfile;
  bootstrapStatus?: AgentBootstrapStatus;
  registrationSource?: AgentRegistrationSource;
  registrationStatus?: AgentRegistrationStatus;
  lastRegistrationAttemptAt?: string;
  confirmedByAgentAt?: string;
  sessionFingerprint?: string;
  registrationHistory?: AgentRegistrationEvent[];
  registrationWarnings?: string[];
  permissionProfile?: "default" | "direct-workspace-read" | string;
  permissionProfileStatus?: AgentPermissionProfileStatus;
  permissionProfileDetail?: string;
  permissionPrompt?: AgentPermissionPrompt;
  mcpPreflightStatus?: AgentMcpPreflightStatus;
  mcpPreflightDetail?: string;
  mcpSetupCommand?: string;
  mcpVerifyCommand?: string;
  mcpRemoveCommand?: string;
  mcpUrl?: string;
  lastSeenAt?: string;
  lastActivityAt?: string;
  activeRequestId?: string;
  leaseStatus?: RequestLeaseStatus;
  leaseStartedAt?: string;
  leaseExpiresAt?: string;
  leaseReleasedAt?: string;
  healthCheckedAt?: string;
  staleAfterMs?: number;
  detail?: string;
  routeReady?: boolean;
  routeBlockedReason?: string;
  status: AgentStatus;
  lastRequestStatus?: string;
  isSelf?: boolean;
};

export type RouterRequest = {
  id: string;
  sourceAgent?: string;
  targetAgent: string;
  task: string;
  status: RequestStatus;
  answer?: string;
  error?: string;
  retryOfRequestId?: string;
  retriedByRequestId?: string;
  archivedAt?: string;
  archivedFromStatus?: RequestStatus;
  diagnosticStatus?: RequestDiagnosticStatus;
  parserDiagnostics?: ResponseParserDiagnostics;
  rawEvidence?: RequestRawEvidence;
  promptEvidence?: RequestRawEvidence;
  leaseStatus?: RequestLeaseStatus;
  leaseStartedAt?: string;
  leaseExpiresAt?: string;
  leaseReleasedAt?: string;
  leaseOwnerAgentId?: string;
  leaseTargetSessionId?: string;
  leaseTargetSessionFingerprint?: string;
  recoveryStatus?: RequestRecoveryStatus;
  recoveryEvents?: RequestRecoveryEvent[];
  interruptedAt?: string;
  recoveredAt?: string;
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
    stale: number;
    missing: number;
    needsAttention: number;
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
