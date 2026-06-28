const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtempSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const port = 3344;
const baseUrl = `http://127.0.0.1:${port}`;
const tempDir = mkdtempSync(join(tmpdir(), "mina-http-smoke-"));
const statePath = join(tempDir, "router-state.json");
const server = spawn(process.execPath, ["dist/apps/http-server/src/index.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    MINA_ROUTER_STATE: statePath,
  },
  stdio: ["ignore", "ignore", "inherit"],
});

async function main() {
  try {
    await waitForServer();

    const state = await json(`${baseUrl}/api/state`);
    assert.equal(state.mcpUrl, `${baseUrl}/mcp`);
    assert.ok(Array.isArray(state.agents));

    const health = await json(`${baseUrl}/api/health`);
    assert.equal(health.mcpUrl, `${baseUrl}/mcp`);
    assert.equal(typeof health.ok, "boolean");

    const html = await text(`${baseUrl}/`);
    assert.match(html, /Mina Agent Router/);
    assert.match(html, /Restart Session/);
    assert.match(html, /Selected Request/);
    assert.match(html, /Archive Stale/);
    assert.match(html, /Copy MCP Command/);

    const registered = await postJson(`${baseUrl}/api/register`, {
      id: "http-smoke",
      name: "http-smoke",
      agentType: "shell",
      transport: "headless",
      sessionId: "http-smoke",
      projectRoot: "/tmp",
      capabilitySummary: "HTTP smoke helper for validating registration metadata.",
      capabilitySources: "manual smoke payload",
    });
    assert.equal(registered.agent.id, "http-smoke");
    assert.equal(registered.agent.capabilitySummary, "HTTP smoke helper for validating registration metadata.");

    const asked = await postJson(`${baseUrl}/api/ask`, {
      target: "http-smoke",
      task: "HTTP smoke request",
      timeoutMs: 1000,
    });
    assert.equal(asked.result.target, "http-smoke");

    const archived = await postJson(`${baseUrl}/api/requests/${asked.result.requestId}/archive`, {});
    assert.equal(archived.result.status, "archived");

    const stale = await postJson(`${baseUrl}/api/requests/archive-stale`, { olderThanMs: 0 });
    assert.ok(Array.isArray(stale.archived));

    const deleted = await deleteJson(`${baseUrl}/api/agents/http-smoke`);
    assert.equal(deleted.agent.id, "http-smoke");

    const initialized = await postMcp({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {},
    });
    assert.equal(initialized.result.serverInfo.name, "mina-agent-router");

    const tools = await postMcp({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    });
    assert.deepEqual(
      tools.result.tools.map((tool) => tool.name).sort(),
      ["call_agent", "get_request_status", "list_agents", "register_agent"],
    );

    console.log("http smoke passed");
  } finally {
    server.kill("SIGTERM");
  }
}

async function waitForServer() {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      await text(`${baseUrl}/`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("HTTP server did not become ready");
}

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} failed: ${response.status}`);
  return response.json();
}

async function text(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} failed: ${response.status}`);
  return response.text();
}

async function postMcp(body) {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`/mcp failed: ${response.status}`);
  return response.json();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${url} failed: ${response.status}`);
  return response.json();
}

async function deleteJson(url) {
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) throw new Error(`${url} failed: ${response.status}`);
  return response.json();
}

main().catch((error) => {
  console.error(error);
  server.kill("SIGTERM");
  process.exitCode = 1;
});
