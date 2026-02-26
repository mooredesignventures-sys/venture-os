import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const NEXT_DIR = path.join(ROOT, ".next");
const LOCK_FILE = path.join(NEXT_DIR, "dev", "lock");
const DEV_URL_FILE = path.join(NEXT_DIR, "dev-safe-url.json");
const LAST_ERROR_FILE = path.join(NEXT_DIR, "dev-safe-last-error.txt");
const NVMRC_FILE = path.join(ROOT, ".nvmrc");
const NODE_MODULES_DIR = path.join(ROOT, "node_modules");
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const VERIFY_BIN = path.join(ROOT, "scripts", "verify-dev-url.mjs");
const PORT_CANDIDATES = [3000, 3001, 3002, 3003];
const MAX_ATTEMPTS = 2;
const RESTART_COOLDOWN_MS = 1200;
const IS_WINDOWS = process.platform === "win32";
const READY_MARKERS = ["Ready in", "Ready on", "Ready"];

function ensureNextDir() {
  fs.mkdirSync(NEXT_DIR, { recursive: true });
}

function clearFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableFsError(error) {
  return (
    error &&
    typeof error === "object" &&
    ["EPERM", "EBUSY", "ENOTEMPTY", "EACCES"].includes(error.code)
  );
}

async function removePathWithRetry(targetPath, { recursive = false, attempts = 5, delayMs = 500 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      if (!fs.existsSync(targetPath)) {
        return true;
      }
      fs.rmSync(targetPath, { force: true, recursive });
      if (!fs.existsSync(targetPath)) {
        return true;
      }
    } catch (error) {
      if (!isRetryableFsError(error) || attempt === attempts) {
        return false;
      }
    }

    await sleep(delayMs);
  }

  return !fs.existsSync(targetPath);
}

function writeLastError(content) {
  try {
    ensureNextDir();
    const text = typeof content === "string" && content.trim() ? content : "No error output captured.";
    fs.writeFileSync(LAST_ERROR_FILE, `${text}\n`);
  } catch {
    // Best effort.
  }
}

function writeDevUrl(url) {
  try {
    ensureNextDir();
    const parsed = new URL(url);
    const port = Number(parsed.port);
    fs.writeFileSync(
      DEV_URL_FILE,
      JSON.stringify(
        {
          url,
          port: Number.isInteger(port) ? port : null,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  } catch {
    // Best effort.
  }
}

async function removeStaleLock() {
  if (fs.existsSync(LOCK_FILE)) {
    const removed = await removePathWithRetry(LOCK_FILE, { recursive: false, attempts: 6, delayMs: 700 });
    if (!removed) {
      writeLastError("Failed to remove .next/dev/lock after retries. Close active Node/Next processes and rerun dev:safe.");
      console.error("[dev:safe] Failed to remove .next/dev/lock. Close active Node/Next processes and rerun.");
      process.exit(1);
    }
  }
}

function readPinnedNodeVersion() {
  try {
    return fs.readFileSync(NVMRC_FILE, "utf8").trim();
  } catch {
    return "";
  }
}

function parseVersion(versionText) {
  const [majorText = "0", minorText = "0", patchText = "0"] = String(versionText).trim().split(".");
  const major = Number.parseInt(majorText, 10);
  const minor = Number.parseInt(minorText, 10);
  const patch = Number.parseInt(patchText, 10);

  if (!Number.isInteger(major) || !Number.isInteger(minor) || !Number.isInteger(patch)) {
    return null;
  }

  return { major, minor, patch };
}

function isVersionLessThan(left, right) {
  if (left.major !== right.major) {
    return left.major < right.major;
  }
  if (left.minor !== right.minor) {
    return left.minor < right.minor;
  }
  return left.patch < right.patch;
}

function warnIfNodeMismatch() {
  const pinned = readPinnedNodeVersion();
  if (!pinned) {
    return;
  }

  const pinnedVersion = parseVersion(pinned);
  const current = process.versions.node;
  const currentVersion = parseVersion(current);
  if (!pinnedVersion || !currentVersion) {
    return;
  }

  if (
    pinnedVersion.major !== currentVersion.major ||
    isVersionLessThan(currentVersion, pinnedVersion)
  ) {
    console.warn(`[dev:safe] WARNING: Node ${pinned} is pinned in .nvmrc, current is ${current}.`);
    console.warn("[dev:safe] WARNING: Dev may be unstable on this Node version.");
  }
}

function ensureNodeModulesExists() {
  if (!fs.existsSync(NODE_MODULES_DIR)) {
    console.error("Run npm install");
    writeLastError("node_modules missing. Run npm install");
    process.exit(1);
  }
}

function buildArgs(port) {
  const args = [NEXT_BIN, "dev", "-p", String(port)];
  args.push("--webpack");
  return args;
}

function hasReadySignal(output) {
  return READY_MARKERS.some((marker) => output.includes(marker));
}

function parseVerifyOutput(output) {
  const lines = String(output)
    .split(/\r?\n/)
    .map((item) => item.trim());

  const baseLine = lines.find((item) => item.startsWith("WORKING_BASE_URL="));
  if (baseLine) {
    return baseLine.slice("WORKING_BASE_URL=".length);
  }

  const fallbackLine = lines.find((item) => item.startsWith("WORKING_URL="));
  return fallbackLine ? fallbackLine.slice("WORKING_URL=".length) : "";
}

function parsePortFromUrl(url) {
  try {
    return Number(new URL(url).port);
  } catch {
    return NaN;
  }
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
      VO_VERIFY_RETRIES: "10",
      VO_VERIFY_RETRY_MS: "500",
    },
    encoding: "utf8",
  });

  const url = parseVerifyOutput(result.stdout || "");
  if (result.status === 0 && url) {
    return { ok: true, url };
  }

  const message = (result.stderr || result.stdout || "").trim();
  return {
    ok: false,
    error: message || "Run npm run dev:safe",
  };
}

function listNextProcesses() {
  if (!IS_WINDOWS) {
    const result = spawnSync("ps", ["-ax", "-o", "pid=,command="], {
      cwd: ROOT,
      encoding: "utf8",
    });
    if (result.status !== 0) {
      return [];
    }
    return (result.stdout || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const firstSpace = line.indexOf(" ");
        const pid = Number(line.slice(0, firstSpace));
        const commandLine = line.slice(firstSpace + 1);
        return { pid, commandLine };
      })
      .filter((row) => Number.isInteger(row.pid) && /next/i.test(row.commandLine));
  }

  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "$p=Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Select-Object ProcessId,CommandLine; $p | ConvertTo-Json -Compress",
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
    }
  );

  if (result.status !== 0 || !result.stdout.trim()) {
    return [];
  }

  const parsed = (() => {
    try {
      return JSON.parse(result.stdout);
    } catch {
      return [];
    }
  })();

  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows
    .filter((row) => row && typeof row.ProcessId === "number")
    .map((row) => ({
      pid: row.ProcessId,
      commandLine: typeof row.CommandLine === "string" ? row.CommandLine : "",
    }))
    .filter((row) => /next/i.test(row.commandLine));
}

function enforceSingleNextProcess() {
  const nextProcs = listNextProcesses();
  if (nextProcs.length === 0) {
    return;
  }

  const summary = nextProcs.map((row) => `${row.pid}`).join(", ");
  writeLastError(
    `Detected existing Next process(es): ${summary}. Stop running dev servers and rerun npm run dev:safe.`
  );
  console.error("[dev:safe] Existing Next process detected. Stop running dev servers and rerun.");
  process.exit(1);
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

async function resolvePort() {
  const requested = Number.parseInt(process.env.VO_DEV_PORT || "", 10);
  if (Number.isInteger(requested) && PORT_CANDIDATES.includes(requested)) {
    if (await isPortFree(requested)) {
      return requested;
    }
  }

  for (const port of PORT_CANDIDATES) {
    if (await isPortFree(port)) {
      return port;
    }
  }

  throw new Error("No free dev port in 3000-3003.");
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

function startNextDev({ port, attempt }) {
  return new Promise((resolve) => {
    const args = buildArgs(port);

    console.log(`[dev:safe] Starting Next dev (webpack) on port ${port} (attempt ${attempt}/${MAX_ATTEMPTS}).`);
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
      verifying = false;

      if (verification.ok) {
        const resolvedPort = parsePortFromUrl(verification.url);
        if (!Number.isInteger(resolvedPort) || resolvedPort !== port) {
          verifierFailure = true;
          verifierError = `Port mismatch detected. Expected localhost:${port}, verified ${verification.url}. Stop other dev servers and rerun npm run dev:safe.`;
          writeLastError(verifierError);
          await stopChildGracefully(child);
          return;
        }

        verifierComplete = true;
        writeDevUrl(verification.url);
        clearFile(LAST_ERROR_FILE);
        const loginUrl = new URL("/login", `${verification.url}/`).toString();
        const appUrl = new URL("/app", `${verification.url}/`).toString();
        console.log(`OPEN_URLS login=${loginUrl} app=${appUrl}`);
        return;
      }

      verifierFailure = true;
      verifierError = verification.error;
      writeLastError(`${verification.error}\n\n${output}`);
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
        verifierFailure,
        verifierError,
      });
    });

    child.on("error", (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      writeLastError(`${errorMessage}\n\n${output}`);
      resolve({
        code: 1,
        signal: "spawn_error",
        output,
        verifierFailure,
        verifierError: errorMessage,
      });
    });
  });
}

async function removeNextDir() {
  if (fs.existsSync(NEXT_DIR)) {
    const removed = await removePathWithRetry(NEXT_DIR, { recursive: true, attempts: 6, delayMs: 800 });
    if (!removed) {
      writeLastError("Failed to remove .next directory after retries. Close active Node/Next processes and rerun dev:safe.");
      console.error("[dev:safe] Failed to clean .next after retries. Close active Node/Next processes and rerun.");
      process.exit(1);
    }
  }
}

async function main() {
  ensureNextDir();
  clearFile(DEV_URL_FILE);
  clearFile(LAST_ERROR_FILE);
  warnIfNodeMismatch();
  ensureNodeModulesExists();
  enforceSingleNextProcess();
  await removeStaleLock();

  let port;
  try {
    port = await resolvePort();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeLastError(message);
    console.error(`[dev:safe] ${message}`);
    process.exit(1);
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const result = await startNextDev({ port, attempt });

    if (result.verifierFailure) {
      process.exit(result.code || 1);
    }

    if (result.code === 0 || result.signal === "SIGINT" || result.signal === "SIGTERM") {
      if (result.code && result.code !== 0) {
        writeLastError(result.output);
      }
      process.exit(result.code);
    }

    if (attempt >= MAX_ATTEMPTS) {
      writeLastError(result.output);
      process.exit(result.code || 1);
    }

    await sleep(RESTART_COOLDOWN_MS);
    await removeNextDir();
    await removeStaleLock();
  }
}

main();
