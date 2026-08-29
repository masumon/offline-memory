# Offline Memory — AIOS

## AIOS = Application Intelligence & Operating Specification

**Status:** Final implementation specification
**Scope:** Full application UI/UX, frontend, backend integrity, Android packaging, accessibility, localization, adaptive layouts, performance, and release polish.
**Repository:** `masumon/offline-memory`
**Primary branch:** `main`

> This document is the implementation contract for the final Offline Memory polish pass. Existing completed work is baseline and must not be unnecessarily reimplemented. Every change must preserve existing business logic, offline-first behavior, database integrity, task/memory semantics, notification behavior, and platform functionality.

---

## 1. Product Direction

Offline Memory is a **privacy-first, offline-first personal memory + task management application** designed primarily for Bangladeshi users while remaining globally usable.

The final product should feel:

- calm, trustworthy, modern, lightweight, and professional;
- distinctly Bangladeshi without becoming a government-style interface;
- equally natural in Bangla and English;
- excellent on small Android phones and adaptive on larger phones/tablets/foldables;
- fast and understandable even when data is empty or the device is offline;
- visually consistent across every screen.

No feature may be removed merely for visual simplification.

---

## 2. Existing Baseline — Do Not Rebuild Unnecessarily

The current codebase already contains important completed foundations, including:

- Expo Router navigation;
- SQLite offline storage;
- task, subtask, memory, notification-delivery and metadata persistence;
- scheduler/bootstrap services;
- task and memory stores/services;
- local NLP parsing;
- backup/restore;
- diagnostics;
- reminders/notifications;
- Bengali/English preference state;
- light/dark theme state;
- centralized `AppIcon` abstraction;
- Bangladesh-inspired green/red visual palette;
- primary bottom navigation;
- existing splash/launcher resources;
- typed routes and TypeScript validation;
- existing test suites.

These are the baseline. Future work must extend and polish them rather than replacing stable architecture.

---

# 3. Visual Design System

## 3.1 Brand Character

Design language:

**Bangladesh-inspired + Material-informed + premium productivity app.**

The interface should use:

- restrained green as the primary brand color;
- red only as a meaningful accent/error/high-attention color, not as a dominant UI color;
- warm neutral surfaces;
- strong contrast;
- generous but controlled spacing;
- rounded cards and controls;
- clear iconography;
- subtle elevation;
- minimal decorative noise.

The national-color inspiration must remain respectful. Do not reproduce the national flag as a decorative UI pattern or imply government affiliation.

## 3.2 Color Tokens

> **Superseded.** The shipped palette is design-system **v4 "Emerald & Sand"** — see
> `src/theme/index.ts` for the authoritative light/dark tokens, accent families and glass
> tokens. The hex values listed below are the earlier v2 direction, kept for history only.

### Light

- Background: `#F4F8F6`
- Surface: `#FFFFFF`
- Muted surface: `#EAF2EE`
- Primary green: `#006A4E`
- Pressed green: `#00543E`
- On-primary: `#FFFFFF`
- Accent red/gold family: use sparingly and semantically
- Primary text: `#10231D`
- Secondary text: `#53665F`
- Muted text: `#879790`
- Border: `#D9E5DF`
- Success: `#16804A`
- Warning: `#B86A00`
- Danger: `#C73535`
- Info: `#087EA4`

### Dark

- Background: `#081410`
- Surface: `#10221B`
- Muted surface: `#183128`
- Primary: `#54C49A`
- Pressed primary: `#35A97D`
- On-primary: `#06130E`
- Accent: warm gold/yellow only where useful
- Primary text: `#F2F8F5`
- Secondary text: `#C2D3CC`
- Muted text: `#8EA39A`
- Border: `#29463A`
- Success: `#55D18F`
- Warning: `#F3B84B`
- Danger: `#FF7B7B`
- Info: `#55C3E5`

All colors must be tokenized. Screens must not invent arbitrary colors.

## 3.3 Typography

- Bengali must be first-class, not an afterthought.
- Use a reliable Unicode Bengali-capable font stack where the platform allows it.
- Maintain readable line height for Bengali glyphs.
- Avoid overly condensed text.
- Body text should generally use 14–17sp.
- Main screen title may use approximately 28–36sp depending on available width.
- Section headings approximately 18–22sp.
- Labels approximately 11–13sp.
- Use weight hierarchy rather than excessive font-size variation.
- Keep long text blocks readable; avoid extremely long single-line labels.

## 3.4 Spacing

Use an 4dp-based spacing scale:

`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48`

Avoid random margins.

## 3.5 Shape

- Small: 8dp
- Medium: 12–16dp
- Large cards: 18–20dp
- Modal/sheet: 20–28dp
- Pills: fully rounded

## 3.6 Elevation

Use subtle elevation only for:

- cards;
- floating action elements;
- navigation surfaces;
- modal/sheet layers.

Avoid heavy shadows.

---

# 4. Global UI/UX Rules

Every screen must have:

1. Safe-area correctness.
2. Responsive width behavior.
3. Keyboard-safe input behavior.
4. Consistent header hierarchy.
5. Clear primary action.
6. Loading state.
7. Empty state.
8. Error state where applicable.
9. Disabled state.
10. Pressed state.
11. Accessibility labels.
12. Adequate touch targets.
13. Bengali/English localization.
14. Light/dark support.
15. No clipped text.
16. No horizontal overflow.
17. No content hidden behind bottom navigation.
18. Consistent icon placement.
19. Consistent card/button dimensions.
20. No unnecessary re-render or blocking startup work.

---

# 5. Navigation Architecture

## Compact phones

Use a professional bottom navigation bar with 5 primary destinations:

1. Home
2. Planning
3. Memory
4. Inbox
5. More

Requirements:

- icon + label;
- selected state;
- unselected state;
- sufficient touch area;
- safe-area aware bottom padding;
- visible selected indicator;
- no overlap with screen content;
- Bengali labels must fit without clipping;
- accessibility roles/labels.

## Medium/large screens

When window width permits, adapt toward:

- navigation rail; or
- expanded navigation panel.

Do not simply stretch the compact phone UI across a tablet.

Use responsive breakpoints rather than device-model checks.

---

# 6. Home / Dashboard

Home should become the application's strongest screen.

Required hierarchy:

1. Brand/header
2. Today/date context
3. Offline/on-device privacy status
4. Quick Capture
5. Local NLP understanding preview
6. Today's focus metrics
7. Today's tasks
8. Recent memories
9. Useful secondary actions

Quick Capture must feel effortless.

Input should support natural-language task creation such as:

- `আগামীকাল সকাল ৯টায় মাকে ফোন করব`
- `Call mother tomorrow at 9 AM`

NLP preview must clearly indicate that it is a preview, not silently modify user intent.

---

# 7. Quick Capture

Design requirements:

- prominent input;
- clear placeholder;
- Add/Create button;
- loading state;
- disabled state;
- keyboard submit;
- accessible label;
- NLP preview;
- error feedback;
- successful creation feedback without intrusive dialogs.

---

# 8. Planning

Planning should provide:

- today;
- upcoming;
- overdue;
- planned date;
- priority;
- status;
- completion;
- rescheduling;
- task editing;
- subtasks where supported.

Use clear visual priority hierarchy:

- Urgent — danger/red semantic treatment;
- High — warning/accent;
- Medium — standard;
- Low — muted.

Do not make every task colorful.

---

# 9. Task Editor

Task Editor must be a polished form with:

- title;
- notes;
- status;
- priority;
- due date/time;
- planned date;
- subtasks;
- save/update;
- completion;
- archive/cancel where supported.

Form requirements:

- field labels always visible;
- clear focus states;
- keyboard-safe layout;
- date/time interaction appropriate for Android;
- validation;
- save progress/loading state;
- destructive actions visually separated;
- unsaved-change handling if required.

---

# 10. Inbox

Inbox is an action queue, not just a list.

Required:

- clear empty state;
- task count;
- task iconography;
- quick planning action;
- priority/status visibility;
- loading state;
- error state;
- accessible actions.

Empty state should be encouraging and informative without excessive decoration.

---

# 11. Memory

Memory should feel like a personal knowledge vault.

Support clear visual distinction for:

- Note
- Fact
- Preference
- Event
- Reflection

Memory cards should expose:

- content/title;
- type;
- importance;
- tags when present;
- updated/created context where useful;
- archive state where applicable.

Avoid displaying raw database terminology to normal users.

---

# 12. Memory Editor

Provide a focused writing experience:

- title;
- content;
- type;
- importance;
- tags;
- save;
- archive/delete only where supported.

Writing area should have generous vertical space and excellent Bengali typing support.

---

# 13. Search

Search must support:

- tasks;
- memories;
- unified results;
- empty state;
- no-result state;
- loading state;
- clear search action;
- readable result grouping.

Search result cards should clearly identify whether an item is a task or memory.

---

# 14. Assistant

Assistant UI should remain consistent with the application brand.

Required:

- clear conversation hierarchy;
- user/assistant distinction;
- loading state;
- actionable responses;
- errors/retry;
- Bengali/English copy;
- no misleading claims about remote processing when functionality is local.

---

# 15. Reminders

Reminders must clearly communicate:

- notification permission state;
- scheduled reminders;
- task association;
- delivery status where available;
- retry/setup action;
- disabled/unavailable state.

Never expose internal notification-delivery database terminology unnecessarily.

---

# 16. Backup & Restore

Backup/restore should look like a secure data-management area.

Include:

- what is backed up;
- privacy/offline messaging;
- export action;
- import/restore action;
- progress/loading;
- validation errors;
- destructive restore confirmation;
- success/failure feedback.

Do not modify the existing backup format or data semantics without explicit migration requirements.

---

# 17. Diagnostics

Diagnostics is an advanced utility screen.

Use:

- grouped diagnostic cards;
- health indicators;
- concise status labels;
- expandable technical details if needed;
- copy/share capability only if already supported and safe;
- clear distinction between healthy, warning, and error.

Do not make technical diagnostics the visual language of normal screens.

---

# 18. More / Settings

More should be a clean settings hub.

Recommended groups:

### Preferences
- Language
- Theme

### Data
- Backup & Restore
- Memory/data tools

### Notifications
- Reminders

### System
- Diagnostics
- About

Use icon-led list rows with clear descriptions.

---

# 19. Language System

Supported languages:

- বাংলা
- English

Language toggle must be:

- persistent;
- immediate where safe;
- consistent across all screens;
- applied to navigation labels;
- applied to buttons;
- applied to empty/error/loading states;
- applied to settings;
- applied to accessibility labels where practical.

Do not mix Bengali and English accidentally in user-facing copy.

Internal technical identifiers may remain English.

---

# 20. Theme System

Support:

- Light
- Dark

Theme selection must persist.

All screens must use semantic theme tokens.

Do not hard-code white/black backgrounds inside screens unless explicitly required by an asset.

System status/navigation bars must harmonize with the active theme.

---

# 21. App Icon / Brand Assets

Create/maintain a professional Offline Memory brand identity:

Concept direction:

- memory/brain/book/leaf/archive motif;
- Bangladesh-inspired green;
- restrained red accent;
- simple silhouette;
- readable at small sizes.

Android adaptive icon requirements:

- foreground layer;
- background layer;
- monochrome layer for themed icons;
- safe-zone aware composition;
- clean vector/shape edges;
- no unnecessary baked-in shadow.

Do not place critical logo details outside the adaptive safe zone.

---

# 22. Splash Screen

Splash screen must:

- use the final brand icon;
- support light/dark appropriately;
- use a clean solid background;
- avoid unnecessary long delays;
- transition smoothly into the first stable frame;
- avoid showing a second redundant loading spinner immediately after the splash.

If animated, keep animation subtle and short.

---

# 23. Loading System

Create consistent loading patterns:

- inline spinner for short operations;
- skeleton placeholders for content-heavy screens where useful;
- button spinner for mutations;
- full-screen loading only for true application initialization.

Never block the whole UI for a small database operation.

---

# 24. Empty States

Every major collection requires a designed empty state.

Each empty state should answer:

- What is empty?
- Why is it empty?
- What can the user do next?

Use an icon/illustration only when it improves comprehension.

---

# 25. Error States

Errors must be:

- human-readable;
- localized;
- actionable;
- non-destructive;
- technically logged where appropriate.

Avoid exposing raw SQL, stack traces, file paths, or internal exception messages to normal users.

---

# 26. Buttons

Button hierarchy:

### Primary
Filled green.

### Secondary
Outlined or tonal.

### Tertiary
Text/icon action.

### Destructive
Danger semantic color, used only for irreversible/destructive actions.

Requirements:

- minimum comfortable touch target;
- clear pressed state;
- disabled state;
- loading state;
- Bengali label fit;
- icon + text alignment.

---

# 27. Cards

Cards should have:

- consistent radius;
- border/elevation token;
- internal spacing;
- clear primary text;
- secondary metadata;
- optional leading icon;
- optional trailing action.

Avoid nested cards unless information architecture requires it.

---

# 28. Icons

Use one coherent icon family through `AppIcon`.

Requirements:

- no random emoji as UI icons;
- semantic icon names;
- consistent size hierarchy;
- sufficient contrast;
- accessibility labels for meaningful icons;
- decorative icons should not be announced unnecessarily.

---

# 29. Illustrations / Images

Offline Memory should remain lightweight.

Prefer:

- vector illustrations;
- simple branded empty-state artwork;
- optimized local assets.

Avoid large remote image dependencies because the product is offline-first.

Images must not become required for core functionality.

---

# 30. Responsive / Adaptive Mobile Design

The UI must fit:

- small Android phones;
- standard phones;
- large phones;
- tablets;
- foldables where possible;
- landscape/resizable windows.

Rules:

- use available window dimensions;
- avoid fixed device-specific widths;
- avoid fixed heights for content containers;
- use flex/grid-like responsive structures;
- prevent text clipping;
- adapt navigation on larger widths;
- preserve feature parity across sizes.

---

# 31. Accessibility

Minimum requirements:

- semantic roles;
- accessibility labels;
- accessibility states for checkboxes/toggles;
- adequate touch targets;
- readable contrast;
- no color-only status communication;
- keyboard/focus usability where applicable;
- dynamic text should not destroy layout.

---

# 32. Performance

Do not sacrifice performance for visual polish.

Required principles:

- avoid unnecessary state updates;
- memoize expensive derived data;
- keep list rendering efficient;
- avoid synchronous heavy startup work;
- keep database access asynchronous;
- use lightweight assets;
- avoid unnecessary dependencies;
- avoid network requirements for core flows.

Startup must present a stable UI as early as practical.

---

# 33. Offline-First / Privacy Contract

The application must continue to function without internet access for all locally supported features.

Core data must remain local unless an explicitly implemented feature requires otherwise.

UI copy should reinforce the privacy model accurately:

- “On this device” / “এই ডিভাইসে” where true;
- never claim end-to-end encryption unless actually implemented;
- never claim AI processing is local unless the implementation proves it;
- never claim data is private from all parties unless technically guaranteed.

---

# 34. Database Safety

Database changes must be additive and migration-safe.

Rules:

1. Never delete existing user data for UI work.
2. Never rewrite existing migrations.
3. Add a new migration for schema changes.
4. Maintain `PRAGMA user_version` correctly.
5. Preserve foreign keys.
6. Preserve indexes unless a verified optimization replaces them.
7. Backward compatibility must be considered.
8. Existing backup/restore must remain compatible.

Current database baseline is schema version 6 before the preference-storage migration; future schema changes must increment the version sequentially.

---

# 35. Backend / Service Safety

UI changes must not bypass:

- task store/service contracts;
- memory store/service contracts;
- notification service;
- scheduler;
- backup/restore;
- diagnostics;
- NLP behavior.

No direct SQL from UI components unless the existing architecture explicitly requires it.

Prefer service/store abstractions.

---

# 36. Security

Review for:

- unsafe input handling;
- path traversal in backup/restore;
- unsafe file assumptions;
- accidental sensitive logging;
- unvalidated imported data;
- SQL injection through dynamic SQL;
- permission overreach;
- insecure external URLs;
- accidental secrets in repository.

Do not add analytics/tracking merely for UI polish.

---

# 37. Android Packaging

Maintain:

- application ID;
- notification behavior;
- required permissions only;
- launcher icon;
- adaptive icon;
- splash resources;
- development build compatibility;
- release build compatibility.

Do not introduce native changes unless necessary and verified.

---

# 38. Code Quality

All final changes must maintain:

- TypeScript correctness;
- ESLint cleanliness;
- existing test compatibility;
- typed Expo Router paths;
- component reuse;
- readable code;
- no duplicated design tokens;
- no dead UI code;
- no unused imports;
- no debug logging left behind.

---

# 39. Testing Strategy — Final Stage

Verification is deliberately performed after the implementation pass.

Final verification must include:

1. `npm run typecheck`
2. `npm run lint`
3. `npm test -- --runInBand`
4. Android debug build
5. Android emulator launch
6. Home
7. Planning
8. Task Editor
9. Memory
10. Memory Editor
11. Inbox
12. Search
13. Assistant
14. Reminders
15. Backup/Restore
16. Diagnostics
17. More
18. Settings
19. Bengali mode
20. English mode
21. Light mode
22. Dark mode
23. Empty states
24. Loading states
25. Error states
26. Keyboard/input behavior
27. small-phone layout
28. large-phone/tablet layout where available
29. navigation safe area
30. splash/icon behavior

The final verification report must distinguish:

- verified pass;
- warning;
- known limitation;
- blocker.

No claim of “fully verified” may be made without actual evidence.

---

# 40. Implementation Order

The implementation agent must follow this order:

### Phase A — Baseline inventory

Review existing implementation and classify each planned item as:

- already complete → leave intact;
- partially complete → extend safely;
- missing → implement;
- defective → fix.

### Phase B — Design foundation

- theme tokens;
- typography;
- spacing;
- radii;
- elevation;
- icon system;
- reusable buttons/cards/rows;
- localization helpers.

### Phase C — Navigation shell

- safe area;
- bottom navigation;
- adaptive navigation;
- headers;
- global theme application.

### Phase D — Core screens

- Home;
- Planning;
- Inbox;
- Memory;
- Search;
- More.

### Phase E — Detail screens

- Task Editor;
- Memory Editor;
- Assistant;
- Reminders;
- Backup;
- Diagnostics;
- Settings.

### Phase F — Platform polish

- launcher icon;
- adaptive icon;
- monochrome icon;
- splash;
- status/navigation bars;
- Android-specific behavior.

### Phase G — Backend safety review

- database;
- migrations;
- stores;
- services;
- scheduler;
- notifications;
- backup/restore;
- diagnostics;
- NLP.

### Phase H — Documentation

Update README and relevant technical documentation to reflect the actual implementation.

### Phase I — Final verification

Only after all implementation work is complete, execute the complete verification matrix.

---

# 41. Git Discipline

All implementation changes must be committed to GitHub `main` after the complete implementation pass.

Before pushing:

- inspect changed files;
- ensure no accidental generated files are committed;
- ensure no secrets are committed;
- ensure no user database is committed;
- ensure migration files are intentional;
- ensure README/AIOS matches actual implementation.

Commit messages should be descriptive.

Do not rewrite unrelated history.

---

# 42. Non-Negotiable Rules

1. Do not remove working functionality for visual simplicity.
2. Do not guess about bugs; inspect evidence.
3. Do not modify backend behavior solely because a UI pattern looks better.
4. Do not overwrite migrations.
5. Do not introduce arbitrary colors.
6. Do not mix localization strings inconsistently.
7. Do not leave one screen behind in the old design system.
8. Do not use fixed device-specific dimensions where responsive layout is required.
9. Do not claim verification without running verification.
10. Do not add unnecessary network dependencies.
11. Do not add tracking/analytics without an explicit product requirement.
12. Do not expose internal technical errors to normal users.
13. Do not break existing tests or data formats.
14. Do not replace existing completed work unnecessarily.
15. Do not stop the implementation merely because one phase is complete; continue through all phases before final verification.

---

# 43. Definition of Done

The AIOS implementation is complete only when:

- every major screen follows one coherent design system;
- Bengali and English are both usable;
- light and dark themes are complete;
- navigation is polished and safe-area correct;
- the UI adapts to available screen size;
- icons, buttons, cards, forms and lists are consistent;
- loading/empty/error/disabled states are designed;
- splash and app branding are production quality;
- backend/database behavior remains intact;
- migrations are safe;
- existing features remain functional;
- documentation matches reality;
- code-level implementation is complete;
- all changes are committed to `main`;
- only then is final verification performed.

---

## Research Basis

This specification incorporates current Android adaptive-app guidance: Material-style components and consistent UX, responsive layouts across phones/tablets/foldables, adequate touch targets, readable text, vector graphics, and light/dark theme support. citeturn0search1turn0search3turn0search6

Android adaptive icons should provide foreground/background layers and a monochrome layer for themed icons, with a protected inner safe area. citeturn0search0turn0search5

Android splash-screen guidance favors the system SplashScreen API, correct icon sizing/masking, light/dark resources, and avoiding unnecessary startup delay or redundant loading UI. citeturn0search2turn0search4turn0search7

The Bangladesh-inspired palette is intentionally based on the country's established green/red visual identity while avoiding use of the national flag itself as decorative UI. Bangladesh's official flag specification describes a green field with a red circle. citeturn0search8turn0search24

---

**AIOS is the implementation contract. Existing completed functionality is baseline; future implementation must build on it safely.**
