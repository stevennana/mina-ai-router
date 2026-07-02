import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { MenuState, RouterAgent, RouterRequest } from "../domain/types";
import { answeredCount, displayAgentName, lastRequestLabel, latestRequestFor, requestForLine, shortCapability, waitingCount } from "../domain/helpers";
import { StatusPill } from "../primitives/StatusPill";
import { Icon } from "../primitives/Icon";
import { Button } from "../primitives/Button";

type FlowPosition = { left: string; top: string };
type DragState = {
  agentId: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
};
type FlowPan = { x: number; y: number };
type PanState = {
  pointerId: number;
  startX: number;
  startY: number;
  startPan: FlowPan;
  armed: boolean;
};

const FLOW_POSITION_STORAGE_KEY = "mina-ai-router.flowPositions.v1";
const FLOW_ZOOM_STORAGE_KEY = "mina-ai-router.flowZoom.v1";
const FLOW_PAN_STORAGE_KEY = "mina-ai-router.flowPan.v1";
const FLOW_LONG_PRESS_MS = 320;
const MIN_FLOW_ZOOM = 0.55;
const MAX_FLOW_ZOOM = 1.35;
const FLOW_ZOOM_STEP = 0.1;

export function LiveFlow({
  agents,
  requests,
  selectedAgentId,
  selectedRequestId,
  onSelectAgent,
  onSelectRouter,
  onDismissMenu,
  onOpenMenu,
  onOpenFlowMenu,
}: {
  agents: RouterAgent[];
  requests: RouterRequest[];
  selectedAgentId: string;
  selectedRequestId: string;
  onSelectAgent: (agentId: string, requestId: string) => void;
  onSelectRouter: () => void;
  onDismissMenu: () => void;
  onOpenMenu: (menu: MenuState) => void;
  onOpenFlowMenu: (menu: MenuState) => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const routerRef = useRef<HTMLButtonElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const dragRef = useRef<DragState | undefined>();
  const panRef = useRef<PanState | undefined>();
  const longPressTimerRef = useRef<number | undefined>();
  const didDragRef = useRef(false);
  const didPanRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lines, setLines] = useState<Array<{ id: string; x1: number; y1: number; x2: number; y2: number; status: string; selected: boolean }>>([]);
  const [savedPositions, setSavedPositions] = useState<Record<string, FlowPosition>>(() => loadSavedPositions());
  const [zoom, setZoom] = useState(() => loadSavedZoom());
  const [pan, setPan] = useState<FlowPan>(() => loadSavedPan());
  const fallbackPositions = useMemo(() => layoutFor(agents.length), [agents.length]);
  const positions = useMemo(() => Object.fromEntries(
    agents.map((agent, index) => [agent.id, savedPositions[agent.id] || fallbackPositions[index]]),
  ), [agents, fallbackPositions, savedPositions]);

  useLayoutEffect(() => {
    const draw = () => {
      const stageElement = stageRef.current;
      const stage = stageElement?.getBoundingClientRect();
      const router = routerRef.current?.getBoundingClientRect();
      if (!stageElement || !stage || !router || !stage.width || !stage.height) return;
      const center = rectCenter(router, stage, zoom);
      setLines(agents.flatMap((agent) => {
        const node = nodeRefs.current[agent.id]?.getBoundingClientRect();
        if (!node) return [];
        const request = requestForLine(agent.id, selectedRequestId, requests);
        const target = rectCenter(node, stage, zoom);
        return [{
          id: agent.id,
          x1: center.x,
          y1: center.y,
          x2: target.x,
          y2: target.y,
          status: request?.status || "",
          selected: Boolean(request?.id && request.id === selectedRequestId),
        }];
      }));
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [agents, requests, selectedRequestId, positions, zoom, pan]);

  function savePositions(next: Record<string, FlowPosition>) {
    setSavedPositions(next);
    window.localStorage.setItem(FLOW_POSITION_STORAGE_KEY, JSON.stringify(next));
  }

  function resetPositions() {
    window.localStorage.removeItem(FLOW_POSITION_STORAGE_KEY);
    setSavedPositions({});
  }

  function saveZoom(next: number) {
    const clamped = Number(clamp(next, MIN_FLOW_ZOOM, MAX_FLOW_ZOOM).toFixed(2));
    setZoom(clamped);
    window.localStorage.setItem(FLOW_ZOOM_STORAGE_KEY, String(clamped));
  }

  function savePan(next: FlowPan) {
    const clamped = {
      x: Math.round(clamp(next.x, -900, 900)),
      y: Math.round(clamp(next.y, -520, 520)),
    };
    setPan(clamped);
    window.localStorage.setItem(FLOW_PAN_STORAGE_KEY, JSON.stringify(clamped));
  }

  function resetView() {
    resetPositions();
    window.localStorage.removeItem(FLOW_ZOOM_STORAGE_KEY);
    window.localStorage.removeItem(FLOW_PAN_STORAGE_KEY);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = undefined;
    }
  }

  function startPanelPan(event: PointerEvent<HTMLDivElement>) {
    if (window.matchMedia("(max-width: 47.99rem)").matches) return;
    if ((event.target as HTMLElement).closest(".agent-node")) return;
    clearLongPressTimer();
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPan: pan,
      armed: false,
    };
    didPanRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      if (!panRef.current || panRef.current.pointerId !== event.pointerId) return;
      panRef.current.armed = true;
      setIsPanning(true);
      mapRef.current?.setPointerCapture(event.pointerId);
    }, FLOW_LONG_PRESS_MS);
  }

  function movePanelPan(event: PointerEvent<HTMLDivElement>) {
    const drag = panRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const movedX = event.clientX - drag.startX;
    const movedY = event.clientY - drag.startY;
    if (!drag.armed && Math.hypot(movedX, movedY) > 7) {
      clearLongPressTimer();
      panRef.current = undefined;
      return;
    }
    if (!drag.armed) return;
    didPanRef.current = true;
    savePan({ x: drag.startPan.x + movedX, y: drag.startPan.y + movedY });
  }

  function endPanelPan(event: PointerEvent<HTMLDivElement>) {
    clearLongPressTimer();
    if (panRef.current?.pointerId === event.pointerId && panRef.current.armed) {
      mapRef.current?.releasePointerCapture(event.pointerId);
    }
    panRef.current = undefined;
    setIsPanning(false);
  }

  function moveAgent(agentId: string, clientX: number, clientY: number) {
    const drag = dragRef.current;
    const stageElement = stageRef.current;
    const stage = stageElement?.getBoundingClientRect();
    const node = nodeRefs.current[agentId]?.getBoundingClientRect();
    if (!drag || !stageElement || !stage || !node) return;

    const leftPx = (clientX - stage.left) / zoom - drag.offsetX;
    const topPx = (clientY - stage.top) / zoom - drag.offsetY;
    const maxLeft = Math.max(0, stageElement.offsetWidth - node.width / zoom);
    const maxTop = Math.max(0, stageElement.offsetHeight - node.height / zoom);
    const left = `${((clamp(leftPx, 0, maxLeft) / Math.max(1, stageElement.offsetWidth)) * 100).toFixed(2)}%`;
    const top = `${((clamp(topPx, 0, maxTop) / Math.max(1, stageElement.offsetHeight)) * 100).toFixed(2)}%`;
    didDragRef.current = true;
    savePositions({ ...savedPositions, [agentId]: { left, top } });
  }

  return (
    <section className="flow-card">
      <div className="flow-head">
        <div>
              <h2>Live Agent Flow</h2>
          <p className="subtitle">Drag agents to arrange the map. Positions are saved in this browser.</p>
        </div>
        <div className="actions">
          <Button tone="ghost" onClick={() => saveZoom(zoom - FLOW_ZOOM_STEP)}><Icon name="remove" />Zoom out</Button>
          <span className="chip mono">{Math.round(zoom * 100)}%</span>
          <Button tone="ghost" onClick={() => saveZoom(zoom + FLOW_ZOOM_STEP)}><Icon name="add" />Zoom in</Button>
          <Button tone="ghost" onClick={resetView}><Icon name="restart_alt" />Reset view</Button>
          <span className="chip">{agents.length} agent{agents.length === 1 ? "" : "s"}</span>
        </div>
      </div>
      <div
        className={["map", isPanning ? "is-panning" : ""].filter(Boolean).join(" ")}
        ref={mapRef}
        onPointerDown={startPanelPan}
        onPointerMove={movePanelPan}
        onPointerUp={endPanelPan}
        onPointerCancel={endPanelPan}
        onClick={(event) => {
          if (didPanRef.current) {
            didPanRef.current = false;
            return;
          }
          if ((event.target as HTMLElement).closest(".agent-node, .router-node")) return;
          onDismissMenu();
        }}
        onContextMenu={(event) => {
          if ((event.target as HTMLElement).closest(".agent-node")) return;
          event.preventDefault();
          onOpenFlowMenu({ kind: "flow", x: event.clientX, y: event.clientY });
        }}
      >
        <div className="flow-stage" ref={stageRef} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <svg className="links" aria-hidden="true">
            {lines.map((line) => (
              <line
                key={line.id}
                className={["link-line", line.status, line.selected ? "selected" : ""].filter(Boolean).join(" ")}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
              />
            ))}
          </svg>
          <button className="router-node" ref={routerRef} type="button" onClick={() => {
            if (didPanRef.current) return;
            onSelectRouter();
          }}>
            <div className="router-icon"><Icon name="router" size={22} /></div>
            <h2>Router Core</h2>
            <code>/mcp</code>
            <div className="node-meta">{answeredCount(requests)} answered / {waitingCount(requests)} waiting</div>
            <div className="legend">
              <span className="dot answered" /><span>answered</span>
              <span className="dot waiting" /><span>waiting</span>
              <span className="dot failed" /><span>failed</span>
            </div>
          </button>
          {agents.map((agent) => {
            const latest = latestRequestFor(agent.id, requests);
            const isActive = latest && ["created", "sent", "waiting"].includes(latest.status);
            const failed = latest && ["failed", "timeout"].includes(latest.status);
            return (
              <button
                className={["agent-node", selectedAgentId === agent.id ? "selected" : "", isActive ? "active-request" : "", failed ? "failed-request" : ""].filter(Boolean).join(" ")}
                data-health-status={agent.status}
                key={agent.id}
                ref={(node) => { nodeRefs.current[agent.id] = node; }}
                style={{ left: positions[agent.id].left, top: positions[agent.id].top }}
                type="button"
                onPointerDown={(event) => {
                  if (window.matchMedia("(max-width: 47.99rem)").matches) return;
                  const stage = stageRef.current?.getBoundingClientRect();
                  if (!stage) return;
                  const node = event.currentTarget.getBoundingClientRect();
                  dragRef.current = {
                    agentId: agent.id,
                    pointerId: event.pointerId,
                    offsetX: (event.clientX - node.left) / zoom,
                    offsetY: (event.clientY - node.top) / zoom,
                  };
                  didDragRef.current = false;
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (dragRef.current?.agentId !== agent.id) return;
                  moveAgent(agent.id, event.clientX, event.clientY);
                }}
                onPointerUp={(event) => {
                  if (dragRef.current?.agentId === agent.id) {
                    event.currentTarget.releasePointerCapture(dragRef.current.pointerId);
                    dragRef.current = undefined;
                  }
                }}
                onPointerCancel={() => {
                  dragRef.current = undefined;
                }}
                onClick={(event) => {
                  if (didDragRef.current) {
                    didDragRef.current = false;
                    return;
                  }
                  onSelectAgent(agent.id, latest?.id || "");
                  onOpenMenu({ kind: "agent", agentId: agent.id, x: event.clientX, y: event.clientY });
                }}
              >
                <div className="agent-title">
                  <span className="agent-id"><Icon name={agent.agentType === "claude" ? "terminal" : "code"} size={15} />{displayAgentName(agent)}</span>
                  <StatusPill status={agent.status} />
                </div>
                <div className="node-meta mono">{agent.agentType} / {agent.transport}</div>
                <div className="node-meta mono">{agent.sessionId || "-"}</div>
                <div className="node-meta request-summary">{shortCapability(agent)}</div>
                <div className="node-meta request-summary">{lastRequestLabel(agent, latest)}</div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function loadSavedPositions(): Record<string, FlowPosition> {
  try {
    const raw = window.localStorage.getItem(FLOW_POSITION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, FlowPosition>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function loadSavedZoom(): number {
  const raw = window.localStorage.getItem(FLOW_ZOOM_STORAGE_KEY);
  const parsed = raw ? Number(raw) : 1;
  return Number.isFinite(parsed) ? clamp(parsed, MIN_FLOW_ZOOM, MAX_FLOW_ZOOM) : 1;
}

function loadSavedPan(): FlowPan {
  try {
    const raw = window.localStorage.getItem(FLOW_PAN_STORAGE_KEY);
    if (!raw) return { x: 0, y: 0 };
    const parsed = JSON.parse(raw) as FlowPan;
    const x = Number(parsed?.x);
    const y = Number(parsed?.y);
    return {
      x: Number.isFinite(x) ? clamp(x, -900, 900) : 0,
      y: Number.isFinite(y) ? clamp(y, -520, 520) : 0,
    };
  } catch {
    return { x: 0, y: 0 };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function layoutFor(count: number): Array<{ left: string; top: string }> {
  const slots = [
    { left: "10%", top: "16%" },
    { left: "68%", top: "14%" },
    { left: "38%", top: "70%" },
    { left: "8%", top: "62%" },
    { left: "70%", top: "60%" },
    { left: "38%", top: "10%" },
    { left: "3%", top: "38%" },
    { left: "76%", top: "38%" },
  ];
  return Array.from({ length: count }, (_, index) => slots[index] || orbitPosition(index, count));
}

function orbitPosition(index: number, count: number): { left: string; top: string } {
  const angle = (Math.PI * 2 * index) / Math.max(count, 1) - Math.PI / 2;
  const x = 42 + Math.cos(angle) * 35;
  const y = 42 + Math.sin(angle) * 31;
  return { left: `${Math.max(2, Math.min(78, x))}%`, top: `${Math.max(4, Math.min(76, y))}%` };
}

function rectCenter(rect: DOMRect, base: DOMRect, zoom: number): { x: number; y: number } {
  return {
    x: (rect.left - base.left + rect.width / 2) / zoom,
    y: (rect.top - base.top + rect.height / 2) / zoom,
  };
}
