const assert = require("node:assert/strict");
const { execFileSync, spawn } = require("node:child_process");
const { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const repoRoot = join(__dirname, "..");
const packageVersion = require(join(repoRoot, "package.json")).version;
const tempDir = mkdtempSync(join(tmpdir(), "mina-installed-cli-"));
const packDir = join(tempDir, "pack");
const consumerWithVerify = join(tempDir, "consumer-with-verify");
const consumerWithoutVerify = join(tempDir, "consumer-without-verify");

async function main() {
  try {
    mkdirSync(packDir, { recursive: true });
    const packName = run("npm", ["pack", "--silent", "--pack-destination", packDir], repoRoot).trim().split(/\r?\n/).pop();
    assert.ok(packName, "npm pack did not return a tarball name");
    const packPath = join(packDir, packName);
    assert.ok(existsSync(packPath), `packed tarball missing: ${packPath}`);

    installConsumer(consumerWithVerify, {
      name: "consumer-app",
      version: "2.3.4",
      scripts: {
        verify: "node -e \"require('node:fs').writeFileSync('consumer-verify-ran.txt','ran')\"",
      },
    }, packPath);

    const mair = join(consumerWithVerify, "node_modules", ".bin", "mair");
    const mairMcp = join(consumerWithVerify, "node_modules", ".bin", "mair-mcp");
    const version = JSON.parse(run(mair, ["version"], consumerWithVerify));
    assert.equal(version.name, "@minasoft/mina-ai-router");
    assert.equal(version.version, packageVersion);

    const verify = JSON.parse(run(mair, ["verify"], consumerWithVerify));
    assert.equal(verify.ok, true);
    assert.equal(verify.command, "mair verify");
    assert.equal(verify.version, packageVersion);
    assert.equal(
      existsSync(join(consumerWithVerify, "consumer-verify-ran.txt")),
      false,
      "installed mair verify must not execute the consumer project's npm verify script",
    );

    const mcp = new McpClient(mairMcp, {
      ...process.env,
      MINA_ROUTER_STATE: join(tempDir, "mcp-state.json"),
    }, consumerWithVerify);
    try {
      const initialize = await mcp.request("initialize", {});
      assert.equal(initialize.serverInfo.name, "mina-ai-router");
      assert.equal(initialize.serverInfo.version, packageVersion);
    } finally {
      await mcp.close();
    }

    installConsumer(consumerWithoutVerify, {
      name: "consumer-without-verify",
      version: "9.9.9",
    }, packPath);
    const secondMair = join(consumerWithoutVerify, "node_modules", ".bin", "mair");
    const secondVerify = JSON.parse(run(secondMair, ["verify"], consumerWithoutVerify));
    assert.equal(secondVerify.ok, true);
    assert.equal(secondVerify.command, "mair verify");

    console.log("installed cli smoke passed");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function installConsumer(dir, packageJson, packPath) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
  run("npm", ["install", packPath, "--ignore-scripts", "--no-audit", "--no-fund"], dir);
}

function run(file, args, cwd) {
  return execFileSync(file, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

class McpClient {
  constructor(script, childEnv, cwd) {
    this.nextId = 1;
    this.buffer = Buffer.alloc(0);
    this.pending = new Map();
    this.child = spawn(script, [], {
      cwd,
      env: childEnv,
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.child.stdout.on("data", (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.readFrames();
    });
    this.child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
    });
    this.child.on("exit", (code) => {
      for (const { reject } of this.pending.values()) {
        reject(new Error(`MCP server exited with code ${code}`));
      }
      this.pending.clear();
    });
  }

  request(method, params) {
    const id = this.nextId++;
    const body = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    this.child.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.delete(id)) {
          reject(new Error(`Timed out waiting for MCP response to ${method}`));
        }
      }, 10_000);
      this.pending.set(id, { resolve, reject, timer });
    });
  }

  readFrames() {
    while (true) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) return;

      const header = this.buffer.slice(0, headerEnd).toString("utf8");
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) throw new Error("Missing Content-Length");
      const contentLength = Number(match[1]);
      const frameStart = headerEnd + 4;
      const frameEnd = frameStart + contentLength;
      if (this.buffer.length < frameEnd) return;

      const payload = JSON.parse(this.buffer.slice(frameStart, frameEnd).toString("utf8"));
      this.buffer = this.buffer.slice(frameEnd);
      const pending = this.pending.get(payload.id);
      if (!pending) continue;
      this.pending.delete(payload.id);
      clearTimeout(pending.timer);
      if (payload.error) pending.reject(new Error(payload.error.message));
      else pending.resolve(payload.result);
    }
  }

  close() {
    this.child.stdin.end();
    this.child.stdout.destroy();
    this.child.stderr.destroy();
    this.child.kill("SIGKILL");
    this.child.unref();
    return Promise.resolve();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
