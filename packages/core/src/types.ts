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

export type RequestLeaseStatus =
  | "active"
  | "released"
  | "orphaned";

export type RequestRecoveryStatus =
  | "interrupted"
  | "recovered";

export type RequestRecoveryAction =
  | "archive"
  | "cancel"
  | "interrupt"
  | "recover";

export type RequestRecoverySource =
  | "cli"
  | "http"
  | "ui"
  | "system";

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
  kind: "transport_capture" | "prompt_envelope";
  capturedAt: string;
  characterCount: number;
  excerpt: string;
  truncated: boolean;
}

export interface RequestRecoveryEvent {
  at: string;
  action: RequestRecoveryAction;
  source: RequestRecoverySource;
  message: string;
  previousLeaseStatus?: RequestLeaseStatus;
  activeRequestId?: string;
  terminalTarget?: string;
}

export type AgentHealthStatus =
  | "available"
  | "busy"
  | "stale"
  | "missing"
  | "needs-attention"
  | "unknown";

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

export type AgentRegistrationSource =
  | "manual"
  | "mcp"
  | "web-ui"
  | "cli"
  | "system"
  | "unknown"
  | string;

export type AgentRegistrationStatus =
  | "placeholder"
  | "pending"
  | "confirmed"
  | "failed"
  | "unknown"
  | string;

export type AgentPermissionProfileStatus =
  | "not-requested"
  | "supported"
  | "unsupported"
  | string;

export type AgentMcpPreflightStatus =
  | "configured"
  | "missing"
  | "stale"
  | "unsupported"
  | string;

export interface AgentPermissionPrompt {
  client: "codex" | "claude" | "unknown" | string;
  kind: "directory-trust" | "permission-approval" | string;
  message: string;
  action: string;
  evidence: string;
}

export interface AgentTransportStatus {
  status: AgentHealthStatus;
  detail?: string;
  bootstrapStatus?: AgentBootstrapStatus;
  permissionPrompt?: AgentPermissionPrompt;
}

export interface AgentRegistrationEvent {
  at: string;
  source: AgentRegistrationSource;
  status: AgentRegistrationStatus;
  agentId: string;
  sessionFingerprint?: string;
}

export type CapabilityQuality = "strong" | "thin" | "missing";

export interface AgentCapabilityProfile {
  projectPurpose?: string;
  primaryLanguages?: string[];
  keyAreas?: string[];
  canAnswer?: string[];
  cannotAnswerYet?: string[];
  evidence?: string[];
  quality: CapabilityQuality;
  qualityReasons?: string[];
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
  allowSelfCall?: boolean;
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
  healthCheckedAt: string;
  staleAfterMs: number;
  status: AgentHealthStatus;
  detail?: string;
  lastRequestStatus?: RequestStatus;
  isSelf?: boolean;
}

export interface AgentTransport {
  send(agent: Agent, input: string, requestId: string): Promise<void>;
  capture(agent: Agent): Promise<string>;
  waitForResponse(
    agent: Agent,
    requestId: string,
    timeoutMs: number,
  ): Promise<string>;
  status?(agent: Agent): Promise<AgentTransportStatus>;
}

export interface TransportRegistry {
  get(type: TransportType): AgentTransport;
}
