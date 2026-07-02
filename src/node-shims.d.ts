declare const process: {
  execPath: string;
  argv: string[];
  env: Record<string, string | undefined>;
  cwd(): string;
  pid: number;
  exitCode?: number;
  kill(pid: number, signal?: string | number): void;
  stdin: {
    on(event: "data", listener: (chunk: Buffer) => void): void;
  };
  stdout: {
    write(chunk: string | Buffer): void;
  };
};

declare const console: {
  log(message?: unknown, ...optionalParams: unknown[]): void;
  error(message?: unknown, ...optionalParams: unknown[]): void;
};

declare const __dirname: string;

declare class Buffer extends Uint8Array {
  static alloc(size: number): Buffer;
  static concat(list: readonly Uint8Array[]): Buffer;
  static from(input: string, encoding?: string): Buffer;
  static from(input: ArrayBuffer): Buffer;
  static byteLength(input: string, encoding?: string): number;
  indexOf(value: string | number, byteOffset?: number): number;
  slice(start?: number, end?: number): Buffer;
  toString(encoding?: string): string;
}

declare module "node:fs" {
  export function appendFileSync(path: string, data: string): void;
  export function closeSync(fd: number): void;
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function openSync(path: string, flags: string): number;
  export function readFileSync(path: string): Buffer;
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function readdirSync(path: string, options?: { withFileTypes?: false }): string[];
  export function readdirSync(path: string, options: { withFileTypes: true }): Array<{
    name: string;
    isDirectory(): boolean;
  }>;
  export function renameSync(oldPath: string, newPath: string): void;
  export function statSync(path: string): {
    isDirectory(): boolean;
    isFile(): boolean;
  };
  export function unlinkSync(path: string): void;
  export function writeFileSync(path: string, data: string): void;
}

declare module "node:http" {
  export interface IncomingMessage {
    headers: Record<string, string | string[] | undefined>;
    method?: string;
    url?: string;
    on(event: "data", listener: (chunk: Buffer) => void): void;
    on(event: "end", listener: () => void): void;
    on(event: "error", listener: (error: Error) => void): void;
  }

  export interface ServerResponse {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(data?: string | Buffer): void;
  }

  export function createServer(
    listener: (request: IncomingMessage, response: ServerResponse) => void,
  ): {
    listen(port: number, host: string, callback?: () => void): void;
  };
}

declare module "node:os" {
  export function homedir(): string;
}

declare module "node:path" {
  export function basename(path: string): string;
  export function dirname(path: string): string;
  export function extname(path: string): string;
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
}

declare module "node:url" {
  export function pathToFileURL(path: string): { href: string };
}

declare class URL {
  constructor(input: string, base?: string);
  href: string;
  pathname: string;
}

declare class Headers {
  constructor(init?: Record<string, string>);
  set(name: string, value: string): void;
  get(name: string): string | null;
  forEach(callback: (value: string, key: string) => void): void;
}

declare class Request {
  constructor(input: string, init?: { method?: string; headers?: Headers; body?: string });
  headers: Headers;
}

declare class Response {
  status: number;
  headers: Headers;
  arrayBuffer(): Promise<ArrayBuffer>;
}

declare module "node:child_process" {
  export function execFileSync(
    file: string,
    args?: readonly string[],
    options?: {
      cwd?: string;
      encoding?: "utf8";
      input?: string;
      stdio?:
        | "inherit"
        | readonly ["ignore" | "pipe", "pipe", "pipe"]
        | readonly ["pipe", "pipe", "pipe"]
        | readonly ["ignore", "ignore", "ignore"];
    },
  ): string;
  export function spawn(
    file: string,
    args?: readonly string[],
    options?: {
      cwd?: string;
      detached?: boolean;
      env?: Record<string, string | undefined>;
      stdio?: "inherit" | "ignore" | readonly ["ignore", number, number];
    },
  ): {
    on(event: "exit", listener: (code: number | null) => void): void;
    unref(): void;
    pid?: number;
  };
}
