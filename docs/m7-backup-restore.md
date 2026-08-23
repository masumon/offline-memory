# M7 — Offline Backup & Restore

## Scope

M7 provides a local, deterministic backup/restore boundary for application data. It must remain offline-only and must never require a network service.

## Data included

- Tasks and task metadata
- Subtasks
- Memories and memory metadata
- Notification delivery state
- Schema/version metadata required for safe restore

## Safety requirements

1. Backup is read-only against the live database.
2. Restore validates the complete payload before mutating the live database.
3. Restore runs transactionally; validation or write failure must roll back.
4. Backup schema versions are explicit and forward-incompatible versions are rejected.
5. Restore must not silently overwrite malformed records.
6. Existing live data is preserved until restore validation succeeds.
7. No network, cloud sync, external LLM, or GitHub Actions dependency is introduced.
8. Backup format must be deterministic enough for repeatable tests.

## Planned implementation boundary

`backup-service` serializes repository data into a versioned JSON document.

`restore-service` parses and validates the document, then applies the complete dataset inside one SQLite transaction.

File-system/platform adapters are kept outside the domain/service layer so the core backup logic remains testable without Android runtime access.
