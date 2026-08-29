type Language = 'en' | 'bn';

export function settingsCopy(language: Language) {
  const bn = language === 'bn';
  return bn
    ? {
        back: 'আরও', eyebrow: 'সেটিংস', title: 'সেটিংস', subtitle: 'অফলাইন ডেটা, ভাষা, থিম ও রিমাইন্ডার নিয়ন্ত্রণ করুন।',
        localTitle: 'লোকাল-ফার্স্ট', localText: 'আপনার মূল টাস্ক ও মেমোরি এই ডিভাইসেই থাকে। মূল ব্যবহারের জন্য কোনো অ্যাকাউন্ট বা ক্লাউড প্রয়োজন নেই।',
        appearance: 'অ্যাপের চেহারা', darkMode: 'ডার্ক / নাইট মোড', darkDescription: 'কম আলোতে আরামদায়ক ডার্ক ইন্টারফেস ব্যবহার করুন।', language: 'ভাষা', bengali: 'বাংলা', english: 'English', section: 'সিস্টেম', onDevice: 'এই ডিভাইসে সংরক্ষিত', useDevice: 'ডিভাইসের ভাষা', reduceMotion: 'কম অ্যানিমেশন', appLock: 'অ্যাপ লক (পিন)', appLockDescription: 'ব্যাকগ্রাউন্ড থেকে ফিরলে ফিঙ্গারপ্রিন্ট / ফেস (বা পিন) চাওয়া হবে।', appLockPinPlaceholder: 'নতুন পিন (৪-৮ অঙ্ক)', appLockSave: 'পিন সেট করুন', appLockOff: 'বন্ধ করুন', appLockNote: 'বায়োমেট্রিক না থাকলে পিনই ব্যবহৃত হবে।', reduceMotionDescription: 'স্ক্রিন পরিবর্তনের অ্যানিমেশন কমান।', quietHours: 'নীরব সময় (রাত ১০টা – সকাল ৭টা)', quietHoursDescription: 'এই সময়ের রিমাইন্ডার পরে সরানো হয়।',
        notifications: 'নোটিফিকেশন', notificationsDescription: 'লোকাল রিমাইন্ডার ও নোটিফিকেশন নিয়ন্ত্রণ করুন।', backup: 'ডেটা ও ব্যাকআপ', backupDescription: 'আপনার লোকাল ডেটা ব্যাকআপ, এক্সপোর্ট বা রিস্টোর করুন।', diagnostics: 'ডায়াগনস্টিকস', diagnosticsDescription: 'লোকাল ডেটাবেস ও নোটিফিকেশন স্বাস্থ্য পরীক্ষা করুন।',
      }
    : {
        back: 'More', eyebrow: 'SETTINGS', title: 'Settings', subtitle: 'Control offline data, language, appearance and reminders.',
        localTitle: 'Local-first', localText: 'Your core tasks and memories stay on this device. No account or cloud connection is required for core use.',
        appearance: 'Appearance', darkMode: 'Dark / Night mode', darkDescription: 'Use a comfortable dark interface for low-light environments.', language: 'Language', bengali: 'বাংলা', english: 'English', section: 'SYSTEM', onDevice: 'Stored on this device',
        useDevice: 'Use device language', reduceMotion: 'Reduce motion', appLock: 'App lock (PIN)', appLockDescription: 'Require fingerprint / face (or a PIN) when the app returns from the background.', appLockPinPlaceholder: 'New PIN (4-8 digits)', appLockSave: 'Set PIN', appLockOff: 'Turn off', appLockNote: 'The PIN is the fallback if biometrics are unavailable.', reduceMotionDescription: 'Minimise screen-transition animation.', quietHours: 'Quiet hours (10 PM – 7 AM)', quietHoursDescription: 'Reminders in this window are pushed to the end of it.',
        notifications: 'Notifications', notificationsDescription: 'Manage local reminder permission and scheduled task reminders.', backup: 'Data & Backup', backupDescription: 'Create, export or restore your local Offline Memory data.', diagnostics: 'Diagnostics', diagnosticsDescription: 'Inspect local database and notification health.',
      };
}

export const settingsItems = [
  { href: '/reminders' as const, icon: 'bell-outline' as const, key: 'notifications' as const, descriptionKey: 'notificationsDescription' as const },
  { href: '/backup' as const, icon: 'database-export-outline' as const, key: 'backup' as const, descriptionKey: 'backupDescription' as const },
  { href: '/diagnostics' as const, icon: 'heart-pulse' as const, key: 'diagnostics' as const, descriptionKey: 'diagnosticsDescription' as const },
] as const;
