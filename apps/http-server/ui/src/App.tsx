import { useEffect, useMemo, useState } from "react";
import type { HealthState, MenuState, ModalState, RouterAgent, RouterRequest, UiState } from "./domain/types";
import { agentRequests, attachCommand, displayAgentName, isRouteReady, mairAttachCommand, mairRefreshCapabilitiesCommand, routeBlockedReason } from "./domain/helpers";
import { copyText, routerApi } from "./lib/api";
import { CommandBar } from "./features/CommandBar";
import { LiveFlow } from "./features/LiveFlow";
import { Inspector } from "./features/Inspector";
import { ActivityTable } from "./features/ActivityTable";
import { FloatingMenus } from "./features/Menus";
import { Modal } from "./primitives/Modal";
import { ConnectGuide } from "./features/ConnectGuide";
import { AgentDetailsForm } from "./features/AgentDetailsForm";
import { RequestCard } from "./features/RequestCard";
import { AskAgentForm } from "./features/AskAgentForm";
import { CreateTmuxAgentForm } from "./features/CreateTmuxAgentForm";
import { TerminalPanel } from "./features/TerminalPanel";
import { RequestDetail } from "./features/RequestDetail";
import { DeveloperTools } from "./features/DeveloperTools";
import { Button } from "./primitives/Button";
import { Kv } from "./primitives/Kv";
import { Icon } from "./primitives/Icon";

const emptyState: UiState = {
  statePath: "",
  mcpUrl: "",
  agents: [],
  requests: [],
};

export function App() {
  const [state, setState] = useState<UiState>(emptyState);
  const [health, setHealth] = useState<HealthState | undefined>();
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [menu, setMenu] = useState<MenuState>({ kind: "none" });
  const [busy, setBusy] = useState(false);
  const [lastAskOutput, setLastAskOutput] = useState("");
  const [selectedSurface, setSelectedSurface] = useState<"router" | "agent">("router");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [activityHeight, setActivityHeight] = useState(() => {
    const stored = Number(window.localStorage.getItem("mina-ai-router.activityHeight.v1"));
    return clampActivityHeight(Number.isFinite(stored) && stored > 0 ? stored : 180);
  });

  const selectedAgent = useMemo(
    () => state.agents.find((agent) => agent.id === selectedAgentId),
    [state.agents, selectedAgentId],
  );
  const selectedRequest = useMemo(
    () => state.requests.find((request) => request.id === selectedRequestId),
    [state.requests, selectedRequestId],
  );
  const activityRequests = useMemo(
    () => selectedSurface === "agent" && selectedAgent
      ? agentRequests(selectedAgent.id, state.requests)
      : state.requests,
    [selectedAgent, selectedSurface, state.requests],
  );

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    const next = await routerApi.state();
    setState(next);
    setSelectedAgentId((current) => {
      if (current && next.agents.some((agent) => agent.id === current)) return current;
      return "";
    });
    routerApi.health().then(setHealth).catch(() => undefined);
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh().catch(() => undefined), 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu({ kind: "none" });
        setModal({ kind: "none" });
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);

  useEffect(() => {
    if (menu.kind === "none") return undefined;
    const closeMenu = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(".context-menu, .agent-node")) return;
      setMenu({ kind: "none" });
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [menu.kind]);

  function agentById(agentId: string): RouterAgent | undefined {
    return state.agents.find((agent) => agent.id === agentId);
  }

  function requestById(requestId: string): RouterRequest | undefined {
    return state.requests.find((request) => request.id === requestId);
  }

  function openAgentAction(action: string, agentId: string) {
    setMenu({ kind: "none" });
    setSelectedAgentId(agentId);
    setSelectedSurface("agent");
    setInspectorOpen(true);
    setInspectorCollapsed(false);
    if (action === "details") setModal({ kind: "details", agentId });
    if (action === "history") setModal({ kind: "history", agentId });
    if (action === "terminal") setModal({ kind: "terminal", agentId });
    if (action === "ask") setModal({ kind: "ask", agentId });
    if (action === "attach") setModal({ kind: "attach", agentId });
    if (action === "copy") {
      const agent = agentById(agentId);
      if (agent) void run(async () => copyText(attachCommand(agent)));
    }
    if (action === "copy-refresh") {
      const agent = agentById(agentId);
      if (agent) void run(async () => copyText(mairRefreshCapabilitiesCommand(agent)));
    }
    if (action === "restart") {
      const agent = agentById(agentId);
      if (!agent) return;
      void run(async () => {
        if (agent.transport !== "tmux") {
          alert(`Agent "${agent.id}" does not use tmux.`);
          return;
        }
        if (!confirm(`Restart tmux session "${agent.sessionId}" for agent "${agent.id}"?`)) return;
        const result = await routerApi.restartAgent(agent.id);
        setState(result.state);
      });
    }
    if (action === "delete") {
      const agent = agentById(agentId);
      if (!agent) return;
      void run(async () => {
        if (!confirm(`Delete agent "${agent.id}" from the router registry?`)) return;
        const result = await routerApi.deleteAgent(agent.id);
        setState(result.state);
        setSelectedAgentId("");
        setModal({ kind: "none" });
      });
    }
  }

  function openFlowAction(action: string) {
    setMenu({ kind: "none" });
    if (action === "create") setModal({ kind: "create-agent" });
    if (action === "guide") setModal({ kind: "connect" });
  }

  function openRequest(requestId: string) {
    setSelectedRequestId(requestId);
    setModal({ kind: "request", requestId });
  }

  async function archiveStale() {
    if (!confirm("Archive stale created/sent/waiting requests older than 30 minutes?")) return;
    const result = await routerApi.archiveStale();
    setState(result.state);
  }

  return (
    <div className={busy ? "is-busy" : ""}>
      <div className="app-shell">
        <CommandBar
          state={state}
          health={health}
          onRefresh={() => void run(refresh)}
          onCreateAgent={() => setModal({ kind: "create-agent" })}
          onConnect={() => setModal({ kind: "connect" })}
          onCopyMcp={() => void run(async () => copyText(`codex mcp add mina-ai-router --url ${state.mcpUrl}`))}
        />
        <main className="workspace">
          <section className="canvas-panel" aria-label="Live operations">
            <LiveFlow
              agents={state.agents}
              requests={state.requests}
              selectedAgentId={selectedAgentId}
              selectedRequestId={selectedRequestId}
              onSelectAgent={(agentId, requestId) => {
                setSelectedAgentId(agentId);
                setSelectedRequestId(requestId);
                setSelectedSurface("agent");
                setInspectorOpen(true);
                setInspectorCollapsed(false);
              }}
              onSelectRouter={() => {
                setSelectedSurface("router");
                setInspectorOpen(false);
                setInspectorCollapsed(false);
                setSelectedAgentId("");
                setSelectedRequestId("");
              }}
              onDismissMenu={() => setMenu({ kind: "none" })}
              onOpenMenu={setMenu}
              onOpenFlowMenu={setMenu}
            />
          </section>
        </main>
      </div>
      {selectedSurface === "router" || selectedSurface === "agent" ? (
        <ActivityTable
          requests={activityRequests}
          onArchiveStale={() => void run(archiveStale)}
          onOpenRequest={openRequest}
          height={activityHeight}
          onHeightChange={(height) => {
            const next = clampActivityHeight(height);
            setActivityHeight(next);
            window.localStorage.setItem("mina-ai-router.activityHeight.v1", String(next));
          }}
          title={selectedSurface === "agent" && selectedAgent ? `${displayAgentName(selectedAgent)} Activity` : "System Activity"}
          subtitle={selectedSurface === "agent" && selectedAgent ? "Recent routed requests for the selected agent." : "Recent routed requests from the local state store."}
        />
      ) : null}
      {inspectorOpen ? (
        <Inspector
          agent={selectedAgent}
          requests={state.requests}
          onAction={openAgentAction}
          onRequest={openRequest}
          collapsed={inspectorCollapsed}
          onCollapse={() => setInspectorCollapsed(true)}
          onExpand={() => setInspectorCollapsed(false)}
        />
      ) : null}
      <FloatingMenus
        menu={menu}
        onAgentAction={openAgentAction}
        onFlowAction={openFlowAction}
        onClose={() => setMenu({ kind: "none" })}
        agent={menu.kind === "agent" ? agentById(menu.agentId) : undefined}
      />
      {renderModal()}
    </div>
  );

  function renderModal() {
    if (modal.kind === "none") return null;
    if (modal.kind === "connect") {
      return <Modal title="Connect an agent" subtitle="Start a visible CLI session and let it self-register through MCP" onClose={() => setModal({ kind: "none" })}><ConnectGuide mcpUrl={state.mcpUrl} /></Modal>;
    }
    if (modal.kind === "create-agent") {
      return <Modal title="Create tmux agent" subtitle="Start Codex or Claude in a project directory" onClose={() => setModal({ kind: "none" })}><CreateTmuxAgentForm onCreated={(agent, nextState) => {
        setState(nextState);
        setSelectedAgentId(agent.id);
      }} /></Modal>;
    }
    if (modal.kind === "details") {
      const agent = agentById(modal.agentId);
      if (!agent) return null;
      return <Modal title={displayAgentName(agent)} subtitle={`${agent.agentType} / ${agent.transport}`} onClose={() => setModal({ kind: "none" })}><AgentDetailsForm agent={agent} onSave={async (summary, sources) => {
        const result = await routerApi.updateAgent(agent.id, { capabilitySummary: summary, capabilitySources: sources });
        setState(result.state);
      }} /></Modal>;
    }
    if (modal.kind === "history") {
      const agent = agentById(modal.agentId);
      if (!agent) return null;
      const requests = agentRequests(agent.id, state.requests).slice().reverse();
      return <Modal title={`${displayAgentName(agent)} history`} subtitle={`${requests.length} routed request${requests.length === 1 ? "" : "s"}`} onClose={() => setModal({ kind: "none" })}>
        {requests.length ? <div className="request-list">{requests.map((request) => <RequestCard key={request.id} request={request} onOpen={openRequest} />)}</div> : <div className="empty">No requests for this agent yet.</div>}
      </Modal>;
    }
    if (modal.kind === "ask") {
      const agent = agentById(modal.agentId);
      if (!agent) return null;
      if (!isRouteReady(agent)) {
        return <Modal title={`Ask ${displayAgentName(agent)}`} subtitle="Route a direct task through MCP" onClose={() => setModal({ kind: "none" })}>
          <div className="notice">{routeBlockedReason(agent)}</div>
        </Modal>;
      }
      return <Modal title={`Ask ${displayAgentName(agent)}`} subtitle="Route a direct task through MCP" onClose={() => setModal({ kind: "none" })}><AskAgentForm agent={agent} output={lastAskOutput} onAsk={async (task) => {
        const result = await routerApi.ask(agent.id, task);
        setLastAskOutput(JSON.stringify(result.result || result, null, 2));
        setState(result.state);
      }} /></Modal>;
    }
    if (modal.kind === "attach") {
      const agent = agentById(modal.agentId);
      if (!agent) return null;
      return <Modal title={`${displayAgentName(agent)} attach`} subtitle="Use these commands when you want direct terminal control" onClose={() => setModal({ kind: "none" })}>
        <div className="guide-steps">
          <div className="notice">The web UI controls routing and session lifecycle. For full interactive terminal control, run one of these commands in your terminal app.</div>
          <Kv label="tmux attach">{attachCommand(agent)}</Kv>
          <Kv label="MAIR helper command">{mairAttachCommand(agent)}</Kv>
          <div className="actions">
            <Button onClick={() => void copyText(attachCommand(agent))}><Icon name="content_copy" />Copy tmux attach</Button>
            <Button tone="secondary" onClick={() => void copyText(mairAttachCommand(agent))}><Icon name="content_copy" />Copy mair attach</Button>
          </div>
        </div>
      </Modal>;
    }
    if (modal.kind === "terminal") {
      const agent = agentById(modal.agentId);
      if (!agent) return null;
      return <Modal title={`${displayAgentName(agent)} terminal`} subtitle={agent.sessionId || "tmux session"} onClose={() => setModal({ kind: "none" })}>
        {agent.transport === "tmux" ? <TerminalPanel agentId={agent.id} /> : <div className="empty">This agent uses {agent.transport}, not tmux.</div>}
      </Modal>;
    }
    if (modal.kind === "request") {
      const request = requestById(modal.requestId) || selectedRequest;
      if (!request) return null;
      return <Modal title={request.id} subtitle={`${request.targetAgent}`} onClose={() => setModal({ kind: "none" })}>
        <RequestDetail request={request} onAction={(action, requestId) => void run(async () => {
          if (action === "cancel" && !confirm(`Mark request "${requestId}" as cancelled?`)) return;
          if (action === "interrupt" && !confirm(`Send Ctrl-C to the terminal for request "${requestId}"?`)) return;
          if (action === "recover" && !confirm(`Mark request "${requestId}" as recovered and release its lease?`)) return;
          if (action === "archive" && !confirm(`Archive request "${requestId}"?`)) return;
          if (action === "unarchive" && !confirm(`Unarchive request "${requestId}"?`)) return;
          const result = await routerApi.requestAction(requestId, action);
          setState(result.state);
          if (action === "retry" && result.result?.requestId) {
            setSelectedRequestId(result.result.requestId);
            setModal({ kind: "request", requestId: result.result.requestId });
          }
        })} />
      </Modal>;
    }
    if (modal.kind === "developer") {
      return <Modal title="Developer tools" subtitle="Hidden diagnostics and maintenance helpers" onClose={() => setModal({ kind: "none" })}>
        <DeveloperTools
          requests={state.requests}
          onSetupPair={() => void run(async () => {
            const result = await routerApi.setupPair();
            setSelectedAgentId(result.helper.id);
            await refresh();
          })}
          onArchiveStale={() => void run(archiveStale)}
          onRequest={openRequest}
        />
      </Modal>;
    }
    return null;
  }
}

function clampActivityHeight(height: number): number {
  return Math.max(96, Math.min(420, Math.round(height)));
}
