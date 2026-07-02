const assert = require("node:assert/strict");
const { execFileSync, spawn } = require("node:child_process");
const { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { pathToFileURL } = require("node:url");

const port = 3344;
const packageVersion = require(join(process.cwd(), "package.json")).version;
const baseUrl = `http://127.0.0.1:${port}`;
const tempDir = mkdtempSync(join(tmpdir(), "mina-http-smoke-"));
const projectRootReal = realpathSync(tempDir);
const statePath = join(tempDir, "router-state.json");
const uiSession = `mina-http-ui-${process.pid}`;
const uiPromptSession = `mina-http-ui-prompt-${process.pid}`;
const promptSession = `mina-http-permission-${process.pid}`;
const promptAdvanceSession = `mina-http-permission-advance-${process.pid}`;
const passiveCodexSession = `mina-http-passive-codex-${process.pid}`;
const cliPendingSession = `mina-http-cli-pending-${process.pid}`;
const claudeIdleConfirmedSession = `mina-http-claude-idle-confirmed-${process.pid}`;
const codexMcpApprovalSession = `mina-http-codex-mcp-approval-${process.pid}`;
const codexMcpListSession = `mina-http-codex-mcp-list-${process.pid}`;
const claudeScopedSession = `mina-http-claude-scoped-${process.pid}`;
const claudeReadOnlySession = `mina-http-claude-readonly-${process.pid}`;
const claudeCwdReadOnlySession = `mina-http-claude-cwd-readonly-${process.pid}`;
const claudeDevNullReadOnlySession = `mina-http-claude-devnull-readonly-${process.pid}`;
const claudeTmuxContextSession = `mina-http-claude-tmux-context-${process.pid}`;
const claudeMcpApprovalSession = `mina-http-claude-mcp-approval-${process.pid}`;
const claudeMcpListSession = `mina-http-claude-mcp-list-${process.pid}`;
const claudeMcpCallAgentSession = `mina-http-claude-mcp-call-agent-${process.pid}`;
const claudeTrustSession = `mina-http-claude-trust-${process.pid}`;
const timeoutSession = `mina-http-timeout-${process.pid}`;
const fakeBinDir = join(tempDir, "fake-bin");
const fakeClientLog = join(tempDir, "fake-client-calls.log");
let serverLog = "";
writeFakeClientBinaries();
writeFileSync(statePath, `${JSON.stringify({
  agents: [
    {
      id: "ui-missing",
      name: "ui-missing",
      agentType: "shell",
      transport: "headless",
      sessionId: "ui-missing",
      projectRoot: tempDir,
      status: "unknown",
    },
    {
      id: "ui-stale",
      name: "ui-stale",
      agentType: "shell",
      transport: "headless",
      sessionId: "ui-stale",
      projectRoot: tempDir,
      status: "unknown",
      capabilitySummary: "Stale generated capability notice.",
      capabilitySources: "AGENTS.md",
      capabilitySource: "generated",
      capabilityUpdatedAt: "2026-01-01T00:00:00.000Z",
      lastCapabilityRefreshAt: "2026-01-01T00:00:00.000Z",
      lastSeenAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "cli-pending-retry",
      name: "cli-pending-retry",
      agentType: "codex",
      transport: "tmux",
      sessionId: cliPendingSession,
      tmuxTarget: cliPendingSession,
      projectRoot: tempDir,
      bootstrapStatus: "created",
      registrationSource: "cli",
      registrationStatus: "pending",
      confirmedByAgentAt: "2026-07-02T08:49:59.669Z",
      mcpPreflightStatus: "configured",
      capabilitySummary: "Pending self-registration capability notice.",
      capabilitySources: "created from Mina CLI",
      sessionFingerprint: cliPendingSession,
    },
    {
      id: "claude-idle-confirmed",
      name: "claude-idle-confirmed",
      agentType: "claude",
      transport: "tmux",
      sessionId: claudeIdleConfirmedSession,
      tmuxTarget: claudeIdleConfirmedSession,
      projectRoot: tempDir,
      bootstrapStatus: "permission-required",
      registrationSource: "mcp",
      registrationStatus: "confirmed",
      confirmedByAgentAt: "2026-07-02T08:49:59.669Z",
      mcpPreflightStatus: "configured",
      capabilitySummary: "Confirmed Claude fixture.",
      capabilitySources: "created from Mina smoke",
      sessionFingerprint: claudeIdleConfirmedSession,
    },
    {
      id: "ui-tmux-missing",
      name: "ui-tmux-missing",
      agentType: "shell",
      transport: "tmux",
      sessionId: `missing-${process.pid}`,
      projectRoot: tempDir,
      status: "unknown",
    },
  ],
  requests: [],
}, null, 2)}\n`);
const server = spawn(process.execPath, ["dist/apps/http-server/src/index.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    MINA_ROUTER_STATE: statePath,
    PATH: `${fakeBinDir}:${process.env.PATH}`,
    FAKE_MCP_URL: `${baseUrl}/mcp`,
    MINA_FAKE_CLIENT_LOG: fakeClientLog,
    FAKE_PROJECT_ROOT: projectRootReal,
  },
  stdio: ["ignore", "ignore", "pipe"],
});
server.stderr.on("data", (chunk) => {
  serverLog += String(chunk);
});

async function main() {
  try {
    if (!await waitForServer()) {
      return;
    }

    const state = await json(`${baseUrl}/api/state`);
    assert.equal(state.mcpUrl, `${baseUrl}/mcp`);
    assert.ok(Array.isArray(state.agents));

    const health = await json(`${baseUrl}/api/health`);
    assert.equal(health.mcpUrl, `${baseUrl}/mcp`);
    assert.equal(typeof health.ok, "boolean");
    assert.equal(health.ok, false);
    assert.ok(health.agents.stale >= 1, "expected stale agent in health summary");
    assert.ok(health.agents.missing >= 1, "expected missing agent in health summary");
    assert.equal(typeof health.agents.needsAttention, "number");

    const html = await text(`${baseUrl}/`);
    assert.match(html, /Mina AI Router/);
    assert.match(html, /<div id="root"><\/div>/);
    assert.match(html, /type="module"[^>]+\/assets\/index-.*\.js/);
    assert.match(html, /rel="stylesheet"[^>]+\/assets\/index-.*\.css/);
    await assertUiFreshnessSurface(html);
    assertFirstUserUiReviewAffordancesFromSource();

    const seededState = await json(`${baseUrl}/api/state`);
    const missingAgent = seededState.agents.find((agent) => agent.id === "ui-missing");
    const staleAgent = seededState.agents.find((agent) => agent.id === "ui-stale");
    const missingTmuxAgent = seededState.agents.find((agent) => agent.id === "ui-tmux-missing");
    assert.ok(missingAgent, "expected missing capability fixture in UI state");
    assert.ok(staleAgent, "expected stale capability fixture in UI state");
    assert.ok(missingTmuxAgent, "expected missing tmux fixture in UI state");
    assert.equal(missingAgent.capabilitySummary, undefined);
    assert.equal(missingAgent.bootstrapStatus, "ready");
    assert.equal(missingAgent.registrationSource, "unknown");
    assert.equal(missingAgent.registrationStatus, "confirmed");
    assert.equal(staleAgent.status, "stale");
    assert.equal(staleAgent.capabilitySource, "generated");
    assert.equal(staleAgent.lastCapabilityRefreshAt, "2026-01-01T00:00:00.000Z");
    assert.equal(missingTmuxAgent.status, "missing");
    assert.ok(missingTmuxAgent.healthCheckedAt);

    const directories = await postJson(`${baseUrl}/api/fs/directories`, {
      path: tempDir,
    });
    assert.equal(directories.path, tempDir);
    assert.ok(Array.isArray(directories.entries));

    execFileSync("tmux", ["new-session", "-d", "-s", cliPendingSession, "-x", "200", "-y", "60", "-c", tempDir, "/bin/sh"], {
      stdio: ["ignore", "ignore", "ignore"],
    });
    const cliPendingTerminal = await json(`${baseUrl}/api/agents/cli-pending-retry/terminal`);
    assert.equal(cliPendingTerminal.terminal.pendingRegistration, true);
    assert.equal(cliPendingTerminal.terminal.permissionPrompt, undefined);
    assert.equal(cliPendingTerminal.terminal.actions[0].id, "retry-self-registration");
    const cliPendingRetry = await postJson(`${baseUrl}/api/agents/cli-pending-retry/terminal/input`, {
      actionId: "retry-self-registration",
    });
    assert.equal(cliPendingRetry.registration, "registration prompt sent to agent");
    assert.equal(cliPendingRetry.agent.bootstrapStatus, "registration-pending");

    const claudeIdleScriptPath = join(tempDir, "claude-idle-confirmed-fixture.sh");
    writeFileSync(claudeIdleScriptPath, [
      "printf 'Registered and confirmed:\\n\\n'",
      "printf -- '- id / name: claude-idle-confirmed\\n'",
      `printf -- '- sessionId / fingerprint: ${claudeIdleConfirmedSession}\\n'`,
      "printf -- '- registrationStatus: confirmed (via mcp)\\n\\n'",
      "printf 'One flag: bootstrapStatus shows permission-required and status is needs-attention -- Mina is waiting on an operator/trust approval before this session can receive routed work. That is a Claude Code\\n'",
      `printf 'permission prompt, not something I can clear from here; it needs to be approved in the tmux session (tmux attach -t ${claudeIdleConfirmedSession}).\\n\\n'`,
      "printf '❯\\n'",
      "printf '? for shortcuts · ← for agents\\n'",
      "sleep 60",
      "",
    ].join("\n"));
    execFileSync("tmux", ["new-session", "-d", "-s", claudeIdleConfirmedSession, "-x", "200", "-y", "60", "-c", tempDir, `/bin/sh ${claudeIdleScriptPath}`], {
      stdio: ["ignore", "ignore", "ignore"],
    });
    await sleep(500);
    const claudeIdleTerminal = await json(`${baseUrl}/api/agents/claude-idle-confirmed/terminal`);
    assert.equal(claudeIdleTerminal.terminal.permissionPrompt, undefined);
    assert.equal(claudeIdleTerminal.terminal.actions.length, 0);
    assert.equal(claudeIdleTerminal.agent.bootstrapStatus, "created");
    assert.equal(claudeIdleTerminal.agent.registrationStatus, "confirmed");

    const uiCreated = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-created",
      agentType: "codex",
      projectRoot: tempDir,
      sessionId: uiSession,
      startupCommand: "/bin/sh",
      permissionProfile: "direct-workspace-read",
      sendRegistrationPrompt: false,
    });
    assert.equal(uiCreated.agent.id, "ui-created");
    assert.equal(uiCreated.agent.sessionId, uiSession);
    assert.equal(uiCreated.agent.bootstrapStatus, "created");
    assert.equal(uiCreated.agent.registrationSource, "web-ui");
    assert.equal(uiCreated.agent.registrationStatus, "pending");
    assert.equal(uiCreated.agent.sessionFingerprint, uiSession);
    assert.equal(uiCreated.agent.permissionProfile, "direct-workspace-read");
    assert.equal(uiCreated.agent.permissionProfileStatus, "unsupported");
    assert.match(uiCreated.agent.permissionProfileDetail, /No known codex startup flag/);
    assert.equal(uiCreated.permissionProfile.permissionProfileStatus, "unsupported");
    assert.equal(uiCreated.agent.mcpPreflightStatus, "configured");
    assert.equal(uiCreated.mcpPreflight.status, "configured");
    assert.ok(uiCreated.agent.lastRegistrationAttemptAt);
    assert.equal(uiCreated.attachCommand, `tmux attach -t ${uiSession}`);
    assert.equal(uiCreated.mairAttachCommand, "mair attach ui-created");

    const uiPrompted = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-prompted",
      agentType: "codex",
      projectRoot: tempDir,
      sessionId: uiPromptSession,
      startupCommand: "/bin/sh",
      registerDelayMs: 0,
    });
    assert.equal(uiPrompted.registration, "registration prompt sent to agent");
    assert.equal(uiPrompted.agent.bootstrapStatus, "registration-pending");
    assert.equal(uiPrompted.agent.registrationStatus, "pending");
    assert.equal(uiPrompted.agent.mcpPreflightStatus, "configured");
    const stateAfterUiPrompted = await json(`${baseUrl}/api/state`);
    const uiPromptedStatus = stateAfterUiPrompted.agents.find((agent) => agent.id === "ui-prompted");
    assert.equal(uiPromptedStatus.bootstrapStatus, "registration-pending");
    assert.equal(uiPromptedStatus.registrationStatus, "pending");

    const terminal = await json(`${baseUrl}/api/agents/ui-created/terminal`);
    assert.equal(terminal.agent.id, "ui-created");
    assert.equal(typeof terminal.terminal.text, "string");

    const terminalInput = await postJson(`${baseUrl}/api/agents/ui-created/terminal/input`, {
      enter: true,
    });
    assert.equal(terminalInput.ok, true);

    const confirmedUiCreated = await postJson(`${baseUrl}/api/register`, {
      id: "ui-created",
      name: "ui-created",
      agentType: "codex",
      transport: "tmux",
      sessionId: uiSession,
      sessionFingerprint: uiSession,
      projectRoot: tempDir,
      capabilitySummary: "Confirmed UI-created helper.",
      capabilitySources: "self registration smoke",
    });
    assert.equal(confirmedUiCreated.agent.id, "ui-created");
    assert.equal(confirmedUiCreated.agent.bootstrapStatus, "ready");
    assert.equal(confirmedUiCreated.agent.registrationSource, "manual");
    assert.equal(confirmedUiCreated.agent.registrationStatus, "confirmed");
    assert.ok(confirmedUiCreated.agent.confirmedByAgentAt);
    assert.ok(confirmedUiCreated.agent.registrationHistory.length >= 2);

    const duplicateUiCreated = await postJson(`${baseUrl}/api/register`, {
      id: "ui-created-copy",
      name: "ui-created-copy",
      agentType: "codex",
      transport: "tmux",
      sessionId: uiSession,
      sessionFingerprint: uiSession,
      projectRoot: tempDir,
    });
    assert.equal(duplicateUiCreated.agent.id, "ui-created");
    assert.ok(duplicateUiCreated.agent.registrationWarnings[0].includes("matched existing session fingerprint"));
    assert.equal(duplicateUiCreated.state.agents.filter((agent) => agent.sessionFingerprint === uiSession).length, 1);

    const updatedUiCreated = await patchJson(`${baseUrl}/api/agents/ui-created`, {
      capabilitySummary: "Edited capability notice.",
      capabilitySources: "manual UI edit",
    });
    assert.equal(updatedUiCreated.agent.capabilitySummary, "Edited capability notice.");
    assert.equal(updatedUiCreated.agent.capabilitySources, "manual UI edit");
    assert.equal(updatedUiCreated.agent.capabilitySource, "manual");
    assert.ok(updatedUiCreated.agent.capabilityUpdatedAt);

    const deletedUiCreated = await deleteJson(`${baseUrl}/api/agents/ui-created`);
    assert.equal(deletedUiCreated.agent.id, "ui-created");

    const mcpBlocked = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-mcp-missing",
      agentType: "claude",
      projectRoot: tempDir,
      sessionId: `mina-http-mcp-${process.pid}`,
      startupCommand: "/bin/sh",
      mcpName: "missing-fixture",
      registerDelayMs: 250,
    });
    assert.equal(mcpBlocked.registration, "waiting for MCP setup");
    assert.equal(mcpBlocked.agent.bootstrapStatus, "mcp-configuring");
    assert.equal(mcpBlocked.agent.mcpPreflightStatus, "missing");
    assert.match(mcpBlocked.nextAction, /claude mcp add --transport http missing-fixture/);
    const mcpBlockedState = await json(`${baseUrl}/api/state`);
    const mcpBlockedStatus = mcpBlockedState.agents.find((agent) => agent.id === "ui-mcp-missing");
    assert.equal(mcpBlockedStatus.status, "needs-attention");
    assert.match(mcpBlockedStatus.detail, /MCP setup/);
    const mcpBlockedHealth = await json(`${baseUrl}/api/health`);
    assert.ok(mcpBlockedHealth.agents.needsAttention >= 1, "MCP-blocked tmux agent should need attention");
    const mcpBlockedAsk = await expectPostJsonFailure(`${baseUrl}/api/ask`, {
      target: "ui-mcp-missing",
      task: "This should not route before MCP setup.",
      timeoutMs: 250,
    });
    assert.equal(mcpBlockedAsk.status, 409);
    assert.match(mcpBlockedAsk.body.error, /not ready to receive routed work/);
    assert.equal(
      mcpBlockedAsk.body.state.requests.some((request) => request.targetAgent === "ui-mcp-missing"),
      false,
      "readiness rejection must not create a routed request",
    );
    const fakeClientCalls = readFileSync(fakeClientLog, "utf8");
    assert.match(fakeClientCalls, new RegExp(`codex cwd=${escapeRegExp(projectRootReal)} mcp get mina-ai-router`));
    assert.match(fakeClientCalls, new RegExp(`codex cwd=${escapeRegExp(projectRootReal)} mcp list`));
    assert.match(fakeClientCalls, new RegExp(`claude cwd=${escapeRegExp(projectRootReal)} mcp get missing-fixture`));

    const promptScriptPath = join(tempDir, "permission-prompt-fixture.sh");
    writeFileSync(promptScriptPath, [
      "printf 'Do you trust the contents of this directory?\\nPress enter to continue\\n'",
      "sleep 60",
      "",
    ].join("\n"));
    const permissionBlocked = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-permission",
      agentType: "codex",
      projectRoot: tempDir,
      sessionId: promptSession,
      startupCommand: `/bin/sh ${promptScriptPath}`,
      registerDelayMs: 250,
      mcpConfigured: true,
    });
    assert.equal(permissionBlocked.registration, "waiting for permission approval");
    assert.equal(permissionBlocked.agent.bootstrapStatus, "permission-required");
    assert.match(permissionBlocked.nextAction, /tmux attach/);

    const blockedState = await json(`${baseUrl}/api/state`);
    const blockedAgent = blockedState.agents.find((agent) => agent.id === "ui-permission");
    assert.equal(blockedAgent.status, "needs-attention");
    assert.equal(blockedAgent.bootstrapStatus, "permission-required");
    assert.equal(blockedAgent.permissionPrompt.client, "codex");
    assert.match(blockedAgent.detail, /directory trust approval/);
    assert.ok(blockedAgent.permissionPrompt);
    const blockedTerminal = await json(`${baseUrl}/api/agents/ui-permission/terminal`);
    assert.equal(blockedTerminal.terminal.actions[0].id, "approve-project-trust");
    assert.equal(blockedTerminal.terminal.actions[0].policy, "guided");

    const promptAdvanceScriptPath = join(tempDir, "permission-advance-fixture.sh");
    writeFileSync(promptAdvanceScriptPath, [
      "printf 'Do you trust the contents of this directory?\\nPress enter to continue\\n'",
      "IFS= read -r _line",
      "printf 'ready after trust approval\\n'",
      "sleep 60",
      "",
    ].join("\n"));
    const permissionAdvanceBlocked = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-permission-advance",
      agentType: "codex",
      projectRoot: tempDir,
      sessionId: promptAdvanceSession,
      startupCommand: `/bin/sh ${promptAdvanceScriptPath}`,
      registerDelayMs: 250,
      mcpConfigured: true,
    });
    assert.equal(permissionAdvanceBlocked.registration, "waiting for permission approval");
    assert.equal(permissionAdvanceBlocked.agent.bootstrapStatus, "permission-required");
    const permissionAdvanceInput = await postJson(`${baseUrl}/api/agents/ui-permission-advance/terminal/input`, {
      enter: true,
    });
    assert.equal(permissionAdvanceInput.registration, "registration prompt sent to agent");
    assert.equal(permissionAdvanceInput.agent.bootstrapStatus, "registration-pending");
    assert.equal(permissionAdvanceInput.agent.registrationStatus, "pending");
    assert.equal(permissionAdvanceInput.terminal.trustPrompt, false);
    assert.equal(permissionAdvanceInput.terminal.pendingRegistration, true);

    const passiveCodexScriptPath = join(tempDir, "codex-passive-update-banner-fixture.sh");
    writeFileSync(passiveCodexScriptPath, [
      "printf 'Update available! 0.142.3 -> 0.142.5\\n'",
      "printf 'Release notes: https://github.com/openai/codex/releases/latest\\n'",
      "printf '› 1. Update now (runs `npm install -g @openai/codex`)\\n'",
      "printf '2. Skip\\n'",
      "printf '3. Skip until next version\\n'",
      "printf 'Press enter to continue\\n'",
      "printf '\\n>_ OpenAI Codex (v0.142.3)\\n'",
      "printf '› Summarize recent commits\\n'",
      "sleep 60",
      "",
    ].join("\n"));
    const passiveCodex = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-codex-passive-update",
      agentType: "codex",
      projectRoot: tempDir,
      sessionId: passiveCodexSession,
      startupCommand: `/bin/sh ${passiveCodexScriptPath}`,
      registerDelayMs: 250,
      mcpConfigured: true,
    });
    assert.equal(passiveCodex.registration, "registration prompt sent to agent");
    assert.notEqual(passiveCodex.agent.bootstrapStatus, "client-update-required");
    const passiveCodexTerminal = await json(`${baseUrl}/api/agents/ui-codex-passive-update/terminal`);
    assert.notEqual(passiveCodexTerminal.terminal.permissionPrompt?.kind, "client-update");
    assert.equal(
      passiveCodexTerminal.terminal.actions.some((action) => action.id === "skip-codex-update"),
      false,
      "passive update banner must not expose skip-codex-update",
    );

    const updatePromptScriptPath = join(tempDir, "codex-update-prompt-fixture.sh");
    writeFileSync(updatePromptScriptPath, [
      "printf 'Update available! 0.142.3 -> 0.142.4\\n'",
      "printf '1. Update now (runs `npm install -g @openai/codex`)\\n'",
      "printf '2. Skip\\n'",
      "printf '3. Skip until next version\\n'",
      "printf 'Press enter to continue\\n'",
      "IFS= read -r choice",
      "printf 'selected:%s\\n' \"$choice\"",
      "printf 'Update available! 0.142.3 -> 0.142.4\\n'",
      "printf '1. Update now (runs `npm install -g @openai/codex`)\\n'",
      "printf '2. Skip\\n'",
      "printf '3. Skip until next version\\n'",
      "printf 'Press enter to continue\\n'",
      "sleep 3",
      "printf 'Codex prompt ready after update choice\\n'",
      "i=0; while [ \"$i\" -lt 140 ]; do printf 'ready line %s\\n' \"$i\"; i=$((i + 1)); done",
      "sleep 60",
      "",
    ].join("\n"));
    const updatePromptAgent = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-codex-update",
      agentType: "codex",
      projectRoot: tempDir,
      sessionId: `mina-http-update-${process.pid}`,
      startupCommand: `/bin/sh ${updatePromptScriptPath}`,
      registerDelayMs: 250,
      mcpConfigured: true,
    });
    assert.equal(updatePromptAgent.registration, "waiting for client update choice");
    assert.equal(updatePromptAgent.agent.bootstrapStatus, "client-update-required");
    assert.match(updatePromptAgent.nextAction, /Skip Codex Update|safe update option/);
    const updateState = await json(`${baseUrl}/api/state`);
    const updateStatus = updateState.agents.find((agent) => agent.id === "ui-codex-update");
    assert.equal(updateStatus.permissionPrompt.kind, "client-update");
    const updateTerminal = await json(`${baseUrl}/api/agents/ui-codex-update/terminal`);
    assert.equal(updateTerminal.terminal.trustPrompt, false);
    assert.equal(updateTerminal.terminal.permissionPrompt.kind, "client-update");
    assert.equal(updateTerminal.terminal.actions[0].id, "skip-codex-update");
    assert.equal(updateTerminal.terminal.actions[0].input.text, "2");
    assert.match(updateTerminal.terminal.text, /Update available/);
    const updateSkip = await postJson(`${baseUrl}/api/agents/ui-codex-update/terminal/input`, {
      actionId: "skip-codex-update",
    });
    assert.equal(updateSkip.registration, "update skip sent");
    assert.match(updateSkip.terminal.text, /selected:2/);
    assert.equal(updateSkip.terminal.permissionPrompt.kind, "client-update");
    assert.equal(updateSkip.agent.bootstrapStatus, "client-update-required");
    await sleep(3_200);
    const updateClearedTerminal = await json(`${baseUrl}/api/agents/ui-codex-update/terminal`);
    assert.equal(updateClearedTerminal.terminal.permissionPrompt, undefined);
    assert.equal(updateClearedTerminal.terminal.actions[0].id, "retry-self-registration");
    const updateRetry = await postJson(`${baseUrl}/api/agents/ui-codex-update/terminal/input`, {
      actionId: "retry-self-registration",
    });
    assert.equal(updateRetry.registration, "registration prompt sent to agent");
    assert.equal(updateRetry.agent.bootstrapStatus, "registration-pending");

    const codexMcpApprovalScriptPath = join(tempDir, "codex-mcp-register-approval-fixture.sh");
    writeFileSync(codexMcpApprovalScriptPath, [
      "printf 'Calling\\n'",
      "printf '└ mina-ai-router.register_agent({\\n'",
      "printf '  \"id\": \"ui-codex-mcp-approval\",\\n'",
      "printf '  \"name\": \"ui-codex-mcp-approval\",\\n'",
      "printf '  \"agentType\": \"codex\",\\n'",
      "printf '  \"transport\": \"tmux\",\\n'",
      `printf '  "sessionId": "${codexMcpApprovalSession}",\\n'`,
      `printf '  "projectRoot": "${tempDir}",\\n'`,
      "printf '  \"startupCommand\": \"codex --no-alt-screen\"\\n'",
      "printf '})\\n\\n'",
      "printf 'Field 1/1\\n'",
      "printf 'Allow the mina-ai-router MCP server to run tool \"register_agent\"?\\n\\n'",
      "printf '› 1. Allow\\n'",
      "printf '  2. Allow for this session\\n'",
      "printf '  3. Always allow\\n'",
      "printf '  4. Cancel\\n'",
      "printf 'enter to submit | esc to cancel\\n'",
      "IFS= read -r approval",
      "printf 'approved-codex-mcp-registration:%s\\n' \"$approval\"",
      "sleep 60",
      "",
    ].join("\n"));
    const codexMcpApproval = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-codex-mcp-approval",
      agentType: "codex",
      projectRoot: tempDir,
      sessionId: codexMcpApprovalSession,
      startupCommand: `/bin/sh ${codexMcpApprovalScriptPath}`,
      registerDelayMs: 250,
      mcpConfigured: true,
    });
    assert.equal(codexMcpApproval.registration, "waiting for permission approval");
    const codexMcpTerminal = await json(`${baseUrl}/api/agents/ui-codex-mcp-approval/terminal`);
    assert.equal(codexMcpTerminal.terminal.permissionPrompt.kind, "codex-mcp-registration-approval");
    assert.equal(codexMcpTerminal.terminal.actions[0].id, "approve-codex-mcp-registration");
    assert.equal(
      codexMcpTerminal.terminal.actions.some((action) => action.id === "retry-self-registration"),
      false,
      "Codex MCP approval must hide generic self-registration retry",
    );
    const codexMcpApproved = await postJson(`${baseUrl}/api/agents/ui-codex-mcp-approval/terminal/input`, {
      actionId: "approve-codex-mcp-registration",
    });
    assert.equal(codexMcpApproved.registration, "unchanged");
    assert.match(codexMcpApproved.terminal.text, /approved-codex-mcp-registration/);
    assert.doesNotMatch(codexMcpApproved.terminal.text, /Use Mina AI Router MCP register_agent/);

    const codexMcpListScriptPath = join(tempDir, "codex-mcp-list-agents-approval-fixture.sh");
    writeFileSync(codexMcpListScriptPath, [
      "printf 'Calling mina-ai-router.list_agents({\\n'",
      "printf '  \"callerAgentId\": \"ui-codex-mcp-list\",\\n'",
      `printf '  "callerSessionFingerprint": "${codexMcpListSession}",\\n'`,
      "printf '  \"sourceAgent\": \"ui-codex-mcp-list\"\\n'",
      "printf '})\\n\\n'",
      "printf 'Field 1/1\\n'",
      "printf 'Allow the mina-ai-router MCP server to run tool \"list_agents\"?\\n\\n'",
      "printf '› 1. Allow\\n'",
      "printf '  2. Allow for this session\\n'",
      "printf '  3. Always allow\\n'",
      "printf '  4. Cancel\\n'",
      "printf 'enter to submit | esc to cancel\\n'",
      "IFS= read -r approval",
      "printf 'approved-codex-mcp-list:%s\\n' \"$approval\"",
      "sleep 60",
      "",
    ].join("\n"));
    const codexMcpList = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-codex-mcp-list",
      agentType: "codex",
      projectRoot: tempDir,
      sessionId: codexMcpListSession,
      startupCommand: `/bin/sh ${codexMcpListScriptPath}`,
      registerDelayMs: 250,
      mcpConfigured: true,
    });
    assert.equal(codexMcpList.registration, "waiting for permission approval");
    const codexMcpListTerminal = await json(`${baseUrl}/api/agents/ui-codex-mcp-list/terminal`);
    assert.equal(codexMcpListTerminal.terminal.permissionPrompt.kind, "codex-mcp-registration-approval");
    assert.equal(codexMcpListTerminal.terminal.actions[0].id, "approve-codex-mcp-registration");
    assert.equal(
      codexMcpListTerminal.terminal.actions.some((action) => action.id === "retry-self-registration"),
      false,
      "Codex list_agents approval must hide generic self-registration retry",
    );

    const claudeScopedScriptPath = join(tempDir, "claude-scoped-command-approval-fixture.sh");
    writeFileSync(claudeScopedScriptPath, [
      "printf 'Bash command\\n'",
      `printf 'cd ${tempDir} && ls -la .claude/skills/mina-ai-router-agent && echo register_agent && echo list_agents\\n'`,
      "printf 'Compound command contains cd with output redirection - manual approval required to prevent path resolution bypass\\n'",
      "IFS= read -r approval",
      "printf 'approved-scoped-command:%s\\n' \"$approval\"",
      "sleep 60",
      "",
    ].join("\n"));
    const claudeScoped = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-claude-scoped",
      agentType: "claude",
      projectRoot: tempDir,
      sessionId: claudeScopedSession,
      startupCommand: `/bin/sh ${claudeScopedScriptPath}`,
      registerDelayMs: 250,
      mcpConfigured: true,
    });
    assert.equal(claudeScoped.registration, "waiting for permission approval");
    assert.equal(claudeScoped.agent.bootstrapStatus, "permission-required");
    const claudeScopedTerminal = await json(`${baseUrl}/api/agents/ui-claude-scoped/terminal`);
    assert.equal(claudeScopedTerminal.terminal.permissionPrompt.kind, "scoped-command-approval");
    assert.equal(claudeScopedTerminal.terminal.actions[0].id, "approve-scoped-registration-command");
    const claudeScopedApproval = await postJson(`${baseUrl}/api/agents/ui-claude-scoped/terminal/input`, {
      actionId: "approve-scoped-registration-command",
    });
    assert.equal(claudeScopedApproval.registration, "registration prompt sent to agent");
    assert.match(claudeScopedApproval.terminal.text, /approved-scoped-command/);
    assert.match(claudeScopedApproval.terminal.text, /Use Mina AI Router MCP register_agent/);

    const claudeReadOnlyScriptPath = join(tempDir, "claude-readonly-command-approval-fixture.sh");
    writeFileSync(claudeReadOnlyScriptPath, [
      "printf 'Bash command\\n\\n'",
      `printf 'cd ${tempDir} && ls -la && echo \"---\" && for f in CLAUDE.md claude.md AGENTS.md agents.md agent.md README.md; do [ -f \"$f\" ] && echo \"FOUND: $f\"; done\\n'`,
      "printf 'List project files and check for capability docs\\n\\n'",
      "printf 'Contains simple_expansion\\n\\n'",
      "printf 'Do you want to proceed?\\n'",
      "printf '❯ 1. Yes\\n'",
      "printf '  2. No\\n\\n'",
      "printf 'Esc to cancel · Tab to amend · ctrl+e to explain\\n'",
      "IFS= read -r approval",
      "printf 'approved-readonly-command:%s\\n' \"$approval\"",
      "sleep 60",
      "",
    ].join("\n"));
    const claudeReadOnly = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-claude-readonly",
      agentType: "claude",
      projectRoot: tempDir,
      sessionId: claudeReadOnlySession,
      startupCommand: `/bin/sh ${claudeReadOnlyScriptPath}`,
      registerDelayMs: 250,
      mcpConfigured: true,
    });
    assert.equal(claudeReadOnly.registration, "waiting for permission approval");
    const claudeReadOnlyTerminal = await json(`${baseUrl}/api/agents/ui-claude-readonly/terminal`);
    assert.equal(claudeReadOnlyTerminal.terminal.permissionPrompt.kind, "scoped-command-approval");
    assert.equal(claudeReadOnlyTerminal.terminal.actions[0].id, "approve-scoped-registration-command");

    const claudeCwdReadOnlyScriptPath = join(tempDir, "claude-cwd-readonly-command-approval-fixture.sh");
    writeFileSync(claudeCwdReadOnlyScriptPath, [
      "printf 'Bash command\\n\\n'",
      "printf 'ls -la && echo \"---\" && for f in CLAUDE.md claude.md AGENTS.md agents.md agent.md README.md; do if [ -f \"$f\" ]; then echo \"=== $f ===\"; fi; done\\n'",
      "printf 'List project files and check for capability docs\\n\\n'",
      "printf 'Contains simple_expansion\\n\\n'",
      "printf 'Do you want to proceed?\\n'",
      "printf '❯ 1. Yes\\n'",
      "printf '  2. No\\n\\n'",
      "printf 'Esc to cancel · Tab to amend · ctrl+e to explain\\n'",
      "IFS= read -r approval",
      "printf 'approved-cwd-readonly-command:%s\\n' \"$approval\"",
      "sleep 60",
      "",
    ].join("\n"));
    const claudeCwdReadOnly = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-claude-cwd-readonly",
      agentType: "claude",
      projectRoot: tempDir,
      sessionId: claudeCwdReadOnlySession,
      startupCommand: `/bin/sh ${claudeCwdReadOnlyScriptPath}`,
      registerDelayMs: 250,
      mcpConfigured: true,
    });
    assert.equal(claudeCwdReadOnly.registration, "waiting for permission approval");
    const claudeCwdReadOnlyTerminal = await json(`${baseUrl}/api/agents/ui-claude-cwd-readonly/terminal`);
    assert.equal(claudeCwdReadOnlyTerminal.terminal.permissionPrompt.kind, "scoped-command-approval");
    assert.equal(claudeCwdReadOnlyTerminal.terminal.actions[0].id, "approve-scoped-registration-command");

    const claudeDevNullReadOnlyScriptPath = join(tempDir, "claude-devnull-readonly-command-approval-fixture.sh");
    writeFileSync(claudeDevNullReadOnlyScriptPath, [
      "printf 'Bash command\\n\\n'",
      `printf 'cd ${tempDir} && ls -la && echo \"---CLAUDE.md---\" && (cat CLAUDE.md 2>/dev/null || echo \"none\") && echo \"---README---\" && (cat README.md 2>/dev/null | head -100 || echo \"none\")\\n'`,
      "printf 'Run shell command\\n\\n'",
      "printf 'This command uses shell operators that require approval for safety\\n\\n'",
      "printf 'Do you want to proceed?\\n'",
      "printf '❯ 1. Yes\\n'",
      "printf '  2. No\\n'",
      "IFS= read -r approval",
      "printf 'approved-devnull-readonly-command:%s\\n' \"$approval\"",
      "sleep 60",
      "",
    ].join("\n"));
    const claudeDevNullReadOnly = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-claude-devnull-readonly",
      agentType: "claude",
      projectRoot: tempDir,
      sessionId: claudeDevNullReadOnlySession,
      startupCommand: `/bin/sh ${claudeDevNullReadOnlyScriptPath}`,
      registerDelayMs: 250,
      mcpConfigured: true,
    });
    assert.equal(claudeDevNullReadOnly.registration, "waiting for permission approval");
    const claudeDevNullReadOnlyTerminal = await json(`${baseUrl}/api/agents/ui-claude-devnull-readonly/terminal`);
    assert.equal(claudeDevNullReadOnlyTerminal.terminal.permissionPrompt.kind, "scoped-command-approval");
    assert.equal(claudeDevNullReadOnlyTerminal.terminal.actions[0].id, "approve-scoped-registration-command");

    const claudeTmuxContextScriptPath = join(tempDir, "claude-tmux-context-approval-fixture.sh");
    writeFileSync(claudeTmuxContextScriptPath, [
      "printf 'Bash command\\n\\n'",
      "printf \"tmux display-message -p '#S' 2>/dev/null || true; tmux display-message -p '#{pane_id}' 2>/dev/null || true; pwd\\n\"",
      "printf 'Check tmux session context and current directory\\n\\n'",
      "printf 'This command requires approval\\n\\n'",
      "printf 'Do you want to proceed?\\n'",
      "printf '❯ 1. Yes\\n'",
      "printf '  2. Yes, and don'\"'\"'t ask again for: tmux display-message *\\n'",
      "printf '  3. No\\n'",
      "IFS= read -r approval",
      "printf 'approved-tmux-context:%s\\n' \"$approval\"",
      "sleep 60",
      "",
    ].join("\n"));
    const claudeTmuxContext = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-claude-tmux-context",
      agentType: "claude",
      projectRoot: tempDir,
      sessionId: claudeTmuxContextSession,
      startupCommand: `/bin/sh ${claudeTmuxContextScriptPath}`,
      registerDelayMs: 250,
      mcpConfigured: true,
    });
    assert.equal(claudeTmuxContext.registration, "waiting for permission approval");
    const claudeTmuxContextTerminal = await json(`${baseUrl}/api/agents/ui-claude-tmux-context/terminal`);
    assert.equal(claudeTmuxContextTerminal.terminal.permissionPrompt.kind, "scoped-command-approval");
    assert.equal(claudeTmuxContextTerminal.terminal.actions[0].id, "approve-scoped-registration-command");

    const claudeMcpApprovalScriptPath = join(tempDir, "claude-mcp-register-approval-fixture.sh");
    writeFileSync(claudeMcpApprovalScriptPath, [
      "printf 'Tool use\\n\\n'",
      "printf 'mina-ai-router - register_agent(\\n'",
      "printf '  id: \"ui-claude-mcp-approval\",\\n'",
      "printf '  agentType: \"claude\",\\n'",
      "printf '  transport: \"tmux\",\\n'",
      `printf '  sessionId: "${claudeMcpApprovalSession}",\\n'`,
      `printf '  projectRoot: "${tempDir}",\\n'`,
      "printf ') (MCP)\\n\\n'",
      "printf 'Do you want to proceed?\\n'",
      "printf '❯ 1. Yes\\n'",
      `printf '  2. Yes, and don'\"'\"'t ask again for mina-ai-router - register_agent commands in ${tempDir}\\n'`,
      "printf '  3. No\\n\\n'",
      "printf 'Esc to cancel · Tab to amend\\n'",
      "IFS= read -r approval",
      "printf 'approved-mcp-registration:%s\\n' \"$approval\"",
      "sleep 60",
      "",
    ].join("\n"));
    const claudeMcpApproval = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-claude-mcp-approval",
      agentType: "claude",
      projectRoot: tempDir,
      sessionId: claudeMcpApprovalSession,
      startupCommand: `/bin/sh ${claudeMcpApprovalScriptPath}`,
      registerDelayMs: 250,
      mcpConfigured: true,
    });
    assert.equal(claudeMcpApproval.registration, "waiting for permission approval");
    const claudeMcpTerminal = await json(`${baseUrl}/api/agents/ui-claude-mcp-approval/terminal`);
    assert.equal(claudeMcpTerminal.terminal.permissionPrompt.kind, "mcp-registration-approval");
    assert.equal(claudeMcpTerminal.terminal.actions[0].id, "approve-mcp-registration");
    const claudeMcpApproved = await postJson(`${baseUrl}/api/agents/ui-claude-mcp-approval/terminal/input`, {
      actionId: "approve-mcp-registration",
    });
    assert.equal(claudeMcpApproved.registration, "unchanged");
    assert.match(claudeMcpApproved.terminal.text, /approved-mcp-registration/);
    assert.doesNotMatch(claudeMcpApproved.terminal.text, /Use Mina AI Router MCP register_agent/);

    const claudeMcpListScriptPath = join(tempDir, "claude-mcp-list-agents-approval-fixture.sh");
    writeFileSync(claudeMcpListScriptPath, [
      "printf 'Registration succeeded already; now confirming via list_agents as instructed.\\n\\n'",
      "printf 'Tool use\\n\\n'",
      "printf 'mina-ai-router - list_agents (MCP)\\n'",
      "printf 'List registered Mina helper agents.\\n\\n'",
      "printf 'Do you want to proceed?\\n'",
      "printf '❯ 1. Yes\\n'",
      `printf '  2. Yes, and don'\"'\"'t ask again for mina-ai-router - list_agents commands in ${tempDir}\\n'`,
      "printf '  3. No\\n\\n'",
      "printf 'Esc to cancel · Tab to amend\\n'",
      "IFS= read -r approval",
      "printf 'approved-mcp-list:%s\\n' \"$approval\"",
      "sleep 60",
      "",
    ].join("\n"));
    const claudeMcpList = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-claude-mcp-list",
      agentType: "claude",
      projectRoot: tempDir,
      sessionId: claudeMcpListSession,
      startupCommand: `/bin/sh ${claudeMcpListScriptPath}`,
      registerDelayMs: 250,
      mcpConfigured: true,
    });
    assert.equal(claudeMcpList.registration, "waiting for permission approval");
    const claudeMcpListTerminal = await json(`${baseUrl}/api/agents/ui-claude-mcp-list/terminal`);
    assert.equal(claudeMcpListTerminal.terminal.permissionPrompt.kind, "mcp-registration-approval");
    assert.equal(claudeMcpListTerminal.terminal.actions[0].id, "approve-mcp-registration");

    const claudeMcpCallAgentScriptPath = join(tempDir, "claude-mcp-call-agent-approval-fixture.sh");
    writeFileSync(claudeMcpCallAgentScriptPath, [
      "printf 'Handling a routed Mina request that needs a helper agent.\\n\\n'",
      "printf 'Tool use\\n\\n'",
      "printf 'mina-ai-router - call_agent (MCP)\\n'",
      "printf 'Route a request to a selected Mina helper agent.\\n\\n'",
      "printf 'Do you want to proceed?\\n'",
      "printf '❯ 1. Yes\\n'",
      `printf '  2. Yes, and don'\"'\"'t ask again for mina-ai-router - call_agent commands in ${tempDir}\\n'`,
      "printf '  3. No\\n\\n'",
      "printf 'Esc to cancel · Tab to amend\\n'",
      "IFS= read -r approval",
      "printf 'approved-mcp-call-agent:%s\\n' \"$approval\"",
      "sleep 60",
      "",
    ].join("\n"));
    const claudeMcpCallAgent = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-claude-mcp-call-agent",
      agentType: "claude",
      projectRoot: tempDir,
      sessionId: claudeMcpCallAgentSession,
      startupCommand: `/bin/sh ${claudeMcpCallAgentScriptPath}`,
      registerDelayMs: 250,
      mcpConfigured: true,
    });
    assert.equal(claudeMcpCallAgent.registration, "waiting for permission approval");
    const claudeMcpCallAgentTerminal = await json(`${baseUrl}/api/agents/ui-claude-mcp-call-agent/terminal`);
    assert.equal(claudeMcpCallAgentTerminal.terminal.permissionPrompt.kind, "mcp-registration-approval");
    assert.equal(claudeMcpCallAgentTerminal.terminal.actions[0].id, "approve-mcp-registration");
    assert.match(claudeMcpCallAgentTerminal.terminal.actions[0].description, /call_agent/);
    const claudeMcpCallAgentApproved = await postJson(`${baseUrl}/api/agents/ui-claude-mcp-call-agent/terminal/input`, {
      actionId: "approve-mcp-registration",
    });
    assert.equal(claudeMcpCallAgentApproved.registration, "unchanged");
    assert.match(claudeMcpCallAgentApproved.terminal.text, /approved-mcp-call-agent/);

    const claudeTrustScriptPath = join(tempDir, "claude-folder-trust-fixture.sh");
    writeFileSync(claudeTrustScriptPath, [
      "printf 'Accessing workspace:\\n\\n'",
      `printf '${tempDir}\\n\\n'`,
      "printf 'Quick safety check: Is this a project you created or one you trust?\\n'",
      "printf 'Claude Code'\"'\"'ll be able to read, edit, and execute files here.\\n\\n'",
      "printf '❯ 1. Yes, I trust this folder\\n'",
      "printf '  2. No, exit\\n\\n'",
      "printf 'Enter to confirm · Esc to cancel\\n'",
      "IFS= read -r approval",
      "printf 'trusted-folder:%s\\n' \"$approval\"",
      "sleep 60",
      "",
    ].join("\n"));
    const claudeTrust = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "ui-claude-folder-trust",
      agentType: "claude",
      projectRoot: tempDir,
      sessionId: claudeTrustSession,
      startupCommand: `/bin/sh ${claudeTrustScriptPath}`,
      registerDelayMs: 250,
      mcpConfigured: true,
    });
    assert.equal(claudeTrust.registration, "waiting for permission approval");
    const claudeTrustTerminal = await json(`${baseUrl}/api/agents/ui-claude-folder-trust/terminal`);
    assert.equal(claudeTrustTerminal.terminal.permissionPrompt.kind, "claude-folder-trust");
    assert.equal(claudeTrustTerminal.terminal.actions[0].id, "approve-claude-project-trust");
    const claudeTrustApproved = await postJson(`${baseUrl}/api/agents/ui-claude-folder-trust/terminal/input`, {
      actionId: "approve-claude-project-trust",
    });
    assert.equal(claudeTrustApproved.registration, "registration prompt sent to agent");
    assert.equal(claudeTrustApproved.agent.bootstrapStatus, "registration-pending");

    const registered = await postJson(`${baseUrl}/api/register`, {
      id: "http-smoke",
      name: "http-smoke",
      agentType: "shell",
      transport: "headless",
      sessionId: "http-smoke",
      projectRoot: "/tmp",
      capabilitySummary: "HTTP smoke helper for validating registration metadata.",
      capabilitySources: "manual smoke payload",
    });
    assert.equal(registered.agent.id, "http-smoke");
    assert.equal(registered.agent.capabilitySummary, "HTTP smoke helper for validating registration metadata.");
    assert.equal(registered.agent.capabilitySource, "generated");
    assert.equal(registered.agent.bootstrapStatus, "ready");
    assert.equal(registered.agent.registrationSource, "manual");
    assert.equal(registered.agent.registrationStatus, "confirmed");
    assert.ok(registered.agent.lastRegistrationAttemptAt);
    assert.ok(registered.agent.confirmedByAgentAt);
    assert.ok(registered.agent.capabilityUpdatedAt);
    assert.ok(registered.agent.lastCapabilityRefreshAt);

    const registeredState = await json(`${baseUrl}/api/state`);
    const registeredAgent = registeredState.agents.find((agent) => agent.id === "http-smoke");
    assert.ok(registeredAgent, "expected registered agent in HTTP UI state");
    assert.equal(registeredAgent.capabilitySource, "generated");
    assert.equal(registeredAgent.bootstrapStatus, "ready");
    assert.equal(registeredAgent.registrationStatus, "confirmed");
    assert.ok(registeredAgent.capabilityUpdatedAt);
    assert.ok(registeredAgent.lastCapabilityRefreshAt);

    const asked = await postJson(`${baseUrl}/api/ask`, {
      target: "http-smoke",
      task: "HTTP smoke request",
      timeoutMs: 1000,
    });
    assert.equal(asked.result.target, "http-smoke");
    const answeredRequest = findRequest(asked.state, asked.result.requestId);
    assert.equal(answeredRequest.sourceAgent, "main");
    assert.equal(answeredRequest.targetAgent, "http-smoke");
    assert.equal(answeredRequest.task, "HTTP smoke request");
    assert.equal(answeredRequest.status, "answered");
    assert.equal(answeredRequest.diagnosticStatus, "answered");
    assert.match(answeredRequest.answer, /Headless response from http-smoke/);
    assert.equal(answeredRequest.parserDiagnostics.kind, "parsed");
    assert.equal(answeredRequest.parserDiagnostics.startMarkerFound, true);
    assert.equal(answeredRequest.parserDiagnostics.endMarkerFound, true);
    assert.equal(answeredRequest.rawEvidence.kind, "transport_capture");
    assert.equal(answeredRequest.promptEvidence.kind, "prompt_envelope");
    assert.equal(answeredRequest.leaseStatus, "released");
    assert.ok(answeredRequest.leaseStartedAt);
    assert.ok(answeredRequest.leaseExpiresAt);
    assert.ok(answeredRequest.leaseReleasedAt);
    assert.equal(answeredRequest.leaseOwnerAgentId, "http-smoke");
    assert.equal(answeredRequest.leaseTargetSessionId, "http-smoke");
    assert.equal(typeof answeredRequest.rawEvidence.excerpt, "string");
    assert.match(answeredRequest.rawEvidence.excerpt, /MINA_AGENT_RESPONSE_START/);
    assert.equal(answeredRequest.rawEvidence.truncated, false);

    const archived = await postJson(`${baseUrl}/api/requests/${asked.result.requestId}/archive`, {});
    assert.equal(archived.result.status, "archived");
    assert.equal(archived.result.diagnosticStatus, "archived");
    assert.equal(archived.result.archivedFromStatus, "answered");
    const archivedRequest = findRequest(archived.state, asked.result.requestId);
    assert.equal(archivedRequest.status, "archived");
    assert.equal(archivedRequest.diagnosticStatus, "archived");
    assert.equal(archivedRequest.archivedFromStatus, "answered");
    assert.match(archivedRequest.answer, /Headless response from http-smoke/);
    assert.equal(archivedRequest.parserDiagnostics.kind, "parsed");
    assert.equal(archivedRequest.rawEvidence.kind, "transport_capture");

    const unarchived = await postJson(`${baseUrl}/api/requests/${asked.result.requestId}/unarchive`, {});
    assert.equal(unarchived.result.status, "answered");
    assert.equal(unarchived.result.diagnosticStatus, "answered");

    const invalidCancel = await expectPostJsonFailure(`${baseUrl}/api/requests/${asked.result.requestId}/cancel`, {});
    assert.equal(invalidCancel.status, 400);
    assert.match(invalidCancel.body.error, /Cannot cancel request/);

    const retried = await postJson(`${baseUrl}/api/requests/${asked.result.requestId}/retry`, {});
    assert.equal(retried.result.target, "http-smoke");
    assert.notEqual(retried.result.requestId, asked.result.requestId);
    const originalAfterRetry = findRequest(retried.state, asked.result.requestId);
    const retryRequest = findRequest(retried.state, retried.result.requestId);
    assert.equal(originalAfterRetry.retriedByRequestId, retried.result.requestId);
    assert.equal(retryRequest.retryOfRequestId, asked.result.requestId);
    assert.equal(retryRequest.status, "answered");

    const rearchived = await postJson(`${baseUrl}/api/requests/${asked.result.requestId}/archive`, {});
    assert.equal(findRequest(rearchived.state, asked.result.requestId).status, "archived");

    const timeoutAgent = await postJson(`${baseUrl}/api/agents/create-tmux`, {
      id: "http-timeout",
      agentType: "codex",
      projectRoot: tempDir,
      sessionId: timeoutSession,
      startupCommand: "/bin/sh",
      sendRegistrationPrompt: false,
      mcpConfigured: true,
    });
    assert.equal(timeoutAgent.agent.id, "http-timeout");
    const confirmedTimeoutAgent = await postJson(`${baseUrl}/api/register`, {
      id: "http-timeout",
      name: "http-timeout",
      agentType: "codex",
      transport: "tmux",
      sessionId: timeoutSession,
      projectRoot: tempDir,
      capabilitySummary: "Timeout smoke helper.",
      capabilitySources: "scripts/smoke-http.js",
    });
    assert.equal(confirmedTimeoutAgent.agent.registrationStatus, "confirmed");
    const timedOutAsk = await expectPostJsonFailure(`${baseUrl}/api/ask`, {
      target: "http-timeout",
      task: "HTTP timeout lease request",
      timeoutMs: 20,
    });
    assert.equal(timedOutAsk.status, 500);
    const timeoutRequest = timedOutAsk.body.state.requests.find((request) => request.targetAgent === "http-timeout");
    assert.equal(timeoutRequest.status, "timeout");
    assert.equal(timeoutRequest.diagnosticStatus, "timeout");
    assert.equal(timeoutRequest.leaseStatus, "orphaned");
    assert.ok(timeoutRequest.leaseStartedAt);
    assert.ok(timeoutRequest.leaseExpiresAt);
    assert.equal(timeoutRequest.leaseReleasedAt, undefined);
    assert.equal(timeoutRequest.leaseOwnerAgentId, "http-timeout");
    assert.equal(timeoutRequest.leaseTargetSessionId, timeoutSession);
    assert.equal(timeoutRequest.promptEvidence.kind, "prompt_envelope");
    assert.equal(timeoutRequest.rawEvidence.kind, "transport_capture");
    const timeoutAgentState = timedOutAsk.body.state.agents.find((agent) => agent.id === "http-timeout");
    assert.equal(timeoutAgentState.activeRequestId, timeoutRequest.id);
    assert.equal(timeoutAgentState.leaseStatus, "orphaned");
    assert.equal(timeoutAgentState.status, "busy");
    assert.match(timeoutAgentState.detail, /timed out/);

    const interrupted = await postJson(`${baseUrl}/api/requests/${timeoutRequest.id}/interrupt`, {});
    assert.equal(interrupted.result.leaseStatus, "orphaned");
    assert.equal(interrupted.result.recoveryStatus, "interrupted");
    assert.equal(interrupted.result.recoveryEvents.at(-1).action, "interrupt");
    assert.equal(interrupted.result.recoveryEvents.at(-1).terminalTarget, timeoutSession);
    const interruptedAgent = interrupted.state.agents.find((agent) => agent.id === "http-timeout");
    assert.equal(interruptedAgent.activeRequestId, timeoutRequest.id);
    assert.equal(interruptedAgent.leaseStatus, "orphaned");

    const recovered = await postJson(`${baseUrl}/api/requests/${timeoutRequest.id}/recover`, {});
    assert.equal(recovered.result.leaseStatus, "released");
    assert.equal(recovered.result.recoveryStatus, "recovered");
    assert.ok(recovered.result.leaseReleasedAt);
    assert.equal(recovered.result.recoveryEvents.at(-1).action, "recover");
    const recoveredAgent = recovered.state.agents.find((agent) => agent.id === "http-timeout");
    assert.equal(recoveredAgent.activeRequestId, undefined);
    assert.equal(recoveredAgent.leaseStatus, "released");

    await postJson(`${baseUrl}/api/register`, {
      id: "http-timeout",
      name: "http-timeout",
      agentType: "codex",
      transport: "headless",
      sessionId: timeoutSession,
      projectRoot: tempDir,
      capabilitySummary: "Recovered timeout helper.",
      capabilitySources: "smoke fixture",
      sessionFingerprint: timeoutSession,
    });
    const afterRecover = await postJson(`${baseUrl}/api/ask`, {
      target: "http-timeout",
      task: "HTTP request after recovery",
      timeoutMs: 1000,
    });
    assert.equal(afterRecover.result.target, "http-timeout");
    const afterRecoverRequest = findRequest(afterRecover.state, afterRecover.result.requestId);
    assert.equal(afterRecoverRequest.status, "answered");
    assert.equal(afterRecoverRequest.leaseStatus, "released");

    await postJson(`${baseUrl}/api/register`, {
      id: "http-timeout",
      name: "http-timeout",
      agentType: "codex",
      transport: "tmux",
      sessionId: timeoutSession,
      projectRoot: tempDir,
      capabilitySummary: "Timeout archive helper.",
      capabilitySources: "smoke fixture",
      sessionFingerprint: timeoutSession,
    });
    const archiveTimedOutAsk = await expectPostJsonFailure(`${baseUrl}/api/ask`, {
      target: "http-timeout",
      task: "HTTP timeout archive request",
      timeoutMs: 20,
    });
    assert.equal(archiveTimedOutAsk.status, 500);
    const archiveTimeoutRequest = archiveTimedOutAsk.body.state.requests.find((request) =>
      request.targetAgent === "http-timeout" && request.task === "HTTP timeout archive request"
    );
    assert.equal(archiveTimeoutRequest.leaseStatus, "orphaned");
    const archivedTimeout = await postJson(`${baseUrl}/api/requests/${archiveTimeoutRequest.id}/archive`, {});
    assert.equal(archivedTimeout.result.status, "archived");
    assert.equal(archivedTimeout.result.leaseStatus, "released");
    assert.equal(archivedTimeout.result.recoveryStatus, "recovered");
    assert.equal(archivedTimeout.result.recoveryEvents.at(-1).action, "archive");
    const archivedTimeoutAgent = archivedTimeout.state.agents.find((agent) => agent.id === "http-timeout");
    assert.equal(archivedTimeoutAgent.activeRequestId, undefined);
    assert.equal(archivedTimeoutAgent.leaseStatus, "released");

    await postJson(`${baseUrl}/api/register`, {
      id: "http-timeout",
      name: "http-timeout",
      agentType: "codex",
      transport: "headless",
      sessionId: timeoutSession,
      projectRoot: tempDir,
      capabilitySummary: "Archive recovered timeout helper.",
      capabilitySources: "smoke fixture",
      sessionFingerprint: timeoutSession,
    });
    const afterArchive = await postJson(`${baseUrl}/api/ask`, {
      target: "http-timeout",
      task: "HTTP request after orphan archive",
      timeoutMs: 1000,
    });
    assert.equal(findRequest(afterArchive.state, afterArchive.result.requestId).status, "answered");

    const stale = await postJson(`${baseUrl}/api/requests/archive-stale`, { olderThanMs: 0 });
    assert.ok(Array.isArray(stale.archived));

    const deleted = await deleteJson(`${baseUrl}/api/agents/http-smoke`);
    assert.equal(deleted.agent.id, "http-smoke");

    const initialized = await postMcp({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {},
    });
    assert.equal(initialized.result.serverInfo.name, "mina-ai-router");
    assert.equal(initialized.result.serverInfo.version, packageVersion);

    const tools = await postMcp({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    });
    assert.deepEqual(
      tools.result.tools.map((tool) => tool.name).sort(),
      ["call_agent", "get_request_status", "list_agents", "register_agent"],
    );

    console.log("http smoke passed");
  } finally {
    try {
      execFileSync("tmux", ["kill-session", "-t", uiSession], {
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch {
      // Temporary UI-created session may not exist.
    }
    try {
      execFileSync("tmux", ["kill-session", "-t", uiPromptSession], {
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch {
      // Temporary prompt-created session may not exist.
    }
    try {
      execFileSync("tmux", ["kill-session", "-t", promptSession], {
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch {
      // Temporary permission fixture session may not exist.
    }
    try {
      execFileSync("tmux", ["kill-session", "-t", promptAdvanceSession], {
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch {
      // Temporary permission advance fixture session may not exist.
    }
    for (const session of [
      passiveCodexSession,
      cliPendingSession,
      claudeIdleConfirmedSession,
      codexMcpApprovalSession,
      codexMcpListSession,
      claudeScopedSession,
      claudeReadOnlySession,
      claudeCwdReadOnlySession,
      claudeDevNullReadOnlySession,
      claudeTmuxContextSession,
      claudeMcpApprovalSession,
      claudeMcpListSession,
      claudeMcpCallAgentSession,
      claudeTrustSession,
    ]) {
      try {
        execFileSync("tmux", ["kill-session", "-t", session], {
          stdio: ["ignore", "ignore", "ignore"],
        });
      } catch {
        // Temporary fixture session may not exist.
      }
    }
    try {
      execFileSync("tmux", ["kill-session", "-t", timeoutSession], {
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch {
      // Temporary timeout fixture session may not exist.
    }
    try {
      execFileSync("tmux", ["kill-session", "-t", `mina-http-mcp-${process.pid}`], {
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch {
      // Temporary MCP preflight fixture session may not exist.
    }
    server.kill("SIGTERM");
  }
}

async function waitForServer() {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (/listen EPERM/.test(serverLog)) {
      assertUiFreshnessSurfaceFromBuild();
      console.log([
        "http smoke skipped: local HTTP listener denied by environment",
        `baseUrl: ${baseUrl}`,
        serverLog.trim(),
      ].join("\n"));
      return false;
    }

    try {
      await text(`${baseUrl}/`);
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("HTTP server did not become ready");
}

async function assertUiFreshnessSurface(html) {
  const scriptPath = html.match(/type="module"[^>]+src="([^"]+index-[^"]+\.js)"/)?.[1];
  const cssPath = html.match(/rel="stylesheet"[^>]+href="([^"]+index-[^"]+\.css)"/)?.[1];
  assert.ok(scriptPath, "expected bundled UI script");
  assert.ok(cssPath, "expected bundled UI stylesheet");

  const script = await text(`${baseUrl}${scriptPath}`);
  const stylesheet = await text(`${baseUrl}${cssPath}`);
  assertUiFreshnessSurfaceContent(script, stylesheet);
}

function assertUiFreshnessSurfaceFromBuild() {
  const publicDir = join(process.cwd(), "dist", "apps", "http-server", "src", "public");
  const html = readFileSync(join(publicDir, "index.html"), "utf8");
  const scriptPath = html.match(/type="module"[^>]+src="(?:\.?\/)?assets\/(index-[^"]+\.js)"/)?.[1];
  const cssPath = html.match(/rel="stylesheet"[^>]+href="(?:\.?\/)?assets\/(index-[^"]+\.css)"/)?.[1];
  assert.ok(scriptPath, "expected bundled UI script");
  assert.ok(cssPath, "expected bundled UI stylesheet");
  const script = readFileSync(join(publicDir, "assets", scriptPath), "utf8");
  const stylesheet = readFileSync(join(publicDir, "assets", cssPath), "utf8");
  assertUiFreshnessSurfaceContent(script, stylesheet);
}

function assertUiFreshnessSurfaceContent(script, stylesheet) {
  assert.match(script, /data-capability-state/);
  assert.match(script, /data-capability-quality/);
  assert.match(script, /capability-card/);
  assert.match(script, /Capability quality/);
  assert.match(script, /Can answer/);
  assert.match(script, /Evidence/);
  assert.match(script, /No answerable domains recorded/);
  assert.match(script, /Missing/);
  assert.match(script, /Stale/);
  assert.match(script, /Fresh/);
  assert.match(script, /Manual/);
  assert.match(script, /Edit Capabilities/);
  assert.match(script, /Copy Refresh Command/);
  assert.match(script, /mair agent refresh-capabilities/);
  assert.match(script, /data-health-status/);
  assert.match(script, /needs-attention/);
  assert.match(script, /Last seen/);
  assert.match(script, /needs attention/);
  assert.doesNotMatch(script, /Port 3333/);
  assert.match(script, /Terminal Unavailable/);
  assert.match(script, /direct terminal control is unavailable/);
  assert.match(script, /ask-agent-task/);

  assert.match(stylesheet, /capability-fresh/);
  assert.match(stylesheet, /capability-profile/);
  assert.match(stylesheet, /profile-tags/);
  assert.match(stylesheet, /quality-strong/);
  assert.match(stylesheet, /quality-thin/);
  assert.match(stylesheet, /capability-stale/);
  assert.match(stylesheet, /capability-manual/);
  assert.match(stylesheet, /capability-missing/);
  assert.match(stylesheet, /health-grid/);
  assert.match(stylesheet, /needs-attention/);
  assert.match(stylesheet, /floating-inspector/);
  assert.match(stylesheet, /max-height:min\(34rem,100vh - 1\.5rem\)/);
  assert.match(stylesheet, /width:100vw/);
  assert.match(stylesheet, /max-height:72vh/);
  assert.match(stylesheet, /activity-body/);
  assert.match(stylesheet, /overflow:auto/);
  assertStaticVisualFixture(stylesheet);
}

function assertFirstUserUiReviewAffordancesFromSource() {
  const commandBar = readFileSync("apps/http-server/ui/src/features/CommandBar.tsx", "utf8");
  assert.doesNotMatch(commandBar, /Port 3333/, "CommandBar must not hard-code the default port");
  assert.match(commandBar, /portLabelFromMcpUrl/, "CommandBar should derive the displayed port from the MCP URL");
  assert.match(commandBar, /new URL\(mcpUrl\)/, "CommandBar port derivation should parse the authoritative MCP URL");

  const inspector = readFileSync("apps/http-server/ui/src/features/Inspector.tsx", "utf8");
  assert.match(inspector, /hasTmuxTerminal/, "Inspector should branch terminal controls by transport");
  assert.match(inspector, /direct terminal control is unavailable/, "Inspector should explain unavailable non-tmux terminal control");
  assert.match(inspector, /hasTmuxTerminal \?/, "Inspector should render Open Terminal only for tmux agents");
  assert.match(inspector, /isRouteReady/, "Inspector Ask action should use route readiness");
  assert.match(inspector, /disabled=\{!routeReady\}/, "Inspector Ask action should be disabled for non-ready agents");
  assert.match(inspector, /routeBlockedReason/, "Inspector should show route blocker guidance");

  const menus = readFileSync("apps/http-server/ui/src/features/Menus.tsx", "utf8");
  assert.match(menus, /Terminal Unavailable/, "Agent context menu should label non-tmux terminal action as unavailable");
  assert.match(menus, /isRouteReady/, "Agent context menu Ask action should use route readiness");
  assert.match(menus, /disabled=\{!routeReady\}/, "Agent context menu Ask action should be disabled for non-ready agents");

  const askForm = readFileSync("apps/http-server/ui/src/features/AskAgentForm.tsx", "utf8");
  assert.match(askForm, /htmlFor=\{taskInputId\}/, "Ask form Task label should be explicitly associated");
  assert.match(askForm, /id=\{taskInputId\}/, "Ask form textarea should expose an explicit id");

  const detailsForm = readFileSync("apps/http-server/ui/src/features/AgentDetailsForm.tsx", "utf8");
  assert.match(detailsForm, /htmlFor=\{capabilitySummaryId\}/, "Capability summary label should be explicitly associated");
  assert.match(detailsForm, /id=\{capabilitySummaryId\}/, "Capability summary textarea should expose an explicit id");
  assert.match(detailsForm, /htmlFor=\{capabilitySourcesId\}/, "Capability sources label should be explicitly associated");
  assert.match(detailsForm, /id=\{capabilitySourcesId\}/, "Capability sources input should expose an explicit id");

  const createForm = readFileSync("apps/http-server/ui/src/features/CreateTmuxAgentForm.tsx", "utf8");
  assert.match(createForm, /onCreated\(result\.agent, result\.state\)/, "Create form should return the API state with the created agent");

  const app = readFileSync("apps/http-server/ui/src/App.tsx", "utf8");
  assert.match(app, /onCreated=\{\(agent, nextState\)/, "App should receive create-agent state in the callback");
  assert.match(app, /setState\(nextState\)/, "App should apply create-agent state immediately without relying on manual refresh");
  assert.match(app, /!isRouteReady\(agent\)/, "App should guard stale Ask modals with route readiness");
  assert.doesNotMatch(app, /onCreated=\{\(agent\) => \{\s*setSelectedAgentId\(agent\.id\);\s*void refresh\(\);/s);

  const terminalPanel = readFileSync("apps/http-server/ui/src/features/TerminalPanel.tsx", "utf8");
  assert.match(terminalPanel, /terminal\.actions/, "Terminal panel should render guided bootstrap actions");
  assert.match(terminalPanel, /runAction/, "Terminal panel should execute prompt-specific actions");
  assert.match(terminalPanel, /Guided bootstrap action is available/, "Terminal status should explain guided actions");
}

function assertStaticVisualFixture(stylesheet) {
  const desktopWidth = 1280;
  const mobileWidth = 390;
  const desktopInspectorWidth = Math.min(24 * 16, desktopWidth - 2 * 16);
  const mobileInspectorWidth = mobileWidth;
  assert.ok(desktopInspectorWidth <= desktopWidth, "desktop inspector should fit within viewport");
  assert.ok(mobileInspectorWidth <= mobileWidth, "mobile inspector should fit within viewport");
  assert.match(stylesheet, /flex-wrap:wrap/);
  assert.match(stylesheet, /flex:(1 1 )?10rem/);
  assert.match(stylesheet, /overflow-wrap:anywhere/);
  assert.match(stylesheet, /min-width:48rem/);
  assert.match(stylesheet, /activity-body\{[^}]*overflow:auto/);

  const visualFixturePath = join(tempDir, "capability-freshness-visual-fixture.html");
  writeFileSync(visualFixturePath, buildStaticVisualFixture(stylesheet), "utf8");
  const fixture = readFileSync(visualFixturePath, "utf8");
  assert.match(fixture, /data-viewport="desktop"/);
  assert.match(fixture, /data-viewport="mobile"/);
  assert.match(fixture, /data-capability-state="missing"/);
  assert.match(fixture, /data-capability-state="stale"/);
  assert.match(fixture, /data-capability-state="fresh"/);
  assert.match(fixture, /data-capability-state="manual"/);
  assert.match(fixture, /data-capability-quality="strong"/);
  assert.match(fixture, /profile-tag/);
  assert.match(fixture, /Copy Refresh Command/);
  assert.match(fixture, /Edit Capabilities/);
  assert.match(fixture, /activity-table/);
  console.log(`visual fixture: ${visualFixturePath}`);
  assertRenderedVisualFixture(stylesheet);
}

function buildStaticVisualFixture(stylesheet) {
  const cards = [
    ["missing", "Missing", "missing", "unknown source", "No capability notice registered yet.", "No sources recorded."],
    ["stale", "Stale", "thin", "agent-generated", "Stale generated capability notice.", "AGENTS.md"],
    ["fresh", "Fresh", "strong", "agent-generated", "Fresh generated capability notice.", "README.md"],
    ["manual", "Manual", "strong", "manual edit", "Operator-curated capability notice.", "operator notes"],
  ].map(([state, label, quality, source, summary, sources]) => `
    <div class="capability-card capability-${state}" data-capability-state="${state}" data-capability-source="${source}" data-capability-quality="${quality}">
      <div class="capability-card-head">
        <span class="status capability-status ${state}">${label}</span>
        <span class="status capability-status quality-${quality}">${quality}</span>
        <span class="subtitle">${source}</span>
      </div>
      <p>${summary}</p>
      <p class="subtitle">${sources}</p>
      <div class="capability-profile">
        <div class="profile-row"><span class="subtitle">Quality</span><span>Profile quality is visible.</span></div>
        <div class="profile-row"><span class="subtitle">Can answer</span><div class="profile-tags"><span class="profile-tag">routing workflow</span><span class="profile-tag">request diagnostics</span></div></div>
        <div class="profile-row"><span class="subtitle">Evidence</span><div class="profile-tags"><span class="profile-tag">${sources}</span></div></div>
      </div>
      <div class="capability-meta">
        <span>Updated ${state === "missing" ? "never" : "2026-06-29 00:00"}</span>
        <span>${state === "manual" ? "This capability card was edited by an operator and is not agent-generated." : "Generated capability metadata state is visible."}</span>
      </div>
      <div class="capability-actions">
        <button class="secondary"><span class="material-symbols-outlined">bolt</span>Edit Capabilities</button>
        <button class="ghost"><span class="material-symbols-outlined">refresh</span>Copy Refresh Command</button>
      </div>
    </div>`).join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>${stylesheet}</style>
<style>
  body { overflow: auto; padding: 1rem; }
  .visual-frame { border: 1px solid var(--outline-soft); margin: 0 0 1rem; overflow: hidden; position: relative; }
  .visual-frame.desktop { width: 1280px; height: 720px; }
  .visual-frame.mobile { width: 390px; height: 844px; }
  .visual-frame .floating-inspector { position: absolute; }
  .visual-frame .floating-activity { position: absolute; height: 12rem; }
</style>
</head>
<body>
  <main class="visual-frame desktop" data-viewport="desktop">
    <aside class="inspector floating-inspector" aria-label="Selected agent inspector">
      <div class="inspector-head"><div><h2>Agent Details</h2><p class="subtitle">ui-stale</p></div><button class="ghost">Hide</button></div>
      <div class="inspector-body">${cards}</div>
    </aside>
    <section class="activity floating-activity">
      <div class="activity-head"><div><h2>System Activity</h2><p class="subtitle">Recent routed requests from the local state store.</p></div></div>
      <div class="activity-body"><table class="activity-table"><tbody><tr><td>request-id-that-is-long-enough-to-force-table-scroll</td><td>answered</td></tr></tbody></table></div>
    </section>
  </main>
  <main class="visual-frame mobile" data-viewport="mobile">
    <aside class="inspector floating-inspector" aria-label="Selected agent inspector">
      <div class="inspector-head"><div><h2>Agent Details</h2><p class="subtitle">ui-manual</p></div><button class="ghost">Hide</button></div>
      <div class="inspector-body">${cards}</div>
    </aside>
    <section class="activity floating-activity">
      <div class="activity-head"><div><h2>System Activity</h2><p class="subtitle">Recent routed requests from the local state store.</p></div></div>
      <div class="activity-body"><table class="activity-table"><tbody><tr><td>mobile-request-id-that-is-long-enough-to-force-table-scroll</td><td>waiting</td></tr></tbody></table></div>
    </section>
  </main>
</body>
</html>`;
}

function assertRenderedVisualFixture(stylesheet) {
  const chromePath = findChromePath();
  if (!chromePath) {
    console.log("visual render skipped: no local Chrome/Chromium binary found");
    return;
  }

  const viewports = [
    { name: "desktop", width: 1280, height: 720 },
    { name: "mobile", width: 390, height: 844 },
  ];

  for (const viewport of viewports) {
    const pagePath = join(tempDir, `capability-freshness-${viewport.name}.html`);
    const screenshotPath = join(tempDir, `capability-freshness-${viewport.name}.png`);
    writeFileSync(pagePath, buildRenderedVisualPage(stylesheet, viewport.name), "utf8");
    const rendered = renderWithChrome(chromePath, pagePath, screenshotPath, viewport);
    if (!rendered) {
      continue;
    }
    const measurement = extractVisualMeasurement(rendered, viewport.name);
    assert.ok(
      measurement.viewport.width >= viewport.width
        && measurement.viewport.width <= Math.max(viewport.width, 500),
      `${viewport.name} viewport width should match the requested size or Chrome's minimum content width`,
    );
    assert.ok(
      measurement.viewport.height >= Math.floor(viewport.height * 0.6)
        && measurement.viewport.height <= viewport.height,
      `${viewport.name} viewport height should be a usable Chrome content area`,
    );
    assert.ok(
      measurement.document.scrollWidth <= measurement.viewport.width + 1,
      `${viewport.name} page should not horizontally overflow`,
    );
    for (const panel of measurement.panels) {
      assert.ok(panel.present, `${viewport.name} ${panel.name} should render`);
      assert.ok(panel.withinViewportX, `${viewport.name} ${panel.name} should fit horizontally in viewport`);
      assert.ok(panel.clientWidth > 0, `${viewport.name} ${panel.name} should have width`);
      assert.ok(panel.clientHeight > 0, `${viewport.name} ${panel.name} should have height`);
      assert.ok(panel.scrollWidth <= panel.clientWidth + 1, `${viewport.name} ${panel.name} should contain horizontal overflow`);
    }
    const activityBody = measurement.containers.find((container) => container.name === "activity-body");
    assert.ok(activityBody.present, `${viewport.name} activity body should render`);
    assert.ok(activityBody.scrollWidth >= activityBody.clientWidth, `${viewport.name} activity body should contain table width`);
    assert.equal(measurement.capabilityStates.sort().join(","), "fresh,manual,missing,stale");
    console.log(`visual render ${viewport.name}: ${screenshotPath}`);
  }
}

function findChromePath() {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

function renderWithChrome(chromePath, pagePath, screenshotPath, viewport) {
  try {
    return execFileSync(chromePath, [
      "--headless=new",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${join(tempDir, `chrome-${viewport.name}`)}`,
      `--window-size=${viewport.width},${viewport.height}`,
      "--hide-scrollbars",
      "--virtual-time-budget=1000",
      `--screenshot=${screenshotPath}`,
      "--dump-dom",
      pathToFileURL(pagePath).href,
    ], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10000,
    });
  } catch (error) {
    const reason = error.signal ? `signal ${error.signal}` : `exit ${error.status}`;
    console.log(`visual render skipped: Chrome could not run in this environment (${reason})`);
    return "";
  }
}

function extractVisualMeasurement(rendered, viewportName) {
  const match = rendered.match(/<pre id="visual-measurement">([^<]+)<\/pre>/);
  assert.ok(match, `${viewportName} visual measurement should be present in rendered DOM`);
  return JSON.parse(match[1].replace(/&quot;/g, "\"").replace(/&amp;/g, "&"));
}

function buildRenderedVisualPage(stylesheet, viewportName) {
  const cards = [
    ["missing", "Missing", "missing", "unknown source", "No capability notice registered yet.", "No sources recorded."],
    ["stale", "Stale", "thin", "agent-generated", "Stale generated capability notice.", "AGENTS.md"],
    ["fresh", "Fresh", "strong", "agent-generated", "Fresh generated capability notice.", "README.md"],
    ["manual", "Manual", "strong", "manual edit", "Operator-curated capability notice.", "operator notes"],
  ].map(([state, label, quality, source, summary, sources]) => `
    <div class="capability-card capability-${state}" data-capability-state="${state}" data-capability-source="${source}" data-capability-quality="${quality}">
      <div class="capability-card-head">
        <span class="status capability-status ${state}">${label}</span>
        <span class="status capability-status quality-${quality}">${quality}</span>
        <span class="subtitle">${source}</span>
      </div>
      <p>${summary}</p>
      <p class="subtitle">${sources}</p>
      <div class="capability-profile">
        <div class="profile-row"><span class="subtitle">Quality</span><span>Profile quality is visible.</span></div>
        <div class="profile-row"><span class="subtitle">Can answer</span><div class="profile-tags"><span class="profile-tag">routing workflow</span><span class="profile-tag">request diagnostics</span></div></div>
        <div class="profile-row"><span class="subtitle">Evidence</span><div class="profile-tags"><span class="profile-tag">${sources}</span></div></div>
      </div>
      <div class="capability-meta">
        <span>Updated ${state === "missing" ? "never" : "2026-06-29 00:00"}</span>
        <span>${state === "manual" ? "This capability card was edited by an operator and is not agent-generated." : "Generated capability metadata state is visible."}</span>
      </div>
      <div class="capability-actions">
        <button class="secondary"><span class="material-symbols-outlined">bolt</span>Edit Capabilities</button>
        <button class="ghost"><span class="material-symbols-outlined">refresh</span>Copy Refresh Command</button>
      </div>
    </div>`).join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>${stylesheet}</style>
<style>
  html, body, #root { width: 100%; min-height: 100%; margin: 0; }
  body { overflow-x: hidden; }
  .visual-app { min-height: 100vh; position: relative; background: var(--surface-low); }
  .visual-app .floating-activity { height: 12rem; }
</style>
</head>
<body data-viewport="${viewportName}">
  <main class="visual-app">
    <aside class="inspector floating-inspector" aria-label="Selected agent inspector">
      <div class="inspector-head"><div><h2>Agent Details</h2><p class="subtitle">ui-${viewportName}</p></div><button class="ghost">Hide</button></div>
      <div class="inspector-body">
        <div class="section"><div class="section-title">Capabilities</div>${cards}</div>
      </div>
    </aside>
    <section class="activity floating-activity">
      <div class="activity-head"><div><h2>System Activity</h2><p class="subtitle">Recent routed requests from the local state store.</p></div></div>
      <div class="activity-body"><table class="activity-table"><tbody><tr><td>${viewportName}-request-id-that-is-long-enough-to-force-contained-table-scroll</td><td>answered</td></tr></tbody></table></div>
    </section>
  </main>
  <pre id="visual-measurement"></pre>
  <script>
    const panelFor = (name, selector) => {
      const element = document.querySelector(selector);
      if (!element) return { name, present: false };
      const rect = element.getBoundingClientRect();
      return {
        name,
        present: true,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        clientWidth: element.clientWidth,
        clientHeight: element.clientHeight,
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight,
        withinViewportX: rect.left >= -1 && rect.right <= window.innerWidth + 1,
      };
    };
    const measurement = {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      },
      panels: [
        panelFor("inspector", ".floating-inspector"),
        panelFor("activity", ".floating-activity"),
      ],
      containers: [
        panelFor("inspector-body", ".inspector-body"),
        panelFor("activity-body", ".activity-body"),
      ],
      capabilityStates: Array.from(document.querySelectorAll("[data-capability-state]")).map((element) => element.getAttribute("data-capability-state")),
    };
    document.getElementById("visual-measurement").textContent = JSON.stringify(measurement);
  </script>
</body>
</html>`;
}

async function json(url) {
  const response = await getWithRetry(url);
  if (!response.ok) throw new Error(`${url} failed: ${response.status}`);
  return response.json();
}

async function text(url) {
  const response = await getWithRetry(url);
  if (!response.ok) throw new Error(`${url} failed: ${response.status}`);
  return response.text();
}

async function getWithRetry(url) {
  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await fetch(url);
    } catch (error) {
      lastError = error;
      const code = error?.cause?.code ?? error?.code;
      if (!["ECONNRESET", "ECONNREFUSED", "EPIPE"].includes(code)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function sleep(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function postMcp(body) {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`/mcp failed: ${response.status}`);
  return response.json();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${url} failed: ${response.status}`);
  return response.json();
}

async function expectPostJsonFailure(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(response.ok, false);
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function patchJson(url, body) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${url} failed: ${response.status}`);
  return response.json();
}

async function deleteJson(url) {
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) throw new Error(`${url} failed: ${response.status}`);
  return response.json();
}

function findRequest(state, requestId) {
  const request = state.requests.find((candidate) => candidate.id === requestId);
  assert.ok(request, `expected request ${requestId} in HTTP state`);
  return request;
}

function writeFakeClientBinaries() {
  mkdirSync(fakeBinDir, { recursive: true });
  writeFileSync(fakeClientLog, "");
  const script = [
    "#!/bin/sh",
    "client=$(basename \"$0\")",
    "printf '%s cwd=%s %s\\n' \"$client\" \"$(pwd)\" \"$*\" >> \"$MINA_FAKE_CLIENT_LOG\"",
    "if [ \"$1\" = 'mcp' ] && [ \"$2\" = 'get' ]; then",
    "  if [ \"$3\" = 'mina-ai-router' ]; then",
    "    printf 'name: %s\\nurl: %s\\n' \"$3\" \"$FAKE_MCP_URL\"",
    "    exit 0",
    "  fi",
    "  exit 1",
    "fi",
    "if [ \"$1\" = 'mcp' ] && [ \"$2\" = 'list' ]; then",
    "  if [ \"$client\" = 'claude' ] && [ \"$(pwd)\" != \"$FAKE_PROJECT_ROOT\" ]; then",
    "    printf 'gitnexus connected\\n'",
    "    exit 0",
    "  fi",
    "  printf 'mina-ai-router %s connected\\n' \"$FAKE_MCP_URL\"",
    "  exit 0",
    "fi",
    "exit 0",
    "",
  ].join("\n");
  for (const client of ["codex", "claude"]) {
    const file = join(fakeBinDir, client);
    writeFileSync(file, script);
    chmodSync(file, 0o755);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

main().catch((error) => {
  console.error(error);
  server.kill("SIGTERM");
  process.exitCode = 1;
});
