import { useState } from "react";
import type { RouterAgent } from "../domain/types";
import { attachCommand, capabilityFreshness, capabilityProfileList, capabilityQualityDetail, capabilityQualityLabel, healthMessage, mairAttachCommand, mairRefreshCapabilitiesCommand } from "../domain/helpers";
import { Button } from "../primitives/Button";
import { Kv } from "../primitives/Kv";
import { Icon } from "../primitives/Icon";

export function AgentDetailsForm({
  agent,
  onSave,
}: {
  agent: RouterAgent;
  onSave: (summary: string, sources: string) => Promise<void>;
}) {
  const [summary, setSummary] = useState(agent.capabilitySummary || "");
  const [sources, setSources] = useState(agent.capabilitySources || "");
  const freshness = capabilityFreshness(agent);
  const quality = capabilityQualityLabel(agent);

  return (
    <>
      <div className="detail-grid">
        <div className="notice" style={{ gridColumn: "1 / -1" }}>{healthMessage(agent)}</div>
        <div
          className={`capability-card capability-${freshness.state}`}
          data-testid="capability-card"
          data-capability-state={freshness.state}
          data-capability-source={agent.capabilitySource || "unknown"}
          data-capability-quality={quality}
          style={{ gridColumn: "1 / -1" }}
        >
          <div className="capability-card-head">
            <span className={`status capability-status ${freshness.state}`}>{freshness.label}</span>
            <span className={`status capability-status quality-${quality}`}>{quality}</span>
            <span className="subtitle">{freshness.sourceLabel}</span>
          </div>
          <p>{freshness.detail}</p>
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
            <span>Saving this form marks the capability card as manual.</span>
          </div>
        </div>
        <Kv label="Status">{agent.status}</Kv>
        <Kv label="Session">{agent.sessionId || "-"}</Kv>
        <Kv label="Project root">{agent.projectRoot || "-"}</Kv>
        <Kv label="Capabilities">{agent.capabilitySummary || "No capability notice registered yet."}</Kv>
        <Kv label="Capability sources">{agent.capabilitySources || "-"}</Kv>
        <Kv label="Capability source">{freshness.sourceLabel}</Kv>
        <Kv label="Capability quality">{quality}</Kv>
        <Kv label="Capability updated">{freshness.timestampLabel}</Kv>
        <Kv label="Refresh command">{mairRefreshCapabilitiesCommand(agent)}</Kv>
        <Kv label="Detail">{agent.detail || "-"}</Kv>
        <Kv label="Last request">{agent.lastRequestStatus || "-"}</Kv>
        <Kv label="Attach command">{attachCommand(agent)}</Kv>
        <Kv label="MAIR attach command">{mairAttachCommand(agent)}</Kv>
      </div>
      <form
        className="detail-grid"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave(summary, sources);
        }}
      >
        <label style={{ gridColumn: "1 / -1" }}>Capabilities<textarea value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
        <label style={{ gridColumn: "1 / -1" }}>Capability sources<input value={sources} onChange={(event) => setSources(event.target.value)} /></label>
        <div className="actions">
          <Button type="submit"><Icon name="bolt" />Save Capabilities</Button>
          <Button tone="secondary" onClick={() => {
            setSummary(agent.capabilitySummary || "");
            setSources(agent.capabilitySources || "");
          }}><Icon name="restart_alt" />Reset</Button>
        </div>
      </form>
    </>
  );
}
