# Project status

Current hardening branch: `fix/m0-hardening`

## M0

M0 foundation is implemented on `main`.

M0 hardening is in progress on `fix/m0-hardening`.

Completed in this hardening pass:

- local notification channel initialization is wired into application startup
- SQLite migration remains isolated behind `SQLiteProvider.onInit`
- no network or external LLM dependency is introduced

Still requiring executable verification when a runner/device is available:

- dependency installation
- TypeScript
- ESLint
- Jest
- Expo Doctor
- Android export/build
- Android runtime smoke test

Do not mark M0 production-ready until the executable verification gates above are green or explicitly waived with a documented reason.
