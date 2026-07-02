const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();
const reviewDir = path.join(repoRoot, "docs", "reviews");
const reviewFiles = fs.existsSync(reviewDir)
  ? fs
      .readdirSync(reviewDir)
      .filter((file) => file.endsWith(".md"))
      .sort()
      .map((file) => path.join("docs", "reviews", file))
  : [];

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
  "docs/exec-plans/active/index.md",
  "docs/exec-plans/completed/023-cli-server-proxy-register-ask.md",
  "docs/exec-plans/completed/024-cli-server-proxy-agent-start-refresh.md",
  "docs/exec-plans/completed/025-health-running-server-mcp-url.md",
  "docs/exec-plans/completed/026-fresh-operator-smoke-hardening.md",
  "docs/exec-plans/completed/027-cli-live-read-proxy-health-agents.md",
  "docs/exec-plans/completed/028-cli-live-read-offline-hardening.md",
  "docs/exec-plans/completed/029-server-start-readiness-and-bind-failure.md",
  "docs/exec-plans/completed/030-live-proxy-stale-pid-diagnostics.md",
  "docs/exec-plans/completed/031-startup-diagnostics-release-hardening.md",
  "docs/exec-plans/completed/032-doc-review-lifecycle-and-smoke-sync.md",
  "docs/exec-plans/completed/033-review-cleanup-safe-docs-gate.md",
  "docs/exec-plans/completed/034-first-user-ui-port-terminal-affordances.md",
  "docs/exec-plans/completed/035-visible-agent-mcp-and-unarchive-error-cleanup.md",
  "docs/exec-plans/completed/036-first-user-ui-accessibility-create-refresh.md",
  "docs/exec-plans/completed/037-codex-prompt-detection-precision.md",
  "docs/exec-plans/completed/038-mcp-blocked-agent-readiness.md",
  "docs/exec-plans/completed/039-route-readiness-enforcement.md",
  "docs/exec-plans/completed/040-health-docs-readiness-language.md",
  "docs/exec-plans/completed/041-first-run-doctor-command.md",
  "docs/exec-plans/completed/042-first-run-setup-codex-claude.md",
  "docs/exec-plans/completed/043-ui-setup-surface.md",
  "docs/exec-plans/completed/044-demo-helper-demotion.md",
  "docs/exec-plans/completed/045-doctor-blocked-agent-readiness.md",
  "docs/exec-plans/completed/046-choose-one-setup-docs-ui.md",
  "docs/exec-plans/completed/047-getting-started-oob-cleanup.md",
  "docs/exec-plans/completed/048-visible-agent-mcp-config-detection.md",
  "docs/exec-plans/completed/049-doctor-mcp-repair-action.md",
  "docs/exec-plans/completed/050-http-create-registration-pending.md",
  "docs/exec-plans/completed/051-cli-controls-dynamic-ports.md",
  "docs/exec-plans/completed/052-installed-cli-version-source.md",
  "docs/exec-plans/completed/053-installed-cli-verify-contract.md",
  "docs/exec-plans/completed/054-installed-verify-success-details.md",
  "docs/exec-plans/completed/055-installed-web-ui-asset-verify.md",
  "docs/exec-plans/completed/056-cli-subcommand-help-no-side-effects.md",
  "docs/exec-plans/completed/057-session-fingerprint-display-name-dedupe.md",
  "docs/exec-plans/completed/058-verify-docs-install-mode-clarity.md",
  "docs/exec-plans/completed/059-claude-session-mcp-visibility.md",
  "docs/exec-plans/completed/060-codex-update-prompt-bootstrap-blocker.md",
  "docs/exec-plans/completed/061-permission-state-advance-after-approval.md",
  "docs/exec-plans/completed/062-guided-bootstrap-approval-loop-design.md",
  "docs/exec-plans/completed/063-real-cli-contract-smoke.md",
  ...reviewFiles,
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
assert.match(read("README.md"), /owns the live router state/);
assert.match(read("README.md"), /CLI reads and writes route through the running server/);
assert.match(read("README.md"), /matching running server/);
assert.match(read("README.md"), /active server-routed requests as `busy`/);
assert.match(read("README.md"), /reports success only after the local Mina health endpoint is ready/);
assert.match(read("README.md"), /stale pid file points at a non-Mina process/);
assert.match(read("README.md"), /mair setup codex/);
assert.match(read("README.md"), /mair setup claude/);
assert.match(read("README.md"), /mair doctor --client all/);
assert.match(read("README.md"), /Codex users/);
assert.match(read("README.md"), /Claude users/);
assert.match(read("README.md"), /If you use both clients/);
assert.match(read("ROADMAP.md"), /Milestone 0\.2: Collaboration Reliability/);
assert.match(read("ROADMAP.md"), /implementation wave completed/);
assert.match(read("ROADMAP.md"), /0\.2\.5 Agent Bootstrap Reliability/);
assert.match(read("docs/USER-START-GUIDE.md"), /Ask One Agent to Use Another/);
assert.match(read("docs/USER-START-GUIDE.md"), /Inspect the Routed Request/);
assert.match(read("docs/USER-START-GUIDE.md"), /Use the GitHub checkout/);
assert.match(read("docs/USER-START-GUIDE.md"), /Watch the readiness state/);
assert.match(read("docs/USER-START-GUIDE.md"), /client-update-required/);
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
assert.match(read("docs/USER-START-GUIDE.md"), /newly created blocked agent may show `needs-attention`/);
assert.match(read("docs/USER-START-GUIDE.md"), /trust approval, MCP setup, or pending self-registration/);
assert.match(read("docs/USER-START-GUIDE.md"), /mair setup codex/);
assert.match(read("docs/USER-START-GUIDE.md"), /mair setup claude/);
assert.match(read("docs/USER-START-GUIDE.md"), /mair doctor/);
assert.match(read("docs/USER-START-GUIDE.md"), /Verify the linked command/);
assert.match(read("docs/USER-START-GUIDE.md"), /For a GitHub checkout, the full test suite is/);
assert.match(read("docs/USER-START-GUIDE.md"), /When Mina is installed as a packaged CLI/);
assert.match(read("docs/USER-START-GUIDE.md"), /installed-package self-check/);
assert.match(read("docs/USER-START-GUIDE.md"), /without\s+running any npm/);
assert.match(read("docs/USER-START-GUIDE.md"), /Codex users/);
assert.match(read("docs/USER-START-GUIDE.md"), /Claude users/);
assert.match(read("docs/USER-START-GUIDE.md"), /owns the live state/);
assert.match(read("docs/USER-START-GUIDE.md"), /Normal CLI reads and writes/);
assert.match(read("docs/USER-START-GUIDE.md"), /non-default port/);
assert.match(read("docs/USER-START-GUIDE.md"), /target agent as `busy`/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /Collaboration Prompt Example/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /Recommended Setup/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /mair setup codex/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /mair setup claude/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /mair doctor/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /visible client list check/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /codex mcp list/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /claude mcp list/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /Use the manual commands below only/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /Mina runs an MCP preflight/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /Claude Code can keep MCP configuration per profile/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /request detail should show lifecycle status, request lease state/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /keeps the lease as `orphaned`/);
assert.match(read("docs/MCP-CLIENT-SETUP.md"), /`list_agents` returns `isSelf`/);
assert.match(read("docs/HTTP-UI-MCP.md"), /live owner for the matching router state file/);
assert.match(read("docs/HTTP-UI-MCP.md"), /CLI reads and writes proxy to the server/);
assert.match(read("docs/HTTP-UI-MCP.md"), /prefer live status from a running server/);
assert.match(read("docs/HTTP-UI-MCP.md"), /actively busy inside the server process/);
assert.match(read("docs/HTTP-UI-MCP.md"), /waits for `\/api\/health` before reporting success/);
assert.match(read("docs/HTTP-UI-MCP.md"), /stale pid files that point at non-Mina servers/);
assert.match(read("docs/HTTP-UI-MCP.md"), /Connect Agent guide/);
assert.match(read("docs/HTTP-UI-MCP.md"), /mair setup codex/);
assert.match(read("docs/HTTP-UI-MCP.md"), /mair setup claude/);
assert.match(read("docs/HTTP-UI-MCP.md"), /only when you use both clients/);
assert.match(read("docs/HTTP-UI-MCP.md"), /installed package/);
assert.match(read("docs/HTTP-UI-MCP.md"), /npm run verify/);
assert.match(read("docs/HTTP-UI-MCP.md"), /linked checkout may make `mair verify` run that same suite/);
assert.match(read("docs/SKILL-INSTALL-GUIDE.md"), /Recommended/);
assert.match(read("docs/SKILL-INSTALL-GUIDE.md"), /mair setup codex/);
assert.match(read("docs/SKILL-INSTALL-GUIDE.md"), /mair setup claude/);
assert.match(read("docs/TROUBLESHOOTING.md"), /Occupied Port/);
assert.match(read("docs/TROUBLESHOOTING.md"), /Stale or Non-Mina Pid File/);
assert.match(read("docs/TROUBLESHOOTING.md"), /prevents split-brain writes/);
assert.match(read("docs/TROUBLESHOOTING.md"), /Agent Created But Not Ready/);
assert.match(read("docs/TROUBLESHOOTING.md"), /client-update-required/);
assert.match(read("docs/product-specs/agent-bootstrap-reliability.md"), /Pain Point Gap Map/);
assert.match(read("docs/product-specs/agent-bootstrap-reliability.md"), /Duplicate registration/);
assert.match(read("docs/product-specs/agent-bootstrap-reliability.md"), /client-update-required/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /Release Readiness Review Fixes/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /live in-memory lock/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /server owns live router state/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /running matching server's MCP URL/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /CLI read commands use the matching running server's live status/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /Server startup reports success only after Mina readiness is confirmed/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /stale or non-Mina pid-file targets/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /review file cleanup does not break docs verification/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /hard-coded default port/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /Non-tmux agents/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /CLI visible-agent MCP preflight/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /Archive-only reasons/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /explicit `id` \/ `htmlFor`/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /returned state immediately/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /Codex update prompt/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /trust-specific evidence/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /MCP-blocked tmux agents/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /transport reachability from route readiness/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /Non-ready agents still accept routed work/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /routeReady/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /User guide defines `needs-attention` too narrowly/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /First-run MCP and skill setup is still manual/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /mair setup codex/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /Demo `setup-codex-pair`/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /can report success while agents are not route-ready/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /choose-one setup flow/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /manual MCP or skill installation required/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /Visible agent start does not consume verified MCP setup/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /Doctor MCP repair guidance repeats the blocker reason/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /leaves prompt-sent agents as `created`/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /fixed derived ports/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /Installed `mair version` reads the consumer project's version/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /Installed `mair verify` runs the consumer project's npm script/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /Installed `mair verify` success details read like failure/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /Installed `mair verify` misses Web UI static assets/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /Subcommand `--help` can execute side effects/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /Duplicate session registration mixes canonical id and display name/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /User guide mixes checkout verify and installed self-check modes/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /Real CLI\/Web UI multi-agent findings/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /Claude MCP verification can pass shell checks/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /client-update-required/);
assert.match(read("docs/product-specs/release-readiness-review-fixes.md"), /smoke:real-cli-contract/);
assert.match(read("docs/design-docs/agent-bootstrap-reliability.md"), /bootstrapStatus/);
assert.match(read("docs/design-docs/agent-bootstrap-reliability.md"), /caller identity/);
assert.match(read("docs/design-docs/agent-bootstrap-reliability.md"), /client-update-required/);
assert.match(read("docs/design-docs/agent-bootstrap-reliability.md"), /MINA_REAL_CLI_SMOKE=1 npm run smoke:real-cli-contract/);
assert.match(read("docs/exec-plans/active/index.md"), /Current active task/);
assert.match(read("docs/exec-plans/active/index.md"), /`NONE`/);
assert.match(read("docs/exec-plans/active/index.md"), /completed exec plans 034-063/);
assert.match(read("docs/exec-plans/completed/023-cli-server-proxy-register-ask.md"), /CLI server proxy for register and ask/);
assert.match(read("docs/exec-plans/completed/024-cli-server-proxy-agent-start-refresh.md"), /CLI server proxy for agent start and refresh/);
assert.match(read("docs/exec-plans/completed/025-health-running-server-mcp-url.md"), /Health running server MCP URL/);
assert.match(read("docs/exec-plans/completed/026-fresh-operator-smoke-hardening.md"), /Fresh operator smoke hardening/);
assert.match(read("docs/exec-plans/completed/027-cli-live-read-proxy-health-agents.md"), /CLI live read proxy for health and agents/);
assert.match(read("docs/exec-plans/completed/028-cli-live-read-offline-hardening.md"), /CLI live read offline hardening/);
assert.match(read("docs/exec-plans/completed/029-server-start-readiness-and-bind-failure.md"), /Server start readiness and bind failure/);
assert.match(read("docs/exec-plans/completed/030-live-proxy-stale-pid-diagnostics.md"), /Live proxy stale pid diagnostics/);
assert.match(read("docs/exec-plans/completed/031-startup-diagnostics-release-hardening.md"), /Startup diagnostics release hardening/);
assert.match(read("docs/exec-plans/completed/032-doc-review-lifecycle-and-smoke-sync.md"), /Doc review lifecycle and smoke sync/);
assert.match(read("docs/exec-plans/completed/033-review-cleanup-safe-docs-gate.md"), /Review cleanup safe docs gate/);
assert.match(read("docs/exec-plans/completed/034-first-user-ui-port-terminal-affordances.md"), /First user UI port and terminal affordances/);
assert.match(read("docs/exec-plans/completed/034-first-user-ui-port-terminal-affordances.md"), /non-default server URL/);
assert.match(read("docs/exec-plans/completed/034-first-user-ui-port-terminal-affordances.md"), /non-tmux selected agent/);
assert.match(read("docs/exec-plans/completed/035-visible-agent-mcp-and-unarchive-error-cleanup.md"), /Visible agent MCP and unarchive error cleanup/);
assert.match(read("docs/exec-plans/completed/035-visible-agent-mcp-and-unarchive-error-cleanup.md"), /matching server running on a non-default port/);
assert.match(read("docs/exec-plans/completed/035-visible-agent-mcp-and-unarchive-error-cleanup.md"), /archive-only `error` text/);
assert.match(read("docs/exec-plans/completed/036-first-user-ui-accessibility-create-refresh.md"), /First user UI accessibility and create refresh/);
assert.match(read("docs/exec-plans/completed/036-first-user-ui-accessibility-create-refresh.md"), /explicit `id` and associated `htmlFor` label/);
assert.match(read("docs/exec-plans/completed/036-first-user-ui-accessibility-create-refresh.md"), /returned state immediately/);
assert.match(read("docs/exec-plans/completed/037-codex-prompt-detection-precision.md"), /Codex prompt detection precision/);
assert.match(read("docs/exec-plans/completed/037-codex-prompt-detection-precision.md"), /Codex update prompts/);
assert.match(read("docs/exec-plans/completed/037-codex-prompt-detection-precision.md"), /trustPrompt: false/);
assert.match(read("docs/exec-plans/completed/038-mcp-blocked-agent-readiness.md"), /MCP blocked agent readiness/);
assert.match(read("docs/exec-plans/completed/038-mcp-blocked-agent-readiness.md"), /transport reachability from collaboration readiness/);
assert.match(read("docs/exec-plans/completed/038-mcp-blocked-agent-readiness.md"), /available count/);
assert.match(read("docs/exec-plans/completed/039-route-readiness-enforcement.md"), /Route readiness enforcement/);
assert.match(read("docs/exec-plans/completed/039-route-readiness-enforcement.md"), /routeReady: false/);
assert.match(read("docs/exec-plans/completed/039-route-readiness-enforcement.md"), /before creating a request/);
assert.match(read("docs/exec-plans/completed/040-health-docs-readiness-language.md"), /Health docs readiness language/);
assert.match(read("docs/exec-plans/completed/040-health-docs-readiness-language.md"), /first-run readiness blockers/);
assert.match(read("docs/exec-plans/completed/041-first-run-doctor-command.md"), /First-run doctor command/);
assert.match(read("docs/exec-plans/completed/041-first-run-doctor-command.md"), /mair doctor/);
assert.match(read("docs/exec-plans/completed/042-first-run-setup-codex-claude.md"), /First-run setup for Codex and Claude/);
assert.match(read("docs/exec-plans/completed/042-first-run-setup-codex-claude.md"), /mair setup codex/);
assert.match(read("docs/exec-plans/completed/043-ui-setup-surface.md"), /UI setup surface/);
assert.match(read("docs/exec-plans/completed/043-ui-setup-surface.md"), /Connect Agent/);
assert.match(read("docs/exec-plans/completed/044-demo-helper-demotion.md"), /Demo helper demotion/);
assert.match(read("docs/exec-plans/completed/044-demo-helper-demotion.md"), /setup-codex-pair/);
assert.match(read("docs/exec-plans/completed/045-doctor-blocked-agent-readiness.md"), /Doctor blocked agent readiness/);
assert.match(read("docs/exec-plans/completed/045-doctor-blocked-agent-readiness.md"), /--ignore-blocked-agents/);
assert.match(read("docs/exec-plans/completed/046-choose-one-setup-docs-ui.md"), /Choose-one setup docs and UI/);
assert.match(read("docs/exec-plans/completed/046-choose-one-setup-docs-ui.md"), /single-client setup/);
assert.match(read("docs/exec-plans/completed/047-getting-started-oob-cleanup.md"), /Getting Started OOB cleanup/);
assert.match(read("docs/exec-plans/completed/047-getting-started-oob-cleanup.md"), /repair\/reference/);
assert.match(read("docs/exec-plans/completed/048-visible-agent-mcp-config-detection.md"), /Visible agent MCP config detection/);
assert.match(read("docs/exec-plans/completed/048-visible-agent-mcp-config-detection.md"), /configured preflight/);
assert.match(read("docs/exec-plans/completed/049-doctor-mcp-repair-action.md"), /Doctor MCP repair action/);
assert.match(read("docs/exec-plans/completed/049-doctor-mcp-repair-action.md"), /mair setup <client>/);
assert.match(read("docs/exec-plans/completed/050-http-create-registration-pending.md"), /HTTP create registration pending/);
assert.match(read("docs/exec-plans/completed/050-http-create-registration-pending.md"), /registration-pending/);
assert.match(read("docs/exec-plans/completed/051-cli-controls-dynamic-ports.md"), /CLI controls dynamic ports/);
assert.match(read("docs/exec-plans/completed/051-cli-controls-dynamic-ports.md"), /dynamic free ports/);
assert.match(read("docs/exec-plans/completed/052-installed-cli-version-source.md"), /Installed CLI version source/);
assert.match(read("docs/exec-plans/completed/052-installed-cli-version-source.md"), /consumer project's `package.json.version`/);
assert.match(read("docs/exec-plans/completed/053-installed-cli-verify-contract.md"), /Installed CLI verify contract/);
assert.match(read("docs/exec-plans/completed/053-installed-cli-verify-contract.md"), /consumer project npm scripts/);
assert.match(read("docs/exec-plans/completed/054-installed-verify-success-details.md"), /Installed verify success details/);
assert.match(read("docs/exec-plans/completed/054-installed-verify-success-details.md"), /success-language detail/);
assert.match(read("docs/exec-plans/completed/055-installed-web-ui-asset-verify.md"), /Installed Web UI asset verify/);
assert.match(read("docs/exec-plans/completed/055-installed-web-ui-asset-verify.md"), /200 HTML/);
assert.match(read("docs/exec-plans/completed/056-cli-subcommand-help-no-side-effects.md"), /CLI subcommand help no side effects/);
assert.match(read("docs/exec-plans/completed/056-cli-subcommand-help-no-side-effects.md"), /does not start a server/);
assert.match(read("docs/exec-plans/completed/057-session-fingerprint-display-name-dedupe.md"), /Session fingerprint display name dedupe/);
assert.match(read("docs/exec-plans/completed/057-session-fingerprint-display-name-dedupe.md"), /canonical display name/);
assert.match(read("docs/exec-plans/completed/058-verify-docs-install-mode-clarity.md"), /Verify docs install mode clarity/);
assert.match(read("docs/exec-plans/completed/058-verify-docs-install-mode-clarity.md"), /Checkout full verification/);
assert.match(read("docs/exec-plans/completed/059-claude-session-mcp-visibility.md"), /Claude session MCP visibility/);
assert.match(read("docs/exec-plans/completed/059-claude-session-mcp-visibility.md"), /mcp list/);
assert.match(read("docs/exec-plans/completed/060-codex-update-prompt-bootstrap-blocker.md"), /Codex update prompt bootstrap blocker/);
assert.match(read("docs/exec-plans/completed/060-codex-update-prompt-bootstrap-blocker.md"), /client-update-required/);
assert.match(read("docs/exec-plans/completed/061-permission-state-advance-after-approval.md"), /Permission state advance after approval/);
assert.match(read("docs/exec-plans/completed/061-permission-state-advance-after-approval.md"), /registration-pending/);
assert.match(read("docs/exec-plans/completed/062-guided-bootstrap-approval-loop-design.md"), /Guided bootstrap approval loop design/);
assert.match(read("docs/exec-plans/completed/062-guided-bootstrap-approval-loop-design.md"), /first-run bootstrap blocker/);
assert.match(read("docs/exec-plans/completed/063-real-cli-contract-smoke.md"), /Real CLI contract smoke/);
assert.match(read("docs/exec-plans/completed/063-real-cli-contract-smoke.md"), /MINA_REAL_CLI_SMOKE=1/);
assert.doesNotMatch(read("docs/GETTING-STARTED.md"), /Required Setup Guides/);
assert.match(read("docs/GETTING-STARTED.md"), /Setup Reference Guides/);
assert.match(read("docs/GETTING-STARTED.md"), /mair setup codex/);
assert.match(read("docs/GETTING-STARTED.md"), /mair doctor --client codex/);

for (const file of markdownFiles) {
  const content = read(file);
  for (const match of content.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)) {
    const link = match[1];
    if (/^https?:/.test(link)) continue;
    const resolved = path.resolve(path.dirname(path.join(repoRoot, file)), link);
    assert.ok(fs.existsSync(resolved), `${file} image link missing: ${link}`);
  }
  for (const match of content.matchAll(/(?<!!)\[[^\]]+]\(([^)]+)\)/g)) {
    const rawLink = match[1].trim().split(/\s+/, 1)[0];
    if (/^(https?:|mailto:|#)/.test(rawLink)) continue;
    const withoutAnchor = rawLink.split("#", 1)[0];
    if (!withoutAnchor) continue;
    const resolved = path.resolve(path.dirname(path.join(repoRoot, file)), withoutAnchor);
    assert.ok(fs.existsSync(resolved), `${file} markdown link missing: ${rawLink}`);
  }
}

console.log("docs smoke passed");
