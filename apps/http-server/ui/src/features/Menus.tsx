import type { MenuState } from "../domain/types";
import type { CSSProperties } from "react";
import { Icon } from "../primitives/Icon";

export function FloatingMenus({
  menu,
  onAgentAction,
  onFlowAction,
  onClose,
}: {
  menu: MenuState;
  onAgentAction: (action: string, agentId: string) => void;
  onFlowAction: (action: string) => void;
  onClose: () => void;
}) {
  if (menu.kind === "none") return null;

  if (menu.kind === "flow") {
    return (
      <div className="context-menu" style={menuPosition(menu.x, menu.y)} onMouseLeave={onClose}>
        <button type="button" onClick={() => onFlowAction("create")}><Icon name="terminal" />Create tmux Agent</button>
        <button type="button" onClick={() => onFlowAction("guide")}><Icon name="add" />Connect Guide</button>
      </div>
    );
  }

  return (
    <div className="context-menu" style={menuPosition(menu.x, menu.y)} onMouseLeave={onClose}>
      <button type="button" onClick={() => onAgentAction("terminal", menu.agentId)}><Icon name="terminal" />Open Terminal</button>
      <button type="button" onClick={() => onAgentAction("ask", menu.agentId)}><Icon name="send" />Ask</button>
      <button type="button" onClick={() => onAgentAction("attach", menu.agentId)}><Icon name="open_in_new" />Attach Commands</button>
      <button type="button" onClick={() => onAgentAction("copy", menu.agentId)}><Icon name="content_copy" />Copy Attach Command</button>
      <button type="button" onClick={() => onAgentAction("restart", menu.agentId)}><Icon name="restart_alt" />Restart Session</button>
      <button type="button" className="danger" onClick={() => onAgentAction("delete", menu.agentId)}><Icon name="delete" />Delete Agent</button>
    </div>
  );
}

function menuPosition(x: number, y: number): CSSProperties {
  return {
    left: Math.max(16, Math.min(x + 8, window.innerWidth - 304)) || 16,
    top: Math.max(16, Math.min(y + 8, window.innerHeight - 360)) || 16,
  };
}
