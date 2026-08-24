# M9 Final Production Gate

## Code-level gates

- [x] Home dashboard hierarchy and quick capture
- [x] Inbox -> planning continuity
- [x] Local reminder UX reuses existing notification services
- [x] Memory list/editor separation
- [x] Unified local task + memory search
- [x] Deterministic local NLP preview
- [x] Pure local orchestrator preview
- [x] Offline-first settings hub
- [x] Task detail/editor flow
- [x] Existing SQLite/service/repository architecture preserved
- [x] No schema/migration changes in M9 UX work
- [ ] TypeScript verification on local environment
- [ ] Lint verification on local environment
- [ ] Full Jest verification on local environment

## Final Android/device gates

- [ ] Release build completes
- [ ] APK installs on a real Android device
- [ ] Cold start works
- [ ] Core task flow works offline
- [ ] Memory CRUD/search works offline
- [ ] Local NLP/orchestrator preview works
- [ ] Local reminders/notifications work
- [ ] Backup/restore works
- [ ] No data loss after restart
- [ ] Final release smoke test passes

Device/runtime gates must not be marked PASS until verified on the user's real Android environment.
