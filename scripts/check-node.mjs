import process from "node:process";

const REQUIRED_MAJOR = 22;
const versionText = process.versions.node;
const major = Number.parseInt(versionText.split(".")[0], 10);

if (major !== REQUIRED_MAJOR) {
  console.warn("============================================================");
  console.warn("[check:node] WARNING: Node 22 LTS is required for best stability.");
  console.warn(`[check:node] Current Node: v${versionText}`);
  console.warn("[check:node] Recommended: v22.11.0 (see .nvmrc / .node-version)");
  console.warn("[check:node] Non-LTS versions increase Windows native module lock risk.");
  console.warn("============================================================");
} else {
  console.log(`[check:node] Node version OK: v${versionText}`);
}

process.exit(0);
