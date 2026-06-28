import { Kv } from "../primitives/Kv";

export function ConnectGuide({ mcpUrl }: { mcpUrl: string }) {
  return (
    <div className="guide-steps">
      <div className="notice">
        Use these commands from the project directory you want to expose as an agent. The CLI sends a short self-registration prompt, and the agent fills its capability summary from project docs or structure.
      </div>
      <Kv label="Start Codex agent">cd /path/to/project && mair codex</Kv>
      <Kv label="Start Claude agent">cd /path/to/project && mair claude</Kv>
      <Kv label="Manual prompt inside the CLI">Register this session with Mina AI Router.</Kv>
      <div className="kv">
        <span>Codex MCP command</span>
        <code>codex mcp add mina-ai-router --url {mcpUrl || "http://127.0.0.1:3333/mcp"}</code>
      </div>
    </div>
  );
}
