const assert = require("node:assert/strict");
const { execFileSync, spawn } = require("node:child_process");
const { existsSync, mkdtempSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { pathToFileURL } = require("node:url");

const port = 3344;
const packageVersion = require(join(process.cwd(), "package.json")).version;
const baseUrl = `http://127.0.0.1:${port}`;
const tempDir = mkdtempSync(join(tmpdir(), "mina-http-smoke-"));
const statePath = join(tempDir, "router-state.json");
const uiSession = `mina-http-ui-${process.pid}`;
const promptSession = `mina-http-permission-${process.pid}`;
const timeoutSession = `mina-http-timeout-${process.pid}`;
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
      lastSeenAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "ui-tmux-missing",
      name: "ui-tmux-missing",
      agentType: "shell",
      transport: "tmux",
      sessionId: `missing-${process.pid}`,
      projectRoot: tempDir,
      status: "unknown",
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
    assert.equal(health.ok, false);
    assert.ok(health.agents.stale >= 1, "expected stale agent in health summary");
    assert.ok(health.agents.missing >= 1, "expected missing agent in health summary");
    assert.equal(typeof health.agents.needsAttention, "number");

    const html = await text(`${baseUrl}/`);
    assert.match(html, /Mina AI Router/);
    assert.match(html, /<div id="root"><\/div>/);
    assert.match(html, /type="module"[^>]+\/assets\/index-.*\.js/);
    assert.match(html, /rel="stylesheet"[^>]+\/assets\/index-.*\.css/);
    await assertUiFreshnessSurface(html);
    assertFirstUserUiReviewAffordancesFromSource();

    const seededState = await json(`${baseUrl}/api/state`);
    const missingAgent = seededState.agents.find((agent) => agent.id === "ui-missing");
    const staleAgent = seededState.agents.find((agent) => agent.id === "ui-stale");
    const missingTmuxAgent = seededState.agents.find((agent) => agent.id === "ui-tmux-missing");
    assert.ok(missingAgent, "expected missing capability fixture in UI state");
    assert.ok(staleAgent, "expected stale capability fixture in UI state");
    assert.ok(missingTmuxAgent, "expected missing tmux fixture in UI state");
    assert.equal(missingAgent.capabilitySummary, undefined);
    assert.equal(missingAgent.bootstrapStatus, "ready");
    assert.equal(missingAgent.registrationSource, "unknown");
    assert.equal(missingAgent.registrationStatus, "confirmed");
    assert.equal(staleAgent.status, "stale");
    assert.equal(staleAgent.capabilitySource, "generated");
    assert.equal(staleAgent.lastCapabilityRefreshAt, "2026-01-01T00:00:00.000Z");
    assert.equal(missingTmuxAgent.status, "missing");
    assert.ok(missingTmuxAgent.healthCheckedAt);

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
      permissionProfile: "direct-workspace-read",
      sendRegistrationPrompt: false,
    });
    assert.equal(uiCreated.agent.id, "ui-created");
    assert.equal(uiCreated.agent.sessionId, uiSession);
    assert.equal(uiCreated.agent.bootstrapStatus, "created");
    assert.equal(uiCreated.agent.registrationSource, "web-ui");
    assert.equal(uiCreated.agent.registrationStatus, "pending");
    assert.equal(uiCreated.agent.sessionFingerprint, uiSession);
    assert.equal(uiCreated.agent.permissionProfile, "direct-workspace-read");
    assert.equal(uiCreated.agent.permissionProfileStatus, "unsupported");
    assert.match(uiCreated.agent.permissionProfileDetail, /No known codex startup flag/);
    assert.equal(uiCreated.permissionProfile.permissionProfileStatus, "unsupported");
    assert.equal(uiCreated.agent.mcpPreflightStatus, "missing");
    assert.match(uiCreated.agent.mcpSetupCommand, /codex mcp add mina-ai-router --url/);
    assert.equal(uiCreated.mcpPreflight.status, "missing");
    assert.ok(uiCreated.agent.lastRegistrationAttemptAt);
    assert.equal(uiCreated.attachCommand, `tmux attach -t ${uiSession}`);
    assert.equal(uiCreated.mairAttachCommand, "mair attach ui-created");

    const terminal = await json(`${baseUrl}/api/agents/ui-created/terminal`);
    assert.equal(terminal.agent.id, "ui-created");
    assert.equal(typeof terminal.terminal.text, "string");

    const terminalInput = await postJson(`${baseUrl}/api/agents/ui-created/terminal/input`, {
      enter: true,
    });
    assert.equal(terminalInput.ok, true);

    const confirmedUiCreated = await postJson(`${baseUrl}/api/register`, {
      id: "ui-created",
      name: "ui-created",
      agentType: "codex",
      transport: "tmux",
      sessionId: uiSession,
      sessionFingerprint: uiSession,
      projectRoot: tempDir,
      capabilitySummary: "Confirmed UI-created helper.",
      capabilitySources: "self registration smoke",
    });
    assert.equal(confirmedUiCreated.agent.id, "ui-created");
    assert.equal(confirmedUiCreated.agent.bootstrapStatus, "ready");
    assert.equal(confirmedUiCreated.agent.registrationSource, "manual");
    assert.equal(confirmedUiCreated.agent.registrationStatus, "confirmed");
    assert.ok(confirmedUiCreated.agent.confirmedByAgentAt);
    assert.ok(confirmedUiCreated.agent.registrationHistory.length >= 2);

    const duplicateUiCreated = await postJson(`${baseUrl}/api/register`, {
      id: "ui-created-copy",
      name: "ui-created-copy",
      agentType: "codex",
      transport: "tmux",
      sessionId: uiSession,
      sessionFingerprint: uiSession,
      projectRoot: tempDir,
    });
    assert.equal(duplicateUiCreated.agent.id, "ui-created");
    assert.ok(duplicateUiCreated.agent.registrationWarnings[0].includes("matched existing session fingerprint"));
    assert.equal(duplicateUiCreated.state.agents.filter((agent) => agent.sessionFingerprint === uiSession).length, 1);

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

    const mcpBlocked = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-mcp-missing",
      agentType: "claude",
      projectRoot: tempDir,
      sessionId: `mina-http-mcp-${process.pid}`,
      startupCommand: "/bin/sh",
      registerDelayMs: 250,
    });
    assert.equal(mcpBlocked.registration, "waiting for MCP setup");
    assert.equal(mcpBlocked.agent.bootstrapStatus, "mcp-configuring");
    assert.equal(mcpBlocked.agent.mcpPreflightStatus, "missing");
    assert.match(mcpBlocked.nextAction, /claude mcp add --transport http mina-ai-router/);
    const mcpBlockedState = await json(`${baseUrl}/api/state`);
    const mcpBlockedStatus = mcpBlockedState.agents.find((agent) => agent.id === "ui-mcp-missing");
    assert.equal(mcpBlockedStatus.status, "needs-attention");
    assert.match(mcpBlockedStatus.detail, /MCP setup/);
    const mcpBlockedHealth = await json(`${baseUrl}/api/health`);
    assert.equal(mcpBlockedHealth.agents.available, 0, "MCP-blocked tmux agent must not be counted as available");
    assert.ok(mcpBlockedHealth.agents.needsAttention >= 1, "MCP-blocked tmux agent should need attention");
    const mcpBlockedAsk = await expectPostJsonFailure(`${baseUrl}/api/ask`, {
      target: "ui-mcp-missing",
      task: "This should not route before MCP setup.",
      timeoutMs: 250,
    });
    assert.equal(mcpBlockedAsk.status, 409);
    assert.match(mcpBlockedAsk.body.error, /not ready to receive routed work/);
    assert.equal(
      mcpBlockedAsk.body.state.requests.some((request) => request.targetAgent === "ui-mcp-missing"),
      false,
      "readiness rejection must not create a routed request",
    );

    const promptScriptPath = join(tempDir, "permission-prompt-fixture.sh");
    writeFileSync(promptScriptPath, [
      "printf 'Do you trust the contents of this directory?\\nPress enter to continue\\n'",
      "sleep 60",
      "",
    ].join("\n"));
    const permissionBlocked = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-permission",
      agentType: "codex",
      projectRoot: tempDir,
      sessionId: promptSession,
      startupCommand: `/bin/sh ${promptScriptPath}`,
      registerDelayMs: 250,
      mcpConfigured: true,
    });
    assert.equal(permissionBlocked.registration, "waiting for permission approval");
    assert.equal(permissionBlocked.agent.bootstrapStatus, "permission-required");
    assert.match(permissionBlocked.nextAction, /tmux attach/);

    const blockedState = await json(`${baseUrl}/api/state`);
    const blockedAgent = blockedState.agents.find((agent) => agent.id === "ui-permission");
    assert.equal(blockedAgent.status, "needs-attention");
    assert.equal(blockedAgent.bootstrapStatus, "permission-required");
    assert.equal(blockedAgent.permissionPrompt.client, "codex");
    assert.match(blockedAgent.detail, /directory trust approval/);

    const updatePromptScriptPath = join(tempDir, "codex-update-prompt-fixture.sh");
    writeFileSync(updatePromptScriptPath, [
      "printf 'Update available! 0.142.3 -> 0.142.4\\n'",
      "printf '1. Update now (runs `npm install -g @openai/codex`)\\n'",
      "printf '2. Skip\\n'",
      "printf '3. Skip until next version\\n'",
      "printf 'Press enter to continue\\n'",
      "sleep 60",
      "",
    ].join("\n"));
    const updatePromptAgent = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-codex-update",
      agentType: "codex",
      projectRoot: tempDir,
      sessionId: `mina-http-update-${process.pid}`,
      startupCommand: `/bin/sh ${updatePromptScriptPath}`,
      registerDelayMs: 250,
      mcpConfigured: true,
      sendRegistrationPrompt: false,
    });
    assert.equal(updatePromptAgent.agent.bootstrapStatus, "created");
    assert.equal(updatePromptAgent.agent.permissionPrompt, undefined);
    const updateTerminal = await json(`${baseUrl}/api/agents/ui-codex-update/terminal`);
    assert.equal(updateTerminal.terminal.trustPrompt, false);
    assert.equal(updateTerminal.terminal.permissionPrompt, undefined);
    assert.match(updateTerminal.terminal.text, /Update available/);

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
    assert.equal(registered.agent.bootstrapStatus, "ready");
    assert.equal(registered.agent.registrationSource, "manual");
    assert.equal(registered.agent.registrationStatus, "confirmed");
    assert.ok(registered.agent.lastRegistrationAttemptAt);
    assert.ok(registered.agent.confirmedByAgentAt);
    assert.ok(registered.agent.capabilityUpdatedAt);
    assert.ok(registered.agent.lastCapabilityRefreshAt);

    const registeredState = await json(`${baseUrl}/api/state`);
    const registeredAgent = registeredState.agents.find((agent) => agent.id === "http-smoke");
    assert.ok(registeredAgent, "expected registered agent in HTTP UI state");
    assert.equal(registeredAgent.capabilitySource, "generated");
    assert.equal(registeredAgent.bootstrapStatus, "ready");
    assert.equal(registeredAgent.registrationStatus, "confirmed");
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
    assert.equal(answeredRequest.promptEvidence.kind, "prompt_envelope");
    assert.equal(answeredRequest.leaseStatus, "released");
    assert.ok(answeredRequest.leaseStartedAt);
    assert.ok(answeredRequest.leaseExpiresAt);
    assert.ok(answeredRequest.leaseReleasedAt);
    assert.equal(answeredRequest.leaseOwnerAgentId, "http-smoke");
    assert.equal(answeredRequest.leaseTargetSessionId, "http-smoke");
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

    const timeoutAgent = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "http-timeout",
      agentType: "codex",
      projectRoot: tempDir,
      sessionId: timeoutSession,
      startupCommand: "/bin/sh",
      sendRegistrationPrompt: false,
      mcpConfigured: true,
    });
    assert.equal(timeoutAgent.agent.id, "http-timeout");
    const confirmedTimeoutAgent = await postJson(`${baseUrl}/api/register`, {
      id: "http-timeout",
      name: "http-timeout",
      agentType: "codex",
      transport: "tmux",
      sessionId: timeoutSession,
      projectRoot: tempDir,
      capabilitySummary: "Timeout smoke helper.",
      capabilitySources: "scripts/smoke-http.js",
    });
    assert.equal(confirmedTimeoutAgent.agent.registrationStatus, "confirmed");
    const timedOutAsk = await expectPostJsonFailure(`${baseUrl}/api/ask`, {
      target: "http-timeout",
      task: "HTTP timeout lease request",
      timeoutMs: 20,
    });
    assert.equal(timedOutAsk.status, 500);
    const timeoutRequest = timedOutAsk.body.state.requests.find((request) => request.targetAgent === "http-timeout");
    assert.equal(timeoutRequest.status, "timeout");
    assert.equal(timeoutRequest.diagnosticStatus, "timeout");
    assert.equal(timeoutRequest.leaseStatus, "orphaned");
    assert.ok(timeoutRequest.leaseStartedAt);
    assert.ok(timeoutRequest.leaseExpiresAt);
    assert.equal(timeoutRequest.leaseReleasedAt, undefined);
    assert.equal(timeoutRequest.leaseOwnerAgentId, "http-timeout");
    assert.equal(timeoutRequest.leaseTargetSessionId, timeoutSession);
    assert.equal(timeoutRequest.promptEvidence.kind, "prompt_envelope");
    assert.equal(timeoutRequest.rawEvidence.kind, "transport_capture");
    const timeoutAgentState = timedOutAsk.body.state.agents.find((agent) => agent.id === "http-timeout");
    assert.equal(timeoutAgentState.activeRequestId, timeoutRequest.id);
    assert.equal(timeoutAgentState.leaseStatus, "orphaned");
    assert.equal(timeoutAgentState.status, "busy");
    assert.match(timeoutAgentState.detail, /timed out/);

    const interrupted = await postJson(`${baseUrl}/api/requests/${timeoutRequest.id}/interrupt`, {});
    assert.equal(interrupted.result.leaseStatus, "orphaned");
    assert.equal(interrupted.result.recoveryStatus, "interrupted");
    assert.equal(interrupted.result.recoveryEvents.at(-1).action, "interrupt");
    assert.equal(interrupted.result.recoveryEvents.at(-1).terminalTarget, timeoutSession);
    const interruptedAgent = interrupted.state.agents.find((agent) => agent.id === "http-timeout");
    assert.equal(interruptedAgent.activeRequestId, timeoutRequest.id);
    assert.equal(interruptedAgent.leaseStatus, "orphaned");

    const recovered = await postJson(`${baseUrl}/api/requests/${timeoutRequest.id}/recover`, {});
    assert.equal(recovered.result.leaseStatus, "released");
    assert.equal(recovered.result.recoveryStatus, "recovered");
    assert.ok(recovered.result.leaseReleasedAt);
    assert.equal(recovered.result.recoveryEvents.at(-1).action, "recover");
    const recoveredAgent = recovered.state.agents.find((agent) => agent.id === "http-timeout");
    assert.equal(recoveredAgent.activeRequestId, undefined);
    assert.equal(recoveredAgent.leaseStatus, "released");

    await postJson(`${baseUrl}/api/register`, {
      id: "http-timeout",
      name: "http-timeout",
      agentType: "codex",
      transport: "headless",
      sessionId: timeoutSession,
      projectRoot: tempDir,
      capabilitySummary: "Recovered timeout helper.",
      capabilitySources: "smoke fixture",
      sessionFingerprint: timeoutSession,
    });
    const afterRecover = await postJson(`${baseUrl}/api/ask`, {
      target: "http-timeout",
      task: "HTTP request after recovery",
      timeoutMs: 1000,
    });
    assert.equal(afterRecover.result.target, "http-timeout");
    const afterRecoverRequest = findRequest(afterRecover.state, afterRecover.result.requestId);
    assert.equal(afterRecoverRequest.status, "answered");
    assert.equal(afterRecoverRequest.leaseStatus, "released");

    await postJson(`${baseUrl}/api/register`, {
      id: "http-timeout",
      name: "http-timeout",
      agentType: "codex",
      transport: "tmux",
      sessionId: timeoutSession,
      projectRoot: tempDir,
      capabilitySummary: "Timeout archive helper.",
      capabilitySources: "smoke fixture",
      sessionFingerprint: timeoutSession,
    });
    const archiveTimedOutAsk = await expectPostJsonFailure(`${baseUrl}/api/ask`, {
      target: "http-timeout",
      task: "HTTP timeout archive request",
      timeoutMs: 20,
    });
    assert.equal(archiveTimedOutAsk.status, 500);
    const archiveTimeoutRequest = archiveTimedOutAsk.body.state.requests.find((request) =>
      request.targetAgent === "http-timeout" && request.task === "HTTP timeout archive request"
    );
    assert.equal(archiveTimeoutRequest.leaseStatus, "orphaned");
    const archivedTimeout = await postJson(`${baseUrl}/api/requests/${archiveTimeoutRequest.id}/archive`, {});
    assert.equal(archivedTimeout.result.status, "archived");
    assert.equal(archivedTimeout.result.leaseStatus, "released");
    assert.equal(archivedTimeout.result.recoveryStatus, "recovered");
    assert.equal(archivedTimeout.result.recoveryEvents.at(-1).action, "archive");
    const archivedTimeoutAgent = archivedTimeout.state.agents.find((agent) => agent.id === "http-timeout");
    assert.equal(archivedTimeoutAgent.activeRequestId, undefined);
    assert.equal(archivedTimeoutAgent.leaseStatus, "released");

    await postJson(`${baseUrl}/api/register`, {
      id: "http-timeout",
      name: "http-timeout",
      agentType: "codex",
      transport: "headless",
      sessionId: timeoutSession,
      projectRoot: tempDir,
      capabilitySummary: "Archive recovered timeout helper.",
      capabilitySources: "smoke fixture",
      sessionFingerprint: timeoutSession,
    });
    const afterArchive = await postJson(`${baseUrl}/api/ask`, {
      target: "http-timeout",
      task: "HTTP request after orphan archive",
      timeoutMs: 1000,
    });
    assert.equal(findRequest(afterArchive.state, afterArchive.result.requestId).status, "answered");

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
    assert.equal(initialized.result.serverInfo.version, packageVersion);

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
    try {
      execFileSync("tmux", ["kill-session", "-t", promptSession], {
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch {
      // Temporary permission fixture session may not exist.
    }
    try {
      execFileSync("tmux", ["kill-session", "-t", timeoutSession], {
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch {
      // Temporary timeout fixture session may not exist.
    }
    try {
      execFileSync("tmux", ["kill-session", "-t", `mina-http-mcp-${process.pid}`], {
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch {
      // Temporary MCP preflight fixture session may not exist.
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
  assert.match(script, /data-capability-quality/);
  assert.match(script, /capability-card/);
  assert.match(script, /Capability quality/);
  assert.match(script, /Can answer/);
  assert.match(script, /Evidence/);
  assert.match(script, /No answerable domains recorded/);
  assert.match(script, /Missing/);
  assert.match(script, /Stale/);
  assert.match(script, /Fresh/);
  assert.match(script, /Manual/);
  assert.match(script, /Edit Capabilities/);
  assert.match(script, /Copy Refresh Command/);
  assert.match(script, /mair agent refresh-capabilities/);
  assert.match(script, /data-health-status/);
  assert.match(script, /needs-attention/);
  assert.match(script, /Last seen/);
  assert.match(script, /needs attention/);
  assert.doesNotMatch(script, /Port 3333/);
  assert.match(script, /Terminal Unavailable/);
  assert.match(script, /direct terminal control is unavailable/);
  assert.match(script, /ask-agent-task/);

  assert.match(stylesheet, /capability-fresh/);
  assert.match(stylesheet, /capability-profile/);
  assert.match(stylesheet, /profile-tags/);
  assert.match(stylesheet, /quality-strong/);
  assert.match(stylesheet, /quality-thin/);
  assert.match(stylesheet, /capability-stale/);
  assert.match(stylesheet, /capability-manual/);
  assert.match(stylesheet, /capability-missing/);
  assert.match(stylesheet, /health-grid/);
  assert.match(stylesheet, /needs-attention/);
  assert.match(stylesheet, /floating-inspector/);
  assert.match(stylesheet, /max-height:min\(34rem,100vh - 1\.5rem\)/);
  assert.match(stylesheet, /width:100vw/);
  assert.match(stylesheet, /max-height:72vh/);
  assert.match(stylesheet, /activity-body/);
  assert.match(stylesheet, /overflow:auto/);
  assertStaticVisualFixture(stylesheet);
}

function assertFirstUserUiReviewAffordancesFromSource() {
  const commandBar = readFileSync("apps/http-server/ui/src/features/CommandBar.tsx", "utf8");
  assert.doesNotMatch(commandBar, /Port 3333/, "CommandBar must not hard-code the default port");
  assert.match(commandBar, /portLabelFromMcpUrl/, "CommandBar should derive the displayed port from the MCP URL");
  assert.match(commandBar, /new URL\(mcpUrl\)/, "CommandBar port derivation should parse the authoritative MCP URL");

  const inspector = readFileSync("apps/http-server/ui/src/features/Inspector.tsx", "utf8");
  assert.match(inspector, /hasTmuxTerminal/, "Inspector should branch terminal controls by transport");
  assert.match(inspector, /direct terminal control is unavailable/, "Inspector should explain unavailable non-tmux terminal control");
  assert.match(inspector, /hasTmuxTerminal \?/, "Inspector should render Open Terminal only for tmux agents");
  assert.match(inspector, /isRouteReady/, "Inspector Ask action should use route readiness");
  assert.match(inspector, /disabled=\{!routeReady\}/, "Inspector Ask action should be disabled for non-ready agents");
  assert.match(inspector, /routeBlockedReason/, "Inspector should show route blocker guidance");

  const menus = readFileSync("apps/http-server/ui/src/features/Menus.tsx", "utf8");
  assert.match(menus, /Terminal Unavailable/, "Agent context menu should label non-tmux terminal action as unavailable");
  assert.match(menus, /isRouteReady/, "Agent context menu Ask action should use route readiness");
  assert.match(menus, /disabled=\{!routeReady\}/, "Agent context menu Ask action should be disabled for non-ready agents");

  const askForm = readFileSync("apps/http-server/ui/src/features/AskAgentForm.tsx", "utf8");
  assert.match(askForm, /htmlFor=\{taskInputId\}/, "Ask form Task label should be explicitly associated");
  assert.match(askForm, /id=\{taskInputId\}/, "Ask form textarea should expose an explicit id");

  const detailsForm = readFileSync("apps/http-server/ui/src/features/AgentDetailsForm.tsx", "utf8");
  assert.match(detailsForm, /htmlFor=\{capabilitySummaryId\}/, "Capability summary label should be explicitly associated");
  assert.match(detailsForm, /id=\{capabilitySummaryId\}/, "Capability summary textarea should expose an explicit id");
  assert.match(detailsForm, /htmlFor=\{capabilitySourcesId\}/, "Capability sources label should be explicitly associated");
  assert.match(detailsForm, /id=\{capabilitySourcesId\}/, "Capability sources input should expose an explicit id");

  const createForm = readFileSync("apps/http-server/ui/src/features/CreateTmuxAgentForm.tsx", "utf8");
  assert.match(createForm, /onCreated\(result\.agent, result\.state\)/, "Create form should return the API state with the created agent");

  const app = readFileSync("apps/http-server/ui/src/App.tsx", "utf8");
  assert.match(app, /onCreated=\{\(agent, nextState\)/, "App should receive create-agent state in the callback");
  assert.match(app, /setState\(nextState\)/, "App should apply create-agent state immediately without relying on manual refresh");
  assert.match(app, /!isRouteReady\(agent\)/, "App should guard stale Ask modals with route readiness");
  assert.doesNotMatch(app, /onCreated=\{\(agent\) => \{\s*setSelectedAgentId\(agent\.id\);\s*void refresh\(\);/s);
}

function assertStaticVisualFixture(stylesheet) {
  const desktopWidth = 1280;
  const mobileWidth = 390;
  const desktopInspectorWidth = Math.min(24 * 16, desktopWidth - 2 * 16);
  const mobileInspectorWidth = mobileWidth;
  assert.ok(desktopInspectorWidth <= desktopWidth, "desktop inspector should fit within viewport");
  assert.ok(mobileInspectorWidth <= mobileWidth, "mobile inspector should fit within viewport");
  assert.match(stylesheet, /flex-wrap:wrap/);
  assert.match(stylesheet, /flex:(1 1 )?10rem/);
  assert.match(stylesheet, /overflow-wrap:anywhere/);
  assert.match(stylesheet, /min-width:48rem/);
  assert.match(stylesheet, /activity-body\{[^}]*overflow:auto/);

  const visualFixturePath = join(tempDir, "capability-freshness-visual-fixture.html");
  writeFileSync(visualFixturePath, buildStaticVisualFixture(stylesheet), "utf8");
  const fixture = readFileSync(visualFixturePath, "utf8");
  assert.match(fixture, /data-viewport="desktop"/);
  assert.match(fixture, /data-viewport="mobile"/);
  assert.match(fixture, /data-capability-state="missing"/);
  assert.match(fixture, /data-capability-state="stale"/);
  assert.match(fixture, /data-capability-state="fresh"/);
  assert.match(fixture, /data-capability-state="manual"/);
  assert.match(fixture, /data-capability-quality="strong"/);
  assert.match(fixture, /profile-tag/);
  assert.match(fixture, /Copy Refresh Command/);
  assert.match(fixture, /Edit Capabilities/);
  assert.match(fixture, /activity-table/);
  console.log(`visual fixture: ${visualFixturePath}`);
  assertRenderedVisualFixture(stylesheet);
}

function buildStaticVisualFixture(stylesheet) {
  const cards = [
    ["missing", "Missing", "missing", "unknown source", "No capability notice registered yet.", "No sources recorded."],
    ["stale", "Stale", "thin", "agent-generated", "Stale generated capability notice.", "AGENTS.md"],
    ["fresh", "Fresh", "strong", "agent-generated", "Fresh generated capability notice.", "README.md"],
    ["manual", "Manual", "strong", "manual edit", "Operator-curated capability notice.", "operator notes"],
  ].map(([state, label, quality, source, summary, sources]) => `
    <div class="capability-card capability-${state}" data-capability-state="${state}" data-capability-source="${source}" data-capability-quality="${quality}">
      <div class="capability-card-head">
        <span class="status capability-status ${state}">${label}</span>
        <span class="status capability-status quality-${quality}">${quality}</span>
        <span class="subtitle">${source}</span>
      </div>
      <p>${summary}</p>
      <p class="subtitle">${sources}</p>
      <div class="capability-profile">
        <div class="profile-row"><span class="subtitle">Quality</span><span>Profile quality is visible.</span></div>
        <div class="profile-row"><span class="subtitle">Can answer</span><div class="profile-tags"><span class="profile-tag">routing workflow</span><span class="profile-tag">request diagnostics</span></div></div>
        <div class="profile-row"><span class="subtitle">Evidence</span><div class="profile-tags"><span class="profile-tag">${sources}</span></div></div>
      </div>
      <div class="capability-meta">
        <span>Updated ${state === "missing" ? "never" : "2026-06-29 00:00"}</span>
        <span>${state === "manual" ? "This capability card was edited by an operator and is not agent-generated." : "Generated capability metadata state is visible."}</span>
      </div>
      <div class="capability-actions">
        <button class="secondary"><span class="material-symbols-outlined">bolt</span>Edit Capabilities</button>
        <button class="ghost"><span class="material-symbols-outlined">refresh</span>Copy Refresh Command</button>
      </div>
    </div>`).join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>${stylesheet}</style>
<style>
  body { overflow: auto; padding: 1rem; }
  .visual-frame { border: 1px solid var(--outline-soft); margin: 0 0 1rem; overflow: hidden; position: relative; }
  .visual-frame.desktop { width: 1280px; height: 720px; }
  .visual-frame.mobile { width: 390px; height: 844px; }
  .visual-frame .floating-inspector { position: absolute; }
  .visual-frame .floating-activity { position: absolute; height: 12rem; }
</style>
</head>
<body>
  <main class="visual-frame desktop" data-viewport="desktop">
    <aside class="inspector floating-inspector" aria-label="Selected agent inspector">
      <div class="inspector-head"><div><h2>Agent Details</h2><p class="subtitle">ui-stale</p></div><button class="ghost">Hide</button></div>
      <div class="inspector-body">${cards}</div>
    </aside>
    <section class="activity floating-activity">
      <div class="activity-head"><div><h2>System Activity</h2><p class="subtitle">Recent routed requests from the local state store.</p></div></div>
      <div class="activity-body"><table class="activity-table"><tbody><tr><td>request-id-that-is-long-enough-to-force-table-scroll</td><td>answered</td></tr></tbody></table></div>
    </section>
  </main>
  <main class="visual-frame mobile" data-viewport="mobile">
    <aside class="inspector floating-inspector" aria-label="Selected agent inspector">
      <div class="inspector-head"><div><h2>Agent Details</h2><p class="subtitle">ui-manual</p></div><button class="ghost">Hide</button></div>
      <div class="inspector-body">${cards}</div>
    </aside>
    <section class="activity floating-activity">
      <div class="activity-head"><div><h2>System Activity</h2><p class="subtitle">Recent routed requests from the local state store.</p></div></div>
      <div class="activity-body"><table class="activity-table"><tbody><tr><td>mobile-request-id-that-is-long-enough-to-force-table-scroll</td><td>waiting</td></tr></tbody></table></div>
    </section>
  </main>
</body>
</html>`;
}

function assertRenderedVisualFixture(stylesheet) {
  const chromePath = findChromePath();
  if (!chromePath) {
    console.log("visual render skipped: no local Chrome/Chromium binary found");
    return;
  }

  const viewports = [
    { name: "desktop", width: 1280, height: 720 },
    { name: "mobile", width: 390, height: 844 },
  ];

  for (const viewport of viewports) {
    const pagePath = join(tempDir, `capability-freshness-${viewport.name}.html`);
    const screenshotPath = join(tempDir, `capability-freshness-${viewport.name}.png`);
    writeFileSync(pagePath, buildRenderedVisualPage(stylesheet, viewport.name), "utf8");
    const rendered = renderWithChrome(chromePath, pagePath, screenshotPath, viewport);
    if (!rendered) {
      continue;
    }
    const measurement = extractVisualMeasurement(rendered, viewport.name);
    assert.equal(measurement.viewport.width, viewport.width);
    assert.equal(measurement.viewport.height, viewport.height);
    assert.ok(
      measurement.document.scrollWidth <= measurement.viewport.width + 1,
      `${viewport.name} page should not horizontally overflow`,
    );
    for (const panel of measurement.panels) {
      assert.ok(panel.present, `${viewport.name} ${panel.name} should render`);
      assert.ok(panel.withinViewportX, `${viewport.name} ${panel.name} should fit horizontally in viewport`);
      assert.ok(panel.clientWidth > 0, `${viewport.name} ${panel.name} should have width`);
      assert.ok(panel.clientHeight > 0, `${viewport.name} ${panel.name} should have height`);
      assert.ok(panel.scrollWidth <= panel.clientWidth + 1, `${viewport.name} ${panel.name} should contain horizontal overflow`);
    }
    const activityBody = measurement.containers.find((container) => container.name === "activity-body");
    assert.ok(activityBody.present, `${viewport.name} activity body should render`);
    assert.ok(activityBody.scrollWidth >= activityBody.clientWidth, `${viewport.name} activity body should contain table width`);
    assert.equal(measurement.capabilityStates.sort().join(","), "fresh,manual,missing,stale");
    console.log(`visual render ${viewport.name}: ${screenshotPath}`);
  }
}

function findChromePath() {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

function renderWithChrome(chromePath, pagePath, screenshotPath, viewport) {
  try {
    return execFileSync(chromePath, [
      "--headless=new",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${join(tempDir, `chrome-${viewport.name}`)}`,
      `--window-size=${viewport.width},${viewport.height}`,
      "--hide-scrollbars",
      "--virtual-time-budget=1000",
      `--screenshot=${screenshotPath}`,
      "--dump-dom",
      pathToFileURL(pagePath).href,
    ], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10000,
    });
  } catch (error) {
    const reason = error.signal ? `signal ${error.signal}` : `exit ${error.status}`;
    console.log(`visual render skipped: Chrome could not run in this environment (${reason})`);
    return "";
  }
}

function extractVisualMeasurement(rendered, viewportName) {
  const match = rendered.match(/<pre id="visual-measurement">([^<]+)<\/pre>/);
  assert.ok(match, `${viewportName} visual measurement should be present in rendered DOM`);
  return JSON.parse(match[1].replace(/&quot;/g, "\"").replace(/&amp;/g, "&"));
}

function buildRenderedVisualPage(stylesheet, viewportName) {
  const cards = [
    ["missing", "Missing", "missing", "unknown source", "No capability notice registered yet.", "No sources recorded."],
    ["stale", "Stale", "thin", "agent-generated", "Stale generated capability notice.", "AGENTS.md"],
    ["fresh", "Fresh", "strong", "agent-generated", "Fresh generated capability notice.", "README.md"],
    ["manual", "Manual", "strong", "manual edit", "Operator-curated capability notice.", "operator notes"],
  ].map(([state, label, quality, source, summary, sources]) => `
    <div class="capability-card capability-${state}" data-capability-state="${state}" data-capability-source="${source}" data-capability-quality="${quality}">
      <div class="capability-card-head">
        <span class="status capability-status ${state}">${label}</span>
        <span class="status capability-status quality-${quality}">${quality}</span>
        <span class="subtitle">${source}</span>
      </div>
      <p>${summary}</p>
      <p class="subtitle">${sources}</p>
      <div class="capability-profile">
        <div class="profile-row"><span class="subtitle">Quality</span><span>Profile quality is visible.</span></div>
        <div class="profile-row"><span class="subtitle">Can answer</span><div class="profile-tags"><span class="profile-tag">routing workflow</span><span class="profile-tag">request diagnostics</span></div></div>
        <div class="profile-row"><span class="subtitle">Evidence</span><div class="profile-tags"><span class="profile-tag">${sources}</span></div></div>
      </div>
      <div class="capability-meta">
        <span>Updated ${state === "missing" ? "never" : "2026-06-29 00:00"}</span>
        <span>${state === "manual" ? "This capability card was edited by an operator and is not agent-generated." : "Generated capability metadata state is visible."}</span>
      </div>
      <div class="capability-actions">
        <button class="secondary"><span class="material-symbols-outlined">bolt</span>Edit Capabilities</button>
        <button class="ghost"><span class="material-symbols-outlined">refresh</span>Copy Refresh Command</button>
      </div>
    </div>`).join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>${stylesheet}</style>
<style>
  html, body, #root { width: 100%; min-height: 100%; margin: 0; }
  body { overflow-x: hidden; }
  .visual-app { min-height: 100vh; position: relative; background: var(--surface-low); }
  .visual-app .floating-activity { height: 12rem; }
</style>
</head>
<body data-viewport="${viewportName}">
  <main class="visual-app">
    <aside class="inspector floating-inspector" aria-label="Selected agent inspector">
      <div class="inspector-head"><div><h2>Agent Details</h2><p class="subtitle">ui-${viewportName}</p></div><button class="ghost">Hide</button></div>
      <div class="inspector-body">
        <div class="section"><div class="section-title">Capabilities</div>${cards}</div>
      </div>
    </aside>
    <section class="activity floating-activity">
      <div class="activity-head"><div><h2>System Activity</h2><p class="subtitle">Recent routed requests from the local state store.</p></div></div>
      <div class="activity-body"><table class="activity-table"><tbody><tr><td>${viewportName}-request-id-that-is-long-enough-to-force-contained-table-scroll</td><td>answered</td></tr></tbody></table></div>
    </section>
  </main>
  <pre id="visual-measurement"></pre>
  <script>
    const panelFor = (name, selector) => {
      const element = document.querySelector(selector);
      if (!element) return { name, present: false };
      const rect = element.getBoundingClientRect();
      return {
        name,
        present: true,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        clientWidth: element.clientWidth,
        clientHeight: element.clientHeight,
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight,
        withinViewportX: rect.left >= -1 && rect.right <= window.innerWidth + 1,
      };
    };
    const measurement = {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      },
      panels: [
        panelFor("inspector", ".floating-inspector"),
        panelFor("activity", ".floating-activity"),
      ],
      containers: [
        panelFor("inspector-body", ".inspector-body"),
        panelFor("activity-body", ".activity-body"),
      ],
      capabilityStates: Array.from(document.querySelectorAll("[data-capability-state]")).map((element) => element.getAttribute("data-capability-state")),
    };
    document.getElementById("visual-measurement").textContent = JSON.stringify(measurement);
  </script>
</body>
</html>`;
}

async function json(url) {
  const response = await getWithRetry(url);
  if (!response.ok) throw new Error(`${url} failed: ${response.status}`);
  return response.json();
}

async function text(url) {
  const response = await getWithRetry(url);
  if (!response.ok) throw new Error(`${url} failed: ${response.status}`);
  return response.text();
}

async function getWithRetry(url) {
  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await fetch(url);
    } catch (error) {
      lastError = error;
      const code = error?.cause?.code ?? error?.code;
      if (!["ECONNRESET", "ECONNREFUSED", "EPIPE"].includes(code)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
  throw lastError;
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
