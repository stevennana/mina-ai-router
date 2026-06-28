const assert = require("node:assert/strict");
const { spawn, execFileSync } = require("node:child_process");
const { existsSync, mkdtempSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const repoRoot = join(__dirname, "..");
const distCli = join(repoRoot, "dist", "apps", "cli", "src", "index.js");
const distMcp = join(repoRoot, "dist", "apps", "mcp-server", "src", "index.js");
const session = `mina-router-mcp-${process.pid}`;
const tempDir = mkdtempSync(join(tmpdir(), "mina-router-mcp-"));
const statePath = join(tempDir, "router-state.json");
const responderPath = join(tempDir, "responder.sh");
const env = {
  ...process.env,
  MINA_ROUTER_STATE: statePath,
};

async function main() {
  assert.ok(existsSync(distCli), "dist CLI does not exist; run npm run build first");
  assert.ok(existsSync(distMcp), "dist MCP server does not exist; run npm run build first");

  writeResponder();
  cleanup();

  try {
    run("tmux", ["new-session", "-d", "-s", session, "-x", "200", "-y", "60", "-c", tempDir, `/bin/sh ${responderPath}`]);
    const mcp = new McpClient(distMcp, env);
    try {
      const initialize = await mcp.request("initialize", {});
      assert.equal(initialize.serverInfo.name, "mina-agent-router");

      const tools = await mcp.request("tools/list", {});
      assert.deepEqual(
        tools.tools.map((tool) => tool.name).sort(),
        ["call_agent", "get_request_status", "list_agents", "register_agent"],
      );

      const registered = JSON.parse(
        (await mcp.callTool("register_agent", {
          id: "payment",
          name: "payment",
          agentType: "shell",
          transport: "tmux",
          sessionId: session,
          projectRoot: tempDir,
        })).content[0].text,
      );
      assert.equal(registered.agent.id, "payment");

      const agents = JSON.parse((await mcp.callTool("list_agents", {})).content[0].text);
      assert.equal(agents.agents[0].id, "payment");
      assert.equal(agents.agents[0].status, "available");

      const call = JSON.parse(
        (await mcp.callTool("call_agent", {
          target: "payment",
          task: "MCP tmux smoke",
          timeoutMs: 5_000,
        })).content[0].text,
      );
      assert.equal(call.target, "payment");
      assert.equal(call.answer, "hello from mcp tmux smoke");

      const status = JSON.parse(
        (await mcp.callTool("get_request_status", {
          requestId: call.requestId,
        })).content[0].text,
      );
      assert.equal(status.status, "answered");
    } finally {
      await mcp.close();
    }

    console.log("mcp smoke passed");
  } finally {
    cleanup();
  }
}

class McpClient {
  constructor(script, childEnv) {
    this.nextId = 1;
    this.buffer = Buffer.alloc(0);
    this.pending = new Map();
    this.child = spawn(process.execPath, [script], {
      cwd: repoRoot,
      env: childEnv,
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.child.stdout.on("data", (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.readFrames();
    });
    this.child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
    });
    this.child.on("exit", (code) => {
      for (const { reject } of this.pending.values()) {
        reject(new Error(`MCP server exited with code ${code}`));
      }
      this.pending.clear();
    });
  }

  request(method, params) {
    const id = this.nextId++;
    const body = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    this.child.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.delete(id)) {
          reject(new Error(`Timed out waiting for MCP response to ${method}`));
        }
      }, 10_000);
      this.pending.set(id, { resolve, reject, timer });
    });
  }

  callTool(name, args) {
    return this.request("tools/call", { name, arguments: args });
  }

  readFrames() {
    while (true) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) return;

      const header = this.buffer.slice(0, headerEnd).toString("utf8");
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) throw new Error("Missing Content-Length");
      const contentLength = Number(match[1]);
      const frameStart = headerEnd + 4;
      const frameEnd = frameStart + contentLength;
      if (this.buffer.length < frameEnd) return;

      const payload = JSON.parse(this.buffer.slice(frameStart, frameEnd).toString("utf8"));
      this.buffer = this.buffer.slice(frameEnd);
      const pending = this.pending.get(payload.id);
      if (!pending) continue;
      this.pending.delete(payload.id);
      clearTimeout(pending.timer);
      if (payload.error) pending.reject(new Error(payload.error.message));
      else pending.resolve(payload.result);
    }
  }

  close() {
    this.child.stdin.end();
    this.child.stdout.destroy();
    this.child.stderr.destroy();
    this.child.kill("SIGKILL");
    this.child.unref();
    return Promise.resolve();
  }
}

function writeResponder() {
  writeFileSync(
    responderPath,
    [
      "while IFS= read -r line; do",
      "  case \"$line\" in",
      "    'Request ID: '*)",
      "      rid=${line#Request ID: }",
      "      printf '<<<MINA_AGENT_RESPONSE_START %s>>>\\nhello from mcp tmux smoke\\n<<<MINA_AGENT_RESPONSE_END %s>>>\\n' \"$rid\" \"$rid\"",
      "      ;;",
      "  esac",
      "done",
      "",
    ].join("\n"),
  );
}

function run(file, args, commandEnv = process.env) {
  return execFileSync(file, args, {
    cwd: repoRoot,
    env: commandEnv,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function cleanup() {
  try {
    execFileSync("tmux", ["kill-session", "-t", session], {
      stdio: ["ignore", "ignore", "ignore"],
    });
  } catch {
    // The session may not exist.
  }
}

main().catch((error) => {
  console.error(error);
  cleanup();
  process.exitCode = 1;
});
