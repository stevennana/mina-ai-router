import type { RouterRequest } from "../domain/types";
import { displaySource } from "../domain/helpers";
import { StatusPill } from "../primitives/StatusPill";

export function RequestCard({ request, onOpen }: { request: RouterRequest; onOpen: (requestId: string) => void }) {
  return (
    <button className="request-item" type="button" onClick={() => onOpen(request.id)}>
      <div className="request-top">
        <strong className="mono">{request.id}</strong>
        <StatusPill status={request.status} />
      </div>
      <div><code>{displaySource(request.sourceAgent)}</code> -&gt; <code>{request.targetAgent}</code></div>
      <div className="muted">{request.task}</div>
    </button>
  );
}
