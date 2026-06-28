import { useState } from "react";
import type { RouterAgent } from "../domain/types";
import { Button } from "../primitives/Button";
import { Icon } from "../primitives/Icon";

export function AskAgentForm({
  agent,
  output,
  onAsk,
}: {
  agent: RouterAgent;
  output: string;
  onAsk: (task: string) => Promise<void>;
}) {
  const [task, setTask] = useState("현재 프로젝트 목적을 짧게 요약해줘.");

  return (
    <form
      className="detail-grid"
      onSubmit={(event) => {
        event.preventDefault();
        void onAsk(task);
      }}
    >
      <label style={{ gridColumn: "1 / -1" }}>Task<textarea value={task} onChange={(event) => setTask(event.target.value)} /></label>
      <div className="actions" style={{ gridColumn: "1 / -1" }}>
        <Button type="submit"><Icon name="send" />Send to {agent.id}</Button>
      </div>
      <pre style={{ gridColumn: "1 / -1" }}>{output}</pre>
    </form>
  );
}
