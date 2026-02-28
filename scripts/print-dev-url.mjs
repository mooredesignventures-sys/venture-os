import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const URL_FILE = path.join(process.cwd(), ".next", "dev-safe-url.json");

function printMissingMessage() {
  console.log("[dev:url] URL file not found: .next/dev-safe-url.json");
  console.log("[dev:url] Start dev first (`npm run dev:watch` recommended, or `npm run dev:safe`).");
}

function toUrl(hostname, port) {
  return `http://${hostname}:${port}`;
}

function main() {
  if (!fs.existsSync(URL_FILE)) {
    printMissingMessage();
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(URL_FILE, "utf8"));
  } catch {
    console.log("[dev:url] Could not parse .next/dev-safe-url.json");
    process.exit(1);
  }

  const port = Number.parseInt(String(parsed?.port || ""), 10);
  if (!Number.isInteger(port) || port <= 0 || port >= 65536) {
    console.log("[dev:url] URL file is missing a valid port.");
    process.exit(1);
  }

  const preferredBase = toUrl("127.0.0.1", port);
  const localhostBase = toUrl("localhost", port);

  console.log(`[dev:url] Preferred: ${preferredBase}`);
  console.log(`[dev:url] Alternate: ${localhostBase}`);
  console.log(`[dev:url] Login: ${preferredBase}/login`);
  console.log(`[dev:url] App: ${preferredBase}/app`);
  console.log(`[dev:url] URL file: ${URL_FILE}`);
}

main();
