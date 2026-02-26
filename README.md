# Venture OS (Prototype)

## Node Version
- Use Node 22 LTS for this repo (`22.11.0`).
- This reduces native module install churn on Windows (for example `lightningcss` lock/unlink failures).

## Run Locally (Windows)
```powershell
cd "C:\Users\User\Desktop\Venture OS\venture-os"
npm run install:clean
npm run dev:safe
```

Open: `http://localhost:3000` (or the printed fallback URL, commonly `http://localhost:3001`).

## Windows Stability
- Preferred install recovery: `npm run install:clean`
- Preferred dev startup: `npm run dev:safe`
- On Windows, `dev:safe` defaults to webpack mode for reliability.
- Turbopack is opt-in on Windows:
  - PowerShell: `$env:VO_TURBO='1'; npm run dev:safe`
  - Cross-shell: `npm run dev:turbo`
- Optional: add Defender exclusions for the repo folder and `node_modules`.

## Key Pages
- `/login`
- `/app`
- `/app/nodes`
- `/app/views`
- `/app/audit`
- `/app/proposals`

