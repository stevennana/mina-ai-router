#!/usr/bin/env node
import { join } from "node:path";
import { execFileSync, spawn } from "node:child_process";
import {
  AgentRegistry,
  AgentRouter,
  FileState,
  RequestStore,
  type Agent,
  type TransportType,
} from "../../../packages/core/src";
import { DefaultTransportRegistry, HeadlessTransport, TmuxClient, TmuxTransport, ZmuxTransport } from "../../../packages/transports/src";

const statePath = process.env.MINA_ROUTER_STATE ?? join(process.cwd(), "data", "router-state.json");

async function main(argv: string[]): Promise<void> {
  const command = argv[2];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  const context = createContext();

  switch (command) {
    case "register":
      registerAgent(argv.slice(3), context);
      break;
    case "agents":
      await listAgents(context);
      break;
    case "agent":
      await showAgent(argv.slice(3), context);
      break;
    case "attach":
      showAttach(argv.slice(3), context);
      break;
    case "setup-codex-pair":
      setupCodexPair(argv.slice(3), context);
      break;
    case "serve":
      serveHttp(argv.slice(3));
      break;
    case "ask":
      await askAgent(argv.slice(3), context);
      break;
    case "requests":
      listRequests(argv.slice(3), context);
      break;
    case "request":
      showRequest(argv.slice(3), context);
      break;
    default:
      throw new Error(`Unknown command "${command}". Run "mar help".`);
  }
}

function serveHttp(args: string[]): void {
  const flags = parseFlags(args);
  const port = flags.port ?? process.env.MINA_HTTP_PORT ?? "3333";
  const serverPath = join(__dirname, "../../http-server/src/index.js");
  const child = spawn(process.execPath, [serverPath], {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: port,
      MINA_ROUTER_STATE: process.env.MINA_ROUTER_STATE ?? statePath,
    },
  });

  child.on("exit", (code) => {
    process.exitCode = code ?? 0;
  });
}

function setupCodexPair(args: string[], context: ReturnType<typeof createContext>): void {
  const options = parseFlags(args);
  const mainRoot = options["main-root"] ?? "/Users/stevenna/WebstormProjects/minasoftai";
  const helperRoot = options["helper-root"] ?? "/Users/stevenna/PycharmProjects/mina-ralph-loop-bootstrap-nextjs";
  const helperId = options["helper-id"] ?? "ralph";
  const sessionId = options.session ?? "mina-ralph-codex";
  const mcpName = options["mcp-name"] ?? "mina-agent-router";
  const codexCommand = options["codex-command"] ?? "codex --no-alt-screen";

  assertCommandAvailable("codex");
  assertCommandAvailable("tmux");

  const agent: Agent = {
    id: helperId,
    name: helperId,
    agentType: "codex",
    transport: "tmux",
    sessionId,
    projectRoot: helperRoot,
    startupCommand: codexCommand,
  };

  const tmux = new TmuxClient();
  tmux.ensureSession(agent);
  context.registry.register(agent);
  context.save();

  const mcpServerPath = join(process.cwd(), "dist", "apps", "mcp-server", "src", "index.js");
  const mcpAddCommand = [
    "codex",
    "mcp",
    "add",
    mcpName,
    "--env",
    `MINA_ROUTER_STATE=${statePath}`,
    "--",
    "node",
    mcpServerPath,
  ];

  printJson({
    ok: true,
    statePath,
    helper: {
      id: helperId,
      root: helperRoot,
      session: sessionId,
      attach: `tmux attach -t ${sessionId}`,
    },
    main: {
      root: mainRoot,
      startCodex: `cd ${shellQuote(mainRoot)} && codex --no-alt-screen`,
    },
    mcp: {
      addCommand: mcpAddCommand.map(shellQuote).join(" "),
      listCommand: "codex mcp list",
      removeCommand: `codex mcp remove ${shellQuote(mcpName)}`,
    },
    nextSteps: [
      "Run npm run build before installing the MCP command if you changed source files.",
      "Run the mcp.addCommand once so Codex CLI can see Mina Agent Router.",
      "Attach to the helper session and make sure helper Codex is ready.",
      "Start Codex in the main.root project.",
      `Ask main Codex to call Mina Agent Router target '${helperId}' for questions about the helper project.`,
    ],
  });
}

function createContext() {
  const fileState = new FileState(statePath);
  const state = fileState.load();
  const registry = new AgentRegistry(state.agents);
  const requestStore = new RequestStore(state.requests);
  const transports = new DefaultTransportRegistry()
    .register("mock", new HeadlessTransport())
    .register("headless", new HeadlessTransport())
    .register("tmux", new TmuxTransport())
    .register("zmux", new ZmuxTransport());
  const context = {
    fileState,
    registry,
    requestStore,
    save: () =>
      fileState.save({
        agents: registry.list(),
        requests: requestStore.list(),
      }),
  };
  const router = new AgentRouter({
    registry,
    requestStore,
    transports,
    onStateChanged: context.save,
  });

  return {
    ...context,
    transports,
    router,
  };
}

function registerAgent(args: string[], context: ReturnType<typeof createContext>): void {
  const id = args[0];
  if (!id) {
    throw new Error("Usage: mar register <id> --agent <type> --transport <transport> --session <session> --root <path>");
  }

  const options = parseFlags(args.slice(1));
  const agent: Agent = {
    id,
    name: options.name ?? id,
    agentType: options.agent ?? "unknown",
    transport: (options.transport ?? "headless") as TransportType,
    sessionId: options.session ?? id,
    projectRoot: options.root ?? process.cwd(),
    tmuxTarget: options.target,
    startupCommand: options.command,
  };

  context.registry.register(agent);
  context.save();
  printJson({ agent });
}

async function listAgents(context: ReturnType<typeof createContext>): Promise<void> {
  const agents = await context.router.listAgentStatuses();
  printJson({
    agents,
  });
}

async function showAgent(args: string[], context: ReturnType<typeof createContext>): Promise<void> {
  const id = args[0];
  if (!id) {
    throw new Error("Usage: mar agent <id>");
  }

  const agent = context.registry.require(id);
  const statuses = await context.router.listAgentStatuses();
  printJson({
    agent,
    status: statuses.find((candidate) => candidate.id === id),
    attach: agent.transport === "tmux" ? `tmux attach -t ${agent.sessionId}` : undefined,
  });
}

function showAttach(args: string[], context: ReturnType<typeof createContext>): void {
  const id = args[0];
  if (!id) {
    throw new Error("Usage: mar attach <id>");
  }

  const agent = context.registry.require(id);
  if (agent.transport !== "tmux") {
    throw new Error(`Agent "${id}" uses transport "${agent.transport}", not tmux.`);
  }

  printJson({
    agent: agent.id,
    command: `tmux attach -t ${agent.sessionId}`,
  });
}

async function askAgent(args: string[], context: ReturnType<typeof createContext>): Promise<void> {
  const target = args[0];
  const task = args.slice(1).join(" ").trim();

  if (!target || !task) {
    throw new Error('Usage: mar ask <target> "question" [--timeout-ms 300000]');
  }

  const flags = parseFlags(args);
  try {
    const response = await context.router.callAgent({
      target,
      task: taskFromArgs(args.slice(1)),
      timeoutMs: flags["timeout-ms"] ? Number(flags["timeout-ms"]) : undefined,
    });

    printJson(response);
  } finally {
    context.save();
  }
}

function listRequests(args: string[], context: ReturnType<typeof createContext>): void {
  const flags = parseFlags(args);
  const target = flags.target;
  const requests = target
    ? context.router.listRequests().filter((request) => request.targetAgent === target)
    : context.router.listRequests();

  printJson({ requests });
}

function showRequest(args: string[], context: ReturnType<typeof createContext>): void {
  const requestId = args[0];
  if (!requestId) {
    throw new Error("Usage: mar request <request-id>");
  }

  printJson(context.router.getRequest(requestId));
}

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token?.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      flags[key] = "true";
      continue;
    }

    flags[key] = value;
    index += 1;
  }

  return flags;
}

function assertCommandAvailable(command: string): void {
  try {
    execFileSync("which", [command], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(`Required command "${command}" is not available on PATH.`);
  }
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_/:=.,@+-]+$/.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, "'\\''")}'`;
}

function taskFromArgs(args: string[]): string {
  const taskTokens: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--timeout-ms") {
      index += 1;
      continue;
    }

    taskTokens.push(token);
  }

  return taskTokens.join(" ").trim();
}

function printHelp(): void {
  console.log(`Mina Agent Router POC

Commands:
  mar register <id> --agent <type> --transport <headless|mock|tmux|zmux> --session <session> --root <path>
  mar agents
  mar agent <id>
  mar attach <id>
  mar setup-codex-pair [--main-root <path>] [--helper-root <path>] [--helper-id <id>] [--session <tmux-session>]
  mar serve [--port 3333]
  mar ask <target> "question"
  mar requests [--target <id>]
  mar request <request-id>

Example:
  mar register payment --agent gemini --transport headless --session payment --root ./payment
  mar register payment --agent gemini --transport tmux --session payment --root ~/work/payment
  mar setup-codex-pair
  mar serve
  mar ask payment "현재 payment flow를 요약해줘."

State:
  Set MINA_ROUTER_STATE=/path/to/router-state.json to share state between CLI and MCP.
`);
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

main(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
