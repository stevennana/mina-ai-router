import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const fallbackVersion = "0.0.0";

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

function findPackageJson(): string | undefined {
  const starts = [process.cwd(), __dirname];
  for (const start of starts) {
    const found = findUp(start, "package.json");
    if (found) {
      return found;
    }
  }
  return undefined;
}

function findUp(start: string, filename: string): string | undefined {
  let current = resolve(start);
  for (let depth = 0; depth < 10; depth += 1) {
    const candidate = join(current, filename);
    if (existsSync(candidate)) {
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
