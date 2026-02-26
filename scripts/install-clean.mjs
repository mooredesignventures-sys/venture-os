import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const TARGETS = ["node_modules", ".next"];
const IS_WINDOWS = process.platform === "win32";

function runCommand(command, args, { allowFailure = false } = {}) {
  const useShell = IS_WINDOWS && command === "npm";

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: "inherit",
      shell: useShell,
    });

    child.on("exit", (code) => {
      if (code === 0 || allowFailure) {
        resolve(code ?? 0);
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with code ${code}`));
    });

    child.on("error", (error) => {
      if (allowFailure) {
        resolve(1);
        return;
      }
      reject(error);
    });
  });
}

function removeTarget(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return true;
  }

  try {
    fs.rmSync(targetPath, { recursive: true, force: true });
    return !fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

async function stopLockingProcesses() {
  if (!IS_WINDOWS) {
    return;
  }

  console.log("[install:clean] Windows detected.");
  console.warn(
    "[install:clean] Close VS Code and other terminals running node/npm before continuing to reduce file-lock risk."
  );
}

async function cleanupTargets() {
  for (const rel of TARGETS) {
    const full = path.join(ROOT, rel);
    let removed = false;

    for (let pass = 1; pass <= 3; pass += 1) {
      removed = removeTarget(full);
      if (removed) {
        break;
      }
      console.warn(`[install:clean] Retry ${pass}/3 failed for ${rel}; waiting before retry.`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    if (!removed) {
      console.warn(`[install:clean] Unable to fully remove ${rel}. It may be locked.`);
    } else {
      console.log(`[install:clean] Removed ${rel}.`);
    }
  }
}

function printEpermGuidance() {
  console.error("[install:clean] EPERM detected during npm ci.");
  console.error("[install:clean] Guidance:");
  console.error("- Close VS Code and any terminal running node/npm.");
  console.error("- Re-run command as Administrator.");
  console.error("- Optionally add Defender exclusions for the repo and node_modules.");
}

async function main() {
  await stopLockingProcesses();
  await cleanupTargets();

  console.log("[install:clean] Running npm cache clean --force");
  await runCommand("npm", ["cache", "clean", "--force"], { allowFailure: false });

  console.log("[install:clean] Running npm ci");
  try {
    await runCommand("npm", ["ci"], { allowFailure: false });
    console.log("[install:clean] npm ci completed.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("EPERM")) {
      printEpermGuidance();
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(`[install:clean] Failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
