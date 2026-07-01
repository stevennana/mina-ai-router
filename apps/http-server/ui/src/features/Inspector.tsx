import type { RouterAgent, RouterRequest } from "../domain/types";
import { agentRequests, attachCommand, bootstrapLabel, capabilityFreshness, capabilityProfileList, capabilityQualityDetail, capabilityQualityLabel, displayAgentName, formatDateTime, healthMessage, isRouteReady, mcpPreflightLabel, permissionProfileLabel, routeBlockedReason } from "../domain/helpers";
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
  const routeReady = isRouteReady(agent);
  const routeReason = routeBlockedReason(agent);
  const freshness = capabilityFreshness(agent);
  const quality = capabilityQualityLabel(agent);
  const hasTmuxTerminal = agent.transport === "tmux";

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
          <div className="health-grid">
            <Kv label="Last seen">{formatDateTime(agent.lastSeenAt)}</Kv>
            <Kv label="Last activity">{formatDateTime(agent.lastActivityAt)}</Kv>
            <Kv label="Checked">{formatDateTime(agent.healthCheckedAt)}</Kv>
            <Kv label="Bootstrap">{bootstrapLabel(agent)}</Kv>
            <Kv label="Permission profile">{permissionProfileLabel(agent)}</Kv>
            <Kv label="MCP preflight">{mcpPreflightLabel(agent)}</Kv>
            {agent.activeRequestId ? <Kv label="Active request">{agent.activeRequestId}</Kv> : null}
            {agent.leaseStatus ? <Kv label="Lease">{agent.leaseStatus}</Kv> : null}
          </div>
          {agent.activeRequestId ? (
            <div className="notice notice-recovery">
              <span>Agent is attached to {agent.activeRequestId}{agent.leaseStatus ? ` (${agent.leaseStatus})` : ""}.</span>
              <Button tone="secondary" onClick={() => onRequest(agent.activeRequestId!)}><Icon name="open_in_new" />Open Request</Button>
            </div>
          ) : null}
          {agent.permissionProfileDetail ? <div className="notice">{agent.permissionProfileDetail}</div> : null}
          {agent.mcpPreflightDetail ? <div className="notice">{agent.mcpPreflightDetail}</div> : null}
          {agent.registrationWarnings?.length ? <div className="notice">{agent.registrationWarnings.join(" ")}</div> : null}
          {agent.mcpSetupCommand && agent.mcpPreflightStatus !== "configured" ? <div className="command-box"><span className="subtitle">MCP setup</span><code>{agent.mcpSetupCommand}</code></div> : null}
          {agent.permissionPrompt ? <div className="notice">{agent.permissionPrompt.evidence}</div> : null}
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
            {hasTmuxTerminal ? (
              <div className="actions">
                <Button onClick={() => onAction("terminal", agent.id)}><Icon name="terminal" />Open Terminal</Button>
                <Button tone="secondary" onClick={() => onAction("copy", agent.id)}><Icon name="content_copy" />Copy</Button>
              </div>
            ) : (
              <div className="notice">This agent uses {agent.transport || "a non-tmux transport"}, so direct terminal control is unavailable.</div>
            )}
          </div>
        </div>
        <div className="section">
          <div className="section-title"><Icon name="bolt" size={15} />Capabilities</div>
          <div
            className={`capability-card capability-${freshness.state}`}
            data-testid="capability-card"
            data-capability-state={freshness.state}
            data-capability-source={agent.capabilitySource || "unknown"}
            data-capability-quality={quality}
          >
            <div className="capability-card-head">
              <span className={`status capability-status ${freshness.state}`}>{freshness.label}</span>
              <span className={`status capability-status quality-${quality}`}>{quality}</span>
              <span className="subtitle">{freshness.sourceLabel}</span>
            </div>
            <p>{agent.capabilitySummary || "No capability notice registered yet."}</p>
            <p className="subtitle">{agent.capabilitySources || "No sources recorded."}</p>
            <div className="capability-profile">
              <div className="profile-row">
                <span className="subtitle">Quality</span>
                <span>{capabilityQualityDetail(agent)}</span>
              </div>
              <div className="profile-row">
                <span className="subtitle">Can answer</span>
                <div className="profile-tags">
                  {capabilityProfileList(agent.capabilityProfile?.canAnswer, "No answerable domains recorded.").map((item) => <span className="profile-tag" key={item}>{item}</span>)}
                </div>
              </div>
              <div className="profile-row">
                <span className="subtitle">Evidence</span>
                <div className="profile-tags">
                  {capabilityProfileList(agent.capabilityProfile?.evidence ?? agent.capabilitySources?.split(","), "No evidence recorded.").map((item) => <span className="profile-tag" key={item}>{item.trim()}</span>)}
                </div>
              </div>
            </div>
            <div className="capability-meta">
              <span>Updated {freshness.timestampLabel}</span>
              <span>{freshness.detail}</span>
            </div>
            <div className="capability-actions">
              <Button tone="secondary" onClick={() => onAction("details", agent.id)}><Icon name="bolt" />Edit Capabilities</Button>
              <Button tone="ghost" onClick={() => onAction("copy-refresh", agent.id)}><Icon name="refresh" />Copy Refresh Command</Button>
            </div>
          </div>
        </div>
        <div className="section">
          <div className="section-title"><Icon name="history" size={15} />Recent Requests</div>
          {recent.length ? <div className="request-list">{recent.map((request) => <RequestCard key={request.id} request={request} onOpen={onRequest} />)}</div> : <div className="empty">No requests for this agent yet.</div>}
        </div>
        <div className="actions">
          <Button tone="secondary" disabled={!routeReady} title={routeReady ? "Ask this agent" : routeReason} onClick={() => onAction("ask", agent.id)}><Icon name="send" />Ask</Button>
          {!routeReady ? <span className="subtitle">{routeReason}</span> : null}
        </div>
      </div>
    </aside>
  );
}
