const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();
const markdownFiles = [
  "README.md",
  "ROADMAP.md",
  "docs/GETTING-STARTED.md",
  "docs/USER-START-GUIDE.md",
  "docs/HTTP-UI-MCP.md",
  "docs/MCP-CLIENT-SETUP.md",
  "docs/exec-plans/active/index.md",
];

for (const file of markdownFiles) {
  assert.ok(fs.existsSync(path.join(repoRoot, file)), `${file} must exist`);
}

const read = (file) => fs.readFileSync(path.join(repoRoot, file), "utf8");

assert.match(read("README.md"), /visible collaboration mesh/);
assert.match(read("README.md"), /Mina AI Router overview/);
assert.match(read("README.md"), /Inspect Reliability/);
assert.match(read("README.md"), /needs-attention/);
assert.match(read("ROADMAP.md"), /Milestone 0\.2: Collaboration Reliability/);
assert.match(read("docs/USER-START-GUIDE.md"), /Ask One Agent to Use Another/);
assert.match(read("docs/USER-START-GUIDE.md"), /Inspect the Routed Request/);
assert.match(read("docs/USER-START-GUIDE.md"), /Refresh Capabilities/);
assert.match(read("docs/USER-START-GUIDE.md"), /Read Health States/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /Collaboration Prompt Example/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /request detail should show lifecycle status/);
assert.match(read("docs/exec-plans/active/index.md"), /request-protocol-diagnostics-foundation/);
assert.match(read("docs/exec-plans/active/index.md"), /collaboration-doc-walkthrough/);

for (const file of markdownFiles) {
  const content = read(file);
  for (const match of content.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)) {
    const link = match[1];
    if (/^https?:/.test(link)) continue;
    const resolved = path.resolve(path.dirname(path.join(repoRoot, file)), link);
    assert.ok(fs.existsSync(resolved), `${file} image link missing: ${link}`);
  }
}

console.log("docs smoke passed");
