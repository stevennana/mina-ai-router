const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const repoRoot = join(__dirname, "..");
const distCli = join(repoRoot, "dist", "apps", "cli", "src", "index.js");
const tempDir = mkdtempSync(join(tmpdir(), "mina-router-multi-"));
const statePath = join(tempDir, "router-state.json");
const env = {
  ...process.env,
  MINA_ROUTER_STATE: statePath,
};

const agents = [
  { id: "payment", answer: "payment scoped answer" },
  { id: "delivery", answer: "delivery scoped answer" },
].map((agent) => ({
  ...agent,
  session: `mina-router-${agent.id}-${process.pid}`,
  responderPath: join(tempDir, `${agent.id}-responder.sh`),
}));

function main() {
  cleanup();

  try {
    for (const agent of agents) {
      writeResponder(agent.responderPath, agent.answer);
      run("tmux", ["new-session", "-d", "-s", agent.session, "-x", "200", "-y", "60", "-c", tempDir, `/bin/sh ${agent.responderPath}`]);
      runNode(["register", agent.id, "--agent", "shell", "--transport", "tmux", "--session", agent.session, "--root", tempDir]);
    }

    const list = JSON.parse(runNode(["agents"]));
    assert.deepEqual(
      list.agents.map((agent) => agent.id).sort(),
      ["delivery", "payment"],
    );
    assert.ok(list.agents.every((agent) => agent.status === "available"));

    for (const agent of agents) {
      const response = JSON.parse(runNode(["ask", agent.id, `question for ${agent.id}`, "--timeout-ms", "5000"]));
      assert.equal(response.target, agent.id);
      assert.equal(response.answer, agent.answer);
    }

    const paymentRequests = JSON.parse(runNode(["requests", "--target", "payment"]));
    const deliveryRequests = JSON.parse(runNode(["requests", "--target", "delivery"]));
    assert.equal(paymentRequests.requests.length, 1);
    assert.equal(deliveryRequests.requests.length, 1);
    assert.equal(paymentRequests.requests[0].targetAgent, "payment");
    assert.equal(deliveryRequests.requests[0].targetAgent, "delivery");

    const attach = JSON.parse(runNode(["attach", "payment"]));
    assert.match(attach.command, /tmux attach -t mina-router-payment-/);

    console.log("multi-agent smoke passed");
  } finally {
    cleanup();
  }
}

function writeResponder(path, answer) {
  writeFileSync(
    path,
    [
      "rid=''",
      "while IFS= read -r line; do",
      "  case \"$line\" in",
      "    'Request ID: '*)",
      "      rid=${line#Request ID: }",
      "      ;;",
      "    '<<<MINA_AGENT_RESPONSE_END '*)",
      "      if [ -n \"$rid\" ]; then",
      `      printf '<<<MINA_AGENT_RESPONSE_START %s>>>\\n${answer}\\n<<<MINA_AGENT_RESPONSE_END %s>>>\\n' "$rid" "$rid"`,
      "      fi",
      "      ;;",
      "  esac",
      "done",
      "",
    ].join("\n"),
  );
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
  for (const agent of agents) {
    try {
      execFileSync("tmux", ["kill-session", "-t", agent.session], {
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch {
      // The session may not exist.
    }
  }
}

main();
