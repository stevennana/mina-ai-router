#!/usr/bin/env node
import { basename, dirname, join, resolve } from "node:path";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import {
  AgentRegistry,
  AgentRouter,
  buildMcpPreflight,
  FileState,
  RequestStore,
  packageVersion,
  type Agent,
  type AgentCapabilityProfile,
  type AgentStatus,
  type AgentRequest,
  type TransportType,
} from "../../../packages/core/src";
import { DefaultTransportRegistry, detectAgentPermissionPrompt, HeadlessTransport, TmuxClient, TmuxTransport, ZmuxTransport } from "../../../packages/transports/src";

const statePath = process.env.MINA_ROUTER_STATE ?? join(process.cwd(), "data", "router-state.json");
const version = packageVersion();
const serverPidPath = process.env.MINA_SERVER_PID ?? join(process.cwd(), "data", "mair-server.json");
const agentStaleAfterMs = Number(process.env.MINA_AGENT_STALE_AFTER_MS ?? 15 * 60 * 1000);
type SetupClient = "codex" | "claude";

async function main(argv: string[]): Promise<void> {
  const command = argv[2];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  const context = createContext();

  switch (command) {
    case "version":
    case "--version":
    case "-v":
      printJson({ name: "@minasoft/mina-ai-router", version });
      break;
    case "health":
      await showHealth(context);
      break;
    case "verify":
      runVerify();
      break;
    case "doctor":
      await runDoctor(argv.slice(3), context);
      break;
    case "setup":
      runSetup(argv.slice(3));
      break;
    case "server":
      await handleServerCommand(argv.slice(3));
      break;
    case "codex":
      await startVisibleAgent("codex", "codex --no-alt-screen", argv.slice(3), context);
      break;
    case "claude":
      await startVisibleAgent("claude", "claude", argv.slice(3), context);
      break;
    case "register":
      await registerAgent(argv.slice(3), context);
      break;
    case "agents":
      await listAgents(context);
      break;
    case "agent":
      await handleAgent(argv.slice(3), context);
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
      await handleRequest(argv.slice(3), context);
      break;
    default:
      throw new Error(`Unknown command "${command}". Run "mair help".`);
  }
}

async function handleServerCommand(args: string[]): Promise<void> {
  const action = args[0] ?? "status";
  const flags = parseFlags(args.slice(1));

  switch (action) {
    case "start":
      await startServer(flags);
      break;
    case "stop":
      stopServer();
      break;
    case "status":
      printJson(serverStatus());
      break;
    default:
      throw new Error("Usage: mair server <start|stop|status> [--port 3333] [--host 127.0.0.1]");
  }
}

async function startServer(flags: Record<string, string>): Promise<void> {
  const current = serverStatus();
  if (current.running) {
    printJson(current);
    return;
  }

  const port = flags.port ?? process.env.MINA_HTTP_PORT ?? "3333";
  const host = flags.host ?? process.env.MINA_HTTP_HOST ?? "127.0.0.1";
  const serverPath = join(__dirname, "../../http-server/src/index.js");
  mkdirSync(dirname(serverPidPath), { recursive: true });
  try {
    unlinkSync(serverPidPath);
  } catch {
    // stale pid file may not exist
  }
  const logPath = flags.log ?? join(dirname(serverPidPath), "mair-server.log");
  const logFd = openSync(logPath, "a");
  const child = spawn(process.execPath, [serverPath], {
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env: {
      ...process.env,
      PORT: port,
      HOST: host,
      MINA_ROUTER_STATE: process.env.MINA_ROUTER_STATE ?? statePath,
    },
  });
  closeSync(logFd);
  const pid = child.pid;
  if (!pid) {
    throw new Error("Failed to start Mina HTTP server.");
  }

  let childExit: { code: number | null; signal: string | null } | undefined;
  child.on("exit", (code) => {
    childExit = { code, signal: null };
  });

  try {
    await waitForServerReadiness({ host, port, expectedStatePath: process.env.MINA_ROUTER_STATE ?? statePath, logPath, pid, getChildExit: () => childExit });
  } catch (error) {
    if (isProcessRunning(pid)) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // child may already be gone
      }
    }
    throw error;
  }

  writeFileSync(serverPidPath, `${JSON.stringify({
    pid,
    port,
    host,
    statePath: process.env.MINA_ROUTER_STATE ?? statePath,
    logPath,
    uiUrl: `http://${host}:${port}/`,
    mcpUrl: `http://${host}:${port}/mcp`,
    startedAt: new Date().toISOString(),
  }, null, 2)}\n`);

  child.unref();
  printJson(serverStatus());
}

async function waitForServerReadiness(options: {
  host: string;
  port: string;
  expectedStatePath: string;
  logPath: string;
  pid: number;
  getChildExit: () => { code: number | null; signal: string | null } | undefined;
}): Promise<void> {
  const url = `http://${options.host}:${options.port}/api/health`;
  const deadline = Date.now() + 5_000;
  let lastError = "";

  while (Date.now() < deadline) {
    const childExit = options.getChildExit();
    if (childExit || !isProcessRunning(options.pid)) {
      throw new Error(serverStartFailureMessage({
        url,
        logPath: options.logPath,
        cause: childExit
          ? `server process exited before readiness (code=${childExit.code ?? "null"}, signal=${childExit.signal ?? "null"})`
          : "server process exited before readiness",
      }));
    }

    try {
      const response = await fetch(url);
      const text = await response.text();
      const parsed = safeJson(text) as { statePath?: unknown } | undefined;
      if (response.ok && parsed && typeof parsed.statePath === "string") {
        if (resolvePath(parsed.statePath) !== resolvePath(options.expectedStatePath)) {
          lastError = `readiness endpoint responded from a Mina server for a different state file: ${parsed.statePath}`;
        } else {
          return;
        }
      } else {
        lastError = parsed
          ? `readiness endpoint returned HTTP ${response.status} without Mina health state`
          : `readiness endpoint did not return Mina JSON: ${truncateText(text, 160)}`;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await delay(100);
  }

  throw new Error(serverStartFailureMessage({
    url,
    logPath: options.logPath,
    cause: `timed out waiting for Mina readiness${lastError ? `: ${lastError}` : ""}`,
  }));
}

function serverStartFailureMessage(input: { url: string; logPath: string; cause: string }): string {
  const logExcerpt = readLogExcerpt(input.logPath);
  return [
    `Mina HTTP server failed to become ready at ${input.url}: ${input.cause}.`,
    `Log: ${input.logPath}`,
    logExcerpt ? `Recent log:\n${logExcerpt}` : "Recent log: <empty>",
  ].join("\n");
}

function readLogExcerpt(logPath: string): string {
  if (!existsSync(logPath)) {
    return "";
  }

  return readFileSync(logPath, "utf8").split(/\r?\n/).filter(Boolean).slice(-12).join("\n");
}

function stopServer(): void {
  const status = serverStatus();
  if (!status.pid) {
    printJson({ ok: true, running: false, message: "No Mina server pid file found." });
    return;
  }

  if (status.running) {
    process.kill(status.pid, "SIGTERM");
  }

  try {
    unlinkSync(serverPidPath);
  } catch {
    // pid file may already be gone
  }

  printJson({ ok: true, running: false, stoppedPid: status.pid });
}

function serverStatus() {
  if (!existsSync(serverPidPath)) {
    return {
      running: false,
      pidPath: serverPidPath,
    };
  }

  const saved = JSON.parse(readFileSync(serverPidPath, "utf8")) as {
    pid?: number;
    port?: string;
    host?: string;
    statePath?: string;
    logPath?: string;
    uiUrl?: string;
    mcpUrl?: string;
    startedAt?: string;
  };
  const running = saved.pid ? isProcessRunning(saved.pid) : false;

  return {
    ...saved,
    running,
    pidPath: serverPidPath,
  };
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function startVisibleAgent(
  agentType: "codex" | "claude",
  defaultCommand: string,
  args: string[],
  context: ReturnType<typeof createContext>,
): Promise<void> {
  assertCommandAvailable("tmux");

  const flags = parseFlags(args);
  const root = flags.root ?? process.cwd();
  const projectName = flags.name ?? basename(root);
  const id = flags.id ?? sanitizeName(projectName);
  const sessionId = flags.session ?? `${agentType}-${sanitizeName(projectName)}`;
  const startupCommand = flags.command ?? defaultCommand;
  const permissionProfile = resolvePermissionProfile(agentType, flags["permission-profile"] ?? "default", root);
  const mcpUrl = matchingLiveServerStatus()?.mcpUrl
    ?? `http://${process.env.MINA_HTTP_HOST ?? "127.0.0.1"}:${process.env.MINA_HTTP_PORT ?? "3333"}/mcp`;
  const mcpPreflight = buildMcpPreflight({
    agentType,
    mcpUrl,
    mcpName: flags["mcp-name"],
    configured: flags["mcp-configured"] === "true",
    configuredUrl: flags["mcp-configured-url"],
  });
  assertCommandAvailable(startupCommand.split(/\s+/)[0]);
  const shouldAttach = flags.attach !== "false" && flags["no-attach"] !== "true";
  const shouldPromptRegister = flags.register !== "false" && flags["no-register"] !== "true";
  const registerDelayMs = flags["register-delay-ms"] ? Number(flags["register-delay-ms"]) : 4_000;
  const existing = context.registry.get(id) ?? context.registry.findBySessionFingerprint(sessionId);
  const registrationAttemptAt = new Date().toISOString();
  const agent: Agent = {
    id,
    name: id,
    agentType,
    transport: "tmux",
    sessionId,
    sessionFingerprint: sessionId,
    projectRoot: root,
    startupCommand,
    bootstrapStatus: mcpPreflight.canSendSelfRegistrationPrompt ? "created" : "mcp-configuring",
    registrationSource: "cli",
    registrationStatus: existing?.registrationStatus === "confirmed" ? "confirmed" : "pending",
    lastRegistrationAttemptAt: registrationAttemptAt,
    permissionProfile: permissionProfile.permissionProfile,
    permissionProfileStatus: permissionProfile.permissionProfileStatus,
    permissionProfileDetail: permissionProfile.permissionProfileDetail,
    mcpPreflightStatus: mcpPreflight.mcpPreflightStatus,
    mcpPreflightDetail: mcpPreflight.mcpPreflightDetail,
    mcpSetupCommand: mcpPreflight.mcpSetupCommand,
    mcpVerifyCommand: mcpPreflight.mcpVerifyCommand,
    mcpRemoveCommand: mcpPreflight.mcpRemoveCommand,
    mcpUrl: mcpPreflight.mcpUrl,
  };
  const tmux = new TmuxClient();
  const existed = tmux.hasSession(sessionId);
  tmux.ensureSession(agent);
  let registeredAgent = await registerThroughLiveOwner(agent, context);

  let registration = "registration prompt skipped";
  let nextAction: string | undefined;
  if (shouldPromptRegister && existing?.registrationStatus !== "confirmed") {
    sleep(registerDelayMs);
    const permissionPrompt = detectAgentPermissionPrompt(agent, tmux.capture(sessionId));
    if (permissionPrompt) {
      registration = "waiting for permission approval";
      nextAction = permissionPrompt.action;
      registeredAgent = await registerThroughLiveOwner({
        ...registeredAgent,
        bootstrapStatus: "permission-required",
      }, context);
    } else if (!mcpPreflight.canSendSelfRegistrationPrompt) {
      registration = "waiting for MCP setup";
      nextAction = mcpPreflight.nextAction;
      registeredAgent = await registerThroughLiveOwner({
        ...registeredAgent,
        bootstrapStatus: "mcp-configuring",
      }, context);
    } else {
      const prompt = buildSelfRegistrationPrompt(agent);
      if (agentType === "codex") {
        tmux.sendCodexText(sessionId, prompt);
      } else {
        tmux.sendText(sessionId, prompt);
      }
      registration = "registration prompt sent to agent";
      registeredAgent = await registerThroughLiveOwner({
        ...registeredAgent,
        bootstrapStatus: "registration-pending",
        registrationStatus: "pending",
      }, context);
    }
  }

  const summary = {
    agent: registeredAgent,
    existed,
    attach: `tmux attach -t ${sessionId}`,
    registration,
    nextAction,
    permissionProfile,
    mcpPreflight,
  };

  if (!shouldAttach) {
    printJson(summary);
    return;
  }

  console.log(JSON.stringify(summary, null, 2));
  execFileSync("tmux", ["attach", "-t", sessionId], {
    stdio: "inherit",
  });
}

function resolvePermissionProfile(
  agentType: string,
  requestedProfile: string,
  projectRoot: string,
): Pick<Agent, "permissionProfile" | "permissionProfileStatus" | "permissionProfileDetail"> {
  if (requestedProfile !== "direct-workspace-read") {
    return {
      permissionProfile: "default",
      permissionProfileStatus: "not-requested",
      permissionProfileDetail: "Default CLI startup. Mina will surface permission prompts instead of hiding them.",
    };
  }

  return {
    permissionProfile: "direct-workspace-read",
    permissionProfileStatus: "unsupported",
    permissionProfileDetail: `No known ${agentType} startup flag in Mina is both direct-read and scoped only to ${projectRoot}. Mina will start the default command and surface permission prompts.`,
  };
}

function buildSelfRegistrationPrompt(agent: Agent): string {
  return [
    "Use Mina AI Router MCP register_agent to register this visible CLI session.",
    "Collect any missing context yourself when possible, but use these values as authoritative:",
    `- id: ${agent.id}`,
    `- name: ${agent.name}`,
    `- agentType: ${agent.agentType}`,
    `- transport: ${agent.transport}`,
    `- sessionId: ${agent.sessionId}`,
    `- sessionFingerprint: ${agent.sessionFingerprint ?? agent.sessionId}`,
    `- projectRoot: ${agent.projectRoot}`,
    `- startupCommand: ${agent.startupCommand ?? ""}`,
    "",
    "If Mina already created this agent record, confirm and update that existing id. Do not create a new id for the same session.",
    "",
    "Before registering, create a concise capability notice for this session:",
    "- Prefer capability docs in this order when present: CLAUDE.md/claude.md, AGENTS.md/agents.md, agent.md, README.md.",
    "- If those files are missing, inspect package metadata and the project file tree to infer what this project/agent can help with.",
    "- Set register_agent capabilitySummary to 2-5 short bullets or one short paragraph under 800 characters.",
    "- Set register_agent capabilitySources to a comma-separated list of the files or project signals you used.",
    "- Set register_agent sessionFingerprint to the value above.",
    "After registering, call list_agents and confirm this agent is available.",
  ].join("\n");
}

async function showHealth(context: ReturnType<typeof createContext>): Promise<void> {
  const liveHealth = await getFromMatchingLiveServer<{
    ok: boolean;
    statePath: string;
    mcpUrl: string;
    agents: {
      total: number;
      available: number;
      busy: number;
      stale: number;
      missing: number;
      needsAttention: number;
      unknown: number;
    };
    requests: {
      total: number;
      open: number;
      waiting?: number;
      answered: number;
      failed: number;
      archived: number;
    };
  }>("/api/health");
  if (liveHealth) {
    printJson({
      ok: liveHealth.ok,
      version,
      statePath: liveHealth.statePath,
      tmuxAvailable: new TmuxClient().isAvailable(),
      agents: liveHealth.agents,
      requests: liveHealth.requests,
      mcp: {
        httpUrl: liveHealth.mcpUrl,
      },
    });
    return;
  }

  const agents = await context.router.listAgentStatuses();
  const requests = context.router.listRequests();
  const openRequests = requests.filter((request) => ["created", "sent", "waiting"].includes(request.status));
  const matchingServer = matchingLiveServerStatus();

  printJson({
    ok: agents.every((agent) => !["missing", "stale", "needs-attention"].includes(agent.status)),
    version,
    statePath,
    tmuxAvailable: new TmuxClient().isAvailable(),
    agents: {
      total: agents.length,
      available: agents.filter((agent) => agent.status === "available").length,
      busy: agents.filter((agent) => agent.status === "busy").length,
      stale: agents.filter((agent) => agent.status === "stale").length,
      missing: agents.filter((agent) => agent.status === "missing").length,
      needsAttention: agents.filter((agent) => agent.status === "needs-attention").length,
      unknown: agents.filter((agent) => agent.status === "unknown").length,
    },
    requests: {
      total: requests.length,
      open: openRequests.length,
      answered: requests.filter((request) => request.status === "answered").length,
      failed: requests.filter((request) => ["failed", "timeout"].includes(request.status)).length,
      archived: requests.filter((request) => request.status === "archived").length,
    },
    mcp: {
      httpUrl: matchingServer?.mcpUrl
        ?? `http://${process.env.MINA_HTTP_HOST ?? "127.0.0.1"}:${process.env.MINA_HTTP_PORT ?? "3333"}/mcp`,
    },
  });
}

function runVerify(): void {
  execFileSync("npm", ["run", "verify"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  printJson({ ok: true, command: "npm run verify" });
}

async function runDoctor(args: string[], context: ReturnType<typeof createContext>): Promise<void> {
  const flags = parseFlags(args);
  const projectRoot = resolve(flags.project ?? process.cwd());
  const clientFilter = normalizeSetupClientFilter(flags.client ?? flags.clients ?? "all");
  const ignoreBlockedAgents = flags["ignore-blocked-agents"] === "true";
  const liveServer = matchingLiveServerStatus();
  const status = serverStatus();
  const mcpUrl = resolveMcpUrl(flags);
  const environmentChecks = [
    doctorCheck("node", true, process.execPath),
    doctorCheck("npm", commandAvailable("npm"), "Required for build, verify, and local package workflows."),
    doctorCheck("tmux", commandAvailable("tmux"), "Required for visible CLI sessions."),
    doctorCheck("built dist", existsSync(join(process.cwd(), "dist", "apps", "cli", "src", "index.js")), "Run npm run build if this is missing."),
    doctorCheck("matching server", Boolean(liveServer), liveServer ? `MCP ${liveServer.mcpUrl ?? mcpUrl}` : `No running Mina server owns ${statePath}. Run mair server start.`),
  ];

  const clients = clientFilter.map((client) => doctorClient(client, projectRoot, mcpUrl));
  const liveState = await getLiveUiState();
  const agents = liveState?.agents ?? await context.router.listAgentStatuses();
  const blockers = agents
    .filter((agent) => agent.routeReady === false || ["mcp-configuring", "permission-required", "registration-pending"].includes(agent.bootstrapStatus ?? ""))
    .map((agent) => ({
      id: agent.id,
      status: agent.status,
      routeReady: agent.routeReady,
      routeBlockedReason: agent.routeBlockedReason,
      bootstrapStatus: agent.bootstrapStatus,
      mcpPreflightStatus: agent.mcpPreflightStatus,
      registrationStatus: agent.registrationStatus,
      repairAction: doctorRepairAction(agent),
    }));

  const checks = [
    ...environmentChecks,
    doctorCheck(
      "route-ready agents",
      ignoreBlockedAgents || blockers.length === 0,
      blockers.length
        ? `${blockers.length} agent(s) are blocked. Resolve the listed repairAction values or rerun with --ignore-blocked-agents for environment-only checks.`
        : "No known agents are blocked from receiving routed work.",
    ),
  ];
  const ok = checks.every((check) => check.ok) && clients.every((client) => client.ok);
  printJson({
    ok,
    statePath,
    projectRoot,
    mcpUrl,
    server: status,
    checks,
    clients,
    blockedAgents: blockers,
  });

  if (!ok) {
    process.exitCode = 1;
  }
}

function doctorRepairAction(agent: AgentStatus): string {
  if (agent.routeBlockedReason) {
    return agent.routeBlockedReason;
  }

  if (agent.bootstrapStatus === "mcp-configuring" || agent.mcpPreflightStatus === "missing" || agent.mcpPreflightStatus === "stale") {
    return `Run mair setup ${agent.agentType === "claude" ? "claude" : "codex"} --project ${shellQuote(agent.projectRoot || process.cwd())}, then rerun mair doctor.`;
  }

  if (agent.bootstrapStatus === "permission-required") {
    return `Open the terminal for ${agent.id}, approve the CLI trust or permission prompt, then rerun mair doctor.`;
  }

  if (agent.bootstrapStatus === "registration-pending" || agent.registrationStatus === "pending") {
    return `Ask ${agent.id} to register this session with Mina AI Router, then rerun mair doctor.`;
  }

  return `Open agent ${agent.id} in the Web UI inspector and resolve its readiness blocker.`;
}

function runSetup(args: string[]): void {
  const client = args[0];
  if (client !== "codex" && client !== "claude") {
    throw new Error("Usage: mair setup <codex|claude> [--project <path>] [--mcp-url <url>] [--mcp-name mina-ai-router] [--dry-run]");
  }

  setupClient(client, parseFlags(args.slice(1)));
}

function setupClient(client: SetupClient, flags: Record<string, string>): void {
  const projectRoot = resolve(flags.project ?? process.cwd());
  const mcpName = flags["mcp-name"] ?? "mina-ai-router";
  const mcpUrl = resolveMcpUrl(flags);
  const dryRun = flags["dry-run"] === "true";
  const source = resolveSkillSourcePath();
  const target = skillTargetFor(client, projectRoot);
  const commands = mcpCommandsFor(client, mcpName, mcpUrl);
  const actions: Array<{ name: string; ok: boolean; detail: string }> = [];

  if (!commandAvailable(client)) {
    throw new Error(`Required command "${client}" is not available on PATH. Install ${client} before running mair setup ${client}.`);
  }

  if (!existsSync(projectRoot)) {
    throw new Error(`Project path does not exist: ${projectRoot}`);
  }

  if (dryRun) {
    printJson({
      ok: true,
      dryRun,
      client,
      projectRoot,
      mcpUrl,
      commands: {
        remove: shellCommand(commands.remove),
        add: shellCommand(commands.add),
        verify: shellCommand(commands.verify),
      },
      skill: {
        source,
        target,
        planned: true,
      },
    });
    return;
  }

  runOptionalMcpCommand(commands.remove, actions, "remove existing MCP entry");
  const addOutput = runRequiredMcpCommand(commands.add, actions, "add MCP entry");
  const verifyOutput = runRequiredMcpCommand(commands.verify, actions, "verify MCP entry");
  const verified = `${addOutput}\n${verifyOutput}`.includes(mcpUrl);
  actions.push({
    name: "verify MCP URL",
    ok: verified,
    detail: verified ? `MCP URL verified: ${mcpUrl}` : `MCP command output did not include ${mcpUrl}.`,
  });
  if (!verified) {
    throw new Error(`MCP setup for ${client} did not verify ${mcpUrl}. Run ${shellCommand(commands.verify)} to inspect the client config.`);
  }

  linkSkill(source, target);
  actions.push({ name: "install registration skill", ok: true, detail: `${target} -> ${source}` });

  printJson({
    ok: true,
    client,
    projectRoot,
    mcpUrl,
    actions,
    commands: {
      remove: shellCommand(commands.remove),
      add: shellCommand(commands.add),
      verify: shellCommand(commands.verify),
    },
    skill: {
      source,
      target,
      installed: existsSync(join(target, "SKILL.md")),
    },
    nextSteps: [
      `Start a visible ${client} session with mair ${client}.`,
      "If the UI shows mcp-configuring, rerun mair doctor --client " + client,
    ],
  });
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
  const mainRoot = options["main-root"];
  const helperRoot = options["helper-root"];
  if (!mainRoot || !helperRoot) {
    throw new Error("setup-codex-pair is a developer/demo helper. Provide explicit --main-root and --helper-root, or use mair setup codex/claude for normal first-run setup.");
  }
  const helperId = options["helper-id"] ?? "ralph";
  const sessionId = options.session ?? "mina-ralph-codex";
  const mcpName = options["mcp-name"] ?? "mina-ai-router";
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
      "Run the mcp.addCommand once so Codex CLI can see Mina AI Router.",
      "Attach to the helper session and make sure helper Codex is ready.",
      "Start Codex in the main.root project.",
      `Ask main Codex to call Mina AI Router target '${helperId}' for questions about the helper project.`,
    ],
  });
}

function normalizeSetupClientFilter(value: string): SetupClient[] {
  if (value === "all") {
    return ["codex", "claude"];
  }

  if (value === "codex" || value === "claude") {
    return [value];
  }

  throw new Error("--client must be codex, claude, or all.");
}

function doctorClient(client: SetupClient, projectRoot: string, mcpUrl: string) {
  const binaryOk = commandAvailable(client);
  const target = skillTargetFor(client, projectRoot);
  const skillInstalled = existsSync(join(target, "SKILL.md"));
  const mcp = binaryOk ? inspectMcpConfig(client, "mina-ai-router", mcpUrl) : {
    ok: false,
    detail: `${client} is not available on PATH.`,
  };

  return {
    client,
    ok: binaryOk && skillInstalled && mcp.ok,
    binary: doctorCheck(`${client} binary`, binaryOk, binaryOk ? "available on PATH" : `Install ${client} before setup.`),
    mcp,
    skill: {
      ok: skillInstalled,
      target,
      detail: skillInstalled ? "registration skill installed or linked" : `Run mair setup ${client} to install the registration skill.`,
    },
  };
}

function doctorCheck(name: string, ok: boolean, detail: string) {
  return { name, ok, detail };
}

function inspectMcpConfig(client: SetupClient, mcpName: string, mcpUrl: string): { ok: boolean; detail: string } {
  const command = mcpCommandsFor(client, mcpName, mcpUrl).verify;
  try {
    const output = execFileSync(command.command, command.args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return {
      ok: output.includes(mcpUrl),
      detail: output.includes(mcpUrl)
        ? `configured for ${mcpUrl}`
        : `MCP entry exists check did not show ${mcpUrl}; run mair setup ${client}.`,
    };
  } catch (error) {
    return {
      ok: false,
      detail: commandFailureMessage(error) || `Run mair setup ${client}.`,
    };
  }
}

function resolveMcpUrl(flags: Record<string, string>): string {
  if (flags["mcp-url"]) {
    return flags["mcp-url"];
  }

  const live = matchingLiveServerStatus();
  if (live?.mcpUrl) {
    return live.mcpUrl;
  }

  return `http://${process.env.MINA_HTTP_HOST ?? "127.0.0.1"}:${process.env.MINA_HTTP_PORT ?? "3333"}/mcp`;
}

function mcpCommandsFor(client: SetupClient, mcpName: string, mcpUrl: string): Record<"remove" | "add" | "verify", { command: string; args: string[] }> {
  if (client === "codex") {
    return {
      remove: { command: "codex", args: ["mcp", "remove", mcpName] },
      add: { command: "codex", args: ["mcp", "add", mcpName, "--url", mcpUrl] },
      verify: { command: "codex", args: ["mcp", "get", mcpName] },
    };
  }

  return {
    remove: { command: "claude", args: ["mcp", "remove", mcpName] },
    add: { command: "claude", args: ["mcp", "add", "--transport", "http", mcpName, mcpUrl] },
    verify: { command: "claude", args: ["mcp", "get", mcpName] },
  };
}

function runOptionalMcpCommand(command: { command: string; args: string[] }, actions: Array<{ name: string; ok: boolean; detail: string }>, name: string): void {
  try {
    execFileSync(command.command, command.args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    actions.push({ name, ok: true, detail: shellCommand(command) });
  } catch (error) {
    actions.push({ name, ok: true, detail: `No existing entry removed or removal was ignored. ${commandFailureMessage(error)}`.trim() });
  }
}

function runRequiredMcpCommand(command: { command: string; args: string[] }, actions: Array<{ name: string; ok: boolean; detail: string }>, name: string): string {
  try {
    const output = execFileSync(command.command, command.args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    actions.push({ name, ok: true, detail: shellCommand(command) });
    return output;
  } catch (error) {
    const detail = commandFailureMessage(error);
    actions.push({ name, ok: false, detail });
    throw new Error(`${name} failed: ${detail}`);
  }
}

function commandFailureMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const record = error as { stderr?: Buffer | string; stdout?: Buffer | string; message?: string };
    const text = `${record.stderr ? String(record.stderr) : ""}${record.stdout ? String(record.stdout) : ""}`.trim();
    return text || record.message || "";
  }

  return String(error);
}

function resolveSkillSourcePath(): string {
  const candidates = [
    join(process.cwd(), "skills", "mina-ai-router-agent"),
    join(__dirname, "../../../../skills/mina-ai-router-agent"),
  ];
  const source = candidates.find((candidate) => existsSync(join(candidate, "SKILL.md")));
  if (!source) {
    throw new Error("Could not locate skills/mina-ai-router-agent/SKILL.md in this checkout or package.");
  }

  return source;
}

function skillTargetFor(client: SetupClient, projectRoot: string): string {
  if (client === "codex") {
    const home = process.env.HOME;
    if (!home) {
      throw new Error("HOME is required to install the Codex registration skill.");
    }

    return join(home, ".codex", "skills", "mina-ai-router-agent");
  }

  return join(projectRoot, ".claude", "skills", "mina-ai-router-agent");
}

function linkSkill(source: string, target: string): void {
  mkdirSync(dirname(target), { recursive: true });
  execFileSync("rm", ["-rf", target], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    execFileSync("ln", ["-sfn", source, target], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    mkdirSync(target, { recursive: true });
    execFileSync("cp", ["-R", `${source}/.`, target], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  }
}

function shellCommand(command: { command: string; args: string[] }): string {
  return [command.command, ...command.args].map(shellQuote).join(" ");
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
    agentStaleAfterMs,
    onStateChanged: context.save,
  });

  return {
    ...context,
    transports,
    router,
  };
}

async function registerAgent(args: string[], context: ReturnType<typeof createContext>): Promise<void> {
  const id = args[0];
  if (!id) {
    throw new Error("Usage: mair register <id> --agent <type> --transport <transport> --session <session> --root <path>");
  }

  const options = parseFlags(args.slice(1));
  const now = new Date().toISOString();
  const agent: Agent = {
    id,
    name: options.name ?? id,
    agentType: options.agent ?? "unknown",
    transport: (options.transport ?? "headless") as TransportType,
    sessionId: options.session ?? id,
    sessionFingerprint: options["session-fingerprint"] ?? options.session ?? id,
    projectRoot: options.root ?? process.cwd(),
    tmuxTarget: options.target,
    startupCommand: options.command,
    capabilitySummary: options.summary ?? options["capability-summary"],
    capabilitySources: options.sources ?? options["capability-sources"],
    bootstrapStatus: "ready",
    registrationSource: "cli",
    registrationStatus: "confirmed",
    lastRegistrationAttemptAt: now,
    confirmedByAgentAt: now,
  };

  const proxied = await postToMatchingLiveServer<{ agent: Agent }>("/api/register", agent);
  if (proxied) {
    printJson({ agent: proxied.agent });
    return;
  }

  const registered = context.registry.register(agent, {
    capabilitySource: agent.capabilitySummary || agent.capabilitySources ? "manual" : undefined,
  });
  context.save();
  printJson({ agent: registered });
}

async function listAgents(context: ReturnType<typeof createContext>): Promise<void> {
  const liveState = await getLiveUiState();
  if (liveState) {
    printJson({
      agents: liveState.agents,
    });
    return;
  }

  const agents = await context.router.listAgentStatuses();
  printJson({
    agents,
  });
}

async function handleAgent(args: string[], context: ReturnType<typeof createContext>): Promise<void> {
  if (args[0] === "refresh-capabilities") {
    await refreshAgentCapabilities(args.slice(1), context);
    return;
  }

  await showAgent(args, context);
}

async function showAgent(args: string[], context: ReturnType<typeof createContext>): Promise<void> {
  const id = args[0];
  if (!id) {
    throw new Error("Usage: mair agent <id> | mair agent refresh-capabilities <id> [--timeout-ms 300000]");
  }

  const liveState = await getLiveUiState();
  if (liveState) {
    const status = liveState.agents.find((candidate) => candidate.id === id);
    if (!status) {
      throw new Error(`Agent "${id}" is not registered.`);
    }
    printJson({
      agent: status,
      status,
      attach: status.transport === "tmux" ? `tmux attach -t ${status.sessionId}` : undefined,
    });
    return;
  }

  const agent = context.registry.require(id);
  const statuses = await context.router.listAgentStatuses();
  printJson({
    agent,
    status: statuses.find((candidate) => candidate.id === id),
    attach: agent.transport === "tmux" ? `tmux attach -t ${agent.sessionId}` : undefined,
  });
}

async function refreshAgentCapabilities(args: string[], context: ReturnType<typeof createContext>): Promise<void> {
  const id = args[0];
  if (!id) {
    throw new Error("Usage: mair agent refresh-capabilities <id> [--timeout-ms 300000]");
  }

  const flags = parseFlags(args.slice(1));
  const proxied = await postToMatchingLiveServer<{ agent: Agent; refresh: { requestId: string; refreshedAt: string; capabilitySource?: string } }>(
    `/api/agents/${encodeURIComponent(id)}/refresh-capabilities`,
    {
      timeoutMs: flags["timeout-ms"] ? Number(flags["timeout-ms"]) : undefined,
    },
  );
  if (proxied) {
    printJson({
      agent: proxied.agent,
      refresh: proxied.refresh,
    });
    return;
  }

  const agent = context.registry.require(id);
  const response = await context.router.callAgent({
    target: id,
    task: buildCapabilityRefreshTask(agent),
    timeoutMs: flags["timeout-ms"] ? Number(flags["timeout-ms"]) : undefined,
  });
  const notice = parseCapabilityRefreshAnswer(response.answer);
  const refreshedAt = new Date().toISOString();
  const updated = context.registry.updateCapabilities(id, {
    summary: notice.capabilitySummary,
    sources: notice.capabilitySources,
    source: "generated",
    refreshedAt,
    profile: notice.capabilityProfile,
  });
  context.save();

  printJson({
    agent: updated,
    refresh: {
      requestId: response.requestId,
      refreshedAt,
      capabilitySource: updated.capabilitySource,
    },
  });
}

function buildCapabilityRefreshTask(agent: Agent): string {
  return [
    "Refresh your Mina AI Router capability registration for this visible local agent.",
    "",
    "Inspect local project docs and metadata before answering.",
    "Prefer capability docs in this order when present: CLAUDE.md/claude.md, AGENTS.md/agents.md, agent.md, README.md.",
    "If those files are missing, inspect package metadata and the project file tree.",
    "",
    "Return only JSON with these string fields:",
    "{",
    '  "capabilitySummary": "2-5 short bullets or one short paragraph under 800 characters",',
    '  "capabilitySources": "comma-separated file paths or project signals used",',
    '  "capabilityProfile": {',
    '    "projectPurpose": "what this project implements",',
    '    "primaryLanguages": ["TypeScript"],',
    '    "keyAreas": ["router", "MCP endpoint"],',
    '    "canAnswer": ["specific question domains this agent can answer"],',
    '    "cannotAnswerYet": ["known limits"],',
    '    "evidence": ["README.md", "package.json", "src/..."]',
    "  }",
    "}",
    "",
    "Do not include markdown fences or extra commentary in the JSON body.",
    "",
    "Registration context:",
    `- id: ${agent.id}`,
    `- agentType: ${agent.agentType}`,
    `- transport: ${agent.transport}`,
    `- sessionId: ${agent.sessionId}`,
    `- projectRoot: ${agent.projectRoot}`,
  ].join("\n");
}

function parseCapabilityRefreshAnswer(answer: string): { capabilitySummary: string; capabilitySources: string; capabilityProfile?: Partial<AgentCapabilityProfile> } {
  const trimmed = answer.trim();
  const jsonText = trimmed.startsWith("{") ? trimmed : trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1);

  if (!jsonText || !jsonText.startsWith("{") || !jsonText.endsWith("}")) {
    throw new Error("Capability refresh response did not contain a JSON object.");
  }

  const parsed = JSON.parse(jsonText) as {
    capabilitySummary?: unknown;
    capabilitySources?: unknown;
    capabilityProfile?: unknown;
  };
  const capabilitySummary = typeof parsed.capabilitySummary === "string" ? parsed.capabilitySummary.trim() : "";
  const capabilitySources = typeof parsed.capabilitySources === "string" ? parsed.capabilitySources.trim() : "";

  if (!capabilitySummary || !capabilitySources) {
    throw new Error("Capability refresh JSON requires non-empty capabilitySummary and capabilitySources strings.");
  }

  if (capabilitySummary.length > 800) {
    throw new Error("Capability refresh JSON capabilitySummary must be under 800 characters.");
  }

  return {
    capabilitySummary,
    capabilitySources,
    capabilityProfile: capabilityProfileValue(parsed.capabilityProfile),
  };
}

function capabilityProfileValue(value: unknown): Partial<AgentCapabilityProfile> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  return {
    projectPurpose: stringObjectValue(record.projectPurpose),
    primaryLanguages: stringArrayValue(record.primaryLanguages),
    keyAreas: stringArrayValue(record.keyAreas),
    canAnswer: stringArrayValue(record.canAnswer),
    cannotAnswerYet: stringArrayValue(record.cannotAnswerYet),
    evidence: stringArrayValue(record.evidence),
  };
}

function stringObjectValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stringArrayValue(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const values = value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .map((item) => item.trim());
  return values.length ? values : undefined;
}

function showAttach(args: string[], context: ReturnType<typeof createContext>): void {
  const id = args[0];
  if (!id) {
    throw new Error("Usage: mair attach <id>");
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
    throw new Error('Usage: mair ask <target> "question" [--timeout-ms 300000]');
  }

  const flags = parseFlags(args);
  const proxied = await postToMatchingLiveServer<{ result: unknown }>("/api/ask", {
    target,
    task: taskFromArgs(args.slice(1)),
    timeoutMs: flags["timeout-ms"] ? Number(flags["timeout-ms"]) : undefined,
  });
  if (proxied) {
    printJson(proxied.result);
    return;
  }

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

async function registerThroughLiveOwner(agent: Agent, context: ReturnType<typeof createContext>): Promise<Agent> {
  const proxied = await postToMatchingLiveServer<{ agent: Agent }>("/api/register", agent);
  if (proxied) {
    return proxied.agent;
  }

  const registered = context.registry.register(agent, {
    capabilitySource: agent.capabilitySummary || agent.capabilitySources ? "manual" : undefined,
  });
  context.save();
  return registered;
}

function listRequests(args: string[], context: ReturnType<typeof createContext>): void {
  const flags = parseFlags(args);
  const target = flags.target;
  const requests = target
    ? context.router.listRequests().filter((request) => request.targetAgent === target)
    : context.router.listRequests();

  printJson({ requests });
}

async function handleRequest(args: string[], context: ReturnType<typeof createContext>): Promise<void> {
  const requestId = args[0];
  if (!requestId) {
    throw new Error("Usage: mair request <request-id> [retry|cancel|archive|unarchive|interrupt|recover]");
  }

  const action = args[1];
  if (action) {
    await runRequestAction(requestId, action, context);
    return;
  }

  printJson(context.router.getRequest(requestId));
}

async function runRequestAction(
  requestId: string,
  action: string,
  context: ReturnType<typeof createContext>,
): Promise<void> {
  if (isRequestAction(action) && await runServerRequestAction(requestId, action)) {
    return;
  }

  const request = context.router.getRequest(requestId);

  switch (action) {
    case "retry": {
      context.requestStore.assertActionAllowed(request, "retry");
      try {
        const result = await context.router.callAgent({
          sourceAgent: request.sourceAgent,
          target: request.targetAgent,
          task: request.task,
          retryOfRequestId: request.id,
        });
        context.requestStore.recordRetry(request.id, result.requestId);
        printJson(result);
      } finally {
        context.save();
      }
      return;
    }
    case "cancel": {
      const updated = context.requestStore.cancel(requestId, "Cancelled by operator from Mina AI Router CLI.", "cli");
      clearAgentLeaseForRequest(updated, context);
      context.save();
      printJson(updated);
      return;
    }
    case "interrupt": {
      const updated = interruptRequest(requestId, context);
      context.save();
      printJson(updated);
      return;
    }
    case "recover": {
      const updated = context.router.recoverRequestLease(
        requestId,
        "cli",
        "Marked recovered by operator from Mina AI Router CLI.",
      );
      printJson(updated);
      return;
    }
    case "archive": {
      const updated = context.router.archiveRequest(requestId, "cli", "Archived by operator from Mina AI Router CLI.");
      printJson(updated);
      return;
    }
    case "unarchive": {
      const updated = context.requestStore.unarchive(requestId);
      context.save();
      printJson(updated);
      return;
    }
    default:
      throw new Error(`Unsupported request action "${action}". Use retry, cancel, archive, unarchive, interrupt, or recover.`);
  }
}

function interruptRequest(requestId: string, context: ReturnType<typeof createContext>) {
  const request = context.requestStore.require(requestId);
  context.requestStore.assertActionAllowed(request, "interrupt");
  const agentId = request.leaseOwnerAgentId ?? request.targetAgent;
  const agent = context.registry.require(agentId);
  if (agent.transport !== "tmux") {
    throw new Error(`Request "${requestId}" targets ${agent.transport}, not tmux; open the session manually.`);
  }

  const target = agent.tmuxTarget ?? agent.sessionId;
  new TmuxClient().sendInterrupt(target);
  return context.requestStore.recordInterrupt(requestId, {
    source: "cli",
    terminalTarget: target,
    message: `Terminal interrupt sent to ${target}.`,
  });
}

function clearAgentLeaseForRequest(request: { leaseOwnerAgentId?: string; id: string }, context: ReturnType<typeof createContext>): void {
  if (!request.leaseOwnerAgentId) {
    return;
  }

  const agent = context.registry.get(request.leaseOwnerAgentId);
  if (!agent || agent.activeRequestId !== request.id) {
    return;
  }

  context.registry.register({
    ...agent,
    activeRequestId: undefined,
    leaseStatus: "released",
    leaseReleasedAt: new Date().toISOString(),
  });
}

function isRequestAction(action: string): action is "retry" | "cancel" | "archive" | "unarchive" | "interrupt" | "recover" {
  return action === "retry"
    || action === "cancel"
    || action === "archive"
    || action === "unarchive"
    || action === "interrupt"
    || action === "recover";
}

async function runServerRequestAction(requestId: string, action: string): Promise<boolean> {
  const status = matchingLiveServerStatus();
  if (!status) {
    return false;
  }

  const url = `http://${status.host}:${status.port}/api/requests/${encodeURIComponent(requestId)}/${encodeURIComponent(action)}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
  } catch (error) {
    throw new Error(
      `Mina server is running for this state file, but ${action} could not reach ${url}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const body = await parseLiveServerJsonResponse<{ result?: unknown; error?: string }>(response, url, `/api/requests/${requestId}/${action}`);
  if (!response.ok) {
    throw new Error(body.error ?? `Request action ${action} failed with HTTP ${response.status}.`);
  }

  printJson(body.result);
  return true;
}

async function getLiveUiState(): Promise<{ statePath: string; mcpUrl: string; agents: AgentStatus[]; requests: AgentRequest[] } | undefined> {
  return getFromMatchingLiveServer("/api/state");
}

function matchingLiveServerStatus(): ReturnType<typeof serverStatus> | undefined {
  const status = serverStatus();
  if (!status.running || !status.host || !status.port || !status.statePath) {
    return undefined;
  }

  if (resolvePath(status.statePath) !== resolvePath(statePath)) {
    return undefined;
  }

  return status;
}

async function getFromMatchingLiveServer<T>(path: string): Promise<T | undefined> {
  const status = matchingLiveServerStatus();
  if (!status) {
    return undefined;
  }

  const url = `http://${status.host}:${status.port}${path}`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(
      `Mina server is running for this state file, but CLI live read could not reach ${url}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const responseBody = await parseLiveServerJsonResponse<T & { error?: string }>(response, url, path);
  if (!response.ok) {
    throw new Error(responseBody.error ?? `CLI live read ${path} failed with HTTP ${response.status}.`);
  }

  return responseBody;
}

async function postToMatchingLiveServer<T>(path: string, body: unknown): Promise<T | undefined> {
  const status = matchingLiveServerStatus();
  if (!status) {
    return undefined;
  }

  const url = `http://${status.host}:${status.port}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
  } catch (error) {
    throw new Error(
      `Mina server is running for this state file, but CLI proxy could not reach ${url}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const responseBody = await parseLiveServerJsonResponse<T & { error?: string }>(response, url, path);
  if (!response.ok) {
    throw new Error(responseBody.error ?? `CLI proxy ${path} failed with HTTP ${response.status}.`);
  }

  return responseBody;
}

async function parseLiveServerJsonResponse<T>(response: Response, url: string, path: string): Promise<T> {
  const text = await response.text();
  const parsed = safeJson(text);
  if (parsed === undefined) {
    throw new Error(nonMinaPidMessage(url, `response was not Mina JSON: ${truncateText(text, 160)}`));
  }

  if (response.ok && !looksLikeMinaResponse(path, parsed)) {
    throw new Error(nonMinaPidMessage(url, "response JSON did not match Mina server shape"));
  }

  return parsed as T;
}

function looksLikeMinaResponse(path: string, value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (path === "/api/health") {
    return typeof record.statePath === "string"
      && typeof record.mcpUrl === "string"
      && Boolean(record.agents && typeof record.agents === "object")
      && Boolean(record.requests && typeof record.requests === "object");
  }

  if (path === "/api/state") {
    return typeof record.statePath === "string"
      && typeof record.mcpUrl === "string"
      && Array.isArray(record.agents)
      && Array.isArray(record.requests);
  }

  if (path === "/api/register") {
    return Boolean(record.agent && typeof record.agent === "object");
  }

  if (path === "/api/ask") {
    return Boolean(record.result && typeof record.result === "object");
  }

  if (/^\/api\/agents\/[^/]+\/refresh-capabilities$/.test(path)) {
    return Boolean(record.agent && typeof record.agent === "object")
      && Boolean(record.refresh && typeof record.refresh === "object");
  }

  if (/^\/api\/requests\/[^/]+\/[^/]+$/.test(path)) {
    return "result" in record;
  }

  return true;
}

function nonMinaPidMessage(url: string, detail: string): string {
  return [
    `Mina server pid file points at ${url}, but ${detail}.`,
    `Remove stale pid file ${serverPidPath} or restart mair server.`,
  ].join(" ");
}

function resolvePath(value: string): string {
  return resolve(value);
}

function safeJson(value: string): unknown | undefined {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function truncateText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1).trim()}...` : normalized;
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
  if (commandAvailable(command)) {
    return;
  }

  throw new Error(`Required command "${command}" is not available on PATH.`);
}

function commandAvailable(command: string): boolean {
  try {
    execFileSync("which", [command], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_/:=.,@+-]+$/.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, "'\\''")}'`;
}

function sanitizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "agent";
}

function sleep(milliseconds: number): void {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return;
  }

  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
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
  console.log(`Mina AI Router

Commands:
  mair version
  mair health
  mair doctor [--client <codex|claude|all>] [--project <path>] [--json]
  mair verify
  mair setup codex [--project <path>] [--mcp-url <url>] [--mcp-name mina-ai-router]
  mair setup claude [--project <path>] [--mcp-url <url>] [--mcp-name mina-ai-router]
  mair server start [--port 3333] [--host 127.0.0.1]
  mair server stop
  mair server status
  mair codex [--id <id>] [--session <tmux-session>] [--root <path>] [--no-attach] [--no-register]
  mair claude [--id <id>] [--session <tmux-session>] [--root <path>] [--no-attach] [--no-register]
  mair register <id> --agent <type> --transport <headless|mock|tmux|zmux> --session <session> --root <path>
  mair agents
  mair agent <id>
  mair agent refresh-capabilities <id> [--timeout-ms 300000]
  mair attach <id>
  mair serve [--port 3333]
  mair ask <target> "question"
  mair requests [--target <id>]
  mair request <request-id> [retry|cancel|archive|unarchive|interrupt|recover]

Developer/demo helper:
  mair setup-codex-pair --main-root <path> --helper-root <path> [--helper-id <id>] [--session <tmux-session>]

Example:
  mair server start --port 3333
  mair setup codex --project ~/work/payment
  mair doctor --client codex --project ~/work/payment
  mair setup claude --project ~/work/payment
  mair doctor --client claude --project ~/work/payment
  mair register payment --agent gemini --transport headless --session payment --root ./payment
  mair register payment --agent gemini --transport tmux --session payment --root ~/work/payment
  mair serve
  mair codex
  mair claude
  mair ask payment "현재 payment flow를 요약해줘."

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
