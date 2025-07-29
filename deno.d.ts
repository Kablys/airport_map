/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="deno.window" />

// Basic Deno types
declare const Deno: {
  readonly env: {
    get(key: string): string | undefined;
  };
  cwd(): string;
  chdir(directory: string): void;
  readTextFile(path: string): Promise<string>;
  readTextFileSync(path: string): string;
  writeTextFile(path: string, data: string): Promise<void>;
  writeTextFileSync(path: string, data: string): void;
  readFile(path: string): Promise<Uint8Array>;
  readFileSync(path: string): Uint8Array;
  writeFile(path: string, data: Uint8Array): Promise<void>;
  writeFileSync(path: string, data: Uint8Array): void;
  remove(path: string, options?: { recursive?: boolean }): Promise<void>;
  removeSync(path: string, options?: { recursive?: boolean }): void;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  stat(path: string): Promise<Deno.FileInfo>;
  statSync(path: string): Deno.FileInfo;
  open(path: string, options?: { read?: boolean; write?: boolean; append?: boolean; truncate?: boolean; create?: boolean; createNew?: boolean }): Promise<Deno.File>;
  openSync(path: string, options?: { read?: boolean; write?: boolean; append?: boolean; truncate?: boolean; create?: boolean; createNew?: boolean }): Deno.File;
  close(rid: number): void;
  run<T extends Deno.RunOptions>(options: T): Deno.Process<T>;
  exit(code?: number): never;
  isatty(rid: number): boolean;
  link(oldpath: string, newpath: string): Promise<void>;
  linkSync(oldpath: string, newpath: string): void;
  symlink(target: string, path: string, type?: string): Promise<void>;
  symlinkSync(target: string, path: string, type?: string): void;
  readLink(path: string): Promise<string>;
  readLinkSync(path: string): string;
  realPath(path: string): Promise<string>;
  realPathSync(path: string): string;
  rename(oldpath: string, newpath: string): Promise<void>;
  renameSync(oldpath: string, newpath: string): void;
  serve(handler: (req: Request) => Response | Promise<Response>): Promise<void>;
  serve(addr: string | Deno.ListenOptions, handler: (req: Request) => Response | Promise<Response>): Promise<void>;
  listen(options: Deno.ListenOptions): Deno.Listener;
  connect(options: Deno.ConnectOptions): Promise<Deno.Conn>;
  hostname(): string;
  execPath(): string;
  execPathSync(): string;
  exitCode: number;
};

declare namespace Deno {
  interface FileInfo {
    isFile: boolean;
    isDirectory: boolean;
    isSymlink: boolean;
    size: number;
    mtime: Date | null;
    atime: Date | null;
    birthtime: Date | null;
  }

  interface DirEntry {
    name: string;
    isFile: boolean;
    isDirectory: boolean;
    isSymlink: boolean;
  }

  interface RunOptions {
    cmd: string[] | [URL, ...string[]];
    cwd?: string;
    env?: { [key: string]: string };
    stdout?: 'inherit' | 'piped' | 'null' | number;
    stderr?: 'inherit' | 'piped' | 'null' | number;
    stdin?: 'inherit' | 'piped' | 'null' | number;
  }

  interface Process<T extends RunOptions = RunOptions> {
    readonly rid: number;
    readonly pid: number;
    readonly stdin: T['stdin'] extends 'piped' ? Deno.Writer & Deno.Closer & { writable: WritableStream<Uint8Array> } : null;
    readonly stdout: T['stdout'] extends 'piped' ? Deno.Reader & Deno.Closer & { readable: ReadableStream<Uint8Array> } : null;
    readonly stderr: T['stderr'] extends 'piped' ? Deno.Reader & Deno.Closer & { readable: ReadableStream<Uint8Array> } : null;
    readonly status: () => Promise<ProcessStatus>;
    output(): Promise<Uint8Array>;
    stderrOutput(): Promise<Uint8Array>;
    close(): void;
    kill(signo: number): void;
  }

  interface ProcessStatus {
    success: boolean;
    code: number;
    signal: Deno.Signal | null;
  }

  type Signal = 'SIGABRT' | 'SIGALRM' | 'SIGBUS' | 'SIGCHLD' | 'SIGCONT' | 'SIGEMT' | 'SIGFPE' | 'SIGHUP' | 'SIGILL' | 'SIGINFO' | 'SIGINT' | 'SIGIO' | 'SIGKILL' | 'SIGPIPE' | 'SIGPROF' | 'SIGQUIT' | 'SIGSEGV' | 'SIGSTOP' | 'SIGSYS' | 'SIGTERM' | 'SIGTRAP' | 'SIGTSTP' | 'SIGTTIN' | 'SIGTTOU' | 'SIGURG' | 'SIGUSR1' | 'SIGUSR2' | 'SIGVTALRM' | 'SIGWINCH' | 'SIGXCPU' | 'SIGXFSZ';

  interface ListenOptions {
    port: number;
    hostname?: string;
    transport?: 'tcp';
  }

  interface ConnectOptions {
    port: number;
    hostname?: string;
    transport?: 'tcp';
  }

  interface Conn extends AsyncIterable<Uint8Array> {
    readonly localAddr: Addr;
    readonly remoteAddr: Addr;
    readonly rid: number;
    closeWrite(): Promise<void>;
    read(p: Uint8Array): Promise<number | null>;
    write(p: Uint8Array): Promise<number>;
    close(): void;
  }

  interface Addr {
    transport: 'tcp' | 'udp';
    hostname: string;
    port: number;
  }

  interface Listener extends AsyncIterable<Conn> {
    addr: Addr;
    accept(): Promise<Conn>;
    close(): void;
    [Symbol.asyncIterator](): AsyncIterableIterator<Conn>;
  }

  interface File extends AsyncIterable<Uint8Array> {
    readonly rid: number;
    readonly readable: ReadableStream<Uint8Array>;
    readonly writable: WritableStream<Uint8Array>;
    close(): void;
    read(p: Uint8Array): Promise<number | null>;
    write(p: Uint8Array): Promise<number>;
    seek(offset: number, whence: number): Promise<number>;
    stat(): Promise<FileInfo>;
    truncate(len?: number): Promise<void>;
  }

  interface Reader {
    read(p: Uint8Array): Promise<number | null>;
  }

  interface Writer {
    write(p: Uint8Array): Promise<number>;
  }

  interface Closer {
    close(): void;
  }

  interface Seeker {
    seek(offset: number, whence: number): Promise<number>;
  }

  interface ReadCloser extends Reader, Closer {}
  interface WriteCloser extends Writer, Closer {}
  interface ReadWriteCloser extends Reader, Writer, Closer {}
}
