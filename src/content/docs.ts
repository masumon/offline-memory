// In-app documents — read inside the app, never opened externally.
// Rendered by app/doc.tsx. Bilingual; `code` blocks stay verbatim.

export type DocBlock =
  | { t: 'h1'; bn: string; en: string }
  | { t: 'h2'; bn: string; en: string }
  | { t: 'h3'; bn: string; en: string }
  | { t: 'p'; bn: string; en: string; muted?: boolean }
  | { t: 'li'; bn: string; en: string }
  | { t: 'code'; text: string }
  | { t: 'rule' };

export type DocId = 'ai-guide' | 'legal';

const YEAR = new Date().getFullYear();
const EFFECTIVE = new Date().toISOString().slice(0, 10);

const AI_GUIDE: DocBlock[] = [
  { t: 'p', bn: 'অফলাইন মেমোরি আপনার লেখা বা বলা কথা বোঝে একটি অন্তর্নির্মিত, নিয়মভিত্তিক ইঞ্জিন দিয়ে — যেটি সম্পূর্ণ এই ডিভাইসেই চলে। কোনো মডেল ডাউনলোড লাগে না, ইন্টারনেট লাগে না, আর এটিই সবসময়ের ফলব্যাক।', en: 'Offline Memory understands what you type or say with a built-in, rule-based engine that runs entirely on your device. No model download, no internet, and it is always the fallback.' },
  { t: 'p', bn: 'আরও চাইলে একটি ঐচ্ছিক অন-ডিভাইস LLM যোগ করতে পারেন। সেটিও পুরোপুরি ডিভাইসে চলে (ইন্টারনেট ছাড়াই), কিন্তু এটি আলাদা একটি অ্যাড-অন যা আপনি নিজে ইনস্টল করেন — তাই ডিফল্ট অ্যাপ হালকা থাকে এবং কোনো native রানটাইম না থাকলেও ভাঙে না।', en: 'If you want more, you can add an optional on-device LLM. It also runs fully on the device (still no internet), but it is a separate add-on you install yourself, so the default app stays small and never breaks.' },

  { t: 'h2', bn: 'যা যা লাগবে', en: 'What you need' },
  { t: 'li', bn: 'অ্যাপের সোর্স কোডের একটি কপি (এটি একবারের ডেভেলপার ধাপ)।', en: 'A checkout of the app source (a one-time developer step).' },
  { t: 'li', bn: 'অ্যাপ বিল্ড করার মতো একটি মেশিন: Android Studio / Xcode, Node.js এবং Expo টুলিং।', en: 'A machine set up to build the app: Android Studio / Xcode, Node.js, and the Expo tooling.' },
  { t: 'li', bn: 'একটি ছোট GGUF ভাষা-মডেল ফাইল (যেমন ১–৩B instruct মডেল) যা ডিভাইসের মেমরিতে আরামসে ধরে।', en: 'A small GGUF language model file (for example a 1–3B instruct model) that fits comfortably in device memory.' },

  { t: 'h2', bn: 'ধাপ ১ — একটি native LLM রানটাইম যোগ করুন', en: 'Step 1 — add a native LLM runtime' },
  { t: 'p', bn: 'আপনার ফর্কে একটি React Native LLM রানটাইম ইনস্টল করে native অ্যাপ আবার বিল্ড করুন:', en: 'In your fork, install a React Native LLM runtime and rebuild the native app:' },
  { t: 'code', text: 'npx expo install llama.rn\nnpx expo run:android   # or: npx expo run:ios' },
  { t: 'p', bn: 'এই ধাপ সাধারণ বিল্ডে কোনো প্রভাব ফেলে না — আপনি স্বেচ্ছায় যোগ করছেন।', en: 'Nothing about this step affects a normal build — you are opting in.' },

  { t: 'h2', bn: 'ধাপ ২ — ইঞ্জিন ইমপ্লিমেন্ট করুন', en: 'Step 2 — implement the engine' },
  { t: 'p', bn: '`src/ai/engine/on-device-llm-engine.ts` তৈরি করুন যা রানটাইম import করে, AiEngine কনট্র্যাক্ট ইমপ্লিমেন্ট করে, তারপর নিজেকে register করে:', en: 'Create src/ai/engine/on-device-llm-engine.ts that imports the runtime, implements the AiEngine contract, then registers itself:' },
  { t: 'code', text: [
    "import { initLlama } from 'llama.rn';",
    "import { registerAiEngine, type AiEngine } from './index';",
    '',
    'const engine: AiEngine = {',
    '  descriptor: {',
    "    id: 'on-device-llm',",
    "    label: { bn: '<Bengali label>', en: 'Advanced (on-device LLM)' },",
    "    description: {",
    "      bn: '<Bengali description>',",
    "      en: 'Runs a small model on the device — still offline.',",
    '    },',
    '    builtIn: false,',
    '  },',
    '  async isReady() { return modelFileExists(); },',
    '  async generate(prompt, opts) { /* run llama.rn here */ },',
    '};',
    '',
    'registerAiEngine(engine);',
  ].join('\n') },

  { t: 'h2', bn: 'ধাপ ৩ — register ও নির্বাচন', en: 'Step 3 — register and select it' },
  { t: 'li', bn: 'startup-এ একবার মডিউলটি import করুন (যেমন `app/_layout.tsx` থেকে) যাতে লঞ্চে register হয়।', en: 'Import that module once at startup (for example from app/_layout.tsx) so it registers on launch.' },
  { t: 'li', bn: 'মডেল ফাইলটি অ্যাপে দিন বা ডাউনলোড করান, আর `isReady()` সেটির দিকে নির্দেশ করান।', en: 'Ship or download the model file and point isReady() at it.' },
  { t: 'li', bn: 'Settings → AI ইঞ্জিন থেকে ইঞ্জিনটি বেছে নিন। পছন্দটি `aiEngineId` হিসেবে সংরক্ষিত হয়।', en: 'Choose the engine in Settings → AI engine. The choice is stored as the aiEngineId preference.' },

  { t: 'h2', bn: 'ফলব্যাক কীভাবে কাজ করে', en: 'How the fallback works' },
  { t: 'p', bn: '`resolveActiveEngine()` আগে আপনার বেছে নেওয়া ইঞ্জিন দেখে। সেটি না থাকলে, register না হলে, বা `isReady()` false দিলে — চুপচাপ অন্তর্নির্মিত নিয়ম-ইঞ্জিনে ফিরে যায়। free-form ফিচারে সবসময় non-LLM পথ রাখতে হবে, যাতে মডেল থাকুক বা না থাকুক অ্যাপ চলে।', en: 'resolveActiveEngine() checks your chosen engine first. If it is missing, not registered, or isReady() returns false, it silently returns the built-in rule engine. Free-form features must always keep a non-LLM path.' },

  { t: 'h2', bn: 'গোপনীয়তা', en: 'Privacy' },
  { t: 'p', bn: 'দুটো ইঞ্জিনই ডিভাইসে চলে। কোনো প্রম্পট, কোনো টেক্সট, বা মডেলের কোনো আউটপুট কখনো সার্ভারে যায় না। LLM যোগ করলেও এটি বদলায় না।', en: 'Both engines run on the device. No prompt, no text, and no model output is ever sent to a server. Adding the LLM does not change that.' },

  { t: 'rule' },
  { t: 'p', muted: true, bn: 'রেফারেন্স: অ্যাপ সোর্সে src/ai/engine/README.md এবং src/ai/engine/types.ts।', en: 'Reference: src/ai/engine/README.md and src/ai/engine/types.ts in the app source.' },
];

const LEGAL: DocBlock[] = [
  { t: 'p', muted: true, bn: `কার্যকর তারিখ: ${EFFECTIVE}`, en: `Effective date: ${EFFECTIVE}` },
  { t: 'p', bn: 'অফলাইন মেমোরি একটি ব্যক্তিগত কাজ ও মেমোরি অ্যাপ যা সম্পূর্ণ আপনার ডিভাইসে চলে। এই নথিতে সহজ ভাষায় বলা হয়েছে অ্যাপটি আপনার তথ্য নিয়ে কী করে এবং কোন শর্তে আপনি এটি ব্যবহার করেন। একমত না হলে অ্যাপটি ব্যবহার বন্ধ করে ডিভাইস থেকে সরিয়ে ফেলুন।', en: 'Offline Memory is a personal task and memory app that runs entirely on your device. This document explains, in plain language, what the app does with your information and the terms under which you use it. If you do not agree, please stop using the app and remove it from your device.' },

  { t: 'h1', bn: 'পর্ব ১ — গোপনীয়তা নীতি', en: 'Part 1 — Privacy Policy' },

  { t: 'h2', bn: '১. সংক্ষেপে', en: '1. The short version' },
  { t: 'li', bn: 'আপনার তৈরি সবকিছু — কাজ, মেমোরি, নোট, ট্যাগ, পরিকল্পনা, রিমাইন্ডার আর সংযুক্ত ফাইল — শুধু আপনার ডিভাইসে থাকে।', en: 'Everything you create — tasks, memories, notes, tags, planning, reminders and attached files — is stored only on your device.' },
  { t: 'li', bn: 'অ্যাপের কোনো অ্যাকাউন্ট নেই, সাইন-ইন নেই, নিজস্ব কোনো সার্ভার নেই। আপনার কনটেন্ট কখনো আমাদের কাছে আপলোড হয় না।', en: 'The app has no account, no sign-in, and no server of its own. Your content is never uploaded to us.' },
  { t: 'li', bn: 'কোনো বিজ্ঞাপন নেই, তৃতীয় পক্ষের কোনো অ্যানালিটিক্স নেই, কোনো ধরনের ট্র্যাকিং বা প্রোফাইলিং নেই।', en: 'There is no advertising, no third-party analytics, and no tracking or profiling of any kind.' },
  { t: 'li', bn: 'ডেটা ডিভাইস ছাড়ে কেবল তখনই, যখন আপনি নিজে একটি ব্যাকআপ ফাইল export বা শেয়ার করেন — এবং শুধু আপনার বেছে নেওয়া গন্তব্যে।', en: 'Data leaves your device only when you deliberately export or share a backup file, and only to the destination you choose.' },

  { t: 'h2', bn: '২. অ্যাপ ডিভাইসে যা রাখে', en: '2. Information the app stores on your device' },
  { t: 'li', bn: 'আপনার লেখা কনটেন্ট: কাজের শিরোনাম ও নোট, মেমোরির টেক্সট, ট্যাগ, গুরুত্ব, তারিখ, সময় ও অগ্রাধিকার।', en: 'Content you enter: task titles and notes, memory text, tags, importance, dates, times and priorities.' },
  { t: 'li', bn: 'সংযুক্ত ফাইল: কাজ বা মেমোরিতে যোগ করা ছবি, ভিডিও, PDF ও অন্যান্য নথি — অ্যাপের প্রাইভেট স্টোরেজে কপি করা।', en: 'Files you attach: images, videos, PDFs and other documents, copied into the app’s private storage.' },
  { t: 'li', bn: 'অ্যাপ সেটিংস: ভাষা, লাইট/ডার্ক থিম, reduce-motion, শান্ত সময়, আর ঐচ্ছিক অ্যাপ-লক PIN (শুধু salted hash হিসেবে, কখনো সরাসরি নয়)।', en: 'App settings: language, light/dark theme, reduce-motion, quiet hours, and an optional app-lock PIN (stored only as a salted hash).' },
  { t: 'li', bn: 'অন-ডিভাইস শেখার কাউন্টার যা ক্যাপচারকে সময়ের সাথে স্মার্ট করে (যেমন "জিম" সাধারণত সকালের কাজ)। এগুলো সাধারণ লোকাল সংখ্যা, কোনো প্রোফাইল নয়, কখনো ডিভাইস ছাড়ে না।', en: 'On-device learning counters that make capture smarter over time. These are plain local counts, not a profile, and never leave the device.' },

  { t: 'h2', bn: '৩. অ্যাপ যা সংগ্রহ করে না', en: '3. Information the app does NOT collect' },
  { t: 'li', bn: 'কোনো নাম, ইমেল, ফোন নম্বর বা কন্টাক্ট নয়।', en: 'No name, email, phone number or contacts.' },
  { t: 'li', bn: 'কোনো লোকেশন নয়।', en: 'No location.' },
  { t: 'li', bn: 'কোনো বিজ্ঞাপন আইডেন্টিফায়ার নয়, ব্যবহার-অ্যানালিটিক্স নয়, ক্র্যাশ টেলিমেট্রি আমাদের কাছে যায় না।', en: 'No advertising identifier, no usage analytics, no crash telemetry sent to us.' },
  { t: 'li', bn: 'মাইক্রোফোনের কোনো অডিও সংরক্ষণ বা প্রেরণ করা হয় না (দেখুন অংশ ৫)।', en: 'No microphone audio is stored or transmitted (see section 5).' },

  { t: 'h2', bn: '৪. পারমিশন এবং কেন লাগে', en: '4. Permissions and why they are used' },
  { t: 'li', bn: 'নোটিফিকেশন — এই ডিভাইসে আপনার কাজের রিমাইন্ডার দেখাতে।', en: 'Notifications — to show your task reminders on this device.' },
  { t: 'li', bn: 'Exact alarm — অ্যাপ বন্ধ থাকলেও ঠিক যে মিনিটে সেট করেছেন সেই মিনিটে রিমাইন্ডার বাজাতে।', en: 'Exact alarms — so a reminder fires at the exact minute you set, even when the app is closed.' },
  { t: 'li', bn: 'মাইক্রোফোন — শুধু যতক্ষণ আপনি মাইক বাটন ধরে রাখেন, যাতে টাইপ না করে কথা বলে কাজ বা মেমোরি বলতে পারেন। কথা ডিভাইসেই টেক্সট হয়।', en: 'Microphone — only while you hold the mic button, so you can speak instead of typing. Speech is turned into text on the device.' },
  { t: 'li', bn: 'ফাইল / স্টোরেজ — শুধু যখন সংযুক্ত করার জন্য ফাইল বাছেন, বা ব্যাকআপ কোথায় রাখবেন/আনবেন তা বাছেন।', en: 'Files / storage — only when you pick a file to attach, or choose where to save or load a backup.' },
  { t: 'li', bn: 'বুট-এ চালু — ফোন রিস্টার্টের পর নির্ধারিত রিমাইন্ডার আবার সেট করতে।', en: 'Run at startup — to re-arm your scheduled reminders after the phone restarts.' },
  { t: 'li', bn: 'বায়োমেট্রিক / ডিভাইস ক্রেডেনশিয়াল — শুধু অ্যাপ লক চালু করলে, আনলক করার জন্য।', en: 'Biometric / device credential — only if you turn on the app lock, to unlock the app.' },
  { t: 'p', bn: 'যেকোনো পারমিশন সিস্টেম সেটিংসে গিয়ে বাতিল করতে পারেন। তখন কিছু ফিচার (রিমাইন্ডার, ভয়েস, সংযুক্তি) আবার অনুমতি না দেওয়া পর্যন্ত কাজ করবে না।', en: 'You can revoke any permission in system settings. Some features will stop working until it is granted again.' },

  { t: 'h2', bn: '৫. ভয়েস ইনপুট', en: '5. Voice input' },
  { t: 'p', bn: 'মাইক বাটন ব্যবহার করলে অ্যাপ আপনার অপারেটিং সিস্টেমের speech recognizer-কে কথা টেক্সটে রূপান্তর করতে বলে। আধুনিক Android ও iOS ডিভাইসে এটি নেটওয়ার্ক ছাড়াই ডিভাইসে চলতে পারে, এবং প্ল্যাটফর্ম সমর্থন করলে অ্যাপ অন-ডিভাইস রিকগনিশনই চায়। recognizer আপনার ডিভাইস প্রস্তুতকারকের, তাদের শর্তে চলে; অ্যাপ নিজে কোনো অডিও রেকর্ড, রাখে বা পাঠায় না।', en: 'When you use the mic button, the app asks your operating system’s speech recognizer to convert speech to text. On modern devices this can run on-device without a network, and the app requests on-device recognition where supported. The recognizer belongs to your device vendor; the app itself records, keeps and sends no audio.' },

  { t: 'h2', bn: '৬. ব্যাকআপ ও শেয়ারিং', en: '6. Backups and sharing' },
  { t: 'p', bn: 'আপনি একটি ব্যাকআপ ফাইল (চাইলে পাসফ্রেজ দিয়ে সুরক্ষিত) তৈরি করতে পারেন। ব্যাকআপ বা শেয়ার করা ফাইল একবার অন্য অ্যাপ, সেবা বা ব্যক্তির কাছে পাঠালে সেটি অ্যাপের নিয়ন্ত্রণের বাইরে চলে যায় এবং আপনি যেখানে পাঠিয়েছেন তার গোপনীয়তা নিয়মের অধীন হয়।', en: 'You can create a backup file (optionally passphrase-protected). Once you send a backup or shared file elsewhere, it is outside the app’s control and subject to the privacy practices of wherever you sent it.' },

  { t: 'h2', bn: '৭. তৃতীয় পক্ষের উপাদান', en: '7. Third-party components' },
  { t: 'p', bn: 'অ্যাপটি ওপেন-সোর্স লাইব্রেরি (React Native, Expo, SQLite সহ) দিয়ে তৈরি যা অ্যাপের অংশ হিসেবে লোকালি চলে। এতে কোনো তৃতীয় পক্ষের বিজ্ঞাপন বা অ্যানালিটিক্স SDK নেই।', en: 'The app is built with open-source libraries (including React Native, Expo and SQLite) that run locally. It embeds no third-party advertising or analytics SDKs.' },

  { t: 'h2', bn: '৮. ডেটা রাখা ও মুছে ফেলা', en: '8. Data retention and deletion' },
  { t: 'p', bn: 'আপনার ডেটা ডিভাইসে থাকে যতক্ষণ না আপনি মুছে ফেলেন। অ্যাপে আলাদা আইটেম মুছতে পারেন, আর অ্যাপের স্টোরেজ ক্লিয়ার বা অ্যাপ আনইনস্টল করে সব সরাতে পারেন। আমাদের সার্ভারে কিছু না থাকায় আপনার হয়ে মোছার মতো কিছু নেই।', en: 'Your data stays until you delete it. You can delete individual items, or remove everything by clearing app storage or uninstalling. Because nothing is on our servers, there is nothing for us to delete on your behalf.' },

  { t: 'h2', bn: '৯. শিশু', en: '9. Children' },
  { t: 'p', bn: 'অ্যাপটি একটি সাধারণ productivity টুল, ১৩ বছরের নিচের শিশুদের উদ্দেশ্যে নয়। এটি কারও কাছ থেকে কোনো ব্যক্তিগত তথ্য সংগ্রহ করে না।', en: 'The app is a general-purpose productivity tool, not directed at children under 13. It collects no personal information from anyone.' },

  { t: 'h2', bn: '১০. নীতির পরিবর্তন', en: '10. Changes to this policy' },
  { t: 'p', bn: 'এই নীতি বদলালে হালনাগাদ সংস্করণ নতুন কার্যকর তারিখসহ অ্যাপের ভেতরেই আসবে। আপডেটের পর ব্যবহার চালিয়ে গেলে বোঝায় আপনি সংশোধিত নীতি মেনে নিয়েছেন।', en: 'If this policy changes, the updated version ships inside the app with a new effective date. Continued use after an update means you accept it.' },

  { t: 'h2', bn: '১১. যোগাযোগ', en: '11. Contact' },
  { t: 'p', bn: 'গোপনীয়তা সংক্রান্ত প্রশ্ন: m.a.sumon92@gmail.com', en: 'Questions about privacy: m.a.sumon92@gmail.com' },

  { t: 'h1', bn: 'পর্ব ২ — ব্যবহারের শর্তাবলি', en: 'Part 2 — Terms of Use' },

  { t: 'h2', bn: '১. ব্যবহারের লাইসেন্স', en: '1. Licence to use the app' },
  { t: 'p', bn: 'SUMON আপনাকে একটি ব্যক্তিগত, non-exclusive, হস্তান্তর-অযোগ্য, প্রত্যাহারযোগ্য লাইসেন্স দেয় — আপনার মালিকানাধীন বা নিয়ন্ত্রিত ডিভাইসে অফলাইন মেমোরি ইনস্টল ও ব্যবহারের জন্য, আপনার ব্যক্তিগত বা অভ্যন্তরীণ ব্যবসায়িক কাজে, এই শর্তাবলি এবং যে স্টোর থেকে ইনস্টল করেছেন তার নিয়ম মেনে।', en: 'SUMON grants you a personal, non-exclusive, non-transferable, revocable licence to install and use Offline Memory on devices you own or control, for your own personal or internal business use, subject to these terms and the rules of the store you installed it from.' },

  { t: 'h2', bn: '২. যা করা যাবে না', en: '2. What you may not do' },
  { t: 'li', bn: 'অ্যাপ বা এর উপাদান নিজের পণ্য হিসেবে কপি, বিক্রি, ভাড়া, সাব-লাইসেন্স বা পুনর্বিতরণ করা।', en: 'Copy, sell, rent, sub-licence or redistribute the app or its assets as your own product.' },
  { t: 'li', bn: 'আইন স্পষ্টভাবে যতটুকু অনুমতি দেয় তার বাইরে reverse engineer, decompile বা disassemble করা।', en: 'Reverse engineer, decompile or disassemble the app except to the limited extent the law expressly allows.' },
  { t: 'li', bn: 'কোনো কপিরাইট, ট্রেডমার্ক বা কৃতিত্ব নোটিশ সরানো বা বদলানো।', en: 'Remove or alter any copyright, trademark or attribution notices.' },
  { t: 'li', bn: 'অ্যাপ ব্যবহার করে আইন ভাঙা বা অন্যের অধিকার লঙ্ঘন করা।', en: 'Use the app to break the law or to infringe someone else’s rights.' },

  { t: 'h2', bn: '৩. আপনার কনটেন্ট আপনারই', en: '3. Your content is yours' },
  { t: 'p', bn: 'অ্যাপে তৈরি আপনার কাজ, মেমোরি, নোট ও ফাইলের সব অধিকার আপনার। যেহেতু সেই কনটেন্ট কখনো আমাদের কাছে পৌঁছায় না, আমরা তার উপর কোনো লাইসেন্স বা মালিকানা দাবি করি না। নিজের ব্যাকআপ রাখার দায়িত্ব আপনার; ব্যাকআপ না নিলে ডিভাইস হারানো মানে সেই ডেটা হারানো।', en: 'You keep all rights to the tasks, memories, notes and files you create. Because that content never reaches us, we claim no licence or ownership over it. You are responsible for your own backups; without one, losing a device means losing the data on it.' },

  { t: 'h2', bn: '৪. উপলব্ধতা ও আপডেট', en: '4. Availability and updates' },
  { t: 'p', bn: 'অ্যাপটি চলমানভাবে দেওয়া হয়, তবে বদলাতে পারে এবং ভবিষ্যতের সংস্করণে নির্দিষ্ট ফিচার যোগ, পরিবর্তন বা বাদ দেওয়া হতে পারে। ঐচ্ছিক native অ্যাড-অন (যেমন অন-ডিভাইস LLM) মানসম্মত অ্যাপের অংশ নয় এবং নিজ দায়িত্বে ব্যবহার্য।', en: 'The app is provided on an ongoing basis but may change; features may be added, altered or removed in future versions. Optional native add-ons are not part of the standard app and are used at your own risk.' },

  { t: 'h2', bn: '৫. দাবি অস্বীকার', en: '5. Disclaimer' },
  { t: 'p', bn: 'অ্যাপটি "যেমন আছে" এবং "যেমন পাওয়া যায়" ভিত্তিতে দেওয়া, কোনো প্রকার ওয়ারেন্টি ছাড়াই — সুস্পষ্ট বা অন্তর্নিহিত, নির্দিষ্ট উদ্দেশ্যে উপযোগিতা ও লঙ্ঘন-না-হওয়া সহ। গুরুত্বপূর্ণ কিছু যাচাইয়ের দায়িত্ব আপনার — অ্যাপটি মনে রাখা ও পরিকল্পনার সহায়ক, রিমাইন্ডার বাজবেই বা হার্ডওয়্যার নষ্ট হলেও ডেটা টিকবে — এমন নিশ্চয়তা নয়।', en: 'The app is provided “as is” and “as available”, without warranties of any kind, express or implied, including fitness for a particular purpose and non-infringement. You are responsible for verifying anything important — the app is an aid to memory and planning, not a guarantee.' },

  { t: 'h2', bn: '৬. দায়সীমা', en: '6. Limitation of liability' },
  { t: 'p', bn: 'আইন যতটুকু অনুমতি দেয়, SUMON এবং ABO ENTERPRISE কোনো পরোক্ষ, আনুষঙ্গিক, বিশেষ বা পরিণামমূলক ক্ষতি, বা ডেটা হারানোর জন্য দায়ী নয়, যা অ্যাপ ব্যবহার বা ব্যবহার করতে না পারা থেকে উদ্ভূত। আইন অনুযায়ী যে দায় সীমিত করা যায় না, তা এই শর্তে সীমিত হবে না।', en: 'To the maximum extent permitted by law, SUMON and ABO ENTERPRISE are not liable for any indirect, incidental, special or consequential loss, or for loss of data, arising from your use of or inability to use the app. Nothing here limits liability that cannot be limited by law.' },

  { t: 'h2', bn: '৭. প্রযোজ্য আইন', en: '7. Governing law' },
  { t: 'p', bn: 'এই শর্তাবলি গণপ্রজাতন্ত্রী বাংলাদেশের আইন দ্বারা পরিচালিত, conflict-of-laws নিয়ম বাদে। আপনার বসবাসের দেশে বাধ্যতামূলক ভোক্তা-সুরক্ষা তবুও প্রযোজ্য।', en: 'These terms are governed by the laws of the People’s Republic of Bangladesh, without regard to its conflict-of-laws rules. Mandatory consumer protections in your country of residence still apply.' },

  { t: 'h1', bn: 'পর্ব ৩ — কপিরাইট ও ট্রেডমার্ক', en: 'Part 3 — Copyright & Trademarks' },
  { t: 'p', bn: `© ${YEAR} SUMON. সর্বস্বত্ব সংরক্ষিত।`, en: `© ${YEAR} SUMON. All rights reserved.` },
  { t: 'p', bn: 'অফলাইন মেমোরি, এর নাম, লোগো, ডিজাইন, স্ক্রিন, লেখা ও শিল্পকর্ম SUMON-এর সম্পত্তি এবং কপিরাইট ও অন্যান্য মেধাস্বত্ব আইনে সুরক্ষিত। "অফলাইন মেমোরি" এবং spark চিহ্ন SUMON-এর ট্রেডমার্ক। ABO ENTERPRISE সহযোগী অংশীদার হিসেবে কৃতিত্বপ্রাপ্ত।', en: 'Offline Memory, its name, logo, design, screens, text and artwork are the property of SUMON and are protected by copyright and other intellectual-property laws. “Offline Memory” and the spark mark are trademarks of SUMON. ABO ENTERPRISE is credited as a supporting partner.' },
  { t: 'p', bn: 'তৃতীয় পক্ষের ওপেন-সোর্স উপাদান তাদের নিজ নিজ লেখকের সম্পত্তি এবং তাদের নিজস্ব লাইসেন্সে ব্যবহৃত। অনুরোধে সেই লাইসেন্সের তালিকা দেওয়া হবে।', en: 'Third-party open-source components remain the property of their respective authors and are used under their own licences. A list is available on request.' },
  { t: 'p', bn: 'লিখিত অনুমতি ছাড়া অফলাইন মেমোরির নাম বা লোগো এমনভাবে ব্যবহার করা যাবে না যা সমর্থন বোঝায় বা বিভ্রান্তির সম্ভাবনা তৈরি করে।', en: 'You may not use the Offline Memory name or logo to imply endorsement, or in a way likely to cause confusion, without written permission.' },

  { t: 'rule' },
  { t: 'p', muted: true, bn: `অফলাইন মেমোরি — ১০০% অফলাইন। কিছুই সার্ভারে যায় না। যোগাযোগ: m.a.sumon92@gmail.com`, en: 'Offline Memory — 100% offline. Nothing is sent to a server. Contact: m.a.sumon92@gmail.com' },
];

export const DOCS: Record<DocId, { title: { bn: string; en: string }; subtitle: { bn: string; en: string }; blocks: DocBlock[] }> = {
  'ai-guide': {
    title: { bn: 'উন্নত অন-ডিভাইস AI', en: 'Advanced on-device AI' },
    subtitle: { bn: 'ঐচ্ছিক LLM ইঞ্জিন যোগ করার নিয়ম', en: 'How to add the optional LLM engine' },
    blocks: AI_GUIDE,
  },
  legal: {
    title: { bn: 'গোপনীয়তা নীতি ও শর্তাবলি', en: 'Privacy Policy & Terms' },
    subtitle: { bn: 'গোপনীয়তা · শর্ত · কপিরাইট', en: 'Privacy · Terms · Copyright' },
    blocks: LEGAL,
  },
};
