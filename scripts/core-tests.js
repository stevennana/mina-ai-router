const assert = require("node:assert/strict");
const {
  AgentRegistry,
  AgentRouter,
  RequestStore,
  buildPromptEnvelope,
  inspectMarkedResponse,
  parseMarkedResponse,
} = require("../dist/packages/core/src");
const { DefaultTransportRegistry, HeadlessTransport } = require("../dist/packages/transports/src");

async function main() {
  testParser();
  testPromptEnvelope();
  testRequestStoreDiagnostics();
  await testRouterLifecycle();
  await testRouterParseFailure();
  await testRouterTimeout();
  console.log("core tests passed");
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
  assert.equal(store.updateStatus("store-test", "archived").diagnosticStatus, "archived");
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
