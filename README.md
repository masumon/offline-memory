# Offline Memory

A professional, fully offline Android personal memory and productivity application.

## Product direction

Offline Memory reduces the cognitive load of remembering tasks. Core functionality works without an internet connection and without a cloud backend.

The local intelligence layer uses deterministic logic, NLP, context handling, planning, and orchestration rather than external LLM APIs.

## Final product UX direction

Offline Memory is a Bengali/English, mobile-first productivity and personal-memory experience with a restrained Bangladesh-inspired visual identity.

- Bengali and English UI copy across primary product surfaces
- Light and Dark/Night themes with persisted local preference
- Professional five-item primary bottom navigation: Home, Planning, Memory, Inbox, More
- Safe-area-aware layouts and accessible touch targets for varied Android screen sizes
- Consistent cards, buttons, icons, spacing, typography, loading, empty, error and retry states
- Offline/on-device status cues and privacy-first messaging
- Branded splash treatment and Android adaptive-icon color system
- Primary brand direction uses Bangladesh-inspired green; warm gold is reserved for emphasis and red for destructive/urgent states
- Existing application functionality remains behind the UI/application-service boundary

### UX principles

1. **Offline first:** core tasks, memory, search, planning, NLP, reminders and backup/restore do not depend on a cloud backend.
2. **Bengali first-class support:** Bengali is treated as a primary product language rather than a translated afterthought.
3. **Responsive mobile layout:** content respects safe areas, touch targets and compact Android screens without sacrificing readability.
4. **Clear state communication:** asynchronous actions expose loading, success, empty, error and retry states rather than silently failing.
5. **Consistent interaction language:** icons, cards, buttons, destructive actions and navigation follow the same visual hierarchy across screens.
6. **Privacy by architecture:** personal data and local intelligence stay on-device unless the user explicitly exports a backup.

## Current foundation

- Android-first React Native application
- Expo SDK 57 / React Native 0.86
- Expo Router
- TypeScript with strict compiler settings
- Local SQLite database, WAL mode and foreign-key enforcement
- Versioned SQLite migrations through schema version 7
- Persisted local language and theme preferences through the migration layer
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

The UI does not access SQLite domain data directly, and the local AI layer does not mutate the database directly. Actions pass through validated application services.

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

Static repository verification and code-level audits are performed continuously. Full Android/device verification is a separate final gate and must not be represented as PASS when an Android runtime is unavailable.

CI/CD and GitHub Actions are intentionally out of scope for the current implementation workflow.
