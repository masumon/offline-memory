// A short, hand-picked list of free, open-weight models that run on a phone. These
// are suggestions only — the app never downloads anything. The user grabs a `.gguf`
// file in their browser, saves it to the phone, then adds it here.
//
// Sizes are for the Q4_K_M quantisation (the balanced default). "ramNeed" is a rough
// figure for the model + a small working buffer; compare it with free device RAM.

export interface FreeModel {
  id: string;
  name: { bn: string; en: string };
  paramLabel: string;
  fileSizeLabel: string;
  ramNeedMB: number;
  quant: string;
  strength: { bn: string; en: string };
  /** Where the .gguf lives. A search page, not a hot link — filenames change over time. */
  source: string;
}

export const FREE_MODELS: FreeModel[] = [
  {
    id: 'llama-3.2-1b',
    name: { bn: 'Llama 3.2 1B Instruct', en: 'Llama 3.2 1B Instruct' },
    paramLabel: '1.2B',
    fileSizeLabel: '~0.8 GB',
    ramNeedMB: 1400,
    quant: 'Q4_K_M',
    strength: { bn: 'সবচেয়ে হালকা — পুরনো/কম RAM ফোনের জন্য।', en: 'Lightest option — for older or low-RAM phones.' },
    source: 'huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF',
  },
  {
    id: 'qwen2.5-1.5b',
    name: { bn: 'Qwen2.5 1.5B Instruct', en: 'Qwen2.5 1.5B Instruct' },
    paramLabel: '1.5B',
    fileSizeLabel: '~1.0 GB',
    ramNeedMB: 1700,
    quant: 'Q4_K_M',
    strength: { bn: 'ছোট আকারে ভালো সব-কাজের মডেল, একাধিক ভাষা বোঝে।', en: 'Best small all-rounder; decent multilingual.' },
    source: 'huggingface.co/bartowski/Qwen2.5-1.5B-Instruct-GGUF',
  },
  {
    id: 'gemma-2-2b',
    name: { bn: 'Gemma 2 2B Instruct', en: 'Gemma 2 2B Instruct' },
    paramLabel: '2.6B',
    fileSizeLabel: '~1.7 GB',
    ramNeedMB: 2600,
    quant: 'Q4_K_M',
    strength: { bn: 'ছোট মডেলের মধ্যে লেখার মান সবচেয়ে ভালো।', en: 'Strongest writing quality among the tiny models.' },
    source: 'huggingface.co/bartowski/gemma-2-2b-it-GGUF',
  },
  {
    id: 'llama-3.2-3b',
    name: { bn: 'Llama 3.2 3B Instruct', en: 'Llama 3.2 3B Instruct' },
    paramLabel: '3.2B',
    fileSizeLabel: '~2.0 GB',
    ramNeedMB: 3200,
    quant: 'Q4_K_M',
    strength: { bn: 'RAM যথেষ্ট থাকলে সবচেয়ে ভালো উত্তর।', en: 'Best answers if the phone has the RAM.' },
    source: 'huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF',
  },
  {
    id: 'phi-3.5-mini',
    name: { bn: 'Phi-3.5 Mini Instruct', en: 'Phi-3.5 Mini Instruct' },
    paramLabel: '3.8B',
    fileSizeLabel: '~2.2 GB',
    ramNeedMB: 3400,
    quant: 'Q4_K_M',
    strength: { bn: 'যুক্তি ও ধাপে-ধাপে চিন্তায় শক্তিশালী।', en: 'Strong at reasoning and step-by-step tasks.' },
    source: 'huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF',
  },
  {
    id: 'smollm2-1.7b',
    name: { bn: 'SmolLM2 1.7B Instruct', en: 'SmolLM2 1.7B Instruct' },
    paramLabel: '1.7B',
    fileSizeLabel: '~1.1 GB',
    ramNeedMB: 1800,
    quant: 'Q4_K_M',
    strength: { bn: 'দ্রুত ও হালকা, ছোট নোট/সারাংশের জন্য ভালো।', en: 'Fast and light; good for short notes and summaries.' },
    source: 'huggingface.co/bartowski/SmolLM2-1.7B-Instruct-GGUF',
  },
];
