# Venture OS (Prototype)

## Run Locally (Windows)
```powershell
cd "C:\Users\User\Desktop\Venture OS\venture-os"
npm install
npm run dev
```

Open: `http://localhost:3000`

## Safe Dev Startup (Lock/Port Recovery)
If `npm run dev` fails due to `.next/dev/lock` or port `3000` already being in use, run:

```bash
npm run dev:safe
```

What it does:
- Removes stale `.next/dev/lock` if present
- Uses port `3000` when free, otherwise falls back to `3001`
- If dev exits unexpectedly, removes `.next` and retries once (max 2 attempts)

## Key Pages
- `/login`
- `/app`
- `/app/nodes`
- `/app/views`
- `/app/audit`
- `/app/proposals`
