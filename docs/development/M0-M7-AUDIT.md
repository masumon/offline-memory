# M0–M7 Full Code Audit

## Scope

This audit rechecks the merged M0–M7 lineage for missing functionality, broken contracts, stale code, schema compatibility, unsafe UX, and unnecessary abstractions.

## Findings fixed on `m0-m7-full-audit`

- Removed obsolete `backup-restore-data.ts` abstraction and stale export.
- Added persistent `planned_date` to tasks with restart-safe schema migration v6.
- Added deterministic daily planning service and mobile planning screen.
- Added inbox-only planning mutation guard.
- Prevented date-only AI tasks from becoming accidental midnight reminders.
- Preserved existing reminder time when an AI reschedule changes only the date.
- Improved Bengali numeral and midnight time parsing.
- Added stale OS notification reconciliation for completed/deleted/rescheduled tasks.
- Added Android exact-alarm manifest permission required for exact-time scheduling.
- Made task store state consistent after archive/create.
- Recorded memory access from search results.
- Added destructive confirmation before permanent memory deletion.
- Made restore accept schema v5 backups while running current schema v6.
- Included planning date in current backup/restore data.
- Reconciled notifications after successful backup restore.
- Removed an unused legacy `Intent` type contract.
- Aligned README/project status documentation with the implemented roadmap.

## Architecture checks

- UI → application service → repository → SQLite boundary retained.
- AI/NLP/orchestrator remain deterministic and do not directly mutate SQLite.
- No external LLM API or network client found in source search.
- No TODO/FIXME markers found in repository search.
- No GitHub Actions workflow dependency is introduced.
- Only one audit development branch exists: `m0-m7-full-audit`.

## Environment verification

- Host Node.js: 22.16.0.
- Host npm: 10.9.2.
- Global TypeScript: 5.8.3.
- Repository clone could not be completed because this execution environment cannot resolve `github.com`.
- Repository `node_modules` are therefore unavailable and the full Jest/TypeScript/Expo command suite cannot honestly be reported as executed here.
- No Android emulator/device is available in this environment.
- GitHub source-level inspection and code-level changes were completed directly against the audit branch.

## Remaining external verification gate

Run locally/Codex in a networked environment:

```bash
npm install
npm run typecheck
npm run lint
npm test
npx expo-doctor
npx expo run:android
```

Then verify on a real Android device: database migration from an existing install, daily planning, exact-time notifications, app restart, device reboot, backup/share/import/restore, restore rollback, and notification reconciliation.
