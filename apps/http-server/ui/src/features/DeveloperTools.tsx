import type { RouterRequest } from "../domain/types";
import { Button } from "../primitives/Button";
import { Icon } from "../primitives/Icon";
import { RequestCard } from "./RequestCard";

export function DeveloperTools({
  requests,
  onSetupPair,
  onArchiveStale,
  onRequest,
}: {
  requests: RouterRequest[];
  onSetupPair: () => void;
  onArchiveStale: () => void;
  onRequest: (requestId: string) => void;
}) {
  const recent = requests.slice().reverse().slice(0, 12);
  return (
    <div className="section">
      <div className="actions">
        <Button onClick={onSetupPair}><Icon name="hub" />Create Two-Codex Demo</Button>
        <Button tone="secondary" onClick={onArchiveStale}><Icon name="archive" />Archive Stale</Button>
      </div>
      <div>
        <h3>Recent router requests</h3>
        {recent.length ? <div className="request-list">{recent.map((request) => <RequestCard key={request.id} request={request} onOpen={onRequest} />)}</div> : <div className="empty">No requests yet.</div>}
      </div>
    </div>
  );
}
