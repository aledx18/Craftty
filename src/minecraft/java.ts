import os from "node:os";
import path from "node:path";
import fs from "node:fs";

export interface JavaRuntime {
  /** Absolute path to the java executable (not JAVA_HOME). */
  path: string;
  /** 8, 17, 21, 27, ... */
  major: number;
}

/**
 * Parse `java -version` output.
 * Modern:  openjdk version "21.0.5"
 * Legacy:  java version "1.8.0_432"  → major 8
 */
export function parseJavaMajor(output: string): number | null {
  const match = output.match(/version "(\d+)(?:\.(\d+))?/);
  if (!match) return null;
  const first = Number(match[1]);
  if (first === 1 && match[2]) return Number(match[2]);
  return Number.isFinite(first) ? first : null;
}

function existsFile(p: string): boolean {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/**
 * Places a Linux box actually keeps a `java` binary.
 * JAVA_HOME first — that's the user's explicit choice.
 */
function collectCandidates(): string[] {
  const home = os.homedir();
  const out: string[] = [];

  if (process.env.JAVA_HOME) {
    out.push(path.join(process.env.JAVA_HOME, "bin", "java"));
  }

  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    if (dir) out.push(path.join(dir, "java"));
  }

  const roots = [
    "/usr/lib/jvm",
    path.join(home, ".local/share/mise/installs/java"),
    path.join(home, ".sdkman/candidates/java"),
    path.join(home, ".asdf/installs/java"),
  ];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    let names: string[] = [];
    try {
      names = fs.readdirSync(root);
    } catch {
      continue;
    }
    for (const name of names) {
      out.push(path.join(root, name, "bin", "java"));
    }
  }

  return out;
}

/**
 * mise/asdf shims are symlinks to the manager binary (`/usr/bin/mise`).
 * Executing the shim works because argv[0] is still "java".
 * realpath() of that shim is the manager — launching Minecraft with it fails.
 * Only follow the symlink when the target is still named `java`.
 */
function usableJavaPath(bin: string): string {
  try {
    const resolved = fs.realpathSync(bin);
    if (path.basename(resolved) === "java") return resolved;
  } catch {}
  return path.resolve(bin);
}

async function probeJava(bin: string): Promise<JavaRuntime | null> {
  if (!existsFile(bin)) return null;
  try {
    const proc = Bun.spawn([bin, "-version"], { stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    await proc.exited;
    const major = parseJavaMajor(stderr + stdout);
    if (major === null) return null;
    return { path: usableJavaPath(bin), major };
  } catch {
    return null;
  }
}

export async function discoverJavaRuntimes(): Promise<JavaRuntime[]> {
  const seen = new Set<string>();
  const found: JavaRuntime[] = [];
  for (const candidate of collectCandidates()) {
    const runtime = await probeJava(candidate);
    if (!runtime || seen.has(runtime.path)) continue;
    seen.add(runtime.path);
    found.push(runtime);
  }
  return found;
}

/**
 * Pick a runtime for a Minecraft version's required major.
 * Prefer an exact match. If none, the closest HIGHER major
 * (Java 21 can often run on 22+; Java 17 cannot run 1.21).
 */
export function pickJava(runtimes: JavaRuntime[], requiredMajor: number): JavaRuntime {
  const exact = runtimes.find((r) => r.major === requiredMajor);
  if (exact) return exact;

  const higher = runtimes
    .filter((r) => r.major > requiredMajor)
    .sort((a, b) => a.major - b.major);
  if (higher[0]) return higher[0];

  const found = runtimes.map((r) => `Java ${r.major} (${r.path})`).join(", ");
  throw new Error(
    found
      ? `Need Java ${requiredMajor}. Found: ${found}`
      : `Need Java ${requiredMajor}. No Java runtime found.`
  );
}

export async function resolveJava(requiredMajor: number): Promise<JavaRuntime> {
  const runtimes = await discoverJavaRuntimes();
  return pickJava(runtimes, requiredMajor);
}
