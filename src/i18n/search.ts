import type { AppLanguage } from './date-time';

export const searchCopy={
  bn:{back:'হোম',eyebrow:'সার্চ',title:'সবকিছু খুঁজুন',subtitle:'এই ডিভাইসে থাকা টাস্ক ও সক্রিয় মেমোরি খুঁজুন।',placeholder:'টাস্ক ও মেমোরি খুঁজুন',task:'টাস্ক',tasks:'টাস্ক',memories:'মেমোরি',all:'সব',importance:'গুরুত্ব',empty:'কোনো মিল পাওয়া যায়নি।',clear:'সার্চ মুছুন',retry:'আবার চেষ্টা করুন',searching:'খোঁজা হচ্ছে…',failedTitle:'সার্চ করা যায়নি',failedDescription:'লোকাল সার্চে সমস্যা হয়েছে। আবার চেষ্টা করুন।',openTask:'টাস্ক খুলুন',openMemory:'মেমোরি খুলুন'},
  en:{back:'Home',eyebrow:'SEARCH',title:'Find anything',subtitle:'Search tasks and active memories stored on this device.',placeholder:'Search tasks and memories',task:'Task',tasks:'Tasks',memories:'Memories',all:'All',importance:'Importance',empty:'No matching local data.',clear:'Clear search',retry:'Retry',searching:'Searching…',failedTitle:'Search failed',failedDescription:'The local search could not be completed. Please try again.',openTask:'Open task',openMemory:'Open memory'}
} as const;

export function search(language:AppLanguage){return searchCopy[language];}
