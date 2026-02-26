import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const NEXT_DIR = path.join(ROOT, ".next");
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const LOCK_FILE = path.join(NEXT_DIR, "dev", "lock");
const PREFERRED_PORT = 3000;
const FALLBACK_PORT = 3001;
const MAX_ATTEMPTS = 2;

function isPortOpen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => resolve(false));
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
  });
}

function resolvePort() {
  return isPortOpen(PREFERRED_PORT).then((free) => {
    if (free) return PREFERRED_PORT;
    console.log(`[dev:safe] Port ${PREFERRED_PORT} is busy. Falling back to ${FALLBACK_PORT}.`);
    return FALLBACK_PORT;
  });
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
    console.log("[dev:safe] Removed .next directory for a clean retry.");
  }
}

function startNextDev(port, attempt) {
  return new Promise((resolve) => {
    console.log(`[dev:safe] Starting Next dev on port ${port} (attempt ${attempt}/${MAX_ATTEMPTS}).`);
    const child = spawn(process.execPath, [NEXT_BIN, "dev", "-p", String(port)], {
      cwd: ROOT,
      stdio: ["inherit", "pipe", "pipe"],
      env: {
        ...process.env,
        PORT: String(port),
      },
    });

    child.stdout?.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr?.on("data", (chunk) => process.stderr.write(chunk));

    let completed = false;
    child.on("exit", (code, signal) => {
      completed = true;
      resolve({ code: code ?? 1, signal });
    });
    child.on("error", () => {
      if (!completed) resolve({ code: 1, signal: "spawn_error" });
    });
  });
}

async function main() {
  let port = await resolvePort();
  console.log(`[dev:safe] Local URL: http://localhost:${port}`);
  removeStaleLock();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const result = await startNextDev(port, attempt);
    if (result.code === 0 || result.signal === "SIGINT" || result.signal === "SIGTERM") {
      process.exit(result.code);
    }

    if (attempt < MAX_ATTEMPTS) {
      if (port === PREFERRED_PORT && !(await isPortOpen(PREFERRED_PORT))) {
        port = FALLBACK_PORT;
        console.log(`[dev:safe] Port ${PREFERRED_PORT} became busy. Retrying on ${FALLBACK_PORT}.`);
      }
      console.log("[dev:safe] Dev server exited unexpectedly. Cleaning .next and retrying once.");
      removeNextDir();
      removeStaleLock();
      continue;
    }

    console.error(`[dev:safe] Failed after ${MAX_ATTEMPTS} attempts.`);
    process.exit(result.code || 1);
  }
}

main();
