# M9 Completeness Audit

## Scope
Review of the full app surface from M0-M9 using the current `m9-final-production` implementation.

## Implemented surfaces
- Home / Today
- Quick Capture
- Inbox
- Daily Planning
- Reminders
- Memory list
- Memory editor
- Unified local search
- Local assistant / NLP preview
- More tools hub
- Settings
- Backup & Restore
- Diagnostics
- Task editor/detail

## Identified UX gap
The Task editor route existed but was not sufficiently discoverable from the main task flows. The M9 polish pass must expose task creation and task detail/edit navigation from Planning/Search/Home task rows and expose Assistant/Settings from More.

## Verification status
Code-level implementation can be reviewed in GitHub. TypeScript, lint, Jest, release APK, and physical Android verification must not be claimed PASS unless actually executed in an Android-capable environment.

## Release gate
Before production release:
1. npm install / dependency integrity
2. TypeScript check
3. ESLint
4. Jest
5. Expo/native Android build
6. Install on Android device
7. Offline CRUD verification
8. Notifications and stale notification reconciliation
9. Backup export/import and invalid-backup rejection
10. Fresh-install and migration verification
11. Accessibility and navigation smoke test
12. Final release build
