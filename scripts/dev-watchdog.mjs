import { spawn } from "node:child_process";
import process from "node:process";

const PORT = String(process.env.VO_DEV_PORT || "3000");
const RESTART_DELAY_MS = 1500;

let child = null;
let stopping = false;
let launchCount = 0;

function logBanner() {
  console.log("[dev:watch] Watchdog active.");
  console.log(`[dev:watch] Fixed port: ${PORT}`);
  console.log("[dev:watch] Restarts `npm run dev:safe` after exits.");
  console.log("[dev:watch] URL file: .next/dev-safe-url.json (see also `npm run dev:url`).");
}

function startDevSafe() {
  launchCount += 1;
  console.log(`[dev:watch] Starting dev:safe (attempt ${launchCount})...`);

  child = spawn("npm run dev:safe", {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      VO_DEV_PORT: PORT,
    },
  });

  child.on("error", (error) => {
    if (stopping) {
      return;
    }
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[dev:watch] Failed to start dev:safe: ${reason}`);
  });

  child.on("exit", (code, signal) => {
    child = null;
    if (stopping) {
      return;
    }

    const codeText = typeof code === "number" ? String(code) : "null";
    const signalText = signal || "none";
    console.log(
      `[dev:watch] dev:safe exited (code=${codeText}, signal=${signalText}). Restarting in ${RESTART_DELAY_MS}ms...`,
    );

    setTimeout(() => {
      if (!stopping) {
        startDevSafe();
      }
    }, RESTART_DELAY_MS);
  });
}

function stopWatchdog(signalName) {
  if (stopping) {
    return;
  }
  stopping = true;
  console.log(`[dev:watch] Received ${signalName}. Stopping watchdog...`);

  if (!child) {
    process.exit(0);
    return;
  }

  const activeChild = child;
  const fallbackTimer = setTimeout(() => {
    try {
      activeChild.kill("SIGKILL");
    } catch {
      // Best effort.
    }
  }, 3000);

  if (typeof fallbackTimer.unref === "function") {
    fallbackTimer.unref();
  }

  activeChild.once("exit", () => {
    clearTimeout(fallbackTimer);
    process.exit(0);
  });

  try {
    activeChild.kill("SIGTERM");
  } catch {
    process.exit(0);
  }
}

process.on("SIGINT", () => stopWatchdog("SIGINT"));
process.on("SIGTERM", () => stopWatchdog("SIGTERM"));

logBanner();
startDevSafe();
