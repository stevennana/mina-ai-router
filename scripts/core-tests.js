const assert = require("node:assert/strict");
const {
  AgentRegistry,
  AgentRouter,
  RequestStore,
  buildPromptEnvelope,
  parseMarkedResponse,
} = require("../dist/packages/core/src");
const { DefaultTransportRegistry, HeadlessTransport } = require("../dist/packages/transports/src");

async function main() {
  testParser();
  testPromptEnvelope();
  await testRouterLifecycle();
  console.log("core tests passed");
}

function testParser() {
  const output = [
    "noise",
    "<<<MINA_AGENT_RESPONSE_START mar-test>>>",
    "answer body",
    "<<<MINA_AGENT_RESPONSE_END mar-test>>>",
    "more noise",
  ].join("\n");

  assert.equal(parseMarkedResponse(output, "mar-test"), "answer body");
  assert.throws(() => parseMarkedResponse(output, "missing"), /Response markers/);

  const echoedPromptAndAnswer = [
    "Wrap your final answer with:",
    "<<<MINA_AGENT_RESPONSE_START mar-test>>>",
    "[your answer]",
    "<<<MINA_AGENT_RESPONSE_END mar-test>>>",
    "actual terminal output",
    "<<<MINA_AGENT_RESPONSE_START mar-test>>>",
    "real answer",
    "<<<MINA_AGENT_RESPONSE_END mar-test>>>",
  ].join("\n");
  assert.equal(parseMarkedResponse(echoedPromptAndAnswer, "mar-test"), "real answer");

  const placeholderOnly = [
    "<<<MINA_AGENT_RESPONSE_START mar-test>>>",
    "| [your",
    "  answer] |",
    "<<<MINA_AGENT_RESPONSE_END mar-test>>>",
  ].join("\n");
  assert.throws(() => parseMarkedResponse(placeholderOnly, "mar-test"), /Response markers/);
}

function testPromptEnvelope() {
  const request = {
    id: "mar-test",
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
  assert.match(envelope, /Request ID: mar-test/);
  assert.match(envelope, /To: payment \/ gemini/);
  assert.match(envelope, /summarize payment/);
  assert.match(envelope, /MINA_AGENT_RESPONSE_START mar-test/);
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
  assert.match(request.answer, /Headless response from payment/);
  assert.equal(request.task, "question with --literal flag text");
  assert.ok(persisted >= 4);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
