import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const NEXT_DIR = path.join(ROOT, ".next");
const LOCK_FILE = path.join(NEXT_DIR, "dev", "lock");
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const VERIFY_BIN = path.join(ROOT, "scripts", "verify-dev-url.mjs");
const PREFERRED_PORT = 3000;
const FALLBACK_PORT = 3001;
const MAX_ATTEMPTS = 2;
const IS_WINDOWS = process.platform === "win32";
const READY_MARKERS = ["Ready in", "Ready on", "Ready"];
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

function hasReadySignal(output) {
  return READY_MARKERS.some((marker) => output.includes(marker));
}

function parseVerifierOutput(output) {
  const lines = String(output)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const baseLine = lines.find((line) => line.startsWith("WORKING_BASE_URL="));
  const baseUrl = baseLine ? baseLine.replace("WORKING_BASE_URL=", "") : "";
  const routesStart = lines.findIndex((line) => line === "WORKING_URLS:");
  const routes = routesStart >= 0 ? lines.slice(routesStart + 1) : [];

  return { baseUrl, routes };
}

function verifyWorkingUrl(port) {
  if (!fs.existsSync(VERIFY_BIN)) {
    return { ok: false, error: "Missing scripts/verify-dev-url.mjs." };
  }

  const result = spawnSync(process.execPath, [VERIFY_BIN], {
    cwd: ROOT,
    env: {
      ...process.env,
      VO_DEV_PORT: String(port),
    },
    encoding: "utf8",
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  const parsed = parseVerifierOutput(result.stdout || "");
  if (result.status === 0 && parsed.baseUrl) {
    console.log(`[dev:safe] OPEN THIS URL: ${parsed.baseUrl}/login`);
    if (parsed.routes.length > 0) {
      console.log("[dev:safe] Verified working routes:");
      for (const route of parsed.routes) {
        console.log(`[dev:safe] - ${route}`);
      }
    }

    return { ok: true };
  }

  return {
    ok: false,
    error:
      (result.stderr || result.stdout || "").trim() ||
      `verify-dev-url exited with code ${result.status ?? 1}.`,
  };
}

function stopChildGracefully(child) {
  return new Promise((resolve) => {
    if (!child || child.killed) {
      resolve();
      return;
    }

    let finished = false;
    const done = () => {
      if (finished) {
        return;
      }
      finished = true;
      resolve();
    };

    child.once("exit", done);
    try {
      child.kill("SIGTERM");
    } catch {
      done();
      return;
    }

    const timer = setTimeout(() => {
      if (finished) {
        return;
      }
      try {
        child.kill("SIGKILL");
      } catch {
        // Best effort.
      }
      done();
    }, 3000);

    if (typeof timer.unref === "function") {
      timer.unref();
    }
  });
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
    let verifying = false;
    let verifierFailure = false;
    let verifierError = "";
    let verifierComplete = false;

    async function runVerifierIfReady() {
      if (verifying || verifierComplete || verifierFailure || !hasReadySignal(output)) {
        return;
      }

      verifying = true;
      const verification = verifyWorkingUrl(port);
      verifierComplete = verification.ok;
      verifying = false;

      if (verification.ok) {
        return;
      }

      verifierFailure = true;
      verifierError = verification.error;
      console.error("[dev:safe] CRITICAL: URL verification failed. Stopping dev server.");
      if (verifierError) {
        console.error(`[dev:safe] ${verifierError}`);
      }
      await stopChildGracefully(child);
    }

    child.stdout?.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(chunk);
      void runVerifierIfReady();
    });
    child.stderr?.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(chunk);
      void runVerifierIfReady();
    });

    child.on("exit", (code, signal) => {
      resolve({
        code: code ?? 1,
        signal,
        output,
        turbopackFailure: mode === "turbopack" && hasTurbopackFailure(output),
        verifierFailure,
        verifierError,
      });
    });

    child.on("error", () => {
      resolve({
        code: 1,
        signal: "spawn_error",
        output,
        turbopackFailure: mode === "turbopack" && hasTurbopackFailure(output),
        verifierFailure,
        verifierError,
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
    if (result.verifierFailure) {
      console.error("[dev:safe] Dev server stopped because URL verification failed.");
      process.exit(result.code || 1);
    }

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

