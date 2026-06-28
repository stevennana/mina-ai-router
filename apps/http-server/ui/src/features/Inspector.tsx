import type { RouterAgent, RouterRequest } from "../domain/types";
import { agentRequests, attachCommand, capabilityFreshness, displayAgentName, healthMessage } from "../domain/helpers";
import { Button } from "../primitives/Button";
import { Kv } from "../primitives/Kv";
import { StatusPill } from "../primitives/StatusPill";
import { RequestCard } from "./RequestCard";
import { Icon } from "../primitives/Icon";

export function Inspector({
  agent,
  requests,
  onAction,
  onRequest,
  collapsed,
  onCollapse,
  onExpand,
}: {
  agent?: RouterAgent;
  requests: RouterRequest[];
  onAction: (action: string, agentId: string) => void;
  onRequest: (requestId: string) => void;
  collapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
}) {
  if (!agent) {
    return null;
  }

  const recent = agentRequests(agent.id, requests).slice().reverse().slice(0, 3);
  const freshness = capabilityFreshness(agent);

  return (
    <aside className={["inspector floating-inspector", collapsed ? "is-collapsed" : ""].filter(Boolean).join(" ")} aria-label="Selected agent inspector">
      {collapsed ? (
        <button className="inspector-tab" type="button" onClick={onExpand} aria-label="Expand agent details">
          <Icon name="chevron_left" />
          <span>Agent</span>
        </button>
      ) : null}
      <div className="inspector-head">
        <div>
          <h2>Agent Details</h2>
          <p className="subtitle">{displayAgentName(agent)}</p>
        </div>
        <Button tone="ghost" onClick={onCollapse}><Icon name="chevron_right" />Hide</Button>
      </div>
      <div className="inspector-body">
        <div className="section">
          <div className="section-title"><Icon name="info" size={15} />Status</div>
          <StatusPill status={agent.status} />
          <div className="notice">{healthMessage(agent)}</div>
        </div>
        <div className="section">
          <div className="section-title"><Icon name="lan" size={15} />Connection</div>
          <Kv label="Project root">{agent.projectRoot || "-"}</Kv>
          <Kv label="Transport">{agent.transport || "-"}</Kv>
          <Kv label="Session">{agent.sessionId || "-"}</Kv>
        </div>
        <div className="section">
          <div className="section-title"><Icon name="terminal" size={15} />Attach</div>
          <div className="command-box">
            <span className="subtitle">Direct terminal control</span>
            <code>{attachCommand(agent)}</code>
            <div className="actions">
              <Button onClick={() => onAction("terminal", agent.id)}><Icon name="terminal" />Open Terminal</Button>
              <Button tone="secondary" onClick={() => onAction("copy", agent.id)}><Icon name="content_copy" />Copy</Button>
            </div>
          </div>
        </div>
        <div className="section">
          <div className="section-title"><Icon name="bolt" size={15} />Capabilities</div>
          <div className={`capability-card capability-${freshness.state}`}>
            <div className="capability-card-head">
              <span className={`status capability-status ${freshness.state}`}>{freshness.label}</span>
              <span className="subtitle">{freshness.sourceLabel}</span>
            </div>
            <p>{agent.capabilitySummary || "No capability notice registered yet."}</p>
            <p className="subtitle">{agent.capabilitySources || "No sources recorded."}</p>
            <div className="capability-meta">
              <span>Updated {freshness.timestampLabel}</span>
              <span>{freshness.detail}</span>
            </div>
            <div className="capability-actions">
              <Button tone="secondary" onClick={() => onAction("details", agent.id)}><Icon name="bolt" />Edit Capabilities</Button>
            </div>
          </div>
        </div>
        <div className="section">
          <div className="section-title"><Icon name="history" size={15} />Recent Requests</div>
          {recent.length ? <div className="request-list">{recent.map((request) => <RequestCard key={request.id} request={request} onOpen={onRequest} />)}</div> : <div className="empty">No requests for this agent yet.</div>}
        </div>
        <div className="actions">
          <Button tone="secondary" onClick={() => onAction("ask", agent.id)}><Icon name="send" />Ask</Button>
        </div>
      </div>
    </aside>
  );
}
