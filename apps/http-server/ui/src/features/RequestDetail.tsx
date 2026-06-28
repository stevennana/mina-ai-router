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
  return (
    <div className="section">
      <div className="request-top">
        <h3>Request</h3>
        <StatusPill status={request.status} />
      </div>
      <div>
        <code>{displaySource(request.sourceAgent)}</code> <span className="muted">-&gt;</span> <code>MCP Router</code> <span className="muted">-&gt;</span> <code>{request.targetAgent}</code>
      </div>
      <Kv label="Task">{request.task}</Kv>
      {request.answer ? <div className="kv"><span>Answer</span><pre>{request.answer}</pre></div> : null}
      {request.error ? <div className="kv"><span>Error</span><pre>{request.error}</pre></div> : null}
      <div className="actions">
        <Button onClick={() => onAction("retry", request.id)}><Icon name="restart_alt" />Retry</Button>
        <Button tone="secondary" onClick={() => onAction("cancel", request.id)}><Icon name="delete" />Cancel</Button>
        <Button tone="secondary" onClick={() => onAction("archive", request.id)}><Icon name="archive" />Archive</Button>
      </div>
    </div>
  );
}
