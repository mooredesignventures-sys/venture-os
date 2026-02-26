import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";

const ROOT = process.cwd();
const NEXT_DIR = path.join(ROOT, ".next");
const DEV_URL_FILE = path.join(NEXT_DIR, "dev-safe-url.json");
const ROUTES = ["/login", "/app", "/app/brainstorm", "/app/nodes"];
const PORTS = [3000, 3001, 3002, 3003];

function fail(message) {
  console.error(`[beta:certify] ${message}`);
  process.exit(1);
}

function parseVersionParts(versionText) {
  const [majorText = "0"] = String(versionText).split(".");
  const major = Number.parseInt(majorText, 10);
  return { major };
}

function isStatusOk(status) {
  return status >= 200 && status < 400;
}

function parseCookieValue(cookieLine) {
  if (typeof cookieLine !== "string") {
    return null;
  }

  const pair = cookieLine.split(";")[0];
  const eq = pair.indexOf("=");
  if (eq <= 0) {
    return null;
  }

  const name = pair.slice(0, eq).trim();
  const value = pair.slice(eq + 1).trim();
  if (!name) {
    return null;
  }

  return { name, value };
}

function readBaseUrlCandidates() {
  const candidates = [];
  const seen = new Set();
  const push = (url) => {
    if (!url || seen.has(url)) {
      return;
    }
    seen.add(url);
    candidates.push(url);
  };

  try {
    const raw = fs.readFileSync(DEV_URL_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed?.url === "string" && parsed.url) {
      push(parsed.url);
    }
  } catch {
    // Fallback ports are added below.
  }

  for (const port of PORTS) {
    push(`http://localhost:${port}`);
  }

  return candidates;
}

function requestUrl(url, { method = "GET", headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "https:" ? https : http;

    const req = client.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers,
        timeout: 4000,
      },
      (res) => {
        res.resume();
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", reject);
    req.end();
  });
}

function buildCookieHeader(cookieJar) {
  const pairs = Object.entries(cookieJar).map(([name, value]) => `${name}=${value}`);
  return pairs.join("; ");
}

function updateCookieJar(cookieJar, responseHeaders) {
  const setCookie = responseHeaders["set-cookie"];
  if (!setCookie) {
    return;
  }

  const entries = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const entry of entries) {
    const parsed = parseCookieValue(entry);
    if (!parsed) {
      continue;
    }
    cookieJar[parsed.name] = parsed.value;
  }
}

async function resolveLiveBaseUrl(candidates) {
  for (const candidate of candidates) {
    try {
      const response = await requestUrl(`${candidate}/login`);
      if (response.status === 200) {
        return candidate;
      }
    } catch {
      // Try next candidate.
    }
  }

  return "";
}

async function main() {
  const current = parseVersionParts(process.versions.node);
  if (current.major !== 22) {
    fail(`Node 22.x required. Current: ${process.versions.node}`);
  }

  if (!fs.existsSync(NEXT_DIR)) {
    fail(".next directory not found. Run npm run dev:safe first.");
  }

  const baseUrl = await resolveLiveBaseUrl(readBaseUrlCandidates());
  if (!baseUrl) {
    fail("No reachable local dev server found. Run npm run dev:safe first.");
  }

  const cookieJar = {};
  const gateResponse = await requestUrl(`${baseUrl}/login/enter`);
  if (!isStatusOk(gateResponse.status)) {
    fail(`/login/enter failed with status ${gateResponse.status}`);
  }
  updateCookieJar(cookieJar, gateResponse.headers);

  for (const routePath of ROUTES) {
    const headers = {};
    const cookieHeader = buildCookieHeader(cookieJar);
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    const response = await requestUrl(`${baseUrl}${routePath}`, { headers });
    if (response.status !== 200) {
      fail(`${routePath} expected 200, received ${response.status}`);
    }
  }

  console.log("BETA_CERTIFIED=true");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
