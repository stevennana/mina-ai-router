const assert = require("node:assert/strict");
const { execFileSync, spawn } = require("node:child_process");
const { chmodSync, existsSync, mkdtempSync, readFileSync, unlinkSync, writeFileSync } = require("node:fs");
const { createServer } = require("node:net");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const repoRoot = join(__dirname, "..");
const packageVersion = require(join(repoRoot, "package.json")).version;
const distCli = join(repoRoot, "dist", "apps", "cli", "src", "index.js");
const tempDir = mkdtempSync(join(tmpdir(), "mina-cli-controls-"));
const statePath = join(tempDir, "router-state.json");
const pidPath = join(tempDir, "mair-server.json");
const session = `mina-cli-controls-${process.pid}`;
const oobCodexSession = `${session}-oob-codex`;
const oobClaudeSession = `${session}-oob-claude`;
const liveSession = `${session}-live`;
const refreshSession = `${session}-refresh`;
let port = 0;
let occupiedPort = 0;
let fakeServerPort = 0;
const spawnedChildren = [];
const env = {
  ...process.env,
  MINA_ROUTER_STATE: statePath,
  MINA_SERVER_PID: pidPath,
  MINA_AGENT_STALE_AFTER_MS: "60000",
};

async function main() {
  port = await getFreePort();
  occupiedPort = await getFreePort();
  fakeServerPort = await getFreePort();
  cleanup();
  writeRefreshResponder();

  try {
    const version = JSON.parse(runNode(["version"]));
    assert.equal(version.version, packageVersion);

    const doctorHelp = runNode(["doctor", "--help"]);
    assert.match(doctorHelp, /Usage: mair doctor/);
    assert.doesNotMatch(doctorHelp, /"checks"/);
    const serverStartHelp = runNode(["server", "start", "--help", "--port", String(port)]);
    assert.match(serverStartHelp, /Usage: mair server/);
    assert.equal(existsSync(pidPath), false, "server start --help must not create a pid file");
    const statusAfterHelp = JSON.parse(runNode(["server", "status"]));
    assert.equal(statusAfterHelp.running, false, "server start --help must not start the server");
    assert.match(runNode(["setup", "codex", "--help"]), /Usage: mair setup/);
    assert.match(runNode(["codex", "--help"]), /Usage: mair codex/);
    assert.match(runNode(["request", "--help"]), /Usage: mair request/);

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

    const occupied = await startPlainHttpServer(occupiedPort, "occupied");
    spawnedChildren.push(occupied);
    const occupiedFailure = expectNodeFailure(["server", "start", "--port", String(occupiedPort)]);
    assert.match(occupiedFailure, /Mina HTTP server failed to become ready|EADDRINUSE|address already in use/);
    assert.doesNotMatch(occupiedFailure, /"running": true/);
    const statusAfterOccupiedFailure = JSON.parse(runNode(["server", "status"]));
    assert.equal(statusAfterOccupiedFailure.running, false);
    stopChild(occupied);

    const fakeServer = await startPlainHttpServer(fakeServerPort, "not mina");
    spawnedChildren.push(fakeServer);
    writeFileSync(pidPath, `${JSON.stringify({
      pid: fakeServer.pid,
      port: String(fakeServerPort),
      host: "127.0.0.1",
      statePath,
      mcpUrl: `http://127.0.0.1:${fakeServerPort}/mcp`,
      uiUrl: `http://127.0.0.1:${fakeServerPort}/`,
      startedAt: new Date().toISOString(),
    }, null, 2)}\n`);
    for (const args of [
      ["health"],
      ["agents"],
      ["register", "fake", "--agent", "shell", "--transport", "headless", "--session", "fake", "--root", tempDir],
    ]) {
      const failure = expectNodeFailure(args);
      assert.match(failure, /pid file points at http:\/\/127\.0\.0\.1:/);
      assert.match(failure, /not Mina JSON|stale pid file|restart mair server/);
      assert.doesNotMatch(failure, /Unexpected token/);
    }
    stopChild(fakeServer);
    try {
      unlinkSync(pidPath);
    } catch {
      // test pid file may already be gone
    }
    clearHealthFixtures();

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

    const healthWithRunningServer = JSON.parse(runNode(["health"]));
    assert.equal(healthWithRunningServer.mcp.httpUrl, `http://127.0.0.1:${port}/mcp`);

    const setupEnv = createFakeClientSetupEnv(`http://127.0.0.1:${port}/mcp`);
    const codexSetup = JSON.parse(runNode(["setup", "codex", "--project", tempDir, "--json"], setupEnv));
    assert.equal(codexSetup.ok, true);
    assert.equal(codexSetup.mcpUrl, `http://127.0.0.1:${port}/mcp`);
    assert.equal(codexSetup.skill.installed, true);
    assert.ok(existsSync(join(setupEnv.HOME, ".codex", "skills", "mina-ai-router-agent", "SKILL.md")));
    const claudeSetup = JSON.parse(runNode(["setup", "claude", "--project", tempDir, "--json"], setupEnv));
    assert.equal(claudeSetup.ok, true);
    assert.equal(claudeSetup.mcpUrl, `http://127.0.0.1:${port}/mcp`);
    assert.equal(claudeSetup.skill.installed, true);
    assert.ok(existsSync(join(tempDir, ".claude", "skills", "mina-ai-router-agent", "SKILL.md")));
    const mcpCallLog = readFileSync(setupEnv.MINA_FAKE_CLIENT_LOG, "utf8");
    assert.match(mcpCallLog, new RegExp(`codex mcp add mina-ai-router --url http://127\\.0\\.0\\.1:${port}/mcp`));
    assert.match(mcpCallLog, new RegExp(`claude mcp add --transport http mina-ai-router http://127\\.0\\.0\\.1:${port}/mcp`));
    const doctor = JSON.parse(runNode(["doctor", "--client", "all", "--project", tempDir, "--json"], setupEnv));
    assert.equal(doctor.ok, true);
    assert.equal(doctor.mcpUrl, `http://127.0.0.1:${port}/mcp`);
    assert.equal(doctor.clients.length, 2);
    assert.equal(doctor.clients.every((client) => client.ok), true);
    const oobCodex = JSON.parse(runNode([
      "codex",
      "--id",
      "oob-codex",
      "--session",
      oobCodexSession,
      "--root",
      tempDir,
      "--command",
      "/bin/sh",
      "--no-attach",
      "--register-delay-ms",
      "0",
    ], setupEnv));
    assert.equal(oobCodex.registration, "registration prompt sent to agent");
    assert.equal(oobCodex.agent.bootstrapStatus, "registration-pending");
    assert.equal(oobCodex.agent.mcpPreflightStatus, "configured");
    assert.equal(oobCodex.mcpPreflight.status, "configured");
    const oobClaude = JSON.parse(runNode([
      "claude",
      "--id",
      "oob-claude",
      "--session",
      oobClaudeSession,
      "--root",
      tempDir,
      "--command",
      "/bin/sh",
      "--no-attach",
      "--register-delay-ms",
      "0",
    ], setupEnv));
    assert.equal(oobClaude.registration, "registration prompt sent to agent");
    assert.equal(oobClaude.agent.bootstrapStatus, "registration-pending");
    assert.equal(oobClaude.agent.mcpPreflightStatus, "configured");
    assert.equal(oobClaude.mcpPreflight.status, "configured");
    await postJson(`${baseUrl}/api/register`, {
      id: "blocked-codex",
      name: "blocked-codex",
      agentType: "codex",
      transport: "tmux",
      sessionId: "blocked-codex",
      projectRoot: tempDir,
      bootstrapStatus: "mcp-configuring",
      registrationStatus: "pending",
      mcpPreflightStatus: "missing",
      mcpPreflightDetail: "fixture missing MCP setup",
    });
    const blockedDoctorFailure = expectNodeFailure(["doctor", "--client", "all", "--project", tempDir, "--json"], setupEnv);
    const blockedDoctor = JSON.parse(blockedDoctorFailure.slice(
      blockedDoctorFailure.indexOf("{"),
      blockedDoctorFailure.lastIndexOf("}") + 1,
    ));
    assert.equal(blockedDoctor.ok, false);
    assert.ok(blockedDoctor.checks.some((check) => check.name === "route-ready agents" && check.ok === false));
    assert.ok(blockedDoctor.blockedAgents.some((agent) => agent.id === "blocked-codex" && /mair setup codex --project/.test(agent.repairAction)));
    const ignoredBlockedDoctor = JSON.parse(runNode(["doctor", "--client", "all", "--project", tempDir, "--ignore-blocked-agents", "--json"], setupEnv));
    assert.equal(ignoredBlockedDoctor.ok, true);
    const pairFailure = expectNodeFailure(["setup-codex-pair"], setupEnv);
    assert.match(pairFailure, /developer\/demo helper/);
    assert.match(pairFailure, /--main-root/);

    const cliProxiedRegister = JSON.parse(runNode([
      "register",
      "cli-proxy-alpha",
      "--agent",
      "shell",
      "--transport",
      "headless",
      "--session",
      "cli-proxy-alpha",
      "--root",
      tempDir,
      "--summary",
      "CLI proxy alpha helper.",
      "--sources",
      "fresh operator smoke",
    ]));
    assert.equal(cliProxiedRegister.agent.id, "cli-proxy-alpha");
    const stateAfterCliRegister = await json(`${baseUrl}/api/state`);
    assert.ok(
      stateAfterCliRegister.agents.some((agent) => agent.id === "cli-proxy-alpha"),
      "expected CLI register to proxy into running HTTP server state",
    );

    await postJson(`${baseUrl}/api/register`, {
      id: "http-proxy-beta",
      name: "http-proxy-beta",
      agentType: "shell",
      transport: "headless",
      sessionId: "http-proxy-beta",
      projectRoot: tempDir,
      capabilitySummary: "HTTP beta helper.",
      capabilitySources: "fresh operator smoke",
    });
    const persistedAfterMixedRegister = JSON.parse(readFileSync(statePath, "utf8"));
    assert.ok(
      persistedAfterMixedRegister.agents.some((agent) => agent.id === "cli-proxy-alpha"),
      "expected later HTTP register to preserve CLI proxied agent",
    );
    assert.ok(
      persistedAfterMixedRegister.agents.some((agent) => agent.id === "http-proxy-beta"),
      "expected HTTP register to persist alongside CLI proxied agent",
    );

    const cliProxiedAsk = JSON.parse(runNode(["ask", "cli-proxy-alpha", "fresh operator proxy question", "--timeout-ms", "1000"]));
    assert.equal(cliProxiedAsk.target, "cli-proxy-alpha");
    const stateAfterCliAsk = await json(`${baseUrl}/api/state`);
    assert.ok(
      stateAfterCliAsk.requests.some((request) => request.id === cliProxiedAsk.requestId && request.status === "answered"),
      "expected CLI ask to proxy into running HTTP server state",
    );

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
      "--mcp-configured-url",
      "http://127.0.0.1:1/mcp",
      "--no-attach",
      "--no-register",
    ]));
    assert.equal(visible.agent.sessionId, session);
    assert.equal(visible.agent.projectRoot, tempDir);
    assert.equal(visible.agent.permissionProfile, "direct-workspace-read");
    assert.equal(visible.agent.permissionProfileStatus, "unsupported");
    assert.match(visible.agent.permissionProfileDetail, /No known codex startup flag/);
    assert.equal(visible.permissionProfile.permissionProfileStatus, "unsupported");
    assert.equal(visible.agent.mcpPreflightStatus, "stale");
    assert.equal(visible.agent.mcpUrl, `http://127.0.0.1:${port}/mcp`);
    assert.equal(visible.agent.bootstrapStatus, "mcp-configuring");
    assert.equal(visible.agent.registrationSource, "cli");
    assert.equal(visible.agent.registrationStatus, "pending");
    assert.equal(visible.agent.sessionFingerprint, session);
    assert.ok(visible.agent.lastRegistrationAttemptAt);
    assert.equal(visible.mcpPreflight.status, "stale");
    assert.match(visible.mcpPreflight.mcpSetupCommand, /codex mcp add mina-ai-router --url/);
    assert.equal(visible.mcpPreflight.mcpUrl, `http://127.0.0.1:${port}/mcp`);
    assert.match(visible.mcpPreflight.mcpSetupCommand, new RegExp(`127\\.0\\.0\\.1:${port}/mcp`));
    assert.doesNotMatch(visible.mcpPreflight.mcpSetupCommand, /127\.0\.0\.1:3333\/mcp/);
    assert.equal(visible.registration, "registration prompt skipped");
    run("tmux", ["has-session", "-t", session]);
    const persistedVisibleAgents = JSON.parse(runNode(["agents"]));
    const persistedVisible = persistedVisibleAgents.agents.find((agent) => agent.id === visible.agent.id);
    assert.ok(persistedVisible, "expected CLI-created visible agent to be persisted");
    assert.equal(persistedVisible.status, "needs-attention");
    assert.equal(persistedVisible.bootstrapStatus, "mcp-configuring");
    assert.equal(persistedVisible.registrationSource, "cli");
    assert.equal(persistedVisible.registrationStatus, "pending");
    const persistedVisibleDetail = JSON.parse(runNode(["agent", visible.agent.id]));
    assert.equal(persistedVisibleDetail.agent.status, "needs-attention");
    assert.equal(persistedVisibleDetail.status.status, "needs-attention");
    assert.equal(persistedVisibleDetail.agent.bootstrapStatus, "mcp-configuring");
    assert.equal(persistedVisibleDetail.agent.mcpPreflightStatus, "stale");
    const stateAfterVisible = await json(`${baseUrl}/api/state`);
    const visibleInServer = stateAfterVisible.agents.find((agent) => agent.id === visible.agent.id);
    assert.ok(visibleInServer, "expected CLI visible agent placeholder to proxy into running HTTP server state");
    assert.equal(visibleInServer.bootstrapStatus, "mcp-configuring");
    assert.equal(visibleInServer.status, "needs-attention");
    const healthAfterVisible = JSON.parse(runNode(["health"]));
    assert.ok(healthAfterVisible.agents.needsAttention >= 1, "MCP-blocked CLI visible agent should need attention");

    const serverRefresh = JSON.parse(runNode(["agent", "refresh-capabilities", "cli-proxy-alpha", "--timeout-ms", "5000"]));
    assert.equal(serverRefresh.agent.id, "cli-proxy-alpha");
    assert.equal(serverRefresh.agent.capabilitySummary, "Headless capability refresh for cli-proxy-alpha.");
    const stateAfterServerRefresh = await json(`${baseUrl}/api/state`);
    const refreshedInServer = stateAfterServerRefresh.agents.find((agent) => agent.id === "cli-proxy-alpha");
    assert.equal(refreshedInServer.capabilitySummary, "Headless capability refresh for cli-proxy-alpha.");
    assert.equal(refreshedInServer.capabilitySource, "generated");

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
    assert.equal(unarchived.diagnosticStatus, "answered");
    assert.equal(unarchived.error, undefined);

    const invalidCancel = expectNodeFailure(["request", asked.result.requestId, "cancel"]);
    assert.match(invalidCancel, /Cannot cancel request/);

    const retried = JSON.parse(runNode(["request", asked.result.requestId, "retry"]));
    assert.equal(retried.target, "cli-helper");
    assert.notEqual(retried.requestId, asked.result.requestId);

    const originalAfterRetry = JSON.parse(runNode(["request", asked.result.requestId]));
    const retryRequest = JSON.parse(runNode(["request", retried.requestId]));
    assert.equal(originalAfterRetry.retriedByRequestId, retried.requestId);
    assert.equal(originalAfterRetry.error, undefined);
    assert.equal(retryRequest.retryOfRequestId, asked.result.requestId);
    assert.equal(retryRequest.status, "answered");

    run("tmux", ["new-session", "-d", "-s", liveSession, "-x", "200", "-y", "60", "-c", tempDir, "sleep 60"]);
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
    const healthWhileBusy = await json(`${baseUrl}/api/health`);
    assert.equal(healthWhileBusy.agents.busy, 1, "expected server health to report busy agent");
    const cliHealthWhileBusy = JSON.parse(runNode(["health"]));
    assert.equal(cliHealthWhileBusy.agents.busy, 1, "expected CLI health to proxy live busy state");
    assert.equal(cliHealthWhileBusy.mcp.httpUrl, `http://127.0.0.1:${port}/mcp`);
    const stateWhileBusy = await json(`${baseUrl}/api/state`);
    const busyInServerState = stateWhileBusy.agents.find((candidate) => candidate.id === "cli-live");
    assert.equal(busyInServerState.status, "busy", "expected /api/state to report busy agent");
    const cliAgentsWhileBusy = JSON.parse(runNode(["agents"]));
    const busyInCliAgents = cliAgentsWhileBusy.agents.find((candidate) => candidate.id === "cli-live");
    assert.equal(busyInCliAgents.status, "busy", "expected mair agents to proxy live busy state");
    const cliAgentDetailWhileBusy = JSON.parse(runNode(["agent", "cli-live"]));
    assert.equal(cliAgentDetailWhileBusy.status.status, "busy", "expected mair agent detail to proxy live busy state");
    assert.equal(cliAgentDetailWhileBusy.agent.status, "busy", "expected mair agent detail payload to include live status");
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

function runNode(args, commandEnv = env) {
  return run(process.execPath, [distCli, ...args], commandEnv);
}

function expectNodeFailure(args, commandEnv = env) {
  try {
    runNode(args, commandEnv);
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
  for (const child of spawnedChildren.splice(0)) {
    stopChild(child);
  }

  try {
    execFileSync("tmux", ["kill-session", "-t", session], {
      stdio: ["ignore", "ignore", "ignore"],
    });
  } catch {
    // The session may not exist.
  }

  try {
    execFileSync("tmux", ["kill-session", "-t", oobCodexSession], {
      stdio: ["ignore", "ignore", "ignore"],
    });
  } catch {
    // The session may not exist.
  }

  try {
    execFileSync("tmux", ["kill-session", "-t", oobClaudeSession], {
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

async function startPlainHttpServer(serverPort, bodyText) {
  let stderr = "";
  const child = spawn(process.execPath, [
    "-e",
    [
      "const http = require('node:http');",
      "const port = Number(process.argv[1]);",
      "const body = process.argv[2];",
      "const server = http.createServer((request, response) => {",
      "  response.writeHead(200, { 'content-type': 'text/plain' });",
      "  response.end(body);",
      "});",
      "server.on('error', (error) => {",
      "  console.error(error && error.stack ? error.stack : String(error));",
      "  process.exit(1);",
      "});",
      "server.listen(port, '127.0.0.1');",
      "setInterval(() => {}, 1000);",
    ].join("\n"),
    String(serverPort),
    bodyText,
  ], {
    cwd: repoRoot,
    stdio: ["ignore", "ignore", "pipe"],
  });
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`plain HTTP server on ${serverPort} exited early: ${child.exitCode}${stderr ? `\n${stderr.trim()}` : ""}`);
    }
    if (/EADDRINUSE|listen EADDRINUSE/.test(stderr)) {
      stopChild(child);
      throw new Error(`plain HTTP server on ${serverPort} failed to listen: ${stderr.trim()}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${serverPort}/`);
      if (await response.text() === bodyText) {
        return child;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  stopChild(child);
  throw new Error(`Timed out waiting for plain HTTP server on ${serverPort}${stderr ? `\n${stderr.trim()}` : ""}`);
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Could not allocate a loopback port.")));
        return;
      }
      const freePort = address.port;
      server.close(() => resolve(freePort));
    });
  });
}

function stopChild(child) {
  if (!child || child.killed || child.exitCode !== null) {
    return;
  }

  try {
    child.kill("SIGTERM");
  } catch {
    // child may already be gone
  }
}

function createFakeClientSetupEnv(mcpUrl) {
  const binDir = join(tempDir, "fake-bin");
  const homeDir = join(tempDir, "home");
  const logPath = join(tempDir, "mcp-client-calls.log");
  const script = [
    "#!/bin/sh",
    "client=$(basename \"$0\")",
    "printf '%s %s\\n' \"$client\" \"$*\" >> \"$MINA_FAKE_CLIENT_LOG\"",
    "if [ \"$1\" = 'mcp' ] && [ \"$2\" = 'get' ]; then",
    "  printf 'name: %s\\nurl: %s\\n' \"$3\" \"$FAKE_MCP_URL\"",
    "  exit 0",
    "fi",
    "if [ \"$1\" = 'mcp' ] && { [ \"$2\" = 'add' ] || [ \"$2\" = 'remove' ]; }; then",
    "  printf 'ok %s %s\\n' \"$client\" \"$2\"",
    "  exit 0",
    "fi",
    "exit 0",
    "",
  ].join("\n");
  writeFileSync(logPath, "");
  writeFileSync(join(tempDir, "README.md"), "# Setup smoke project\n");
  run("mkdir", ["-p", binDir, homeDir]);
  for (const client of ["codex", "claude"]) {
    const file = join(binDir, client);
    writeFileSync(file, script);
    chmodSync(file, 0o755);
  }

  return {
    ...env,
    PATH: `${binDir}:${process.env.PATH}`,
    HOME: homeDir,
    FAKE_MCP_URL: mcpUrl,
    MINA_FAKE_CLIENT_LOG: logPath,
  };
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

function clearHealthFixtures() {
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  state.agents = state.agents.filter((agent) => !["cli-stale", "cli-missing", "cli-attention"].includes(agent.id));
  state.requests = state.requests.filter((request) => request.id !== "cli-attention-request");
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
