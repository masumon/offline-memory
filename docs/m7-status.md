# M7 Status

M7 implementation is present in the current `main` lineage and is being re-audited on `m0-m7-full-audit`.

Implemented:

- versioned offline backup document format
- complete SQLite backup reader for tasks, subtasks, memories, notification deliveries and app metadata
- database schema version 6 support, including daily planning date
- strict backup validation
- transactional full SQLite restore
- restore referential-integrity and constraint validation before mutation
- backward-compatible restore of schema version 5 backups
- local JSON file export and Android/iOS document-picker import
- explicit user confirmation before restore
- task and memory store refresh after successful restore
- regression coverage for backup format, reader and restore validation

Remaining verification gate:

- full Jest/typecheck/lint suite in a networked local/Codex environment
- real Android device export/share/import/restore and rollback verification

These environment-dependent checks are not claimed as PASS by the audit branch. No CI/CD or GitHub Actions dependency is introduced.
