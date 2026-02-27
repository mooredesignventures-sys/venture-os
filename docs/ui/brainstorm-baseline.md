# Brainstorm Baseline

- Tag: `brainstorm-maturity-v1`
- Commit: `d9d528a`
- URL: `/app/brainstorm`

## Visual Checklist

- 3/6/3 columns from md+
- Top inserts show as cards (not document list)
- Map height 300px; buttons below map
- Team list scrolls (max-h 240px)
- Chat compact (h-20)

## Provenance

- Brainstorm maturity PR: https://github.com/mooredesignventures-sys/venture-os/pull/53
- Maturity tag: brainstorm-maturity-v1 (commit d9d528a)
- Baseline lock commit: 739f100

## Restore (60 seconds)

Commands:

```bash
git fetch --tags
git checkout brainstorm-maturity-v1 -- app/app/brainstorm/brainstorm-client.js
git commit -m "Restore Brainstorm UI baseline (tag brainstorm-maturity-v1)"
git push
```
