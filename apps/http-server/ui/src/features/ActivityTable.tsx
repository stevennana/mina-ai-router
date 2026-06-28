import type { RouterRequest } from "../domain/types";
import { displaySource, formatTime, latencyLabel } from "../domain/helpers";
import { Button } from "../primitives/Button";
import { StatusPill } from "../primitives/StatusPill";
import { Icon } from "../primitives/Icon";

export function ActivityTable({
  requests,
  onArchiveStale,
  onOpenRequest,
  height,
  onHeightChange,
  title = "System Activity",
  subtitle = "Recent routed requests from the local state store.",
}: {
  requests: RouterRequest[];
  onArchiveStale: () => void;
  onOpenRequest: (requestId: string) => void;
  height: number;
  onHeightChange: (height: number) => void;
  title?: string;
  subtitle?: string;
}) {
  const recent = requests.slice().reverse().slice(0, 12);

  return (
    <section className="activity floating-activity" aria-label="Recent router activity" style={{ height }}>
      <div
        className="activity-resize-handle"
        role="separator"
        aria-label="Resize router activity"
        onPointerDown={(event) => {
          const startY = event.clientY;
          const startHeight = height;
          event.currentTarget.setPointerCapture(event.pointerId);
          const move = (moveEvent: PointerEvent) => {
            onHeightChange(Math.max(96, Math.min(420, startHeight - (moveEvent.clientY - startY))));
          };
          const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        }}
      />
      <div className="activity-head">
        <div>
          <h2>{title}</h2>
          <p className="subtitle">{subtitle}</p>
        </div>
        <div className="actions">
          <Button tone="secondary" onClick={onArchiveStale}><Icon name="archive" />Archive stale</Button>
        </div>
      </div>
      <div className="activity-body">
        {recent.length ? (
          <table className="activity-table">
            <thead>
              <tr><th>Time</th><th>From</th><th>To</th><th>Status</th><th>Latency</th><th>Summary</th></tr>
            </thead>
            <tbody>
              {recent.map((request) => (
                <tr key={request.id} onClick={() => onOpenRequest(request.id)}>
                  <td>{formatTime(request.updatedAt || request.createdAt)}</td>
                  <td>{displaySource(request.sourceAgent)}</td>
                  <td>{request.targetAgent}</td>
                  <td><StatusPill status={request.status} /></td>
                  <td>{latencyLabel(request)}</td>
                  <td>{request.task || request.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty">No routed requests yet.</div>}
      </div>
    </section>
  );
}
