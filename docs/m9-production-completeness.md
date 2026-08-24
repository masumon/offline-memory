# M9 Production Completeness Contract

This document defines the implementation-level completion contract for M9. Runtime verification remains a separate release gate.

## Product surfaces

- Home / Today
- Quick Capture
- Inbox
- Planning
- Task Detail / Editor
- Reminders
- Memory
- Memory Editor
- Search
- Local Assistant
- Settings
- Backup / Restore
- Diagnostics
- More / secondary navigation

## Completion standard

Every user-facing capability must have a connected path from UI control to the appropriate application service and persistence layer, with loading, empty, error, success, disabled, and destructive-action states where applicable. Existing M0-M8 business logic remains authoritative; M9 must not create parallel repositories, duplicate business rules, or bypass validated application services.

## Data safety

- No destructive schema changes.
- No direct SQLite access from UI.
- No direct database mutation from NLP/orchestrator code.
- No fake/demo production data.
- Archive/restore and backup/restore flows must remain recoverable.

## Release gate

This contract does not claim TypeScript, lint, Jest, native Android, physical-device, notification-runtime, or release-build verification. Those remain explicit final verification activities.
