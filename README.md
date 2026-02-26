# Venture OS (Prototype)

## Run Locally (Windows)
```powershell
cd "C:\Users\User\Desktop\Venture OS\venture-os"
npm install
npm run dev
```

Open: `http://localhost:3000`

## Windows Recommended Dev Startup
- Use `npm run dev:safe` on Windows for more reliable startup.
- `dev:safe` starts with Turbopack and falls back to webpack if Turbopack cache/root errors occur.
- It tries port `3000` first, then falls back to `3001` if needed.
- It removes stale `.next/dev/lock` and retries once after cleaning `.next`.

## Key Pages
- `/login`
- `/app`
- `/app/nodes`
- `/app/views`
- `/app/audit`
- `/app/proposals`
