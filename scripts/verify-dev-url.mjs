import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const PORTS = [3000, 3001];
const ROUTES_TO_CHECK = ["/login", "/app"];
const DISPLAY_ROUTES = ["/login", "/app", "/app/nodes", "/app/views", "/app/audit"];
const REDIRECT_MIN = 300;
const REDIRECT_MAX = 399;
const BRAINSTORM_PAGE = path.join(process.cwd(), "app", "app", "brainstorm", "page.js");

function isRedirect(statusCode) {
  return statusCode >= REDIRECT_MIN && statusCode <= REDIRECT_MAX;
}

function isUrlLive(statusCode) {
  return statusCode === 200 || statusCode === 307;
}

function parseExpectedPort() {
  const rawPort = process.env.VO_DEV_PORT;
  if (!rawPort) {
    return null;
  }

  const parsedPort = Number(rawPort);
  if (!Number.isInteger(parsedPort)) {
    return null;
  }

  return parsedPort;
}

async function requestRoute(baseUrl, routePath) {
  const methods = ["HEAD", "GET"];

  for (const method of methods) {
    try {
      const response = await fetch(`${baseUrl}${routePath}`, {
        method,
        redirect: "manual",
      });

      return { ok: true, status: response.status };
    } catch {
      // Try GET when HEAD is unsupported or request fails.
    }
  }

  return { ok: false, status: 0 };
}

async function probePort(port) {
  const baseUrl = `http://localhost:${port}`;
  const loginResponse = await requestRoute(baseUrl, ROUTES_TO_CHECK[0]);

  if (!loginResponse.ok) {
    return { live: false, baseUrl, port };
  }

  const appResponse = await requestRoute(baseUrl, ROUTES_TO_CHECK[1]);
  if (!appResponse.ok) {
    return { live: false, baseUrl, port };
  }

  return {
    live: isUrlLive(loginResponse.status),
    baseUrl,
    port,
  };
}

async function verifyDisplayRoutes(baseUrl) {
  const routes = [...DISPLAY_ROUTES];
  if (fs.existsSync(BRAINSTORM_PAGE)) {
    routes.push("/app/brainstorm");
  }

  const verifiedUrls = [];

  for (const routePath of routes) {
    const response = await requestRoute(baseUrl, routePath);
    if (!response.ok) {
      continue;
    }

    if (response.status === 200 || isRedirect(response.status)) {
      verifiedUrls.push(`${baseUrl}${routePath}`);
    }
  }

  return verifiedUrls;
}

async function main() {
  const expectedPort = parseExpectedPort();
  const checks = [];

  for (const port of PORTS) {
    checks.push(await probePort(port));
  }

  const liveChecks = checks.filter((check) => check.live);
  if (liveChecks.length === 0) {
    console.error("[dev:verify] No working dev server found on localhost:3000 or localhost:3001.");
    process.exit(1);
  }

  const selectedCheck =
    expectedPort !== null
      ? liveChecks.find((check) => check.port === expectedPort) || liveChecks[0]
      : liveChecks[0];

  const workingUrls = await verifyDisplayRoutes(selectedCheck.baseUrl);

  if (workingUrls.length === 0) {
    console.error(`[dev:verify] ${selectedCheck.baseUrl} responded, but no expected routes verified.`);
    process.exit(1);
  }

  console.log(`WORKING_BASE_URL=${selectedCheck.baseUrl}`);
  console.log("WORKING_URLS:");
  for (const url of workingUrls) {
    console.log(url);
  }
}

main();
