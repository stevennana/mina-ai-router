const assert = require("node:assert/strict");
const {
  AgentRegistry,
  AgentRouter,
  buildMcpPreflight,
  RequestStore,
  buildPromptEnvelope,
  inspectMarkedResponse,
  parseMarkedResponse,
} = require("../dist/packages/core/src");
const { DefaultTransportRegistry, detectAgentPermissionPrompt, HeadlessTransport } = require("../dist/packages/transports/src");

async function main() {
  testParser();
  testPromptEnvelope();
  testRegistryCapabilityMetadata();
  testRegistryIdempotentRegistration();
  testMcpPreflight();
  testPermissionPromptDetection();
  testRequestStoreDiagnostics();
  await testRouterLifecycle();
  await testRouterCancelStaysTerminal();
  await testRouterParseFailure();
  await testRouterTimeout();
  await testRouterHealthClassification();
  console.log("core tests passed");
}

function testMcpPreflight() {
  const codexMissing = buildMcpPreflight({
    agentType: "codex",
    mcpUrl: "http://127.0.0.1:3333/mcp",
  });
  assert.equal(codexMissing.status, "missing");
  assert.equal(codexMissing.canSendSelfRegistrationPrompt, false);
  assert.equal(codexMissing.mcpSetupCommand, "codex mcp add mina-ai-router --url http://127.0.0.1:3333/mcp");
  assert.match(codexMissing.nextAction, /codex mcp add/);

  const claudeConfigured = buildMcpPreflight({
    agentType: "claude",
    mcpUrl: "http://127.0.0.1:3333/mcp",
    configuredUrl: "http://127.0.0.1:3333/mcp",
  });
  assert.equal(claudeConfigured.status, "configured");
  assert.equal(claudeConfigured.canSendSelfRegistrationPrompt, true);
  assert.equal(claudeConfigured.mcpSetupCommand, "claude mcp add --transport http mina-ai-router http://127.0.0.1:3333/mcp");

  const stale = buildMcpPreflight({
    agentType: "codex",
    mcpUrl: "http://127.0.0.1:3333/mcp",
    configuredUrl: "http://127.0.0.1:9999/mcp",
  });
  assert.equal(stale.status, "stale");
  assert.equal(stale.canSendSelfRegistrationPrompt, false);
  assert.match(stale.mcpPreflightDetail, /9999/);

  const unsupported = buildMcpPreflight({
    agentType: "gemini",
    mcpUrl: "http://127.0.0.1:3333/mcp",
  });
  assert.equal(unsupported.status, "unsupported");
  assert.equal(unsupported.canSendSelfRegistrationPrompt, false);
}

function testPermissionPromptDetection() {
  const codexAgent = {
    id: "codex",
    name: "codex",
    agentType: "codex",
    projectRoot: "/tmp/project",
    transport: "tmux",
    sessionId: "codex-session",
  };
  const claudeAgent = {
    id: "claude",
    name: "claude",
    agentType: "claude",
    projectRoot: "/tmp/project",
    transport: "tmux",
    sessionId: "claude-session",
  };

  const codexPrompt = detectAgentPermissionPrompt(
    codexAgent,
    "Do you trust the contents of this directory?\nPress enter to continue",
  );
  assert.equal(codexPrompt.client, "codex");
  assert.equal(codexPrompt.kind, "directory-trust");
  assert.match(codexPrompt.action, /tmux attach -t codex-session/);

  const claudePrompt = detectAgentPermissionPrompt(
    claudeAgent,
    "Claude needs your permission to read files in this project. Press Enter to continue.",
  );
  assert.equal(claudePrompt.client, "claude");
  assert.equal(claudePrompt.kind, "permission-approval");
  assert.match(claudePrompt.action, /tmux attach -t claude-session/);

  assert.equal(detectAgentPermissionPrompt(codexAgent, "ready for input"), undefined);
}

function testRegistryCapabilityMetadata() {
  const registry = new AgentRegistry([
    {
      id: "payment",
      name: "payment",
      agentType: "gemini",
      projectRoot: "/tmp/payment",
      transport: "headless",
      sessionId: "payment",
      capabilitySummary: "Existing manual summary.",
      capabilitySources: "manual notes",
      capabilitySource: "manual",
      capabilityUpdatedAt: "2026-01-01T00:00:00.000Z",
    },
  ]);

  const merged = registry.register({
    id: "payment",
    name: "payment",
    agentType: "gemini",
    projectRoot: "/tmp/payment",
    transport: "headless",
    sessionId: "payment",
  });
  assert.equal(merged.capabilitySummary, "Existing manual summary.");
  assert.equal(merged.capabilitySource, "manual");
  assert.equal(merged.bootstrapStatus, "ready");
  assert.equal(merged.registrationSource, "unknown");
  assert.equal(merged.registrationStatus, "confirmed");

  const placeholder = registry.register({
    id: "payment",
    name: "payment",
    agentType: "gemini",
    projectRoot: "/tmp/payment",
    transport: "headless",
    sessionId: "payment",
    bootstrapStatus: "created",
    registrationSource: "web-ui",
    registrationStatus: "pending",
    lastRegistrationAttemptAt: "2026-01-01T00:01:00.000Z",
    sessionFingerprint: "payment-session",
  });
  assert.equal(placeholder.bootstrapStatus, "created");
  assert.equal(placeholder.registrationSource, "web-ui");
  assert.equal(placeholder.registrationStatus, "pending");
  assert.equal(placeholder.lastRegistrationAttemptAt, "2026-01-01T00:01:00.000Z");
  assert.equal(placeholder.sessionFingerprint, "payment-session");

  const refreshed = registry.updateCapabilities("payment", {
    summary: "Generated summary.",
    sources: "AGENTS.md, package.json",
    source: "generated",
    refreshedAt: "2026-01-02T00:00:00.000Z",
  });
  assert.equal(refreshed.capabilitySummary, "Generated summary.");
  assert.equal(refreshed.capabilitySource, "generated");
  assert.equal(refreshed.capabilityUpdatedAt, "2026-01-02T00:00:00.000Z");
  assert.equal(refreshed.lastCapabilityRefreshAt, "2026-01-02T00:00:00.000Z");
  assert.equal(refreshed.bootstrapStatus, "created");
  assert.equal(refreshed.registrationStatus, "pending");
}

function testRegistryIdempotentRegistration() {
  const registry = new AgentRegistry();

  const placeholder = registry.register({
    id: "payment",
    name: "payment",
    agentType: "codex",
    projectRoot: "/tmp/payment",
    transport: "tmux",
    sessionId: "payment-session",
    bootstrapStatus: "created",
    registrationSource: "web-ui",
    registrationStatus: "pending",
    lastRegistrationAttemptAt: "2026-01-01T00:00:00.000Z",
    sessionFingerprint: "payment-session",
  });
  assert.equal(placeholder.registrationHistory.length, 1);
  assert.equal(placeholder.registrationHistory[0].source, "web-ui");
  assert.equal(placeholder.registrationHistory[0].status, "pending");

  const confirmed = registry.register({
    id: "payment",
    name: "payment",
    agentType: "codex",
    projectRoot: "/tmp/payment",
    transport: "tmux",
    sessionId: "payment-session",
    bootstrapStatus: "ready",
    registrationSource: "mcp",
    registrationStatus: "confirmed",
    lastRegistrationAttemptAt: "2026-01-01T00:01:00.000Z",
    confirmedByAgentAt: "2026-01-01T00:01:00.000Z",
    sessionFingerprint: "payment-session",
    capabilitySummary: "Payment API helper.",
    capabilitySources: "README.md, src",
  }, {
    capabilitySource: "generated",
    refreshedAt: "2026-01-01T00:01:00.000Z",
  });
  assert.equal(confirmed.id, "payment");
  assert.equal(confirmed.bootstrapStatus, "ready");
  assert.equal(confirmed.registrationSource, "mcp");
  assert.equal(confirmed.registrationStatus, "confirmed");
  assert.equal(confirmed.confirmedByAgentAt, "2026-01-01T00:01:00.000Z");
  assert.equal(confirmed.registrationHistory.length, 2);
  assert.equal(confirmed.registrationHistory[1].source, "mcp");
  assert.equal(confirmed.capabilitySource, "generated");

  const duplicate = registry.register({
    id: "payment-copy",
    name: "payment-copy",
    agentType: "codex",
    projectRoot: "/tmp/payment",
    transport: "tmux",
    sessionId: "payment-session",
    bootstrapStatus: "ready",
    registrationSource: "mcp",
    registrationStatus: "confirmed",
    lastRegistrationAttemptAt: "2026-01-01T00:02:00.000Z",
    confirmedByAgentAt: "2026-01-01T00:02:00.000Z",
    sessionFingerprint: "payment-session",
  });
  assert.equal(duplicate.id, "payment");
  assert.equal(registry.get("payment-copy"), undefined);
  assert.equal(registry.list().length, 1);
  assert.equal(duplicate.registrationHistory.length, 3);
  assert.match(duplicate.registrationWarnings[0], /matched existing session fingerprint/);
  assert.equal(duplicate.lastRegistrationAttemptAt, "2026-01-01T00:02:00.000Z");
}

function testParser() {
  const output = [
    "noise",
    "<<<MINA_AGENT_RESPONSE_START mair-test>>>",
    "answer body",
    "<<<MINA_AGENT_RESPONSE_END mair-test>>>",
    "more noise",
  ].join("\n");

  assert.equal(parseMarkedResponse(output, "mair-test"), "answer body");
  assert.throws(() => parseMarkedResponse(output, "missing"), /Response markers/);

  const echoedPromptAndAnswer = [
    "Wrap your final answer with:",
    "<<<MINA_AGENT_RESPONSE_START mair-test>>>",
    "[your answer]",
    "<<<MINA_AGENT_RESPONSE_END mair-test>>>",
    "actual terminal output",
    "<<<MINA_AGENT_RESPONSE_START mair-test>>>",
    "real answer",
    "<<<MINA_AGENT_RESPONSE_END mair-test>>>",
  ].join("\n");
  assert.equal(parseMarkedResponse(echoedPromptAndAnswer, "mair-test"), "real answer");

  const placeholderOnly = [
    "<<<MINA_AGENT_RESPONSE_START mair-test>>>",
    "| [your",
    "  answer] |",
    "<<<MINA_AGENT_RESPONSE_END mair-test>>>",
  ].join("\n");
  assert.throws(() => parseMarkedResponse(placeholderOnly, "mair-test"), /Response markers/);
  const placeholderDiagnostics = inspectMarkedResponse(placeholderOnly, "mair-test");
  assert.equal(placeholderDiagnostics.ok, false);
  assert.equal(placeholderDiagnostics.diagnostics.kind, "placeholder_only");
  assert.equal(placeholderDiagnostics.diagnostics.placeholderCount, 1);

  const missingDiagnostics = inspectMarkedResponse("no markers here", "mair-test");
  assert.equal(missingDiagnostics.ok, false);
  assert.equal(missingDiagnostics.diagnostics.kind, "missing_markers");
  assert.equal(missingDiagnostics.diagnostics.startMarkerFound, false);
}

function testRequestStoreDiagnostics() {
  const now = new Date(0).toISOString();
  const store = new RequestStore([
    {
      id: "store-test",
      sourceAgent: "source",
      targetAgent: "target",
      task: "task",
      status: "waiting",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  assert.equal(store.updateStatus("store-test", "cancelled").diagnosticStatus, "cancelled");
  assert.deepEqual(store.validActions(store.require("store-test")), ["retry", "archive"]);
  const archived = store.archive("store-test");
  assert.equal(archived.status, "archived");
  assert.equal(archived.diagnosticStatus, "archived");
  assert.equal(archived.archivedFromStatus, "cancelled");
  assert.deepEqual(store.validActions(archived), ["retry", "unarchive"]);
  const unarchived = store.unarchive("store-test");
  assert.equal(unarchived.status, "cancelled");
  assert.equal(unarchived.diagnosticStatus, "cancelled");
  assert.throws(() => store.cancel("store-test"), /Cannot cancel request/);
  assert.equal(store.recordRetry("store-test", "retry-test").retriedByRequestId, "retry-test");
}

function testPromptEnvelope() {
  const request = {
    id: "mair-test",
    sourceAgent: "shopping",
    targetAgent: "payment",
    task: "summarize payment",
    status: "created",
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
  const agent = {
    id: "payment",
    name: "payment",
    agentType: "gemini",
    projectRoot: "/tmp/payment",
    transport: "headless",
    sessionId: "payment",
  };

  const envelope = buildPromptEnvelope(request, agent);
  assert.match(envelope, /Request ID: mair-test/);
  assert.match(envelope, /To: payment \/ gemini/);
  assert.match(envelope, /summarize payment/);
  assert.match(envelope, /MINA_AGENT_RESPONSE_START mair-test/);
}

async function testRouterLifecycle() {
  let persisted = 0;
  const registry = new AgentRegistry([
    {
      id: "payment",
      name: "payment",
      agentType: "gemini",
      projectRoot: "/tmp/payment",
      transport: "headless",
      sessionId: "payment",
    },
  ]);
  const requestStore = new RequestStore();
  const transports = new DefaultTransportRegistry().register("headless", new HeadlessTransport());
  const router = new AgentRouter({
    registry,
    requestStore,
    transports,
    onStateChanged: () => {
      persisted += 1;
    },
  });

  const response = await router.callAgent({
    target: "payment",
    task: "question with --literal flag text",
    timeoutMs: 1_000,
  });

  const request = router.getRequest(response.requestId);
  assert.equal(request.status, "answered");
  assert.equal(request.diagnosticStatus, "answered");
  assert.match(request.answer, /Headless response from payment/);
  assert.equal(request.parserDiagnostics.kind, "parsed");
  assert.equal(request.rawEvidence.kind, "transport_capture");
  assert.equal(request.task, "question with --literal flag text");
  assert.ok(persisted >= 4);

  const retry = await router.callAgent({
    target: "payment",
    task: request.task,
    retryOfRequestId: request.id,
    timeoutMs: 1_000,
  });
  const retryRequest = router.getRequest(retry.requestId);
  assert.equal(retryRequest.retryOfRequestId, request.id);
}

async function testRouterCancelStaysTerminal() {
  const transport = new DeferredResponseTransport();
  const registry = new AgentRegistry([
    {
      id: "payment",
      name: "payment",
      agentType: "gemini",
      projectRoot: "/tmp/payment",
      transport: "test",
      sessionId: "payment",
    },
  ]);
  const requestStore = new RequestStore();
  const transports = new DefaultTransportRegistry().register("test", transport);
  const router = new AgentRouter({
    registry,
    requestStore,
    transports,
  });

  const pending = router.callAgent({
    target: "payment",
    task: "cancel race",
    timeoutMs: 1_000,
  });

  await transport.waitStarted;
  const request = router.listRequests()[0];
  requestStore.cancel(request.id, "Cancelled during transport wait.");
  transport.resolve([
    `<<<MINA_AGENT_RESPONSE_START ${request.id}>>>`,
    "late answer",
    `<<<MINA_AGENT_RESPONSE_END ${request.id}>>>`,
  ].join("\n"));

  await assert.rejects(
    pending,
    /Request "mar-[^"]+" is cancelled and can no longer be updated/,
  );

  const cancelled = router.getRequest(request.id);
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.diagnosticStatus, "cancelled");
  assert.equal(cancelled.answer, undefined);

  const [agentStatus] = await router.listAgentStatuses();
  assert.equal(agentStatus.lastRequestStatus, "cancelled");
}

async function testRouterParseFailure() {
  const router = buildRouterWithTransport(new MalformedResponseTransport());

  await assert.rejects(
    () => router.callAgent({ target: "payment", task: "no markers", timeoutMs: 1_000 }),
    /Response markers/,
  );

  const request = router.listRequests()[0];
  assert.equal(request.status, "failed");
  assert.equal(request.diagnosticStatus, "parse_failure");
  assert.equal(request.parserDiagnostics.kind, "missing_markers");
  assert.equal(request.rawEvidence.excerpt, "plain response without protocol markers");
}

async function testRouterTimeout() {
  const router = buildRouterWithTransport(new TimeoutTransport());

  await assert.rejects(
    () => router.callAgent({ target: "payment", task: "timeout", timeoutMs: 1 }),
    /Timed out/,
  );

  const request = router.listRequests()[0];
  assert.equal(request.status, "timeout");
  assert.equal(request.diagnosticStatus, "timeout");
  assert.match(request.error, /Last capture/);
  assert.equal(request.rawEvidence.excerpt, "partial terminal capture");
}

async function testRouterHealthClassification() {
  const staleTime = "2026-01-01T00:00:00.000Z";
  const registry = new AgentRegistry([
    {
      id: "available",
      name: "available",
      agentType: "gemini",
      projectRoot: "/tmp/available",
      transport: "available",
      sessionId: "available",
    },
    {
      id: "missing",
      name: "missing",
      agentType: "gemini",
      projectRoot: "/tmp/missing",
      transport: "missing",
      sessionId: "missing",
    },
    {
      id: "stale",
      name: "stale",
      agentType: "gemini",
      projectRoot: "/tmp/stale",
      transport: "unknown",
      sessionId: "stale",
      lastSeenAt: staleTime,
    },
    {
      id: "attention",
      name: "attention",
      agentType: "gemini",
      projectRoot: "/tmp/attention",
      transport: "available",
      sessionId: "attention",
    },
    {
      id: "busy",
      name: "busy",
      agentType: "gemini",
      projectRoot: "/tmp/busy",
      transport: "deferred",
      sessionId: "busy",
    },
  ]);
  const requestStore = new RequestStore([
    {
      id: "attention-request",
      sourceAgent: "main",
      targetAgent: "attention",
      task: "failed task",
      status: "failed",
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      error: "transport failed",
    },
  ]);
  const deferred = new DeferredResponseTransport();
  const transports = new DefaultTransportRegistry()
    .register("available", new StaticStatusTransport("available"))
    .register("missing", new StaticStatusTransport("missing", "session is gone"))
    .register("unknown", new StaticStatusTransport("unknown"))
    .register("deferred", deferred);
  const router = new AgentRouter({
    registry,
    requestStore,
    transports,
    agentStaleAfterMs: 1,
  });

  const pending = router.callAgent({
    target: "busy",
    task: "long running",
    timeoutMs: 1_000,
  });
  await deferred.waitStarted;

  const statuses = await router.listAgentStatuses();
  const byId = Object.fromEntries(statuses.map((status) => [status.id, status]));
  assert.equal(byId.available.status, "available");
  assert.ok(byId.available.lastSeenAt);
  assert.equal(byId.available.bootstrapStatus, "ready");
  assert.equal(byId.available.registrationStatus, "confirmed");
  assert.equal(byId.missing.status, "missing");
  assert.match(byId.missing.detail, /session is gone/);
  assert.equal(byId.stale.status, "stale");
  assert.equal(byId.stale.lastSeenAt, staleTime);
  assert.equal(byId.attention.status, "needs-attention");
  assert.match(byId.attention.detail, /transport failed/);
  assert.equal(byId.busy.status, "busy");
  assert.ok(byId.busy.lastActivityAt);

  deferred.resolve([
    `<<<MINA_AGENT_RESPONSE_START ${requestStore.list().find((request) => request.targetAgent === "busy").id}>>>`,
    "done",
    `<<<MINA_AGENT_RESPONSE_END ${requestStore.list().find((request) => request.targetAgent === "busy").id}>>>`,
  ].join("\n"));
  await pending;
}

function buildRouterWithTransport(transport) {
  const registry = new AgentRegistry([
    {
      id: "payment",
      name: "payment",
      agentType: "gemini",
      projectRoot: "/tmp/payment",
      transport: "test",
      sessionId: "payment",
    },
  ]);
  const requestStore = new RequestStore();
  const transports = new DefaultTransportRegistry().register("test", transport);

  return new AgentRouter({
    registry,
    requestStore,
    transports,
  });
}

class MalformedResponseTransport {
  async send() {}
  async capture() {
    return "plain response without protocol markers";
  }
  async waitForResponse() {
    return "plain response without protocol markers";
  }
}

class TimeoutTransport {
  async send() {}
  async capture() {
    return "partial terminal capture";
  }
  async waitForResponse() {
    throw new Error("Timed out waiting for response markers for mair-test. Last capture:\npartial terminal capture");
  }
}

class DeferredResponseTransport {
  constructor() {
    this.waitStarted = new Promise((resolve) => {
      this.markWaitStarted = resolve;
    });
    this.response = new Promise((resolve) => {
      this.resolveResponse = resolve;
    });
  }

  async send() {}
  async capture() {
    return "";
  }
  async waitForResponse() {
    this.markWaitStarted();
    return this.response;
  }
  resolve(output) {
    this.resolveResponse(output);
  }
}

class StaticStatusTransport {
  constructor(status, detail) {
    this.statusValue = status;
    this.detail = detail;
  }

  async send() {}
  async capture() {
    return "";
  }
  async waitForResponse(agent, requestId) {
    return [
      `<<<MINA_AGENT_RESPONSE_START ${requestId}>>>`,
      "ok",
      `<<<MINA_AGENT_RESPONSE_END ${requestId}>>>`,
    ].join("\n");
  }
  async status() {
    return { status: this.statusValue, detail: this.detail };
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
