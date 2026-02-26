import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const NEXT_DIR = path.join(ROOT, ".next");
const LOCK_FILE = path.join(NEXT_DIR, "dev", "lock");
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const PREFERRED_PORT = 3000;
const FALLBACK_PORT = 3001;
const MAX_ATTEMPTS = 2;
const IS_WINDOWS = process.platform === "win32";
const TURBOPACK_FAILURE_MARKERS = [
  "Turbopack build failed",
  "inferred your workspace root",
  "Persisting failed",
  "os error 1224",
  "compaction is already active",
];

function initialMode() {
  if (!IS_WINDOWS) {
    return "turbopack";
  }
  if (process.env.VO_TURBO === "1") {
    return "turbopack";
  }
  return "webpack";
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => resolve(false));
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
  });
}

async function resolveInitialPort() {
  if (await isPortFree(PREFERRED_PORT)) {
    return PREFERRED_PORT;
  }
  console.log(`[dev:safe] Port ${PREFERRED_PORT} is busy. Falling back to ${FALLBACK_PORT}.`);
  return FALLBACK_PORT;
}

function removeStaleLock() {
  if (fs.existsSync(LOCK_FILE)) {
    fs.rmSync(LOCK_FILE, { force: true });
    console.log("[dev:safe] Removed stale .next/dev/lock.");
  }
}

function removeNextDir() {
  if (fs.existsSync(NEXT_DIR)) {
    fs.rmSync(NEXT_DIR, { recursive: true, force: true });
    console.log("[dev:safe] Removed .next directory.");
  }
}

function hasTurbopackFailure(output) {
  return TURBOPACK_FAILURE_MARKERS.some((marker) => output.includes(marker));
}

function buildArgs(port, mode) {
  const args = [NEXT_BIN, "dev", "-p", String(port)];
  if (mode === "webpack") {
    args.push("--webpack");
  }
  return args;
}

function startNextDev({ port, mode, attempt }) {
  return new Promise((resolve) => {
    const args = buildArgs(port, mode);

    console.log(
      `[dev:safe] Starting Next dev (${mode}) on port ${port} (attempt ${attempt}/${MAX_ATTEMPTS}).`
    );
    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      stdio: ["inherit", "pipe", "pipe"],
      env: {
        ...process.env,
        PORT: String(port),
      },
    });

    let output = "";
    child.stdout?.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(chunk);
    });

    child.on("exit", (code, signal) => {
      resolve({
        code: code ?? 1,
        signal,
        output,
        turbopackFailure: mode === "turbopack" && hasTurbopackFailure(output),
      });
    });

    child.on("error", () => {
      resolve({
        code: 1,
        signal: "spawn_error",
        output,
        turbopackFailure: mode === "turbopack" && hasTurbopackFailure(output),
      });
    });
  });
}

async function main() {
  removeStaleLock();
  let port = await resolveInitialPort();
  console.log(`[dev:safe] Local URL: http://localhost:${port}`);

  let mode = initialMode();
  if (IS_WINDOWS && mode === "webpack") {
    console.log("[dev:safe] Windows detected: defaulting to webpack mode (set VO_TURBO=1 to opt into Turbopack).");
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (!(await isPortFree(port)) && port === PREFERRED_PORT) {
      port = FALLBACK_PORT;
      console.log(`[dev:safe] Port ${PREFERRED_PORT} became busy. Retrying on ${FALLBACK_PORT}.`);
    }

    const result = await startNextDev({ port, mode, attempt });
    if (result.code === 0 || result.signal === "SIGINT" || result.signal === "SIGTERM") {
      process.exit(result.code);
    }

    if (attempt >= MAX_ATTEMPTS) {
      console.error(`[dev:safe] Failed after ${MAX_ATTEMPTS} attempts.`);
      process.exit(result.code || 1);
    }

    if (mode === "turbopack" && result.turbopackFailure) {
      console.log("[dev:safe] Turbopack failure detected. Falling back to webpack dev mode.");
      mode = "webpack";
    } else {
      console.log("[dev:safe] Dev server exited unexpectedly. Retrying once.");
    }

    removeNextDir();
    removeStaleLock();
  }
}

main();

