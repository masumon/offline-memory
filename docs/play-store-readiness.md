# Play Store readiness checklist — Offline Memory

A living checklist for shipping `com.masumon.offlinememory` to Google Play. Tick items as
they are done; keep the "Notes" column honest.

## 1. Build & signing

| Item | State | Notes |
| --- | --- | --- |
| Release variant builds clean (`npx expo run:android --variant release`) | ☐ | R8 minify is on. |
| Upload key / keystore backed up outside the repo | ☐ | Never commit the keystore or `keystore.properties`. |
| `applicationId` final = `com.masumon.offlinememory` | ☑ | |
| `versionCode` bumped for every upload | ☐ | Currently unset in `app.json` → add `android.versionCode`. |
| `versionName` matches `CHANGELOG` latest (`src/content/changelog.ts`) | ☐ | Keep the two in lock-step. |
| Play App Signing enrolled | ☐ | Let Google hold the app signing key; keep the upload key. |
| ProGuard/R8 keeps: SQLite, Reanimated, Expo modules verified at runtime | ☐ | Smoke-test the release APK, not just debug. |

## 2. App content & policy

| Item | State | Notes |
| --- | --- | --- |
| Privacy policy URL (hosted, reachable) | ☐ | App is fully offline — state plainly that no data leaves the device. |
| Data safety form: "No data collected / shared" | ☐ | True today. Re-check if any analytics/crash SDK is ever added. |
| Target audience & content rating questionnaire | ☐ | Productivity, everyone. |
| Ads declaration = no ads | ☐ | |
| Permissions justified: `POST_NOTIFICATIONS`, `RECORD_AUDIO`, `SCHEDULE_EXACT_ALARM`? | ☐ | Audio = on-device speech capture only. Confirm exact-alarm need vs. inexact. |
| Foreground-service / background-work disclosure | ☐ | Only local notifications scheduled; no FGS today. |
| Financial / health / sensitive categories | ☑ n/a | |

## 3. Store listing assets

| Item | State | Notes |
| --- | --- | --- |
| App icon 512×512 (32-bit PNG) | ☐ | |
| Feature graphic 1024×500 | ☐ | |
| Phone screenshots ×2–8 (min 1080px, 16:9 or 9:16) | ☐ | Light + dark; Bengali + English. |
| Short description (≤80 chars) | ☐ | |
| Full description (≤4000 chars) — offline-first, bilingual, private | ☐ | |
| Localised listing: `bn-BD` + `en-US` | ☐ | The app itself is bilingual; the listing should be too. |

## 4. Quality gates (run before every release)

| Item | State | Notes |
| --- | --- | --- |
| `npx tsc --noEmit` clean | ☐ | |
| `npx eslint .` clean | ☐ | |
| `npx jest` all green | ☐ | |
| Manual pass on a real device (Vivo V2317) | ☐ | Onboarding, capture (typed + voice), reminders fire, backup→restore round-trip, Trash restore, theme + language switch. |
| Cold-start has no white/theme flash | ☑ | Fixed in Phase 1 (prefs-gated `Appearance.setColorScheme`). |
| Back-from-root exit dialog behaves | ☑ | |
| Offline airplane-mode smoke test | ☐ | Everything core must work with no network. |
| Low-end device / large font (accessibility) pass | ☐ | `AppText` caps multipliers; still eyeball key screens. |

## 5. Pre-launch report (Play Console)

| Item | State | Notes |
| --- | --- | --- |
| Internal testing track upload + install | ☐ | |
| Pre-launch report: no crashes / ANRs | ☐ | |
| Accessibility scan issues triaged | ☐ | |
| Deobfuscation / native-debug-symbols uploaded | ☐ | Upload the R8 mapping file with each release. |

## 6. Post-submit

| Item | State | Notes |
| --- | --- | --- |
| Staged rollout (start ~20%) | ☐ | |
| Crash/ANR watch for 48h | ☐ | |
| `CHANGELOG` entry mirrored into the release notes field | ☐ | |
