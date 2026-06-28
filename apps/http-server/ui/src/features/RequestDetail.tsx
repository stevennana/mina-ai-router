import type { ReactNode } from "react";
import type { RouterRequest } from "../domain/types";
import { displaySource } from "../domain/helpers";
import { Button } from "../primitives/Button";
import { Kv } from "../primitives/Kv";
import { StatusPill } from "../primitives/StatusPill";
import { Icon } from "../primitives/Icon";

export function RequestDetail({
  request,
  onAction,
}: {
  request: RouterRequest;
  onAction: (action: "retry" | "cancel" | "archive", requestId: string) => void;
}) {
  const parser = request.parserDiagnostics;
  const rawEvidence = request.rawEvidence;

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
      </div>

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

      <div className="actions">
        <Button onClick={() => onAction("retry", request.id)}><Icon name="restart_alt" />Retry</Button>
        <Button tone="secondary" onClick={() => onAction("cancel", request.id)}><Icon name="delete" />Cancel</Button>
        <Button tone="secondary" onClick={() => onAction("archive", request.id)}><Icon name="archive" />Archive</Button>
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
