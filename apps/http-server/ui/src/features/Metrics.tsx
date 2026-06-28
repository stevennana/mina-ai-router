import type { RouterAgent, RouterRequest } from "../domain/types";
import { answeredCount, waitingCount } from "../domain/helpers";
import { Icon, type IconName } from "../primitives/Icon";

export function Metrics({ agents, requests }: { agents: RouterAgent[]; requests: RouterRequest[] }) {
  return (
    <div className="metrics">
      <Metric icon="hub" label="Live agents" value={agents.length} />
      <Metric icon="bolt" label="Waiting requests" value={waitingCount(requests)} />
      <Metric icon="archive" label="Completed total" value={answeredCount(requests)} />
      <Metric icon="lan" label="MCP clients" value="local" />
    </div>
  );
}

function Metric({ icon, label, value }: { icon: IconName; label: string; value: string | number }) {
  return (
    <div className="metric">
      <span><Icon name={icon} size={15} /> {label}</span>
      <strong>{value}</strong>
    </div>
  );
}
