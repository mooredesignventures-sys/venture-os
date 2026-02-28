import { spawnSync } from "node:child_process";
import net from "node:net";
import process from "node:process";

function resolvePort() {
  const parsed = Number.parseInt(process.env.VO_DEV_PORT || "3000", 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : 3000;
}

function listListeningPidsOnWindows(port) {
  const result = spawnSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8" });
  if (result.status !== 0) {
    return [];
  }

  const pids = new Set();
  const pattern = new RegExp(`:${port}\\s+`, "i");
  for (const line of (result.stdout || "").split(/\r?\n/)) {
    if (!pattern.test(line) || !/LISTENING/i.test(line)) {
      continue;
    }
    const parts = line.trim().split(/\s+/);
    const pid = Number.parseInt(parts[parts.length - 1], 10);
    if (Number.isInteger(pid)) {
      pids.add(pid);
    }
  }
  return [...pids];
}

function listListeningPidsOnUnix(port) {
  const result = spawnSync("lsof", ["-nP", "-i", `TCP:${port}`, "-sTCP:LISTEN", "-t"], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return [];
  }

  return (result.stdout || "")
    .split(/\r?\n/)
    .map((line) => Number.parseInt(line.trim(), 10))
    .filter((value) => Number.isInteger(value));
}

function listListeningPids(port) {
  if (process.platform === "win32") {
    return listListeningPidsOnWindows(port);
  }
  return listListeningPidsOnUnix(port);
}

function checkPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", (error) => {
      if (error && typeof error === "object" && error.code === "EADDRINUSE") {
        resolve(false);
        return;
      }
      reject(error);
    });
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}

async function main() {
  const port = resolvePort();
  const listeningPids = listListeningPids(port);

  if (listeningPids.length > 0) {
    console.error(
      `[dev:portcheck] Port ${port} is in use by PID(s): ${listeningPids.join(", ")}. Stop them and retry.`,
    );
    process.exit(1);
  }

  let available = false;
  try {
    available = await checkPortAvailable(port);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[dev:portcheck] Failed to check port ${port}: ${reason}`);
    process.exit(1);
  }

  if (available) {
    console.log(`[dev:portcheck] Port ${port} is available.`);
    process.exit(0);
  }

  console.error(`[dev:portcheck] Port ${port} is in use. Stop the process and retry.`);
  process.exit(1);
}

main();
