// Build-time generator for the in-app "Privacy Policy & Terms" document.
// Opened from Settings and About. Dev-only; the PDF ships as a bundled asset.
// Run: node scripts/generate-legal-pdf.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDoc } from './lib/pdf.mjs';

const assets = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
mkdirSync(assets, { recursive: true });

const APP = 'Offline Memory';
const OWNER = 'SUMON';
const PARTNER = 'ABO ENTERPRISE';
const CONTACT = 'm.a.sumon92@gmail.com';
const EFFECTIVE = new Date().toISOString().slice(0, 10);
const YEAR = new Date().getFullYear();

const BLOCKS = [
  { type: 'h1', text: `${APP} - Privacy Policy & Terms` },
  { type: 'p', muted: true, text: `Effective date: ${EFFECTIVE}` },
  { type: 'p', text: `${APP} ("the app") is a personal task and memory app that runs entirely on your device. This document explains, in plain language, what the app does with your information and the terms under which you use it. If you do not agree with it, please stop using the app and remove it from your device.` },

  { type: 'h1', text: 'Part 1 - Privacy Policy' },

  { type: 'h2', text: '1. The short version' },
  { type: 'li', text: 'Everything you create - tasks, memories, notes, tags, planning, reminders and attached files - is stored only on your device.' },
  { type: 'li', text: 'The app has no account, no sign-in, and no server that belongs to it. Your content is never uploaded to us.' },
  { type: 'li', text: 'There is no advertising, no third-party analytics, and no tracking or profiling of any kind.' },
  { type: 'li', text: 'Data leaves your device only when you deliberately export or share a backup file, and only to the destination you choose.' },

  { type: 'h2', text: '2. Information the app stores on your device' },
  { type: 'p', text: 'The app keeps the following in a private local database and private app storage that only the app can read:' },
  { type: 'li', text: 'Content you enter: task titles and notes, memory text, tags, importance, dates, times and priorities.' },
  { type: 'li', text: 'Files you attach: images, videos, PDFs and other documents you add to a task or memory, copied into the app\'s private storage.' },
  { type: 'li', text: 'App settings: language, light/dark theme, reduce-motion, quiet hours, and an optional app-lock PIN (stored only as a salted hash, never in plain text).' },
  { type: 'li', text: 'On-device learning counters that make capture smarter over time (for example that "gym" is usually a morning task). These are plain local counts, not a profile, and never leave the device.' },
  { type: 'li', text: 'A record of which reminders have already fired, so you are not notified twice.' },

  { type: 'h2', text: '3. Information the app does NOT collect' },
  { type: 'li', text: 'No name, email, phone number or contacts.' },
  { type: 'li', text: 'No location.' },
  { type: 'li', text: 'No advertising identifier, no usage analytics, no crash telemetry sent to us.' },
  { type: 'li', text: 'No microphone audio is stored or transmitted (see section 5).' },

  { type: 'h2', text: '4. Permissions and why they are used' },
  { type: 'li', text: 'Notifications - to show your task reminders on this device.' },
  { type: 'li', text: 'Exact alarms / schedule alarm - so a reminder fires at the minute you set, even when the app is closed.' },
  { type: 'li', text: 'Microphone - only while you hold the mic button, so you can speak a task or memory instead of typing. Speech is turned into text on the device.' },
  { type: 'li', text: 'Files / storage - only when you pick a file to attach, or choose where to save or load a backup.' },
  { type: 'li', text: 'Run at startup (receive boot completed) - to re-arm your scheduled reminders after the phone restarts.' },
  { type: 'li', text: 'Biometric / device credential - only if you turn on the app lock, to unlock the app.' },
  { type: 'p', text: 'You can revoke any permission in your system settings. Some features (reminders, voice capture, attachments) will stop working until the permission is granted again.' },

  { type: 'h2', text: '5. Voice input' },
  { type: 'p', text: 'When you use the mic button, the app asks your operating system\'s speech recognizer to convert speech to text. On modern Android and iOS devices this can run on the device without a network connection, and the app requests on-device recognition where the platform supports it. The recognizer is provided by your device vendor and is governed by their terms; the app itself does not record, keep or send any audio.' },

  { type: 'h2', text: '6. Backups and sharing' },
  { type: 'p', text: 'You can create a backup file (optionally protected with a passphrase you choose) and a snapshot you can share. Once you send a backup or a shared file to another app, service or person, it is outside the app\'s control and is subject to the privacy practices of wherever you sent it. Keep passphrase-protected backups if you store them somewhere shared.' },

  { type: 'h2', text: '7. Third-party components' },
  { type: 'p', text: 'The app is built with open-source libraries (including React Native, Expo and SQLite) that run locally as part of the app. It does not embed third-party advertising or analytics SDKs. The optional advanced on-device AI engine, if you choose to add it yourself, also runs locally; see the separate "Advanced on-device AI" guide.' },

  { type: 'h2', text: '8. Data retention and deletion' },
  { type: 'p', text: 'Your data stays on your device until you delete it. You can delete individual items in the app, and you can remove everything by clearing the app\'s storage or uninstalling the app. Because nothing is stored on our servers, there is nothing for us to delete on your behalf.' },

  { type: 'h2', text: '9. Children' },
  { type: 'p', text: 'The app is a general-purpose productivity tool and is not directed at children under 13. It collects no personal information from anyone.' },

  { type: 'h2', text: '10. Changes to this policy' },
  { type: 'p', text: 'If this policy changes, the updated version will ship inside the app with a new effective date. Continued use after an update means you accept the revised policy.' },

  { type: 'h2', text: '11. Contact' },
  { type: 'p', text: `Questions about privacy: ${CONTACT}` },

  { type: 'h1', text: 'Part 2 - Terms of Use' },

  { type: 'h2', text: '1. Licence to use the app' },
  { type: 'p', text: `${OWNER} grants you a personal, non-exclusive, non-transferable, revocable licence to install and use ${APP} on devices you own or control, for your own personal or internal business use, subject to these terms and the rules of the store you installed it from.` },

  { type: 'h2', text: '2. What you may not do' },
  { type: 'li', text: 'Copy, sell, rent, sub-licence or redistribute the app or its assets as your own product.' },
  { type: 'li', text: 'Reverse engineer, decompile or disassemble the app except to the limited extent the law expressly allows.' },
  { type: 'li', text: 'Remove or alter any copyright, trademark or attribution notices.' },
  { type: 'li', text: 'Use the app to break the law or to infringe someone else\'s rights.' },

  { type: 'h2', text: '3. Your content is yours' },
  { type: 'p', text: 'You keep all rights to the tasks, memories, notes and files you create in the app. Because that content never reaches us, we claim no licence or ownership over it. You are responsible for keeping your own backups; loss of a device means loss of the data on it unless you have exported a backup.' },

  { type: 'h2', text: '4. Availability and updates' },
  { type: 'p', text: 'The app is provided on an ongoing basis but may change, and specific features may be added, altered or removed in future versions. Optional native add-ons (such as an on-device LLM) are not part of the standard app and are used at your own risk.' },

  { type: 'h2', text: '5. Disclaimer' },
  { type: 'p', text: 'The app is provided "as is" and "as available", without warranties of any kind, whether express or implied, including fitness for a particular purpose and non-infringement. You are responsible for verifying anything important - the app is an aid to memory and planning, not a guarantee that a reminder will fire or that data will survive a hardware failure.' },

  { type: 'h2', text: '6. Limitation of liability' },
  { type: 'p', text: `To the maximum extent permitted by law, ${OWNER} and ${PARTNER} are not liable for any indirect, incidental, special or consequential loss, or for loss of data, arising from your use of or inability to use the app. Nothing in these terms limits liability that cannot be limited by law.` },

  { type: 'h2', text: '7. Governing law' },
  { type: 'p', text: 'These terms are governed by the laws of the People\'s Republic of Bangladesh, without regard to its conflict-of-laws rules. Mandatory consumer protections in your country of residence still apply.' },

  { type: 'h1', text: 'Part 3 - Copyright & Trademarks' },
  { type: 'p', text: `© ${YEAR} ${OWNER}. All rights reserved.` },
  { type: 'p', text: `${APP}, its name, logo, design, screens, text and artwork are the property of ${OWNER} and are protected by copyright and other intellectual-property laws. "${APP}" and the ${APP} spark mark are trademarks of ${OWNER}. ${PARTNER} is credited as a supporting partner.` },
  { type: 'p', text: 'Third-party open-source components remain the property of their respective authors and are used under their own licences. A list of those licences is available on request.' },
  { type: 'p', text: `You may not use the ${APP} name or logo to imply endorsement, or in a way likely to cause confusion, without written permission.` },

  { type: 'rule' },
  { type: 'p', muted: true, text: `${APP} - 100% offline. Nothing is sent to a server. Contact: ${CONTACT}` },
];

writeFileSync(
  resolve(assets, 'privacy-and-terms.pdf'),
  await renderDoc(BLOCKS, {
    title: `${APP} - Privacy Policy & Terms`,
    footer: `© ${YEAR} ${OWNER} - ${APP}. All rights reserved.`,
  }),
);
console.log('  ✓ assets/privacy-and-terms.pdf');
