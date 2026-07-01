import { Kv } from "../primitives/Kv";

export function ConnectGuide({ mcpUrl }: { mcpUrl: string }) {
  return (
    <div className="guide-steps">
      <div className="notice">
        Use setup first from the project directory you want to expose. It configures MCP for this live router URL and installs the registration skill before the visible CLI session starts.
      </div>
      <Kv label="Setup Codex">mair setup codex --project /path/to/project --mcp-url {mcpUrl || "http://127.0.0.1:3333/mcp"}</Kv>
      <Kv label="Setup Claude">mair setup claude --project /path/to/project --mcp-url {mcpUrl || "http://127.0.0.1:3333/mcp"}</Kv>
      <Kv label="Readiness check">mair doctor --client all --project /path/to/project</Kv>
      <Kv label="Start Codex agent">cd /path/to/project && mair codex</Kv>
      <Kv label="Start Claude agent">cd /path/to/project && mair claude</Kv>
      <Kv label="Manual prompt inside the CLI">Register this session with Mina AI Router.</Kv>
      <div className="kv">
        <span>Codex MCP command</span>
        <code>codex mcp add mina-ai-router --url {mcpUrl || "http://127.0.0.1:3333/mcp"}</code>
      </div>
      <div className="kv">
        <span>Claude MCP command</span>
        <code>claude mcp add --transport http mina-ai-router {mcpUrl || "http://127.0.0.1:3333/mcp"}</code>
      </div>
    </div>
  );
}
