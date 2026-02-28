# Venture OS (Prototype)

## Node Version
- Use Node 22 LTS for this repo (`22.11.0`).
- If Node is not `22.11.0+` on major `22`, install is blocked by `npm` preinstall guard.
- This reduces native module install churn on Windows (for example `lightningcss` lock/unlink failures).

## Run Locally (Windows)
```powershell
cd "C:\Users\User\Desktop\Venture OS\venture-os"
nvm use 22.11.0
npm install
npm run dev:watch
```

Recommended local workflow:
- Start with watchdog: `npm run dev:watch`
- Print exact URL(s): `npm run dev:url`
- Prefer `127.0.0.1` over `localhost` when opening pages in browser.

`dev:safe` still prints:
- `OPEN_URLS login=http://localhost:3000/login app=http://localhost:3000/app`

`dev:url` prints both variants:
- Preferred: `http://127.0.0.1:3000`
- Alternate: `http://localhost:3000`

## Windows Stability
Why EPERM happens on Windows:
- Native `.node` modules (for example `lightningcss.win32-x64-msvc.node`) can be mapped/locked by active processes.
- If `npm ci` tries to unlink while mapped, Windows returns `EPERM: operation not permitted, unlink ...`.

Why Turbopack can fail intermittently on Windows:
- Turbopack persistence can hit mapped-section file constraints (`os error 1224`) and compaction/write-batch contention.
- These appear as `Persisting failed` / `compaction is already active` class errors.

Supported Windows workflow (required):
- Install/recover: `npm run install:clean`
- Dev: `npm run dev:watch` (recommended watchdog) or `npm run dev:safe`
- URL helper: `npm run dev:url` (prints preferred 127.0.0.1 URL)
- Turbo opt-in only:
  - PowerShell: `$env:VO_TURBO='1'; npm run dev:safe`
  - Direct turbo: `npm run dev:turbo`

Mandatory operating rules:
- Never run install commands while a dev server is running.
- If EPERM recurs, close VS Code completely before rerunning install.

Defender exclusions (optional but recommended):
1. Open Windows Security -> Virus & threat protection.
2. Open Manage settings -> Exclusions -> Add or remove exclusions.
3. Add folder exclusion for repo root:
   - `C:\Users\User\Desktop\Venture OS\venture-os`
4. Add folder exclusion for:
   - `C:\Users\User\Desktop\Venture OS\venture-os\node_modules`

## Key Pages
- `/login`
- `/app`
- `/app/nodes`
- `/app/views`
- `/app/audit`
- `/app/proposals`
