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
  "docs/product-specs/agent-bootstrap-reliability.md",
  "docs/product-specs/release-readiness-review-fixes.md",
  "docs/design-docs/agent-bootstrap-reliability.md",
  "docs/reviews/2026-06-29-collaboration-reliability-branch-review.md",
  "docs/exec-plans/active/index.md",
];

for (const file of markdownFiles) {
  assert.ok(fs.existsSync(path.join(repoRoot, file)), `${file} must exist`);
}

const read = (file) => fs.readFileSync(path.join(repoRoot, file), "utf8");

assert.match(read("README.md"), /visible collaboration mesh/);
assert.match(read("README.md"), /Mina AI Router overview/);
assert.match(read("README.md"), /Install From GitHub/);
assert.match(read("README.md"), /Inspect Reliability/);
assert.match(read("README.md"), /permission-required/);
assert.match(read("README.md"), /mcp-configuring/);
assert.match(read("README.md"), /accidental self-calls/);
assert.match(read("README.md"), /mark recovered/);
assert.match(read("README.md"), /needs-attention/);
assert.match(read("ROADMAP.md"), /Milestone 0\.2: Collaboration Reliability/);
assert.match(read("ROADMAP.md"), /implementation wave completed/);
assert.match(read("ROADMAP.md"), /0\.2\.5 Agent Bootstrap Reliability/);
assert.match(read("docs/USER-START-GUIDE.md"), /Ask One Agent to Use Another/);
assert.match(read("docs/USER-START-GUIDE.md"), /Inspect the Routed Request/);
assert.match(read("docs/USER-START-GUIDE.md"), /Use the GitHub checkout/);
assert.match(read("docs/USER-START-GUIDE.md"), /Watch the readiness state/);
assert.match(read("docs/USER-START-GUIDE.md"), /registration-pending/);
assert.match(read("docs/USER-START-GUIDE.md"), /If the Web UI already created the agent placeholder/);
assert.match(read("docs/USER-START-GUIDE.md"), /where `isSelf` is not true/);
assert.match(read("docs/USER-START-GUIDE.md"), /request lease state/);
assert.match(read("docs/USER-START-GUIDE.md"), /Interrupt Terminal/);
assert.match(read("docs/USER-START-GUIDE.md"), /Mark Recovered/);
assert.match(read("docs/USER-START-GUIDE.md"), /Refresh Capabilities/);
assert.match(read("docs/USER-START-GUIDE.md"), /Strong/);
assert.match(read("docs/USER-START-GUIDE.md"), /Thin/);
assert.match(read("docs/USER-START-GUIDE.md"), /Read Health States/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /Collaboration Prompt Example/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /Mina runs an MCP preflight/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /Claude Code can keep MCP configuration per profile/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /request detail should show lifecycle status, request lease state/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /keeps the lease as `orphaned`/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /`list_agents` returns `isSelf`/);
assert.match(read("docs/product-specs/agent-bootstrap-reliability.md"), /Pain Point Gap Map/);
assert.match(read("docs/product-specs/agent-bootstrap-reliability.md"), /Duplicate registration/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /Release Readiness Review Fixes/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /live in-memory lock/);
assert.match(read("docs/reviews/2026-06-29-collaboration-reliability-branch-review.md"), /Recovered Timeout Requests Leave AgentRouter Busy Lock Stuck/);
assert.match(read("docs/design-docs/agent-bootstrap-reliability.md"), /bootstrapStatus/);
assert.match(read("docs/design-docs/agent-bootstrap-reliability.md"), /caller identity/);
assert.match(read("docs/exec-plans/active/index.md"), /Current active task/);
assert.match(read("docs/exec-plans/active/index.md"), /router-recovery-lock-release/);
assert.match(read("docs/exec-plans/active/index.md"), /orphan-archive-semantics/);
assert.match(read("docs/exec-plans/active/index.md"), /cli-blocked-agent-placeholder/);
assert.match(read("docs/exec-plans/active/index.md"), /release-version-and-verify-contract/);

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
