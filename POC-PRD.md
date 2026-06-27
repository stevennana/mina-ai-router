Mina Agent Router POC

1. Project Overview

Mina Agent Router is a local agent routing tool that allows one primary CLI AI agent to communicate with other live project-scoped CLI AI agents.

The goal is not to build a large autonomous multi-agent system.
The goal is to let a main agent, such as Codex CLI running in a shopping-service project, ask another currently running agent, such as Gemini CLI in a payment project or Claude CLI in a delivery project, and receive the answer back inside the main agent workflow.

The developer should still be able to observe, attach to, and interrupt each agent session when needed.

2. Problem Statement

Modern CLI AI agents such as Codex CLI, Claude Code, and Gemini CLI work well inside individual project directories.

However, when multiple related projects are involved, each agent only understands its own project context.

Example:

shopping-service/
delivery/
payment/

Each project may have its own AI agent session:

shopping-service → Codex CLI
delivery         → Claude Code
payment          → Gemini CLI

The shopping-service project may depend on the delivery and payment projects as libraries or modules.

Today, when the main Codex agent needs information from the payment project, the human developer has to manually copy the question, ask the payment agent, copy the answer, and paste it back into the main Codex session.

This project aims to remove that manual relay work.

3. Target Scenario

The developer is working in the shopping-service project with Codex CLI as the main agent.

The developer asks Codex:

지금 payment UI를 수정해야 할 것 같은데,
payment 개발사항을 보고 가장 적합한 UI를 제안해줘.

Codex should be able to call Mina Agent Router through an MCP tool.

Mina Agent Router sends the question to the live payment agent session.

The payment agent inspects or reasons based on the payment project and returns an answer.

Mina Agent Router captures the answer and returns it to the main Codex session.

Codex then uses the payment agent’s answer to provide the final response to the developer.

Expected flow:

User
↓
Codex CLI in shopping-service
↓ MCP tool call
Mina Agent Router
↓ transport
Live payment agent session
↓ response
Mina Agent Router
↓ MCP response
Codex CLI in shopping-service
↓
User

4. What This Project Is

Mina Agent Router is:

- A local MCP server
- A cross-agent request router
- A live CLI agent session bridge
- A request/response protocol layer
- A transport-agnostic agent communication system

It should allow a main agent to call another registered agent like a tool.

5. What This Project Is Not

Mina Agent Router is not:

- A full autonomous multi-agent framework
- A large A2A orchestration platform
- A replacement for Codex, Claude, or Gemini
- A full terminal emulator
- A full AI-agent terminal product in v0.1
- A cloud/SaaS product in the POC phase

The POC should stay small.

6. Initial Technical Direction

The first version should be written in TypeScript and Node.js.

Recommended stack:

Language: TypeScript
Runtime: Node.js 22+
Package manager: pnpm
MCP SDK: @modelcontextprotocol/sdk
Database: SQLite
SQLite library: better-sqlite3
CLI framework: commander or cac
Test framework: vitest

The project should be transport-agnostic.

The initial transport candidate is tmux, used as a local PTY session backend through its CLI control commands.

However, the core router must not depend directly on tmux internals.

7. Architecture

High-level architecture:

Mina Agent Router
├── MCP Server
├── CLI
├── Core Router
├── Agent Registry
├── Request Store
├── Prompt Envelope Builder
├── Response Parser
└── Transport Adapter
├── TmuxTransport
├── HeadlessTransport
└── Future transports

The core should depend on a generic transport interface.

Example:

export interface AgentTransport {
send(agentId: string, input: string): Promise<void>;
capture(agentId: string): Promise<string>;
waitForResponse(
agentId: string,
requestId: string,
timeoutMs: number
): Promise<string>;
}

8. Proposed Project Structure

mina-agent-router/
apps/
cli/
src/
index.ts
mcp-server/
src/
index.ts
packages/
core/
src/
router.ts
registry.ts
request-store.ts
prompt-envelope.ts
response-parser.ts
types.ts
transports/
src/
transport.ts
tmux/
tmux-client.ts
tmux-transport.ts
headless/
headless-transport.ts
docs/
PROJECT.md
PROTOCOL.md
POC.md
data/
router.db

9. Core Concepts

9.1 Agent

An agent represents a live or callable AI session.

Example:

{
"id": "payment",
"name": "payment",
"agentType": "gemini",
"projectRoot": "/Users/example/work/payment",
"transport": "tmux",
"sessionId": "payment"
}

9.2 Main Agent

The main agent is the agent currently interacting with the developer.

Example:

shopping-service / Codex CLI

9.3 Helper Agent

A helper agent is another project-scoped agent that can be called by the main agent.

Example:

payment / Gemini CLI
delivery / Claude Code

9.4 Request

A request represents a question from one agent to another.

Example:

{
"id": "mar-001",
"sourceAgent": "shopping",
"targetAgent": "payment",
"task": "현재 payment 개발사항을 보고 shopping-service payment UI에 반영할 점을 제안해줘.",
"status": "created"
}

9.5 Response Marker

The router should ask the target agent to wrap its final answer in markers.

Example:

<<<MINA_AGENT_RESPONSE_START mar-001>>>
Payment 프로젝트 기준으로 ...
<<<MINA_AGENT_RESPONSE_END mar-001>>>

The response parser should extract only the content between these markers.

10. Prompt Envelope

When Mina Agent Router sends a task to a target agent, it should generate a structured prompt.

Example:

[Mina Agent Router Request]
Request ID: mar-001
From: shopping / codex
To: payment / gemini
The shopping-service agent is asking you to answer the following request:
"현재 payment 개발사항을 보고 shopping-service payment UI에 반영할 점을 제안해줘."
Please answer based on the current payment project context.
Include:
- relevant payment flow
- API/status constraints
- UI states shopping-service should support
- recommended UI behavior
- risks or assumptions
  Wrap your final answer with:
  <<<MINA_AGENT_RESPONSE_START mar-001>>>
  ...
  <<<MINA_AGENT_RESPONSE_END mar-001>>>

11. MCP Tools for POC

The MCP server should initially provide three tools.

11.1 list_agents

Returns registered agents.

Example output:

{
"agents": [
{
"id": "payment",
"agentType": "gemini",
"transport": "tmux",
"status": "unknown"
},
{
"id": "delivery",
"agentType": "claude",
"transport": "tmux",
"status": "unknown"
}
]
}

11.2 call_agent

Sends a task to a target agent and waits for a response.

Input:

{
"target": "payment",
"task": "현재 payment 개발사항을 보고 shopping-service payment UI에 반영할 점을 제안해줘.",
"timeoutMs": 300000
}

Output:

{
"requestId": "mar-001",
"target": "payment",
"answer": "Payment 프로젝트 기준으로 ..."
}

11.3 get_request_status

Returns the current status of a request.

Input:

{
"requestId": "mar-001"
}

Output:

{
"requestId": "mar-001",
"status": "answered"
}

12. CLI Commands for POC

The CLI should support basic local testing without MCP first.

12.1 Register Agent

mar register payment \
--agent gemini \
--transport tmux \
--session payment \
--root ~/work/payment

12.2 List Agents

mar agents

12.3 Ask Agent

mar ask payment "현재 payment flow를 요약해줘."

12.4 Show Requests

mar requests

12.5 Show Request Detail

mar request mar-001

13. POC Milestone

The first POC is successful when the following works:

1. A payment agent session is registered.
2. The router can send a prompt to the payment session.
3. The payment agent receives the prompt.
4. The payment agent returns an answer wrapped in response markers.
5. The router captures and parses the answer.
6. The answer is returned to the caller.
7. The same flow works through an MCP tool call from Codex CLI.

14. POC Scope

Include:

- TypeScript project setup
- CLI app
- MCP server app
- Agent registry
- In-memory or SQLite request store
- Prompt envelope builder
- Response marker parser
- Transport interface
- tmux transport prototype
- call_agent MCP tool

Exclude for now:

- Security policy
- Permission model
- Web UI
- Full terminal emulator
- Native terminal app
- Complex multi-agent planning
- Automatic project indexing
- Mina Wiki integration
- Team/SaaS features

15. Transport Strategy

The router core must not be tied to one transport.

Initial transport:

TmuxTransport

Possible future transports:

HeadlessTransport
ZmuxTransport
HerdrTransport
PtyTransport
ZellijTransport

The router should call the transport interface only.

Do not put tmux-specific logic into router core.

16. Response Parsing Strategy

The first parser should be marker-based.

Input:

some terminal output
<<<MINA_AGENT_RESPONSE_START mar-001>>>
actual answer
<<<MINA_AGENT_RESPONSE_END mar-001>>>
more terminal output

Output:

actual answer

If the marker is not found before timeout, return a clear error.

The POC does not need advanced idle detection yet.

17. Request Status Lifecycle

Use simple statuses first:

created
sent
waiting
answered
failed
timeout

Possible lifecycle:

created → sent → waiting → answered
created → sent → waiting → timeout
created → sent → failed

18. Development Principles

Keep the POC small.

Use abstractions only where needed.

Do not build a full terminal product.

Do not fork or embed a large terminal multiplexer during POC.

Prefer external transport adapter first.

The key thing to validate is:

Can a main CLI AI agent call another live project-scoped CLI AI agent and receive a useful response?

19. First Implementation Tasks

1. Create TypeScript workspace structure.
2. Add packages/core.
3. Define shared types:
    * Agent
    * AgentRequest
    * AgentResponse
    * RequestStatus
    * AgentTransport
4. Implement prompt envelope builder.
5. Implement response marker parser.
6. Implement in-memory request store.
7. Implement CLI command mar ask.
8. Implement placeholder/mock transport for local tests.
9. Implement tmux command client.
10. Implement TmuxTransport.
11. Implement MCP server with list_agents and call_agent.
12. Test with one live payment agent session.
13. Test from Codex CLI through MCP.

20. Success Criteria

The POC is considered successful if this works end-to-end:

User asks Codex in shopping-service:
"payment 개발사항을 보고 UI를 제안해줘."
Codex calls:
call_agent(target = "payment", task = "...")
Mina Agent Router sends the request to the payment agent session.
The payment agent answers with response markers.
Mina Agent Router parses the response.
Codex receives the answer and produces a final recommendation for the user.

21. Working Assumption

The first version prioritizes usefulness over completeness.

It is acceptable if:

- only one target agent is supported at first
- the request is marker-based
- timeout handling is simple
- the transport only works on macOS/Linux
- status detection is basic

It is not acceptable if:

- router core depends directly on tmux internals
- the project becomes a full terminal app too early
- the POC requires a large multi-agent framework
- the main agent cannot receive the helper agent's answer as a tool result

22. Suggested Initial Command Names

Use mar as the CLI command name for now.

mar = Mina Agent Router

Example commands:

mar register payment --agent gemini --transport tmux --session payment --root ~/work/payment
mar agents
mar ask payment "현재 payment flow를 요약해줘."
mar requests

23. Notes for Codex

When implementing this project:

* Keep the first version minimal.
* Start with mock transport before tmux if needed.
* Make the transport interface clean.
* Do not over-design the database schema.
* Prioritize an end-to-end working demo.
* Write small tests for prompt envelope and response parser.
* Avoid building a terminal UI in the first POC.
* Use TypeScript and Node.js unless there is a strong reason not to.

The most important goal is to validate the cross-agent call flow.
