import type { AppLanguage } from '../i18n/date-time';

// A short, human "what changed" list — the newest release first. `version` should match
// the value in app.json so the What's-new screen knows whether the reader has seen it.
// Keep each line outcome-focused ("you can now…"), not a commit message.

export type ChangelogEntry = {
  version: string;
  date: string; // ISO date, display-only
  headline: { bn: string; en: string };
  items: { bn: string; en: string }[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.1.0',
    date: '2026-09-02',
    headline: { bn: 'গোছানো, দ্রুত ও আরও কাজের', en: 'Tidier, faster, more capable' },
    items: [
      {
        bn: 'ট্র্যাশ ও আনডু — মুছে ফেলা টাস্ক বা মেমোরি ৩০ দিন পর্যন্ত ফিরিয়ে আনা যায়।',
        en: 'Trash & Undo — deleted tasks and memories can be restored for up to 30 days.',
      },
      {
        bn: 'একটা কপি এক্সপোর্ট করুন — Markdown, JSON বা CSV ফাইল হিসেবে।',
        en: 'Export a copy — as a Markdown, JSON or CSV file.',
      },
      {
        bn: 'সাপ্তাহিক রিভিউ — এই সপ্তাহে কী শেষ হলো, কী বাকি, এক নজরে।',
        en: 'Weekly review — what you finished and what carried over, at a glance.',
      },
      {
        bn: 'ট্যাগ ব্রাউজার — মেমোরির সব ট্যাগ ও প্রতিটিতে কতগুলো, একসাথে।',
        en: 'Tag browser — every memory tag and how much each one holds.',
      },
      {
        bn: 'ফোকাস মোড — একটা কাজ বেছে টাইমার চালিয়ে মন দিন।',
        en: 'Focus mode — pick one task and run a timer on it.',
      },
      {
        bn: 'পুনরাবৃত্ত টাস্কে “এইবারেরটা বাদ দিন” — পরের বারে চলে যায়, সম্পন্ন না করেই।',
        en: 'Recurring tasks get “Skip this one” — jump to the next occurrence without completing.',
      },
      {
        bn: 'সেটিংসে বেশি নিয়ন্ত্রণ — ১২/২৪ ঘণ্টা, সপ্তাহ শুরুর দিন, রিমাইন্ডার কত আগে, নীরব সময়।',
        en: 'Deeper settings — 12/24-hour clock, week start day, reminder lead time, quiet hours.',
      },
      {
        bn: 'বড় লেখা, ত্রুটি থেকে সেরে ওঠা, আর নানা জায়গায় ছোট ছোট মসৃণতা।',
        en: 'Larger-text support, graceful error recovery, and polish throughout.',
      },
    ],
  },
];

export const LATEST_VERSION = CHANGELOG[0]?.version ?? '0.0.0';

export function changelogHeadline(entry: ChangelogEntry, language: AppLanguage): string {
  return entry.headline[language];
}
