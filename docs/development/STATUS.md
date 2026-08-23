# Project status

Current implementation baseline: `main` (M7 merged).
Current full-audit branch: `m0-m7-full-audit`.

## Roadmap

- M0 — Project bootstrap and offline foundation
- M1 — Task and repository engine
- M2 — Reminders and scheduling
- M3 — Inbox and daily planning
- M4 — Local deterministic NLP
- M5 — Orchestration and context
- M6 — Memory and search
- M7 — Backup and restore
- M8 — Android hardening and QA
- M9 — Production release

## Full-audit policy

M0–M7 are not considered production-complete solely because a phase was previously merged. The audit branch rechecks every phase for missing functionality, broken boundaries, stale code, schema compatibility, regression coverage, and unnecessary abstractions.

Known environment limitation: this execution environment cannot resolve `github.com` from a local shell and has no Android emulator/device, so full npm/Expo runtime verification must be performed in a networked local/Codex environment. Static repository review and code-level fixes continue without treating unavailable runtime checks as PASS.

## Constraints

- Core functionality remains fully offline.
- Local deterministic NLP/orchestration is used instead of external LLM APIs.
- No cloud database or network dependency is introduced for core features.
- CI/CD and GitHub Actions remain intentionally out of scope.
