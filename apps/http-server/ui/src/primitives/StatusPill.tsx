import type { RequestStatus, AgentStatus } from "../domain/types";

export function StatusPill({ status }: { status: RequestStatus | AgentStatus }) {
  return (
    <span className={`status ${sanitizeStatus(status)}`}>
      <span className={`dot ${sanitizeStatus(status)}`} />
      {status}
    </span>
  );
}

function sanitizeStatus(status: string): string {
  return status.replace(/[^a-zA-Z0-9_-]/g, "");
}
