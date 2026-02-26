import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";

const DEV_URL_FILE = path.join(process.cwd(), ".next", "dev-safe-url.json");
const PORTS = [3000, 3001, 3002, 3003];
const REQUIRED_ROUTES = ["/login", "/app"];
const OPTIONAL_ROUTES = ["/app/nodes"];
const RETRIES = Number.parseInt(process.env.VO_VERIFY_RETRIES || "8", 10);
const RETRY_MS = Number.parseInt(process.env.VO_VERIFY_RETRY_MS || "500", 10);

function parseExpectedPort() {
  const raw = process.env.VO_DEV_PORT;
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseSavedUrl() {
  try {
    const raw = fs.readFileSync(DEV_URL_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed?.url === "string" && parsed.url) {
      return parsed.url;
    }
    if (typeof parsed?.baseUrl === "string" && parsed.baseUrl) {
      return parsed.baseUrl;
    }
    return null;
  } catch {
    return null;
  }
}

function buildCandidateUrls(savedUrl, expectedPort) {
  const candidates = [];
  const seen = new Set();

  function push(url) {
    if (!url || seen.has(url)) {
      return;
    }
    seen.add(url);
    candidates.push(url);
  }

  push(savedUrl);
  if (Number.isInteger(expectedPort)) {
    push(`http://localhost:${expectedPort}`);
  }
  for (const port of PORTS) {
    push(`http://localhost:${port}`);
  }

  return candidates;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isHealthyStatus(status) {
  return status === 200 || (status >= 300 && status <= 399);
}

async function requestRoute(baseUrl, routePath) {
  const methods = ["HEAD", "GET"];

  for (const method of methods) {
    try {
      const status = await new Promise((resolve, reject) => {
        const request = http.request(`${baseUrl}${routePath}`, {
          method,
          timeout: 1500,
        });
        request.on("response", (response) => {
          response.resume();
          resolve(response.statusCode || 0);
        });
        request.on("timeout", () => {
          request.destroy(new Error("timeout"));
        });
        request.on("error", reject);
        request.end();
      });
      return status;
    } catch {
      // Try GET if HEAD is not supported.
    }
  }

  return 0;
}

async function isUrlLive(baseUrl) {
  const verifiedRequired = [];

  for (const routePath of REQUIRED_ROUTES) {
    const status = await requestRoute(baseUrl, routePath);
    if (!isHealthyStatus(status)) {
      return null;
    }
    verifiedRequired.push(`${baseUrl}${routePath}`);
  }

  const verifiedOptional = [];
  for (const routePath of OPTIONAL_ROUTES) {
    const status = await requestRoute(baseUrl, routePath);
    if (isHealthyStatus(status)) {
      verifiedOptional.push(`${baseUrl}${routePath}`);
    }
  }

  return {
    verifiedRequired,
    verifiedOptional,
  };
}

function persistUrl(url) {
  try {
    const parsed = new URL(url);
    const port = Number(parsed.port);
    fs.mkdirSync(path.dirname(DEV_URL_FILE), { recursive: true });
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
    // Non-fatal.
  }
}

async function main() {
  const expectedPort = parseExpectedPort();
  const savedUrl = parseSavedUrl();
  const candidates = buildCandidateUrls(savedUrl, expectedPort);

  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    for (const url of candidates) {
      const result = await isUrlLive(url);
      if (result) {
        persistUrl(url);
        console.log(`WORKING_BASE_URL=${url}`);
        console.log(`WORKING_URL=${url}`);
        for (const verifiedUrl of result.verifiedRequired) {
          console.log(`VERIFIED_URL=${verifiedUrl}`);
        }
        for (const verifiedUrl of result.verifiedOptional) {
          console.log(`VERIFIED_URL=${verifiedUrl}`);
        }
        process.exit(0);
      }
    }

    if (attempt < RETRIES) {
      await sleep(RETRY_MS);
    }
  }

  console.error("Run npm run dev:safe");
  process.exit(1);
}

main();
