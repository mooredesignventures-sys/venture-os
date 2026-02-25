# Views + Quality Smoke Checklist

## Purpose
Minimal manual smoke checks for views parity and read-only quality checks.

## Commands
```powershell
npm run build
npm run lint
npm run dev -- -p 3002
```

## PASS/FAIL checks
1. Open `http://localhost:3002/login` and click `Enter (temporary)`.
PASS: `/app` loads.

2. Open `/app/views`, `/app/views/decisions`, `/app/views/requirements`, `/app/views/business`.
PASS: all pages load without crashes in default Draft mode.

3. On each views page, switch to `Committed only` using the scope toggle.
PASS: mode switches consistently and pages remain stable.

4. In `/app/views/business`, verify counts are shown and relationships are grouped by type.
PASS: grouped sections (`depends_on`, `enables`, `relates_to`) appear when data exists.

5. In `/app/nodes`, click `Run invariant checks (report-only)`.
PASS: report message appears and no data is changed.

6. In `/app/nodes`, paste a schemaVersion `1` bundle and click `Validate Bundle (dry run)`.
PASS: validation path runs and shows PASS/FAIL message.

7. Repeat step 6 with a schemaVersion `2` bundle.
PASS: validation path runs and shows PASS/FAIL message.
