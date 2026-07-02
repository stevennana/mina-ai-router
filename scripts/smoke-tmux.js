const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { existsSync, mkdtempSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const repoRoot = join(__dirname, "..");
const distCli = join(repoRoot, "dist", "apps", "cli", "src", "index.js");
const session = `mina-router-smoke-${process.pid}`;
const tempDir = mkdtempSync(join(tmpdir(), "mina-router-"));
const statePath = join(tempDir, "router-state.json");
const responderPath = join(tempDir, "responder.sh");

const env = {
  ...process.env,
  MINA_ROUTER_STATE: statePath,
};

function main() {
  assert.ok(existsSync(distCli), "dist CLI does not exist; run npm run build first");

  writeFileSync(
    responderPath,
    [
      "rid=''",
      "mode='ask'",
      "while IFS= read -r line; do",
      "  case \"$line\" in",
      "    'Request ID: '*)",
      "      rid=${line#Request ID: }",
      "      ;;",
      "    *'capabilitySummary'*)",
      "      mode='refresh'",
      "      ;;",
      "    '<<<MINA_AGENT_RESPONSE_END '*)",
      "      if [ -n \"$rid\" ]; then",
      "      if [ \"$mode\" = 'refresh' ]; then",
      "      printf '<<<MINA_AGENT_RESPONSE_START %s>>>\\n{\"capabilitySummary\":\"Shell tmux smoke helper for router request diagnostics, capability refresh workflows, and terminal transport checks.\",\"capabilitySources\":\"AGENTS.md, package.json, scripts/smoke-tmux.js\",\"capabilityProfile\":{\"projectPurpose\":\"tmux smoke helper for Mina router CLI verification\",\"primaryLanguages\":[\"Shell\",\"JavaScript\"],\"keyAreas\":[\"tmux transport\",\"request diagnostics\"],\"canAnswer\":[\"How the tmux smoke responder returns marker wrapped answers\",\"How capability refresh stores structured profile evidence\"],\"cannotAnswerYet\":[\"Production deployment policy\"],\"evidence\":[\"scripts/smoke-tmux.js\",\"package.json\",\"AGENTS.md\"]}}\\n<<<MINA_AGENT_RESPONSE_END %s>>>\\n' \"$rid\" \"$rid\"",
      "      else",
      "      printf '<<<MINA_AGENT_RESPONSE_START %s>>>\\nhello from tmux smoke\\n<<<MINA_AGENT_RESPONSE_END %s>>>\\n' \"$rid\" \"$rid\"",
      "      fi",
      "      fi",
      "      ;;",
      "  esac",
      "done",
      "",
    ].join("\n"),
  );

  cleanup();
  try {
    try {
      run("tmux", ["new-session", "-d", "-s", session, "-x", "200", "-y", "60", "-c", tempDir, `/bin/sh ${responderPath}`]);
    } catch (error) {
      if (reportTmuxDenied(error)) return;
      throw error;
    }
    runNode(["register", "smoke", "--agent", "shell", "--transport", "tmux", "--session", session, "--root", tempDir]);
    const listed = JSON.parse(runNode(["agents"]));
    const smokeAgent = listed.agents.find((agent) => agent.id === "smoke");
    assert.ok(smokeAgent, "expected registered smoke agent in health list");
    assert.equal(smokeAgent.status, "available");
    assert.ok(smokeAgent.lastSeenAt);
    assert.ok(smokeAgent.healthCheckedAt);
    assert.equal(typeof smokeAgent.staleAfterMs, "number");

    const raw = runNode(["ask", "smoke", "return a marker response", "--timeout-ms", "5000"]);
    const parsed = JSON.parse(raw);

    assert.equal(parsed.target, "smoke");
    assert.equal(parsed.answer, "hello from tmux smoke");

    const requests = JSON.parse(runNode(["requests", "--target", "smoke"]));
    assert.equal(requests.requests.length, 1);
    assert.equal(requests.requests[0].status, "answered");

    const afterRequest = JSON.parse(runNode(["agents"])).agents.find((agent) => agent.id === "smoke");
    assert.equal(afterRequest.status, "available");
    assert.ok(afterRequest.lastActivityAt);

    const refreshed = JSON.parse(runNode(["agent", "refresh-capabilities", "smoke", "--timeout-ms", "5000"]));
    assert.equal(refreshed.agent.id, "smoke");
    assert.equal(refreshed.agent.capabilitySummary, "Shell tmux smoke helper for router request diagnostics, capability refresh workflows, and terminal transport checks.");
    assert.equal(refreshed.agent.capabilitySources, "AGENTS.md, package.json, scripts/smoke-tmux.js");
    assert.equal(refreshed.agent.capabilitySource, "generated");
    assert.equal(refreshed.agent.capabilityProfile.quality, "strong");
    assert.deepEqual(refreshed.agent.capabilityProfile.evidence, ["scripts/smoke-tmux.js", "package.json", "AGENTS.md"]);
    assert.ok(refreshed.agent.lastCapabilityRefreshAt);

    console.log("tmux smoke passed");
  } finally {
    cleanup();
  }
}

function runNode(args) {
  return run(process.execPath, [distCli, ...args], env);
}

function run(file, args, commandEnv = process.env) {
  return execFileSync(file, args, {
    cwd: repoRoot,
    env: commandEnv,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function reportTmuxDenied(error) {
  const details = `${error.stderr || ""}${error.message || ""}`;
  if (!/Operation not permitted/.test(details)) {
    return false;
  }

  console.log([
    "tmux smoke skipped: tmux socket denied by environment",
    details.trim(),
  ].join("\n"));
  return true;
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

main();
