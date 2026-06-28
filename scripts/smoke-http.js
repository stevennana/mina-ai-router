const assert = require("node:assert/strict");
const { execFileSync, spawn } = require("node:child_process");
const { mkdtempSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const port = 3344;
const baseUrl = `http://127.0.0.1:${port}`;
const tempDir = mkdtempSync(join(tmpdir(), "mina-http-smoke-"));
const statePath = join(tempDir, "router-state.json");
const uiSession = `mina-http-ui-${process.pid}`;
let serverLog = "";
writeFileSync(statePath, `${JSON.stringify({
  agents: [
    {
      id: "ui-missing",
      name: "ui-missing",
      agentType: "shell",
      transport: "headless",
      sessionId: "ui-missing",
      projectRoot: tempDir,
      status: "unknown",
    },
    {
      id: "ui-stale",
      name: "ui-stale",
      agentType: "shell",
      transport: "headless",
      sessionId: "ui-stale",
      projectRoot: tempDir,
      status: "unknown",
      capabilitySummary: "Stale generated capability notice.",
      capabilitySources: "AGENTS.md",
      capabilitySource: "generated",
      capabilityUpdatedAt: "2026-01-01T00:00:00.000Z",
      lastCapabilityRefreshAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  requests: [],
}, null, 2)}\n`);
const server = spawn(process.execPath, ["dist/apps/http-server/src/index.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    MINA_ROUTER_STATE: statePath,
  },
  stdio: ["ignore", "ignore", "pipe"],
});
server.stderr.on("data", (chunk) => {
  serverLog += String(chunk);
});

async function main() {
  try {
    if (!await waitForServer()) {
      return;
    }

    const state = await json(`${baseUrl}/api/state`);
    assert.equal(state.mcpUrl, `${baseUrl}/mcp`);
    assert.ok(Array.isArray(state.agents));

    const health = await json(`${baseUrl}/api/health`);
    assert.equal(health.mcpUrl, `${baseUrl}/mcp`);
    assert.equal(typeof health.ok, "boolean");

    const html = await text(`${baseUrl}/`);
    assert.match(html, /Mina AI Router/);
    assert.match(html, /<div id="root"><\/div>/);
    assert.match(html, /type="module"[^>]+\/assets\/index-.*\.js/);
    assert.match(html, /rel="stylesheet"[^>]+\/assets\/index-.*\.css/);
    await assertUiFreshnessSurface(html);

    const seededState = await json(`${baseUrl}/api/state`);
    const missingAgent = seededState.agents.find((agent) => agent.id === "ui-missing");
    const staleAgent = seededState.agents.find((agent) => agent.id === "ui-stale");
    assert.ok(missingAgent, "expected missing capability fixture in UI state");
    assert.ok(staleAgent, "expected stale capability fixture in UI state");
    assert.equal(missingAgent.capabilitySummary, undefined);
    assert.equal(staleAgent.capabilitySource, "generated");
    assert.equal(staleAgent.lastCapabilityRefreshAt, "2026-01-01T00:00:00.000Z");

    const directories = await postJson(`${baseUrl}/api/fs/directories`, {
      path: tempDir,
    });
    assert.equal(directories.path, tempDir);
    assert.ok(Array.isArray(directories.entries));

    const uiCreated = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-created",
      agentType: "codex",
      projectRoot: tempDir,
      sessionId: uiSession,
      startupCommand: "/bin/sh",
      sendRegistrationPrompt: false,
    });
    assert.equal(uiCreated.agent.id, "ui-created");
    assert.equal(uiCreated.agent.sessionId, uiSession);
    assert.equal(uiCreated.attachCommand, `tmux attach -t ${uiSession}`);
    assert.equal(uiCreated.mairAttachCommand, "mair attach ui-created");

    const terminal = await json(`${baseUrl}/api/agents/ui-created/terminal`);
    assert.equal(terminal.agent.id, "ui-created");
    assert.equal(typeof terminal.terminal.text, "string");

    const terminalInput = await postJson(`${baseUrl}/api/agents/ui-created/terminal/input`, {
      enter: true,
    });
    assert.equal(terminalInput.ok, true);

    const updatedUiCreated = await patchJson(`${baseUrl}/api/agents/ui-created`, {
      capabilitySummary: "Edited capability notice.",
      capabilitySources: "manual UI edit",
    });
    assert.equal(updatedUiCreated.agent.capabilitySummary, "Edited capability notice.");
    assert.equal(updatedUiCreated.agent.capabilitySources, "manual UI edit");
    assert.equal(updatedUiCreated.agent.capabilitySource, "manual");
    assert.ok(updatedUiCreated.agent.capabilityUpdatedAt);

    const deletedUiCreated = await deleteJson(`${baseUrl}/api/agents/ui-created`);
    assert.equal(deletedUiCreated.agent.id, "ui-created");

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
    assert.equal(registered.agent.capabilitySource, "generated");
    assert.ok(registered.agent.capabilityUpdatedAt);
    assert.ok(registered.agent.lastCapabilityRefreshAt);

    const registeredState = await json(`${baseUrl}/api/state`);
    const registeredAgent = registeredState.agents.find((agent) => agent.id === "http-smoke");
    assert.ok(registeredAgent, "expected registered agent in HTTP UI state");
    assert.equal(registeredAgent.capabilitySource, "generated");
    assert.ok(registeredAgent.capabilityUpdatedAt);
    assert.ok(registeredAgent.lastCapabilityRefreshAt);

    const asked = await postJson(`${baseUrl}/api/ask`, {
      target: "http-smoke",
      task: "HTTP smoke request",
      timeoutMs: 1000,
    });
    assert.equal(asked.result.target, "http-smoke");
    const answeredRequest = findRequest(asked.state, asked.result.requestId);
    assert.equal(answeredRequest.sourceAgent, "main");
    assert.equal(answeredRequest.targetAgent, "http-smoke");
    assert.equal(answeredRequest.task, "HTTP smoke request");
    assert.equal(answeredRequest.status, "answered");
    assert.equal(answeredRequest.diagnosticStatus, "answered");
    assert.match(answeredRequest.answer, /Headless response from http-smoke/);
    assert.equal(answeredRequest.parserDiagnostics.kind, "parsed");
    assert.equal(answeredRequest.parserDiagnostics.startMarkerFound, true);
    assert.equal(answeredRequest.parserDiagnostics.endMarkerFound, true);
    assert.equal(answeredRequest.rawEvidence.kind, "transport_capture");
    assert.equal(typeof answeredRequest.rawEvidence.excerpt, "string");
    assert.match(answeredRequest.rawEvidence.excerpt, /MINA_AGENT_RESPONSE_START/);
    assert.equal(answeredRequest.rawEvidence.truncated, false);

    const archived = await postJson(`${baseUrl}/api/requests/${asked.result.requestId}/archive`, {});
    assert.equal(archived.result.status, "archived");
    assert.equal(archived.result.diagnosticStatus, "archived");
    assert.equal(archived.result.archivedFromStatus, "answered");
    const archivedRequest = findRequest(archived.state, asked.result.requestId);
    assert.equal(archivedRequest.status, "archived");
    assert.equal(archivedRequest.diagnosticStatus, "archived");
    assert.equal(archivedRequest.archivedFromStatus, "answered");
    assert.match(archivedRequest.answer, /Headless response from http-smoke/);
    assert.equal(archivedRequest.parserDiagnostics.kind, "parsed");
    assert.equal(archivedRequest.rawEvidence.kind, "transport_capture");

    const unarchived = await postJson(`${baseUrl}/api/requests/${asked.result.requestId}/unarchive`, {});
    assert.equal(unarchived.result.status, "answered");
    assert.equal(unarchived.result.diagnosticStatus, "answered");

    const invalidCancel = await expectPostJsonFailure(`${baseUrl}/api/requests/${asked.result.requestId}/cancel`, {});
    assert.equal(invalidCancel.status, 400);
    assert.match(invalidCancel.body.error, /Cannot cancel request/);

    const retried = await postJson(`${baseUrl}/api/requests/${asked.result.requestId}/retry`, {});
    assert.equal(retried.result.target, "http-smoke");
    assert.notEqual(retried.result.requestId, asked.result.requestId);
    const originalAfterRetry = findRequest(retried.state, asked.result.requestId);
    const retryRequest = findRequest(retried.state, retried.result.requestId);
    assert.equal(originalAfterRetry.retriedByRequestId, retried.result.requestId);
    assert.equal(retryRequest.retryOfRequestId, asked.result.requestId);
    assert.equal(retryRequest.status, "answered");

    const rearchived = await postJson(`${baseUrl}/api/requests/${asked.result.requestId}/archive`, {});
    assert.equal(findRequest(rearchived.state, asked.result.requestId).status, "archived");

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
    assert.equal(initialized.result.serverInfo.name, "mina-ai-router");

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
    try {
      execFileSync("tmux", ["kill-session", "-t", uiSession], {
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch {
      // Temporary UI-created session may not exist.
    }
    server.kill("SIGTERM");
  }
}

async function waitForServer() {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (/listen EPERM/.test(serverLog)) {
      assertUiFreshnessSurfaceFromBuild();
      console.log([
        "http smoke skipped: local HTTP listener denied by environment",
        `baseUrl: ${baseUrl}`,
        serverLog.trim(),
      ].join("\n"));
      return false;
    }

    try {
      await text(`${baseUrl}/`);
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("HTTP server did not become ready");
}

async function assertUiFreshnessSurface(html) {
  const scriptPath = html.match(/type="module"[^>]+src="([^"]+index-[^"]+\.js)"/)?.[1];
  const cssPath = html.match(/rel="stylesheet"[^>]+href="([^"]+index-[^"]+\.css)"/)?.[1];
  assert.ok(scriptPath, "expected bundled UI script");
  assert.ok(cssPath, "expected bundled UI stylesheet");

  const script = await text(`${baseUrl}${scriptPath}`);
  const stylesheet = await text(`${baseUrl}${cssPath}`);
  assertUiFreshnessSurfaceContent(script, stylesheet);
}

function assertUiFreshnessSurfaceFromBuild() {
  const publicDir = join(process.cwd(), "dist", "apps", "http-server", "src", "public");
  const html = readFileSync(join(publicDir, "index.html"), "utf8");
  const scriptPath = html.match(/type="module"[^>]+src="(?:\.?\/)?assets\/(index-[^"]+\.js)"/)?.[1];
  const cssPath = html.match(/rel="stylesheet"[^>]+href="(?:\.?\/)?assets\/(index-[^"]+\.css)"/)?.[1];
  assert.ok(scriptPath, "expected bundled UI script");
  assert.ok(cssPath, "expected bundled UI stylesheet");
  const script = readFileSync(join(publicDir, "assets", scriptPath), "utf8");
  const stylesheet = readFileSync(join(publicDir, "assets", cssPath), "utf8");
  assertUiFreshnessSurfaceContent(script, stylesheet);
}

function assertUiFreshnessSurfaceContent(script, stylesheet) {
  assert.match(script, /data-capability-state/);
  assert.match(script, /capability-card/);
  assert.match(script, /Missing/);
  assert.match(script, /Stale/);
  assert.match(script, /Fresh/);
  assert.match(script, /Manual/);
  assert.match(script, /Edit Capabilities/);
  assert.match(script, /Copy Refresh Command/);
  assert.match(script, /mair agent refresh-capabilities/);

  assert.match(stylesheet, /capability-fresh/);
  assert.match(stylesheet, /capability-stale/);
  assert.match(stylesheet, /capability-manual/);
  assert.match(stylesheet, /capability-missing/);
  assert.match(stylesheet, /floating-inspector/);
  assert.match(stylesheet, /max-height:min\(34rem,100vh - 1\.5rem\)/);
  assert.match(stylesheet, /width:100vw/);
  assert.match(stylesheet, /max-height:72vh/);
  assert.match(stylesheet, /activity-body/);
  assert.match(stylesheet, /overflow:auto/);
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

async function expectPostJsonFailure(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(response.ok, false);
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function patchJson(url, body) {
  const response = await fetch(url, {
    method: "PATCH",
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

function findRequest(state, requestId) {
  const request = state.requests.find((candidate) => candidate.id === requestId);
  assert.ok(request, `expected request ${requestId} in HTTP state`);
  return request;
}

main().catch((error) => {
  console.error(error);
  server.kill("SIGTERM");
  process.exitCode = 1;
});
