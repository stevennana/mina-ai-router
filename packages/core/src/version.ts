import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const fallbackVersion = "0.0.0";
const packageName = "@minasoft/mina-ai-router";

export function packageVersion(): string {
  const packagePath = findPackageJson();
  if (!packagePath) {
    return fallbackVersion;
  }

  try {
    const parsed = JSON.parse(readFileSync(packagePath, "utf8")) as { version?: unknown };
    return typeof parsed.version === "string" && parsed.version.trim()
      ? parsed.version
      : fallbackVersion;
  } catch {
    return fallbackVersion;
  }
}

export function packageRoot(): string | undefined {
  const packagePath = findPackageJson();
  return packagePath ? dirname(packagePath) : undefined;
}

function findPackageJson(): string | undefined {
  return findUpPackageJson(__dirname);
}

function findUpPackageJson(start: string): string | undefined {
  let current = resolve(start);
  for (let depth = 0; depth < 10; depth += 1) {
    const candidate = join(current, "package.json");
    if (isMinaPackageJson(candidate)) {
      return candidate;
    }
    const parent = dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
  return undefined;
}

function isMinaPackageJson(candidate: string): boolean {
  if (!existsSync(candidate)) {
    return false;
  }

  try {
    const parsed = JSON.parse(readFileSync(candidate, "utf8")) as { name?: unknown };
    return parsed.name === packageName;
  } catch {
    return false;
  }
}
