import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const READY_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;
const DEV_URL_FILE = path.join(ROOT, ".next", "dev-safe-url.json");

let child = null;
let readyPrinted = false;
let shuttingDown = false;

function readPackageScripts() {
  try {
    const file = path.join(ROOT, "package.json");
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return parsed && typeof parsed === "object" && parsed.scripts ? parsed.scripts : {};
  } catch {
    return {};
  }
}

function chooseDevScript() {
  const scripts = readPackageScripts();
  if (scripts["dev:watch"]) {
    return "dev:watch";
  }
  return "dev:safe";
}

function normalizeBaseUrl(urlText, fallbackPort = 3000) {
  try {
    const parsed = new URL(urlText || `http://localhost:${fallbackPort}`);
    const host = parsed.hostname === "localhost" ? "127.0.0.1" : parsed.hostname;
    return {
      base: `${parsed.protocol}//${host}:${parsed.port || String(fallbackPort)}`,
      port: Number.parseInt(parsed.port || String(fallbackPort), 10),
    };
  } catch {
    return {
      base: `http://127.0.0.1:${fallbackPort}`,
      port: fallbackPort,
    };
  }
}

function readDevUrl() {
  if (!fs.existsSync(DEV_URL_FILE)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(DEV_URL_FILE, "utf8"));
    const fallbackPort = Number.parseInt(String(parsed?.port || "3000"), 10) || 3000;
    return normalizeBaseUrl(parsed?.url, fallbackPort);
  } catch {
    return null;
  }
}

function headRequest(url) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };

    const parsed = new URL(url);
    const client = parsed.protocol === "https:" ? https : http;
    const request = client.request(
      url,
      {
        method: "HEAD",
        timeout: 2_500,
      },
      (response) => {
        response.resume();
        done({
          ok: Number.isInteger(response.statusCode) && response.statusCode >= 200 && response.statusCode < 400,
          statusCode: response.statusCode || 0,
        });
      },
    );

    request.on("timeout", () => {
      request.destroy(new Error("timeout"));
    });
    request.on("error", () => {
      done({ ok: false, statusCode: 0 });
    });
    request.end();
  });
}

function printNetstatRange() {
  const result = spawnSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8" });
  if (result.status !== 0) {
    console.log("[dev:up] netstat failed.");
    return;
  }

  const lines = (result.stdout || "").split(/\r?\n/).filter((line) => {
    if (!/LISTENING/i.test(line)) {
      return false;
    }
    for (let port = 3000; port <= 3010; port += 1) {
      if (new RegExp(`:${port}\\s+`).test(line)) {
        return true;
      }
    }
    return false;
  });

  if (lines.length === 0) {
    console.log("[dev:up] No LISTENING entries found for ports 3000-3010.");
    return;
  }

  console.log("[dev:up] LISTENING ports 3000-3010:");
  for (const line of lines) {
    console.log(`  ${line.trim()}`);
  }
}

function printReady(url) {
  console.log(`READY: ${url}`);
}

function startDev() {
  const scriptName = chooseDevScript();
  console.log(`[dev:up] Starting npm run ${scriptName} ...`);

  child = spawn(`npm run ${scriptName}`, {
    stdio: "inherit",
    shell: true,
    env: { ...process.env },
  });

  child.on("exit", (code, signal) => {
    child = null;
    if (shuttingDown) {
      process.exit(0);
      return;
    }

    const codeText = typeof code === "number" ? String(code) : "null";
    const signalText = signal || "none";
    console.error(`[dev:up] Child exited early (code=${codeText}, signal=${signalText}).`);
    process.exit(typeof code === "number" ? code : 1);
  });
}

async function waitForReady() {
  const start = Date.now();

  while (Date.now() - start < READY_TIMEOUT_MS) {
    const devUrl = readDevUrl();
    const base = devUrl ? devUrl.base : "http://127.0.0.1:3000";
    const loginUrl = `${base}/login`;
    const probe = await headRequest(loginUrl);

    if (probe.ok) {
      readyPrinted = true;
      printReady(loginUrl);
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return false;
}

function wireSignals() {
  const shutdown = () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    if (!child) {
      process.exit(0);
      return;
    }
    try {
      child.kill("SIGTERM");
    } catch {
      process.exit(0);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function main() {
  wireSignals();
  startDev();

  const ready = await waitForReady();
  if (!ready) {
    console.error("[dev:up] Timed out waiting for readiness (60s).");
    printNetstatRange();
    console.error("[dev:up] Run `npm run dev:diag` and share the output.");
    process.exit(1);
  }

  if (readyPrinted) {
    console.log("[dev:up] Keep this terminal open while developing.");
  }
}

main();
