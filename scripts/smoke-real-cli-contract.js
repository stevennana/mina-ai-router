const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { existsSync, mkdtempSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const projectRoot = mkdtempSync(join(tmpdir(), "mina-real-cli-contract-"));
const mcpName = process.env.MINA_REAL_CLI_MCP_NAME ?? "mina-ai-router";

writeFileSync(join(projectRoot, "README.md"), "# Mina real CLI contract smoke\n");

function main() {
  if (process.env.MINA_REAL_CLI_SMOKE !== "1") {
    console.log("real CLI contract smoke skipped: set MINA_REAL_CLI_SMOKE=1 to probe installed Codex/Claude clients");
    return;
  }

  const clients = ["codex", "claude"].filter(commandAvailable);
  if (clients.length === 0) {
    console.log("real CLI contract smoke skipped: neither codex nor claude is available on PATH");
    return;
  }

  for (const client of clients) {
    const output = run(client, ["mcp", "list"], projectRoot);
    assert.match(
      output,
      new RegExp(mcpName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `${client} mcp list should show ${mcpName}; run mair setup ${client} --project ${projectRoot}`,
    );
  }

  console.log(`real CLI contract smoke passed for: ${clients.join(", ")}`);
}

function commandAvailable(command) {
  try {
    execFileSync("sh", ["-lc", `command -v ${shellQuote(command)}`], {
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd: existsSync(cwd) ? cwd : process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

main();
