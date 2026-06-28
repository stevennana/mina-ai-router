const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const repoRoot = join(__dirname, "..");
const distCli = join(repoRoot, "dist", "apps", "cli", "src", "index.js");
const tempDir = mkdtempSync(join(tmpdir(), "mina-cli-controls-"));
const statePath = join(tempDir, "router-state.json");
const pidPath = join(tempDir, "mair-server.json");
const session = `mina-cli-controls-${process.pid}`;
const port = 3400 + (process.pid % 1000);
const env = {
  ...process.env,
  MINA_ROUTER_STATE: statePath,
  MINA_SERVER_PID: pidPath,
};

function main() {
  cleanup();

  try {
    const started = JSON.parse(runNode(["server", "start", "--port", String(port)]));
    assert.equal(started.running, true);
    assert.equal(started.port, String(port));

    const status = JSON.parse(runNode(["server", "status"]));
    assert.equal(status.running, true);
    assert.equal(status.mcpUrl, `http://127.0.0.1:${port}/mcp`);

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

    const registered = JSON.parse(runNode([
      "register",
      "cli-helper",
      "--agent",
      "shell",
      "--transport",
      "headless",
      "--session",
      "cli-helper",
      "--root",
      tempDir,
    ]));
    assert.equal(registered.agent.id, "cli-helper");

    const asked = JSON.parse(runNode(["ask", "cli-helper", "CLI recovery request"]));
    assert.equal(asked.target, "cli-helper");

    const request = JSON.parse(runNode(["request", asked.requestId]));
    assert.equal(request.status, "answered");
    assert.equal(request.task, "CLI recovery request");

    const archived = JSON.parse(runNode(["request", asked.requestId, "archive"]));
    assert.equal(archived.status, "archived");
    assert.equal(archived.archivedFromStatus, "answered");

    const unarchived = JSON.parse(runNode(["request", asked.requestId, "unarchive"]));
    assert.equal(unarchived.status, "answered");

    const invalidCancel = expectNodeFailure(["request", asked.requestId, "cancel"]);
    assert.match(invalidCancel, /Cannot cancel request/);

    const retried = JSON.parse(runNode(["request", asked.requestId, "retry"]));
    assert.equal(retried.target, "cli-helper");
    assert.notEqual(retried.requestId, asked.requestId);

    const originalAfterRetry = JSON.parse(runNode(["request", asked.requestId]));
    const retryRequest = JSON.parse(runNode(["request", retried.requestId]));
    assert.equal(originalAfterRetry.retriedByRequestId, retried.requestId);
    assert.equal(retryRequest.retryOfRequestId, asked.requestId);
    assert.equal(retryRequest.status, "answered");

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

function cleanup() {
  try {
    execFileSync("tmux", ["kill-session", "-t", session], {
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

main();
