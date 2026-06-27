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
      "while IFS= read -r line; do",
      "  case \"$line\" in",
      "    'Request ID: '*)",
      "      rid=${line#Request ID: }",
      "      printf '<<<MINA_AGENT_RESPONSE_START %s>>>\\nhello from tmux smoke\\n<<<MINA_AGENT_RESPONSE_END %s>>>\\n' \"$rid\" \"$rid\"",
      "      ;;",
      "  esac",
      "done",
      "",
    ].join("\n"),
  );

  cleanup();
  try {
    run("tmux", ["new-session", "-d", "-s", session, "-x", "200", "-y", "60", "-c", tempDir, `/bin/sh ${responderPath}`]);
    runNode(["register", "smoke", "--agent", "shell", "--transport", "tmux", "--session", session, "--root", tempDir]);
    const raw = runNode(["ask", "smoke", "return a marker response", "--timeout-ms", "5000"]);
    const parsed = JSON.parse(raw);

    assert.equal(parsed.target, "smoke");
    assert.equal(parsed.answer, "hello from tmux smoke");

    const requests = JSON.parse(runNode(["requests", "--target", "smoke"]));
    assert.equal(requests.requests.length, 1);
    assert.equal(requests.requests[0].status, "answered");

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
