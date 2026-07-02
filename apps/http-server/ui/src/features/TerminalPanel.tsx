import { useEffect, useState } from "react";
import type { TerminalAction } from "../domain/types";
import { isPendingUiRegistration } from "../domain/helpers";
import { routerApi } from "../lib/api";
import { Button } from "../primitives/Button";
import { Icon } from "../primitives/Icon";

export function TerminalPanel({
  agentId,
  autoHideOnRegistered = false,
}: {
  agentId: string;
  autoHideOnRegistered?: boolean;
}) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("Watching the current tmux session.");
  const [input, setInput] = useState("");
  const [hidden, setHidden] = useState(false);
  const [actions, setActions] = useState<TerminalAction[]>([]);

  async function refresh(allowAutoHide: boolean) {
    const result = await routerApi.terminal(agentId);
    setText(result.terminal.text || "");
    setActions(result.terminal.actions || []);
    setStatus(terminalStatusText(result.terminal, autoHideOnRegistered));
    if (allowAutoHide && autoHideOnRegistered) {
      const state = await routerApi.state();
      const latest = state.agents.find((agent) => agent.id === agentId);
      if (latest && !isPendingUiRegistration(latest)) setHidden(true);
    }
  }

  async function send(textValue: string, enter: boolean) {
    const result = await routerApi.terminalInput(agentId, textValue, enter);
    setText(result.terminal.text || "");
    setActions(result.terminal.actions || []);
    setStatus(result.registration === "registration prompt sent to agent"
      ? "Trust approved. Mina sent the self-registration prompt."
      : terminalStatusText(result.terminal, autoHideOnRegistered));
  }

  async function runAction(actionId: string) {
    const result = await routerApi.terminalInput(agentId, "", false, actionId);
    setText(result.terminal.text || "");
    setActions(result.terminal.actions || []);
    setStatus(result.registration === "registration prompt sent to agent"
      ? "Guided action sent. Mina sent the self-registration prompt."
      : terminalStatusText(result.terminal, autoHideOnRegistered));
  }

  useEffect(() => {
    void refresh(false);
    const timer = window.setInterval(() => void refresh(true).catch(() => undefined), 1800);
    return () => window.clearInterval(timer);
  }, [agentId]);

  if (hidden) return null;

  return (
    <div className="terminal-panel">
      <div className="terminal-head">
        <div>
          <strong>Terminal preview</strong>
          <p className="subtitle">{status}</p>
        </div>
        <div className="actions">
          <Button tone="secondary" onClick={() => void refresh(false)}><Icon name="refresh" />Refresh</Button>
          <Button tone="secondary" onClick={() => void send("", true)}><Icon name="keyboard_return" />Send Enter</Button>
        </div>
      </div>
      {actions.length > 0 && (
        <div className="terminal-actions">
          {actions.map((action) => (
            <Button key={action.id} tone={action.policy === "manual" ? "secondary" : "primary"} onClick={() => {
              if (action.input) void runAction(action.id);
            }} disabled={!action.input}>
              <Icon name={action.policy === "manual" ? "open_in_new" : "bolt"} />{action.label}
            </Button>
          ))}
        </div>
      )}
      <pre>{text}</pre>
      <div className="actions">
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Type input for this tmux session" onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            const next = input;
            setInput("");
            void send(next, true);
          }
        }} />
        <Button onClick={() => {
          const next = input;
          setInput("");
          void send(next, true);
        }}><Icon name="send" />Send</Button>
      </div>
    </div>
  );
}

function terminalStatusText(
  terminal: { trustPrompt: boolean; permissionPrompt?: { message: string; action: string }; actions?: TerminalAction[]; pendingRegistration: boolean },
  autoHideOnRegistered: boolean,
): string {
  if (terminal.actions?.length) {
    return "Guided bootstrap action is available for this prompt.";
  }
  if (terminal.permissionPrompt) return `${terminal.permissionPrompt.message} ${terminal.permissionPrompt.action}`;
  if (terminal.trustPrompt) return "Agent is waiting for a permission or trust prompt. Press Send Enter only after reviewing the directory.";
  if (terminal.pendingRegistration) return "Waiting for the agent to finish self-registration.";
  return autoHideOnRegistered ? "Agent is registered. Terminal preview will close automatically." : "Live terminal preview is active.";
}
