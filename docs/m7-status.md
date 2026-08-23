# M7 Status

M7 now has:

- versioned offline backup document format
- strict backup validation
- complete SQLite backup reader for tasks, subtasks, memories, notification deliveries and app metadata
- schema-version validation
- transactional full SQLite restore
- restore referential-integrity and constraint validation before mutation
- local JSON file export
- Android/iOS document picker import
- explicit user confirmation before restore
- backup/share and restore workflow in the mobile UI
- task and memory store refresh after successful restore
- regression coverage for backup format, reader and restore validation

Remaining before M7 is complete:

- run the full Jest/typecheck/lint suite in an available local/CI-free environment
- verify Android device export/share/import/restore end-to-end
- verify rollback behavior with an injected SQLite write failure
- final M7 source audit and PR review

M7 remains incomplete until those verification gates pass.
