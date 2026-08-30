import { normalizeText } from '../nlp/normalize';

// Deterministic conversational replies — greetings, thanks, "who are you", and a full
// tour of what the app can do. No model: hand-written bilingual copy so the assistant
// never leaves the user with a blank "I don't understand".

export type Lang = 'bn' | 'en';

export interface HelpTopic {
  title: string;
  detail: string;
  /** A ready-to-run example the UI can offer as a tap chip. */
  example?: string;
}

export function helpTopics(lang: Lang): { intro: string; topics: HelpTopic[]; outro: string } {
  if (lang === 'bn') {
    return {
      intro: 'আমি এই ডিভাইসেই কাজ করি — কোনো ইন্টারনেট বা ক্লাউড লাগে না। যা যা করতে পারি:',
      topics: [
        { title: 'টাস্ক তৈরি', detail: 'একটা লাইনে বললেই টাস্ক বানাই — সময়/তারিখসহ।', example: 'আগামীকাল সকাল ৯টায় ডাক্তারকে ফোন করতে হবে' },
        { title: 'টাস্ক শেষ / সময় পরিবর্তন', detail: '“কাজটা শেষ” বা “মিটিং পিছিয়ে দাও শুক্রবার” বললেই হয়।', example: 'রিপোর্টের কাজ শেষ' },
        { title: 'টাস্ক দেখা', detail: 'আপনার আজকের বা সব টাস্কের তালিকা দেখাই।', example: 'আমার কাজগুলো দেখাও' },
        { title: 'তথ্য মনে রাখা', detail: 'যেকোনো তথ্য — পাসওয়ার্ড, নম্বর, মেয়াদ — বললে সেভ করি।', example: 'মনে রাখো আমার পাসপোর্টের মেয়াদ ২০৩০ সাল' },
        { title: 'প্রশ্নের উত্তর', detail: 'সেভ করা তথ্য থেকে সরাসরি উত্তর দিই।', example: 'আমার পাসপোর্টের মেয়াদ কত?' },
        { title: 'মেমোরি খোঁজা', detail: 'পুরনো নোট বা তথ্য খুঁজে বের করি।', example: 'রিপোর্ট খুঁজে দাও' },
        { title: 'একসাথে কয়েকটি কাজ', detail: '“A কর, তারপর B” বললে ধাপে ধাপে সব করি।', example: 'দুধ কেনো, আর ব্যাংকে যেতে হবে' },
        { title: 'ভয়েস', detail: 'মাইক চেপে কথা বললেই লিখে নিই — অফলাইনে।' },
      ],
      outro: 'বাংলা বা ইংরেজি — যেভাবে খুশি বলুন। বুঝতে না পারলে আমি জানিয়ে দেব, আটকে থাকব না।',
    };
  }
  return {
    intro: 'I run entirely on this device — no internet, no cloud. Here is what I can do:',
    topics: [
      { title: 'Create tasks', detail: 'Say it in one line and I make a task, with date/time.', example: 'call the doctor tomorrow at 9am' },
      { title: 'Complete / reschedule', detail: '“done with the report” or “move the meeting to Friday”.', example: 'done with the report' },
      { title: 'See tasks', detail: 'I list today’s or all of your tasks.', example: 'show my tasks' },
      { title: 'Remember info', detail: 'Passwords, numbers, expiry dates — tell me and I save it.', example: 'remember my passport expires in 2030' },
      { title: 'Answer questions', detail: 'I answer straight from what you saved.', example: 'when does my passport expire?' },
      { title: 'Search memory', detail: 'I find old notes and facts.', example: 'find the report' },
      { title: 'Multi-step', detail: '“do A, then B” and I run every step in order.', example: 'buy milk and go to the bank' },
      { title: 'Voice', detail: 'Hold the mic and speak — transcribed offline.' },
    ],
    outro: 'Bangla or English, phrase it however you like. If I can’t work something out I’ll say so — I won’t get stuck.',
  };
}

export type SmallTalkKind = 'greeting' | 'thanks' | 'identity' | 'wellbeing' | 'ack';

export function classifySmallTalk(text: string): SmallTalkKind {
  const t = normalizeText(text);
  if (/(thank|thx|ধন্যবাদ|থ্যাংক|থ্যাঙ্ক)/u.test(t)) return 'thanks';
  if (/(who are you|your name|are you (a )?(bot|ai|robot)|তুমি কে|তোমার নাম|তুমি কি (রোবট|বট|এআই))/u.test(t)) return 'identity';
  if (/(how are you|কেমন আছ)/u.test(t)) return 'wellbeing';
  if (/^(ok(ay)?|cool|nice|great|ঠিক আছে|আচ্ছা|ওকে|বাহ|দারুণ|চমৎকার)/u.test(t)) return 'ack';
  return 'greeting';
}

export function smallTalkReply(text: string, lang: Lang): string {
  const kind = classifySmallTalk(text);
  const bn = lang === 'bn';
  switch (kind) {
    case 'thanks':
      return bn ? 'সবসময়! আর কিছু লাগলে বলুন।' : 'Anytime! Tell me if you need anything else.';
    case 'identity':
      return bn
        ? 'আমি এই অ্যাপের লোকাল সহকারী — সব কাজ আপনার ফোনেই করি, কোনো ইন্টারনেট ছাড়াই। টাস্ক, মেমোরি আর প্রশ্নের উত্তর — এসব সামলাই।'
        : 'I’m this app’s on-device assistant — everything runs on your phone, no internet. I handle tasks, memories and answering questions.';
    case 'wellbeing':
      return bn ? 'আমি ঠিক আছি, ধন্যবাদ! আপনাকে কীভাবে সাহায্য করতে পারি?' : 'I’m good, thanks! How can I help you?';
    case 'ack':
      return bn ? 'ঠিক আছে। পরের কাজটা বলুন।' : 'Got it. What’s next?';
    case 'greeting':
    default:
      return bn
        ? 'হ্যালো! একটা টাস্ক বানাতে, তথ্য সেভ করতে বা প্রশ্ন করতে পারেন। “সাহায্য” লিখলে সব দেখাব।'
        : 'Hello! You can add a task, save a note, or ask a question. Type “help” to see everything.';
  }
}
