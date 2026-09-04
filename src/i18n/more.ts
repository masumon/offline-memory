import type { AppLanguage } from './date-time';

export const moreCopy={
  bn:{back:'হোম',eyebrow:'টুল ও ডেটা',title:'আরও',subtitle:'অ্যাপের বাড়তি টুল আর আপনার ডেটার নিয়ন্ত্রণ এক জায়গায়।',groups:{
    Tools:{title:'টুল',items:{search:{title:'সার্চ',description:'নিজের সব কাজ আর মেমোরির ভেতরে খুঁজুন।'},assistant:{title:'অ্যাসিস্ট্যান্ট',description:'কথায় বা লিখে বললেই কাজ বা মেমোরি তৈরি হয়।'},review:{title:'সাপ্তাহিক রিভিউ',description:'এই সপ্তাহে কী শেষ হলো, কী বাকি — এক নজরে।'},focus:{title:'ফোকাস মোড',description:'একটা কাজ বেছে টাইমার চালিয়ে মন দিন।'},tags:{title:'ট্যাগ ব্রাউজার',description:'মেমোরির সব ট্যাগ ও প্রতিটিতে কতগুলো।'},onThisDay:{title:'এই দিনে',description:'আগের বছরগুলোয় আজকের দিনে কী লিখেছিলেন।'}}},
    Data:{title:'ডেটা',items:{backup:{title:'ব্যাকআপ ও রিস্টোর',description:'সব ডেটা একটা ফাইলে রাখুন, দরকারে ফিরিয়ে আনুন।'}}},
    Notifications:{title:'রিমাইন্ডার',items:{reminders:{title:'রিমাইন্ডার',description:'কোন কাজের জন্য কখন মনে করাবে, ঠিক করে দিন।'}}},
    System:{title:'সিস্টেম',items:{whatsNew:{title:'নতুন কী আছে',description:'সাম্প্রতিক আপডেটে যা যা যুক্ত হয়েছে।'},diagnostics:{title:'ডায়াগনস্টিকস',description:'ডেটাবেস, ফাইল আর রিমাইন্ডার ঠিকঠাক আছে কিনা দেখে নিন।'},settings:{title:'সেটিংস',description:'ভাষা, থিম, রিমাইন্ডার আর ডেটা — সব এখান থেকে।'},about:{title:'অ্যাপ সম্পর্কে',description:'অ্যাপটা কী, কীভাবে গোপনীয়তা রাখে, আর স্বত্ব।'}}}
  }},
  en:{back:'Home',eyebrow:'TOOLS & DATA',title:'More',subtitle:'The app’s extra tools and control over your data, in one place.',groups:{
    Tools:{title:'Tools',items:{search:{title:'Search',description:'Look through everything you’ve saved — tasks and memories.'},assistant:{title:'Assistant',description:'Say or type it and the app turns it into a task or memory, right here.'},review:{title:'Weekly review',description:'What you finished this week, what carried over — at a glance.'},focus:{title:'Focus mode',description:'Pick one task and run a timer on it.'},tags:{title:'Tag browser',description:'Every memory tag and how much each one holds.'},onThisDay:{title:'On this day',description:'What you wrote on today’s date in earlier years.'}}},
    Data:{title:'Data',items:{backup:{title:'Backup & Restore',description:'Put everything in one file, and bring it back when you need to.'}}},
    Notifications:{title:'Reminders',items:{reminders:{title:'Reminders',description:'Choose what gets a reminder and when.'}}},
    System:{title:'System',items:{whatsNew:{title:"What's new",description:'What was added in the most recent updates.'},diagnostics:{title:'Diagnostics',description:'Check that the database, files and reminders are all healthy.'},settings:{title:'Settings',description:'Language, theme, reminders and data — all from here.'},about:{title:'About the app',description:'What it is, how it keeps things private, and the copyright.'}}}
  }}
} as const;

export function more(language:AppLanguage){return moreCopy[language];}
