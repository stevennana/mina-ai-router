import type { ReactNode } from "react";
import type { RouterRequest } from "../domain/types";
import { displaySource } from "../domain/helpers";
import { Button } from "../primitives/Button";
import { Kv } from "../primitives/Kv";
import { StatusPill } from "../primitives/StatusPill";
import { Icon } from "../primitives/Icon";

export type RequestDetailAction = "retry" | "cancel" | "archive" | "unarchive" | "interrupt" | "recover";

export function RequestDetail({
  request,
  onAction,
}: {
  request: RouterRequest;
  onAction: (action: RequestDetailAction, requestId: string) => void;
}) {
  const parser = request.parserDiagnostics;
  const rawEvidence = request.rawEvidence;
  const promptEvidence = request.promptEvidence;
  const actions = validActions(request);
  const isOrphaned = request.leaseStatus === "orphaned";

  return (
    <div className="section request-detail">
      <div className="request-top">
        <h3>Request</h3>
        <div className="status-cluster">
          <StatusPill status={request.status} />
          {request.diagnosticStatus ? <StatusPill status={request.diagnosticStatus} /> : null}
        </div>
      </div>
      <div className="request-route">
        <code>{displaySource(request.sourceAgent)}</code>
        <span className="muted">-&gt;</span>
        <code>MCP Router</code>
        <span className="muted">-&gt;</span>
        <code>{request.targetAgent}</code>
      </div>

      <div className="detail-grid">
        <Kv label="Request id">{request.id}</Kv>
        <Kv label="Source">{displaySource(request.sourceAgent)}</Kv>
        <Kv label="Target">{request.targetAgent}</Kv>
        <Kv label="Lifecycle">{describeLifecycle(request)}</Kv>
        <Kv label="Created">{formatTimestamp(request.createdAt)}</Kv>
        <Kv label="Updated">{formatTimestamp(request.updatedAt)}</Kv>
        {request.retryOfRequestId ? <Kv label="Retry of">{request.retryOfRequestId}</Kv> : null}
        {request.retriedByRequestId ? <Kv label="Retried by">{request.retriedByRequestId}</Kv> : null}
        {request.archivedFromStatus ? <Kv label="Archived from">{request.archivedFromStatus}</Kv> : null}
        {request.archivedAt ? <Kv label="Archived">{formatTimestamp(request.archivedAt)}</Kv> : null}
        {request.leaseStatus ? <Kv label="Lease">{request.leaseStatus}</Kv> : null}
        {request.leaseOwnerAgentId ? <Kv label="Lease owner">{request.leaseOwnerAgentId}</Kv> : null}
        {request.leaseTargetSessionId ? <Kv label="Lease session">{request.leaseTargetSessionId}</Kv> : null}
        {request.leaseStartedAt ? <Kv label="Lease started">{formatTimestamp(request.leaseStartedAt)}</Kv> : null}
        {request.leaseExpiresAt ? <Kv label="Lease expires">{formatTimestamp(request.leaseExpiresAt)}</Kv> : null}
        {request.leaseReleasedAt ? <Kv label="Lease released">{formatTimestamp(request.leaseReleasedAt)}</Kv> : null}
        {request.recoveryStatus ? <Kv label="Recovery">{request.recoveryStatus}</Kv> : null}
      </div>

      {isOrphaned ? (
        <DiagnosticSection title="Recovery needed">
          <div className="recovery-banner">
            Router timeout ended this transaction, but the target terminal lease is still orphaned. Use Interrupt Terminal to send Ctrl-C, or Mark Recovered after confirming the agent is idle.
          </div>
        </DiagnosticSection>
      ) : null}

      <Kv label="Task">{request.task}</Kv>

      <DiagnosticSection title="Parsed answer">
        {request.answer ? <pre>{request.answer}</pre> : <span className="muted">No parsed answer is available for this request.</span>}
      </DiagnosticSection>

      {request.error ? (
        <DiagnosticSection title="Error">
          <pre>{request.error}</pre>
        </DiagnosticSection>
      ) : null}

      {parser ? (
        <DiagnosticSection title="Parser diagnostics">
          <div className="diagnostic-grid">
            <Kv label="Parser result">{parser.kind}</Kv>
            <Kv label="Start marker">{formatBoolean(parser.startMarkerFound)}</Kv>
            <Kv label="End marker">{formatBoolean(parser.endMarkerFound)}</Kv>
            <Kv label="Candidates">{parser.candidateCount}</Kv>
            <Kv label="Placeholders">{parser.placeholderCount}</Kv>
            <Kv label="Answer length">{parser.answerLength ?? "-"}</Kv>
          </div>
          <pre>{parser.message}</pre>
        </DiagnosticSection>
      ) : (
        <DiagnosticSection title="Parser diagnostics">
          <span className="muted">No parser diagnostics were recorded.</span>
        </DiagnosticSection>
      )}

      {rawEvidence ? (
        <DiagnosticSection title="Raw evidence">
          <div className="diagnostic-grid">
            <Kv label="Evidence kind">{rawEvidence.kind}</Kv>
            <Kv label="Captured">{formatTimestamp(rawEvidence.capturedAt)}</Kv>
            <Kv label="Characters">{rawEvidence.characterCount}</Kv>
            <Kv label="Excerpt truncated">{formatBoolean(rawEvidence.truncated)}</Kv>
          </div>
          <pre>{rawEvidence.excerpt}</pre>
        </DiagnosticSection>
      ) : (
        <DiagnosticSection title="Raw evidence">
          <span className="muted">No raw transport excerpt was recorded.</span>
        </DiagnosticSection>
      )}

      {promptEvidence ? (
        <DiagnosticSection title="Prompt evidence">
          <div className="diagnostic-grid">
            <Kv label="Evidence kind">{promptEvidence.kind}</Kv>
            <Kv label="Captured">{formatTimestamp(promptEvidence.capturedAt)}</Kv>
            <Kv label="Characters">{promptEvidence.characterCount}</Kv>
            <Kv label="Excerpt truncated">{formatBoolean(promptEvidence.truncated)}</Kv>
          </div>
          <pre>{promptEvidence.excerpt}</pre>
        </DiagnosticSection>
      ) : null}

      {request.recoveryEvents?.length ? (
        <DiagnosticSection title="Recovery history">
          <div className="recovery-events">
            {request.recoveryEvents.map((event) => (
              <div className="recovery-event" key={`${event.at}-${event.action}`}>
                <div>
                  <strong>{event.action}</strong>
                  <span className="muted"> by {event.source} at {formatTimestamp(event.at)}</span>
                </div>
                <p>{event.message}</p>
                {event.terminalTarget ? <code>{event.terminalTarget}</code> : null}
              </div>
            ))}
          </div>
        </DiagnosticSection>
      ) : null}

      <div className="actions">
        {actions.includes("retry") ? <Button onClick={() => onAction("retry", request.id)}><Icon name="restart_alt" />Retry</Button> : null}
        {actions.includes("cancel") ? <Button tone="secondary" onClick={() => onAction("cancel", request.id)}><Icon name="delete" />Cancel</Button> : null}
        {actions.includes("interrupt") ? <Button tone="secondary" onClick={() => onAction("interrupt", request.id)}><Icon name="terminal" />Interrupt Terminal</Button> : null}
        {actions.includes("recover") ? <Button tone="secondary" onClick={() => onAction("recover", request.id)}><Icon name="keyboard_return" />Mark Recovered</Button> : null}
        {actions.includes("archive") ? <Button tone="secondary" onClick={() => onAction("archive", request.id)}><Icon name="archive" />Archive</Button> : null}
        {actions.includes("unarchive") ? <Button tone="secondary" onClick={() => onAction("unarchive", request.id)}><Icon name="unarchive" />Unarchive</Button> : null}
      </div>
    </div>
  );
}

function DiagnosticSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="diagnostic-section">
      <div className="section-title">{title}</div>
      {children}
    </section>
  );
}

function describeLifecycle(request: RouterRequest): string {
  switch (request.diagnosticStatus ?? request.status) {
    case "answered":
      return "Answered with a parsed marker-wrapped response.";
    case "parse_failure":
      return "Failed because the response could not be parsed.";
    case "transport_failure":
      return "Failed while sending to or reading from the target transport.";
    case "unknown_failure":
      return "Failed without a specific diagnostic classification.";
    case "timeout":
      return "Timed out while waiting for the target agent.";
    case "cancelled":
      return "Cancelled by the operator.";
    case "archived":
      return "Archived in the local activity log.";
    case "pending":
      return "Request is still in progress.";
    default:
      return request.status;
  }
}

function validActions(request: RouterRequest): RequestDetailAction[] {
  if (request.status === "archived") {
    return ["retry", "unarchive"];
  }

  if (request.leaseStatus === "orphaned") {
    const recoveryActions: RequestDetailAction[] = request.recoveryStatus === "interrupted"
      ? ["recover"]
      : ["interrupt", "recover"];
    return [...recoveryActions, "retry", "archive"];
  }

  if (["created", "sent", "waiting"].includes(request.status)) {
    return ["cancel"];
  }

  return ["retry", "archive"];
}

function formatTimestamp(value?: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatBoolean(value: boolean): string {
  return value ? "yes" : "no";
}
