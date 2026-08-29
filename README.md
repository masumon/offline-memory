# Offline Memory

A privacy‑first, fully offline Android app for personal memory and day‑to‑day task management. Bengali‑first, equally natural in English, and designed to feel calm, trustworthy and premium on ordinary Android phones.

> **100% offline.** No account, no sign‑in, no server of its own. Everything you create stays on the device and only leaves it when *you* export a backup.

---

## What it does

- **Quick capture** — type or speak one line; the app decides whether it is a task or a memory, extracts the date, time, priority and tags, and shows you exactly what it understood before anything is saved.
- **Tasks & planning** — a daily plan laid out by time of day, an inbox for half‑formed thoughts, overdue/ due/ priority focus, subtasks, recurrence and attachments.
- **Memory** — durable notes with kinds, importance, tags and full‑text search; explicit task ↔ memory links.
- **Reminders** — exact‑alarm local notifications that survive a reboot, with snooze / reschedule / cancel and quiet hours.
- **Local assistant** — deterministic on‑device command understanding for "call the supplier tomorrow at 9am", "remember the wifi password", "show my tasks", etc.
- **Backup & restore** — an attachment‑aware archive (optionally passphrase‑encrypted) you can save or share; legacy JSON backups still restore.
- **In‑app documents** — the "Advanced on‑device AI" setup guide and the full Privacy Policy & Terms are read *inside* the app, bilingually.

---

## Highlights of the current build

### Understanding & on‑device intelligence
- Deterministic bilingual local NLP: an expanded Bengali + English verb lexicon, synonym/typo tolerance (Levenshtein), number‑word → digit normalisation, relative time ("in 2 hours" / "৩০ মিনিট পর"), auto‑priority, auto‑tags and multi‑step splitting ("buy milk, then call the bank").
- An on‑device **learning layer** (`learning` table): time‑of‑day habits ("gym" → usually 6am), preferred task/memory intent, frequent‑task chips and tag co‑occurrence — plain local counters, never a profile, never uploaded.
- **Proactive suggestions**: bulk‑reschedule overdue items, make a repeated title recurring, plan today, gentle backup nudge — each dismissable and rate‑limited.
- **Streaks**: a quiet "days in a row you finished something" counter.
- **Pluggable AI engine**: the built‑in rule engine is always the fallback; an optional on‑device LLM can be added as a **separate, opt‑in module** that registers itself — the default build never imports it, so it stays small and unbreakable. See `src/ai/engine/README.md`.

### Voice (offline)
- Hold‑to‑talk speech‑to‑text via the OS on‑device recogniser (`requiresOnDeviceRecognition` on Android) and OS text‑to‑speech for confirmations. No audio is recorded, kept or sent anywhere.

### Design
- **"Emerald & Sand"** v4 palette — emerald green primary, restrained gold accent — with full light/dark semantic tokens.
- Brand **gradient hero** on Home; premium **glassmorphism** (highlight border, reduced scrim) that never sacrifices readability.
- Reanimated micro‑motion (entrance, dialogs, snackbar, suggestions), all gated by **Reduce Motion**.
- A **branded animated splash**: three drifting/spinning sparks and a "Powered by" credit that shimmers in, then lifts away — one emerald background throughout, no visible seam.
- Colourful, real, rounded bottom‑navigation icons (Home = green, Planning = blue, Memory = purple, Inbox = orange, More = gold) on a translucent glass bar.
- A 48 dp shared touch‑target contract, safe‑area‑aware navigation, and responsive constraints for larger windows/foldables.
- **Professional app icon & branding**: emerald spark mark, Android adaptive foreground/background/monochrome, generated from a single vector source (`npm run icons`).

### Data & platform
- Local **SQLite** with versioned migrations, WAL and foreign‑key enforcement (currently schema v11: adds explicit task ↔ memory `relations`).
- Attachments for images, video, PDF and arbitrary files, with lifecycle cleanup and a storage‑reconciliation diagnostic.
- Attachment‑aware **Backup Archive v2** (serialized DB + preferences + attachment binaries), passphrase encryption via pure‑JS AES‑256‑CBC + PBKDF2, and validated legacy JSON restore.
- Modern Expo FileSystem `File` / `Directory` / `Paths` APIs.
- App lock (biometric / device credential; PIN stored only as a salted hash), quiet hours, launcher quick‑actions.
- Device **diagnostics**: schema version, database readability, notification layer, scheduled‑reminder count and attachment integrity.

---

## Architecture

```text
UI (screens, HomeScreen, shared primitives)
  -> Application Services   (task / memory / planning / backup / suggestion / streak / relation …)
  -> Local AI               (nlp • orchestrator • context • pluggable engine)
  -> Repository Layer
  -> SQLite  +  Local Notifications
```

UI never bypasses the application/service boundary for domain mutations. Bundled documents are typed block content in `src/content/docs.ts`, rendered natively by `app/doc.tsx`.

**Stack:** Expo SDK 57 · React Native 0.86 · Expo Router (typed routes) · strict TypeScript · Zustand · Jest (`jest-expo`, multi‑project).

---

## Local setup

```bash
npm install
npx expo start          # Metro (dev client)
npx expo run:android    # build + install a debug APK on a connected device
```

Regenerate brand assets after editing the vector sources or document content:

```bash
npm run assets          # app icons + both PDFs
npm run icons           # icons only
npm run guide           # AI‑engine guide PDF
npm run legal           # Privacy & Terms PDF
```

> The generated PDFs are kept for the project/website. The app itself reads the same
> content in‑app and never opens an external viewer.

---

## Verification

```powershell
npm run verify:local    # full Windows gate: typecheck + lint + Jest, then a fresh debug APK when a device is attached
```

Individual checks:

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
```

Current status: **`tsc` 0 · `eslint` 0 · Jest suite green.**

---

## Privacy & data safety

Tasks, memories, search, planning, NLP, reminders, learning and backup/restore all run on the device. Nothing is sent to a server, there is no advertising or analytics, and there is no tracking of any kind. Data leaves the device only when you deliberately export or share a backup, to the destination you choose.

Local SQLite files, journals and transient database artifacts are git‑ignored so a user's local database is never committed.

The complete policy — data stored, permissions and why, third‑party components, your rights, copyright and terms — ships inside the app under **Settings → Legal** and **About**, and is also generated to `assets/privacy-and-terms.pdf`.

---

## Credits

Made by **SUMON** · Powered by **ABO ENTERPRISE**.
© Offline Memory. All rights reserved. "Offline Memory" and the spark mark are trademarks of the author; third‑party open‑source components remain under their own licences.
