type Language = 'en' | 'bn';
export function backupCopy(language: Language) {
  const bn = language === 'bn';
  const restoredAttachments = (count: number) => bn ? `ব্যাকআপ রিস্টোর হয়েছে এবং ${count}টি সংযুক্ত ফাইল ফিরিয়ে আনা হয়েছে।` : `Backup restored with ${count} attachment${count === 1 ? '' : 's'}.`;
  const localDescription = bn ? 'ডেটা লোকালেই থাকে; রপ্তানি ফাইল আপনি নিজে শেয়ার করলে তবেই ডিভাইসের বাইরে যাবে।' : 'Data stays local; exported backup files leave the device only when you explicitly share them.';
  const restoreConfirm = bn ? 'রিস্টোর' : 'Restore';
  const operationError = bn ? 'ব্যাকআপ অপারেশন সম্পন্ন করা যায়নি।' : 'The backup operation could not be completed';
  return {
    back: bn ? 'ফিরুন' : 'Back',
    eyebrow: bn ? 'ডেটা সেফটি' : 'DATA SAFETY',
    title: bn ? 'ব্যাকআপ ও রিস্টোর' : 'Backup & Restore',
    subtitle: bn ? 'ব্যাকআপে স্থানীয় ডেটার সঙ্গে সংযুক্ত ফাইলও রাখা হয়। আপনি নিজে শেয়ার না করলে এটি ডিভাইসেই থাকে।' : 'The backup includes local data and linked files. It stays on-device unless you explicitly share it.',
    create: bn ? 'সম্পূর্ণ ব্যাকআপ তৈরি' : 'Create complete backup',
    createText: bn ? 'টাস্ক, সাবটাস্ক, মেমোরি, নোটিফিকেশন ডেলিভারি স্টেট, ডেটাবেস মেটাডেটা এবং সংযুক্ত ছবি, ভিডিও, PDF ও অন্যান্য ফাইল একটি ZIP আর্কাইভে এক্সপোর্ট করুন।' : 'Exports tasks, subtasks, memories, notification state, database metadata and linked images, videos, PDFs and other files into a ZIP archive.',
    createButton: bn ? 'ব্যাকআপ তৈরি ও শেয়ার' : 'Create & Share Backup',
    restore: bn ? 'ব্যাকআপ রিস্টোর' : 'Restore backup',
    restoreText: bn ? 'পুরোনো যাচাইকৃত JSON ব্যাকআপ এবং নতুন সংযুক্ত-ফাইলসহ ZIP ব্যাকআপ—দুই ধরনের ব্যাকআপই যাচাই করে রিস্টোর করা যাবে।' : 'Validated legacy JSON backups and new attachment-aware ZIP backups are both supported.',
    choose: bn ? 'ব্যাকআপ ফাইল নির্বাচন করুন' : 'Choose Backup File',
    storage: bn ? 'সংযুক্ত ফাইল স্টোরেজ' : 'Attachment storage',
    files: bn ? 'ফাইল' : 'Files',
    used: bn ? 'মেটাডেটায় জানা আকার' : 'Known metadata size',
    available: bn ? 'ডিভাইসে খালি জায়গা' : 'Free device storage',
    lastSize: bn ? 'সর্বশেষ ব্যাকআপ আকার' : 'Last backup size',
    success: (count: number, bytes: string) => bn ? `ব্যাকআপ সফল। ${count}টি সংযুক্ত ফাইলসহ ${bytes} আর্কাইভ শেয়ার করা হয়েছে।` : `Backup created with ${count} attachment${count === 1 ? '' : 's'} (${bytes}).`,
    restoredAttachments,
    restoredWithAttachments: restoredAttachments,
    restored: bn ? 'ব্যাকআপ সফলভাবে রিস্টোর হয়েছে।' : 'Backup restored successfully.',
    restoredRetry: bn ? 'ব্যাকআপ রিস্টোর হয়েছে। রিমাইন্ডার রিফ্রেশ পরে আবার চেষ্টা করবে।' : 'Backup restored. Reminder refresh will retry automatically.',
    operationError,
    error: operationError,
    localTitle: bn ? 'লোকাল ও শেয়ার-নির্ভর' : 'Local and user-controlled',
    localDescription,
    localText: localDescription,
    restoreTitle: bn ? 'ব্যাকআপ রিস্টোর করবেন?' : 'Restore backup?',
    restoreDescription: bn ? 'বর্তমান লোকাল ডেটা নির্বাচিত ব্যাকআপ দিয়ে প্রতিস্থাপিত হবে।' : 'Current local data will be replaced by the selected backup.',
    restoreConfirm,
    confirm: restoreConfirm,
    cancel: bn ? 'বাতিল' : 'Cancel',
    encryptLabel: bn ? 'পাসফ্রেজ দিয়ে সুরক্ষিত করুন (ঐচ্ছিক)' : 'Protect with a passphrase (optional)',
    encryptPlaceholder: bn ? 'পাসফ্রেজ — মনে রাখুন, এটি রিকভার করা যায় না' : 'Passphrase — remember it, it cannot be recovered',
    encryptNote: bn ? 'পাসফ্রেজ দিলে ব্যাকআপ ফাইল AES-256 দিয়ে এনক্রিপ্ট হবে।' : 'With a passphrase the backup file is AES-256 encrypted.',
    encryptedRestoreTitle: bn ? 'এনক্রিপ্টেড ব্যাকআপ' : 'Encrypted backup',
    encryptedRestorePrompt: bn ? 'এই ব্যাকআপটি খুলতে পাসফ্রেজ দিন।' : 'Enter the passphrase to open this backup.',
    wrongPassphrase: bn ? 'ভুল পাসফ্রেজ বা ফাইলটি নষ্ট।' : 'Wrong passphrase or corrupt file.',
    unlock: bn ? 'আনলক করুন' : 'Unlock',
  };
}
