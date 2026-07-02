import { homedir } from "node:os";
import { join } from "node:path";

export function defaultRuntimeDir(): string {
  return process.env.MINA_RUNTIME_DIR ?? join(homedir(), ".mair");
}

export function defaultRouterStatePath(): string {
  return join(defaultRuntimeDir(), "router-state.json");
}

export function defaultServerPidPath(): string {
  return join(defaultRuntimeDir(), "mair-server.json");
}

