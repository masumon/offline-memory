# Offline Memory

A professional, fully offline Android personal memory and productivity application.

## Product direction

Offline Memory is designed to reduce the cognitive load of remembering tasks. Core functionality must work without an internet connection and without a cloud backend.

The local intelligence layer will use deterministic logic, NLP, context handling, planning, and orchestration rather than external LLM APIs.

## Current foundation

- Android-first React Native application
- Expo SDK 57
- Expo Router
- TypeScript with strict compiler settings
- Local SQLite database
- WAL mode and foreign-key enforcement
- Versioned database migration foundation
- Zustand application state foundation
- Local Android notification channel foundation
- Jest/Expo test foundation
- Production-oriented folder boundaries

Expo SDK 57 targets React Native 0.86 and requires Node.js 22.13.x or newer. See the official Expo SDK reference for the supported matrix.

## Architecture

```text
UI
  -> Application Services
  -> Local AI / NLP / Orchestrator
  -> Repository Layer
  -> SQLite
  -> Local Notifications
```

The UI will not access SQLite directly, and the local AI layer will not mutate the database directly. Actions will pass through validated application services.

## Development phases

1. M0 — Project bootstrap
2. M1 — Task and repository engine
3. M2 — Reminders and scheduling
4. M3 — Inbox and daily planning
5. M4 — Local NLP
6. M5 — Orchestration and context
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
npm test
```

## Privacy

The application is intentionally designed without a cloud database or external AI service for core functionality. Personal tasks, notes, memory, and local intelligence remain on the device unless the user explicitly exports a backup.
