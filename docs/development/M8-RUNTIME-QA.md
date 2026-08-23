# M8 Runtime QA Gate

Run on a networked machine with Android SDK/emulator or a physical Android device.

## Static gates

- `npm install`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npx expo-doctor`

## Android gates

1. Build/install the development app.
2. Open Diagnostics and verify database is readable.
3. Verify notification permission state.
4. Create a task with a future due time and verify one OS notification is scheduled.
5. Re-run diagnostics and verify the scheduled reminder count.
6. Reschedule the task and verify the old reminder is removed and the new reminder exists.
7. Complete the task and verify its reminder is removed.
8. Force-close and reopen the app; verify scheduler reconciliation restores only valid reminders.
9. Reboot the device and verify persisted task data and valid reminders remain consistent.
10. Export a backup, mutate local data, import the backup, and verify tasks/memories are restored.
11. Attempt a malformed/unsupported backup and verify live data is unchanged.
12. Test Android back navigation, keyboard/input, screen rotation policy, accessibility labels, and empty/error/loading states.

A failed runtime gate must remain visible as FAIL; unavailable runtime access must remain NOT VERIFIED rather than PASS.
