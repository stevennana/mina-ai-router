const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { existsSync, mkdtempSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const repoRoot = join(__dirname, "..");
const distCli = join(repoRoot, "dist", "apps", "cli", "src", "index.js");
const tempDir = mkdtempSync(join(tmpdir(), "mina-cli-controls-"));
const statePath = join(tempDir, "router-state.json");
const pidPath = join(tempDir, "mair-server.json");
const session = `mina-cli-controls-${process.pid}`;
const liveSession = `${session}-live`;
const port = 3400 + (process.pid % 1000);
const env = {
  ...process.env,
  MINA_ROUTER_STATE: statePath,
  MINA_SERVER_PID: pidPath,
};

async function main() {
  cleanup();

  try {
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
      "--no-attach",
      "--no-register",
    ]));
    assert.equal(visible.agent.sessionId, session);
    assert.equal(visible.agent.projectRoot, tempDir);
    assert.equal(visible.registration, "registration prompt skipped");
    run("tmux", ["has-session", "-t", session]);

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
    runNode(["server", "stop"]);
  } catch {
    // The server may not be running.
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
