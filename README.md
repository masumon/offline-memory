# Offline Memory

A professional, fully offline Android personal memory and productivity application.

## Product direction

Offline Memory is a Bengali/English, mobile-first productivity and personal-memory experience with a restrained Bangladesh-inspired visual identity. Core functionality is offline-first and uses deterministic local NLP/orchestration rather than external LLM APIs.

## Current foundation

- Expo SDK 57 / React Native 0.86 / Expo Router
- Strict TypeScript
- Local SQLite with versioned migrations, WAL and foreign-key enforcement
- Task, planning, inbox, memory, search, reminders, backup/restore and diagnostics services
- Deterministic bilingual local NLP and local assistant orchestration
- Persisted Bengali/English language and Light/Dark theme preferences
- Five-item primary navigation with responsive expanded navigation for larger windows
- Shared theme tokens, cards, buttons, states and `AppIcon` abstraction
- Android adaptive launcher icon foreground/background/monochrome resources
- Branded Android splash resource

## Architecture

```text
UI
  -> Application Services
  -> Local AI / NLP / Orchestrator
  -> Repository Layer
  -> SQLite
  -> Local Notifications
```

UI components do not bypass the application/service boundary for domain mutations.

## Local setup

```bash
npm install
npx expo start
npx expo run:android
```

## Final verification commands

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
```

Android/device verification is a separate final gate and must not be represented as PASS without actual runtime evidence.

## Project contract

`AIOS.md` is the implementation contract for the final polish pass. Existing completed functionality is the baseline; missing, partial, or defective areas are extended or fixed without unnecessarily rebuilding stable architecture.

CI/CD and GitHub Actions remain deferred until the final implementation stage requested separately.

## Privacy

Core tasks, memories, search, planning, NLP, reminders and backup/restore do not require a cloud backend. Data remains on-device unless the user explicitly exports a backup.
