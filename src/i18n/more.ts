import type { AppLanguage } from './date-time';

type MoreItemCopy={title:string;description:string};

export const moreCopy={
  bn:{back:'হোম',eyebrow:'টুলস ও ডেটা',title:'আরও',subtitle:'Offline Memory-এর সহায়ক টুল ও ডেটা কন্ট্রোল।',groups:{
    Tools:{title:'টুলস',items:{search:{title:'সার্চ',description:'লোকালি সংরক্ষিত টাস্ক ও সক্রিয় মেমোরি খুঁজুন।'},assistant:{title:'লোকাল অ্যাসিস্ট্যান্ট',description:'লোকাল টাস্ক ও মেমোরি কমান্ড ব্যবহার করুন।'}}},
    Data:{title:'ডেটা',items:{backup:{title:'ব্যাকআপ ও রিস্টোর',description:'আপনার লোকাল ডেটা সুরক্ষিত বা রিস্টোর করুন।'}}},
    Notifications:{title:'নোটিফিকেশন',items:{reminders:{title:'রিমাইন্ডার',description:'এই ডিভাইসের টাস্ক রিমাইন্ডার নিয়ন্ত্রণ করুন।'}}},
    System:{title:'সিস্টেম',items:{diagnostics:{title:'ডায়াগনস্টিকস',description:'ডেটাবেস, সংযুক্ত ফাইল ও নোটিফিকেশন স্বাস্থ্য পরীক্ষা করুন।'},settings:{title:'সেটিংস',description:'ভাষা, চেহারা, নোটিফিকেশন ও ডেটা নিয়ন্ত্রণ করুন।'},about:{title:'আমাদের সম্পর্কে',description:'Offline Memory-এর পরিচয়, architecture ও privacy দেখুন।'}}}
  }},
  en:{back:'Home',eyebrow:'TOOLS & DATA',title:'More',subtitle:'Supporting tools and data controls for Offline Memory.',groups:{
    Tools:{title:'Tools',items:{search:{title:'Search',description:'Search tasks and active memories stored locally.'},assistant:{title:'Local Assistant',description:'Use deterministic local task and memory commands.'}}},
    Data:{title:'Data',items:{backup:{title:'Backup & Restore',description:'Protect or restore your local data.'}}},
    Notifications:{title:'Notifications',items:{reminders:{title:'Reminders',description:'Manage task reminders scheduled on this device.'}}},
    System:{title:'System',items:{diagnostics:{title:'Diagnostics',description:'Check local database, attachments and notification health.'},settings:{title:'Settings',description:'Control language, appearance, notifications and data.'},about:{title:'About',description:'Offline Memory identity, architecture and privacy.'}}}
  }}
} as const;

export function more(language:AppLanguage){return moreCopy[language];}
