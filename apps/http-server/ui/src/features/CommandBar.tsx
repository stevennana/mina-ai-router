import { Button } from "../primitives/Button";
import { Icon } from "../primitives/Icon";
import type { HealthState, UiState } from "../domain/types";

export function CommandBar({
  state,
  health,
  onRefresh,
  onCreateAgent,
  onConnect,
  onCopyMcp,
}: {
  state: UiState;
  health?: HealthState;
  onRefresh: () => void;
  onCreateAgent: () => void;
  onConnect: () => void;
  onCopyMcp: () => void;
}) {
  const healthText = health
    ? health.ok
      ? `${health.agents.available}/${health.agents.total} available, ${health.requests.open} open`
      : [
        health.agents.missing ? `${health.agents.missing} missing` : "",
        health.agents.stale ? `${health.agents.stale} stale` : "",
        health.agents.needsAttention ? `${health.agents.needsAttention} needs attention` : "",
        `${health.requests.open} open`,
      ].filter(Boolean).join(", ")
    : "Health loading...";

  return (
    <header className="top-command">
      <div className="brand-block">
        <div className="brand-mark"><Icon name="router" size={21} /></div>
        <div className="brand-title">
          <h1>Mina AI Router</h1>
          <p className="subtitle">Local MCP control plane for visible CLI agents</p>
        </div>
      </div>
      <div className="status-cluster">
        <span className="chip"><span className="dot success" />{healthText}</span>
        <span className="chip mono">Port 3333</span>
        <span className="chip chip-copy mono">{state.mcpUrl || "Loading MCP URL..."}</span>
      </div>
      <div className="command-actions">
        <Button tone="secondary" onClick={onRefresh}><Icon name="refresh" />Refresh</Button>
        <Button tone="secondary" onClick={onCreateAgent}><Icon name="terminal" />Create tmux Agent</Button>
        <Button onClick={onConnect}><Icon name="add" />Connect Agent</Button>
        <Button tone="ghost" onClick={onCopyMcp}><Icon name="content_copy" />Copy MCP</Button>
      </div>
    </header>
  );
}
