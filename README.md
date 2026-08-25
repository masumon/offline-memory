# Offline Memory

A professional, fully offline Android personal memory and productivity application.

## Product direction

Offline Memory is a Bengali/English, mobile-first productivity and personal-memory experience with a restrained Bangladesh-inspired visual identity. Core functionality is offline-first and uses deterministic bilingual local NLP/orchestration rather than external LLM APIs.

## Current foundation

- Expo SDK 57 / React Native 0.86 / Expo Router
- Strict TypeScript
- Local SQLite with versioned migrations, WAL and foreign-key enforcement
- Task, planning, inbox, memory, search, reminders, backup/restore and diagnostics services
- Deterministic bilingual local NLP and local assistant orchestration
- Persisted Bengali/English language and Light/Dark theme preferences
- Five-item primary navigation with responsive expanded navigation for larger windows
- Shared theme tokens, cards, buttons, icon buttons, badges, states and `AppIcon` abstraction
- Bangladesh-localized date/time pickers and centralized Bengali/English date-time formatting
- Attachment support for images, videos, PDFs and arbitrary document/file types with local lifecycle cleanup
- Attachment-aware ZIP backup export and restore, including app language/theme preferences, while retaining compatibility with validated legacy JSON backups
- Android adaptive launcher icon foreground/background/monochrome resources
- Branded Android splash resource
- Responsive content constraints for larger windows so settings/tools remain readable instead of stretching indefinitely

## UX / design system

The final UI follows `AIOS.md` and uses:

- Bangladesh-inspired green as the primary brand color, with restrained semantic red/gold accents
- Light and dark semantic color tokens
- Bengali-first readable typography and localized status/priority labels
- Consistent rounded cards, buttons, icon containers and pressed/loading/empty/error states
- Safe-area-aware primary navigation with a compact bottom bar and expanded navigation for wider windows
- A minimum comfortable touch-target strategy and no device-model-specific layout assumptions
- Local vector/icon assets instead of required remote images for core flows
- Local file metadata, thumbnails for images, file-type icons, share/remove actions and localized attachment feedback

## Backup format

New exports use the attachment-aware Offline Memory Backup Archive v2. The archive contains the validated database payload, app language/theme preferences, attachment metadata and the corresponding binary attachment files. Legacy validated Offline Memory Backup v1 JSON files remain restorable.

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

For the complete Windows local gate:

```powershell
npm run verify:local
```

The script runs typecheck, lint, the full Jest suite, then builds a fresh Android debug APK and installs/launches it when an online Android emulator/device is available. It deliberately does not claim Android runtime PASS when no runtime evidence exists.

Individual checks remain available:

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
```

## Project contract

`AIOS.md` is the implementation contract for the final polish pass. Existing completed functionality is the baseline; missing, partial, or defective areas are extended or fixed without unnecessarily rebuilding stable architecture.

CI/CD and GitHub Actions remain deferred until the final implementation stage requested separately.

## Privacy and data safety

Core tasks, memories, search, planning, NLP, reminders and backup/restore do not require a cloud backend. Data remains on-device unless the user explicitly exports a backup.

Local SQLite database files, journals and transient database artifacts are ignored by Git so a user's local database is not accidentally committed to the repository.
