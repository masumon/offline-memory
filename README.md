# Offline Memory

A professional, fully offline Android personal memory and productivity application.

## Product direction

Offline Memory reduces the cognitive load of remembering tasks. Core functionality works without an internet connection and without a cloud backend.

The local intelligence layer uses deterministic logic, NLP, context handling, planning, and orchestration rather than external LLM APIs.

## Current foundation

- Android-first React Native application
- Expo SDK 57 / React Native 0.86
- Expo Router
- TypeScript with strict compiler settings
- Local SQLite database, WAL mode and foreign-key enforcement
- Versioned SQLite migrations through schema version 6
- Task engine with inbox, planning date, due time, priorities and status transitions
- Local Android notification scheduling with persisted delivery identity and stale-notification reconciliation
- Deterministic bilingual local NLP with Bengali digit/date/time handling
- Pure local orchestrator and validated application-action boundary
- Memory CRUD, archive/restore, deterministic local search and context retrieval
- Versioned offline backup/restore with transactional validation
- Zustand application state foundation
- Jest/Expo test foundation

## Architecture

```text
UI
  -> Application Services
  -> Local AI / NLP / Orchestrator
  -> Repository Layer
  -> SQLite
  -> Local Notifications
```

The UI does not access SQLite directly, and the local AI layer does not mutate the database directly. Actions pass through validated application services.

## Development phases

1. M0 — Project bootstrap
2. M1 — Task and repository engine
3. M2 — Reminders and scheduling
4. M3 — Inbox and daily planning
5. M4 — Local deterministic NLP
6. M5 — Orchestration, context and scheduling integration
7. M6 — Memory and search
8. M7 — Backup and restore
9. M8 — Android hardening and QA
10. M9 — Production release

## Local setup

```bash
npm install
npx expo start
```

For a native Android development build:

```bash
npx expo run:android
```

Validation:

```bash
npm run typecheck
npm run lint
npm test
```

## Privacy

The application is intentionally designed without a cloud database or external AI service for core functionality. Personal tasks, notes, memory, and local intelligence remain on the device unless the user explicitly exports a backup.

## Verification policy

Static repository verification and code-level audits are performed continuously. Full Android/device verification is a separate gate and must not be represented as PASS when an Android runtime is unavailable.

CI/CD and GitHub Actions are intentionally out of scope for the current implementation workflow.
