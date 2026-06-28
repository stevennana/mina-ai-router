import { useState } from "react";
import type { DirectoryListing, RouterAgent } from "../domain/types";
import { routerApi } from "../lib/api";
import { Button } from "../primitives/Button";
import { TerminalPanel } from "./TerminalPanel";
import { Icon } from "../primitives/Icon";

export function CreateTmuxAgentForm({
  onCreated,
}: {
  onCreated: (agent: RouterAgent) => void;
}) {
  const [agentType, setAgentType] = useState("codex");
  const [projectRoot, setProjectRoot] = useState("");
  const [agentId, setAgentId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [listing, setListing] = useState<DirectoryListing | undefined>();
  const [output, setOutput] = useState("");
  const [terminalAgentId, setTerminalAgentId] = useState("");

  async function loadDirectory(path?: string) {
    const result = await routerApi.directories(path);
    setListing(result);
    setProjectRoot(result.path);
  }

  async function submit() {
    const result = await routerApi.createTmuxAgent({
      agentType,
      projectRoot,
      id: agentId || undefined,
      sessionId: sessionId || undefined,
    });
    setOutput(JSON.stringify({
      agent: result.agent.id,
      session: result.agent.sessionId,
      existed: result.existed,
      registration: result.registration,
      nextAction: result.nextAction,
      tmuxAttach: result.attachCommand,
      mairAttach: result.mairAttachCommand,
    }, null, 2));
    setTerminalAgentId(result.agent.id);
    onCreated(result.agent);
  }

  return (
    <form
      className="detail-grid"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label>Agent type<select value={agentType} onChange={(event) => setAgentType(event.target.value)}><option value="codex">codex</option><option value="claude">claude</option></select></label>
      <label>Project directory<input value={projectRoot} onChange={(event) => setProjectRoot(event.target.value)} placeholder="/Users/you/work/project" /></label>
      <div className="actions">
        <Button tone="secondary" onClick={() => void loadDirectory(projectRoot || undefined)}><Icon name="folder_open" />Browse Directory</Button>
      </div>
      <label>Agent id<input value={agentId} onChange={(event) => setAgentId(event.target.value)} placeholder="optional, derived from directory" /></label>
      <label>tmux session<input value={sessionId} onChange={(event) => setSessionId(event.target.value)} placeholder="optional, derived from directory" /></label>
      {listing ? (
        <div className="directory-picker">
          <div className="actions">
            <Button tone="secondary" onClick={() => void loadDirectory("__HOME__")}><Icon name="folder_open" />Home</Button>
            <Button tone="secondary" onClick={() => void loadDirectory(listing.parent)}><Icon name="keyboard_return" />Up</Button>
            <Button onClick={() => setProjectRoot(listing.path)}><Icon name="open_in_new" />Use Current Directory</Button>
          </div>
          <div className="kv"><span>Current directory</span><strong>{listing.path}</strong></div>
          <div className="directory-list">
            {listing.entries.length ? listing.entries.map((entry) => (
              <button className="directory-row" key={entry.path} type="button" onClick={() => void loadDirectory(entry.path)}>
                <span>{entry.name}</span>
                <span className="muted">Open</span>
              </button>
            )) : <div className="empty">No child directories.</div>}
          </div>
        </div>
      ) : null}
      <div className="notice" style={{ gridColumn: "1 / -1" }}>Mina will create or reuse the tmux session, register the agent, and send a self-registration prompt.</div>
      <div className="actions" style={{ gridColumn: "1 / -1" }}>
        <Button type="submit"><Icon name="add" />Create Agent</Button>
      </div>
      {output ? <pre style={{ gridColumn: "1 / -1" }}>{output}</pre> : null}
      {terminalAgentId ? <TerminalPanel agentId={terminalAgentId} autoHideOnRegistered /> : null}
    </form>
  );
}
