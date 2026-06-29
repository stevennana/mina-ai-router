const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { existsSync, mkdtempSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const repoRoot = join(__dirname, "..");
const packageVersion = require(join(repoRoot, "package.json")).version;
const distCli = join(repoRoot, "dist", "apps", "cli", "src", "index.js");
const tempDir = mkdtempSync(join(tmpdir(), "mina-cli-controls-"));
const statePath = join(tempDir, "router-state.json");
const pidPath = join(tempDir, "mair-server.json");
const session = `mina-cli-controls-${process.pid}`;
const liveSession = `${session}-live`;
const refreshSession = `${session}-refresh`;
const port = 3400 + (process.pid % 1000);
const env = {
  ...process.env,
  MINA_ROUTER_STATE: statePath,
  MINA_SERVER_PID: pidPath,
  MINA_AGENT_STALE_AFTER_MS: "1",
};

async function main() {
  cleanup();
  writeRefreshResponder();

  try {
    const version = JSON.parse(runNode(["version"]));
    assert.equal(version.version, packageVersion);

    const registeredCliRefresh = JSON.parse(runNode([
      "register",
      "cli-refresh",
      "--agent",
      "shell",
      "--transport",
      "headless",
      "--session",
      "cli-refresh",
      "--root",
      tempDir,
      "--summary",
      "Manual capability summary.",
      "--sources",
      "manual operator note",
    ]));
    assert.equal(registeredCliRefresh.agent.registrationSource, "cli");
    assert.equal(registeredCliRefresh.agent.registrationStatus, "confirmed");
    assert.equal(registeredCliRefresh.agent.sessionFingerprint, "cli-refresh");
    assert.ok(registeredCliRefresh.agent.registrationHistory.length >= 1);
    const refreshed = JSON.parse(runNode(["agent", "refresh-capabilities", "cli-refresh", "--timeout-ms", "5000"]));
    assert.equal(refreshed.agent.id, "cli-refresh");
    assert.equal(refreshed.agent.capabilitySummary, "Headless capability refresh for cli-refresh.");
    assert.equal(refreshed.agent.capabilitySources, "headless transport prompt");
    assert.equal(refreshed.agent.capabilitySource, "generated");
    assert.ok(refreshed.agent.lastCapabilityRefreshAt);
    seedHealthFixtures();
    const health = JSON.parse(runNode(["health"]));
    assert.equal(health.ok, false);
    assert.ok(health.agents.stale >= 1, "expected stale health count");
    assert.ok(health.agents.missing >= 1, "expected missing health count");
    assert.ok(health.agents.needsAttention >= 1, "expected needs-attention health count");

    const agents = JSON.parse(runNode(["agents"]));
    const byId = Object.fromEntries(agents.agents.map((agent) => [agent.id, agent]));
    assert.equal(byId["cli-stale"].status, "stale");
    assert.equal(byId["cli-missing"].status, "missing");
    assert.equal(byId["cli-attention"].status, "needs-attention");
    assert.ok(byId["cli-stale"].healthCheckedAt);
    const staleDetail = JSON.parse(runNode(["agent", "cli-stale"]));
    assert.equal(staleDetail.status.status, "stale");

    const started = JSON.parse(runNode(["server", "start", "--port", String(port)]));
    if (!started.running) {
      if (reportListenerDenied(started)) return;
      assert.equal(started.running, true, serverFailureMessage(started));
    }
    assert.equal(started.running, true);
    assert.equal(started.port, String(port));

    const status = JSON.parse(runNode(["server", "status"]));
    if (!status.running) {
      if (reportListenerDenied(status)) return;
      assert.equal(status.running, true, serverFailureMessage(status));
    }
    assert.equal(status.running, true);
    assert.equal(status.mcpUrl, `http://127.0.0.1:${port}/mcp`);

    const baseUrl = `http://127.0.0.1:${port}`;
    await waitForServer(baseUrl);

    const visible = JSON.parse(runNode([
      "codex",
      "--session",
      session,
      "--root",
      tempDir,
      "--command",
      "/bin/sh",
      "--permission-profile",
      "direct-workspace-read",
      "--no-attach",
      "--no-register",
    ]));
    assert.equal(visible.agent.sessionId, session);
    assert.equal(visible.agent.projectRoot, tempDir);
    assert.equal(visible.agent.permissionProfile, "direct-workspace-read");
    assert.equal(visible.agent.permissionProfileStatus, "unsupported");
    assert.match(visible.agent.permissionProfileDetail, /No known codex startup flag/);
    assert.equal(visible.permissionProfile.permissionProfileStatus, "unsupported");
    assert.equal(visible.agent.mcpPreflightStatus, "missing");
    assert.equal(visible.agent.bootstrapStatus, "mcp-configuring");
    assert.equal(visible.agent.registrationSource, "cli");
    assert.equal(visible.agent.registrationStatus, "pending");
    assert.equal(visible.agent.sessionFingerprint, session);
    assert.ok(visible.agent.lastRegistrationAttemptAt);
    assert.equal(visible.mcpPreflight.status, "missing");
    assert.match(visible.mcpPreflight.mcpSetupCommand, /codex mcp add mina-ai-router --url/);
    assert.equal(visible.registration, "registration prompt skipped");
    run("tmux", ["has-session", "-t", session]);
    const persistedVisibleAgents = JSON.parse(runNode(["agents"]));
    const persistedVisible = persistedVisibleAgents.agents.find((agent) => agent.id === visible.agent.id);
    assert.ok(persistedVisible, "expected CLI-created visible agent to be persisted");
    assert.equal(persistedVisible.bootstrapStatus, "mcp-configuring");
    assert.equal(persistedVisible.registrationSource, "cli");
    assert.equal(persistedVisible.registrationStatus, "pending");
    const persistedVisibleDetail = JSON.parse(runNode(["agent", visible.agent.id]));
    assert.equal(persistedVisibleDetail.agent.bootstrapStatus, "mcp-configuring");
    assert.equal(persistedVisibleDetail.agent.mcpPreflightStatus, "missing");

    const registered = await postJson(`${baseUrl}/api/register`, {
      id: "cli-helper",
      name: "cli-helper",
      agentType: "shell",
      transport: "headless",
      sessionId: "cli-helper",
      projectRoot: tempDir,
    });
    assert.equal(registered.agent.id, "cli-helper");

    const asked = await postJson(`${baseUrl}/api/ask`, {
      target: "cli-helper",
      task: "CLI recovery request",
    });
    assert.equal(asked.result.target, "cli-helper");

    const request = JSON.parse(runNode(["request", asked.result.requestId]));
    assert.equal(request.status, "answered");
    assert.equal(request.task, "CLI recovery request");

    const archived = JSON.parse(runNode(["request", asked.result.requestId, "archive"]));
    assert.equal(archived.status, "archived");
    assert.equal(archived.archivedFromStatus, "answered");

    const unarchived = JSON.parse(runNode(["request", asked.result.requestId, "unarchive"]));
    assert.equal(unarchived.status, "answered");

    const invalidCancel = expectNodeFailure(["request", asked.result.requestId, "cancel"]);
    assert.match(invalidCancel, /Cannot cancel request/);

    const retried = JSON.parse(runNode(["request", asked.result.requestId, "retry"]));
    assert.equal(retried.target, "cli-helper");
    assert.notEqual(retried.requestId, asked.result.requestId);

    const originalAfterRetry = JSON.parse(runNode(["request", asked.result.requestId]));
    const retryRequest = JSON.parse(runNode(["request", retried.requestId]));
    assert.equal(originalAfterRetry.retriedByRequestId, retried.requestId);
    assert.equal(retryRequest.retryOfRequestId, asked.result.requestId);
    assert.equal(retryRequest.status, "answered");

    await postJson(`${baseUrl}/api/register`, {
      id: "cli-live",
      name: "cli-live",
      agentType: "shell",
      transport: "tmux",
      sessionId: liveSession,
      projectRoot: tempDir,
      startupCommand: "sleep 60",
    });
    const pendingAsk = postJson(`${baseUrl}/api/ask`, {
      target: "cli-live",
      task: "CLI cancels an in-flight server request",
      timeoutMs: 5_000,
    }).catch((error) => error);
    const liveRequest = await waitForOpenRequest(baseUrl, "cli-live");
    const cancelled = JSON.parse(runNode(["request", liveRequest.id, "cancel"]));
    assert.equal(cancelled.status, "cancelled");
    assert.equal(cancelled.diagnosticStatus, "cancelled");
    const afterCancel = await pendingAsk;
    assert.ok(afterCancel instanceof Error, "expected cancelled in-flight HTTP ask to fail");
    const stateAfterCancel = await json(`${baseUrl}/api/state`);
    const cancelledInServer = stateAfterCancel.requests.find((candidate) => candidate.id === liveRequest.id);
    assert.equal(cancelledInServer.status, "cancelled");

    const stopped = JSON.parse(runNode(["server", "stop"]));
    assert.equal(stopped.running, false);

    console.log("cli controls smoke passed");
  } finally {
    cleanup();
  }
}

function runNode(args) {
  return run(process.execPath, [distCli, ...args], env);
}

function expectNodeFailure(args) {
  try {
    runNode(args);
  } catch (error) {
    return `${error.stderr || ""}${error.stdout || ""}${error.message || ""}`;
  }

  throw new Error(`Expected command to fail: ${args.join(" ")}`);
}

function run(file, args, commandEnv = process.env) {
  return execFileSync(file, args, {
    cwd: repoRoot,
    env: commandEnv,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function reportListenerDenied(status) {
  const details = readServerLog(status);
  if (!/listen EPERM/.test(details)) {
    return false;
  }

  console.log([
    "cli controls smoke skipped: local HTTP listener denied by environment",
    `pidPath: ${status.pidPath}`,
    `logPath: ${status.logPath}`,
    details.trim(),
  ].join("\n"));
  return true;
}

function serverFailureMessage(status) {
  const details = readServerLog(status).trim();
  return [
    "Expected CLI controls HTTP server to be running.",
    `pidPath: ${status.pidPath}`,
    `logPath: ${status.logPath}`,
    details ? `server log:\n${details}` : "server log: <empty or unavailable>",
  ].join("\n");
}

function readServerLog(status) {
  if (!status.logPath || !existsSync(status.logPath)) {
    return "";
  }

  return readFileSync(status.logPath, "utf8");
}

async function waitForOpenRequest(baseUrl, targetAgent) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const state = await json(`${baseUrl}/api/state`);
    const request = state.requests.find((candidate) =>
      candidate.targetAgent === targetAgent && ["created", "sent", "waiting"].includes(candidate.status)
    );
    if (request) {
      return request;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const state = await json(`${baseUrl}/api/state`);
  const requestSummary = state.requests
    .filter((candidate) => candidate.targetAgent === targetAgent)
    .map((candidate) => `${candidate.id}:${candidate.status}`)
    .join(", ") || "none";

  throw new Error(`Timed out waiting for open request for ${targetAgent}. Requests seen for target: ${requestSummary}`);
}

async function waitForServer(baseUrl) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      await json(`${baseUrl}/api/health`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error("Timed out waiting for CLI controls HTTP server");
}

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} failed: ${response.status}`);
  return response.json();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${url} failed: ${response.status} ${text}`);
  }
  return response.json();
}

function cleanup() {
  try {
    execFileSync("tmux", ["kill-session", "-t", session], {
      stdio: ["ignore", "ignore", "ignore"],
    });
  } catch {
    // The session may not exist.
  }

  try {
    execFileSync("tmux", ["kill-session", "-t", liveSession], {
      stdio: ["ignore", "ignore", "ignore"],
    });
  } catch {
    // The session may not exist.
  }

  try {
    execFileSync("tmux", ["kill-session", "-t", refreshSession], {
      stdio: ["ignore", "ignore", "ignore"],
    });
  } catch {
    // The session may not exist.
  }

  try {
    runNode(["server", "stop"]);
  } catch {
    // The server may not be running.
  }
}

function writeRefreshResponder() {
  writeFileSync(
    join(tempDir, "refresh-responder.sh"),
    [
      "rid=''",
      "while IFS= read -r line; do",
      "  case \"$line\" in",
      "    'Request ID: '*)",
      "      rid=${line#Request ID: }",
      "      ;;",
      "    '<<<MINA_AGENT_RESPONSE_END '*)",
      "      if [ -n \"$rid\" ]; then",
      "      printf '<<<MINA_AGENT_RESPONSE_START %s>>>\\n{\"capabilitySummary\":\"CLI controls refreshed capability.\",\"capabilitySources\":\"AGENTS.md, package.json\"}\\n<<<MINA_AGENT_RESPONSE_END %s>>>\\n' \"$rid\" \"$rid\"",
      "      fi",
      "      ;;",
      "  esac",
      "done",
      "",
    ].join("\n"),
  );
}

function seedHealthFixtures() {
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  state.agents.push(
    {
      id: "cli-stale",
      name: "cli-stale",
      agentType: "shell",
      transport: "headless",
      sessionId: "cli-stale",
      projectRoot: tempDir,
      lastSeenAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "cli-missing",
      name: "cli-missing",
      agentType: "shell",
      transport: "tmux",
      sessionId: `missing-${process.pid}`,
      projectRoot: tempDir,
    },
    {
      id: "cli-attention",
      name: "cli-attention",
      agentType: "shell",
      transport: "headless",
      sessionId: "cli-attention",
      projectRoot: tempDir,
    },
  );
  state.requests.push({
    id: "cli-attention-request",
    sourceAgent: "main",
    targetAgent: "cli-attention",
    task: "failed health fixture",
    status: "failed",
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    error: "fixture transport failure",
  });
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
