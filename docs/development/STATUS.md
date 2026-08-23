# Project status

Current implementation baseline: `main` (M7 merged).
Current M8 branch: `m8-production-hardening`.

## Roadmap

- M0 — Project bootstrap and offline foundation
- M1 — Task and repository engine
- M2 — Reminders and scheduling
- M3 — Inbox and daily planning
- M4 — Local deterministic NLP
- M5 — Orchestration and context
- M6 — Memory and search
- M7 — Backup and restore
- M8 — Android hardening and QA **IN PROGRESS**
- M9 — Production release

## M8 scope

M8 hardens the Android runtime boundary without introducing cloud dependencies. It covers notification permission/state diagnostics, scheduled-reminder visibility, database schema health checks, startup/lifecycle behavior, destructive-action safety, accessibility checks, and regression tests for platform-facing services.

A local diagnostics screen is available at `/diagnostics` and is reachable from the Home screen. It reports SQLite schema version, notification permission state, and the number of OS-scheduled reminders. Diagnostics are informational and do not mutate application data.

## Verification policy

Static repository verification and code-level audits are performed continuously. Full Android/device verification remains a separate gate and must not be represented as PASS when an Android runtime is unavailable. Required M8 runtime gates are:

- `npm install`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npx expo-doctor`
- real Android build/install
- notification permission and exact-time reminder test
- process restart / app resume reminder reconciliation
- backup/restore verification on a real device

## Constraints

- Core functionality remains fully offline.
- Local deterministic NLP/orchestration is used instead of external LLM APIs.
- No cloud database or network dependency is introduced for core features.
- CI/CD and GitHub Actions remain intentionally out of scope.
