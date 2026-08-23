# Project status

Current implementation branch: `main`

## M0

M0 foundation and hardening are implemented on `main`.

Completed:

- local notification channel initialization is wired into application startup
- SQLite migration remains isolated behind `SQLiteProvider.onInit`
- no network or external LLM dependency is introduced
- CI/CD has intentionally been removed from the current development workflow

Verification policy:

- code is reviewed and validated in the available development environment as far as tooling permits
- executable Android/device verification will be performed when a suitable Android environment/device is available
- a feature is not considered production-ready solely from static review

## Development sequence

M0 Foundation → M1 Task Engine → M2 Memory Engine → M3 Local NLP → M4 Orchestrator → M5 Planning & Scheduling → M6 Notifications & Reminders → M7 Professional UI → M8 Intelligence & Personalization → M9 Security/Privacy → M10 Final Android QA and release hardening.

CI/CD is explicitly out of scope for the current implementation sequence and will not block feature development.
