// The opt-in "advanced" engine. It is always registered so the UI can show it, but
// `isReady()` is true only when BOTH a verified model file is installed AND this build
// carries a native GGUF runtime. Until then `resolveActiveEngine()` keeps using the
// built-in rule engine, so nothing breaks.

import type { SQLiteDatabase } from 'expo-sqlite';
import type { AiEngine } from './types';
import { registerAiEngine } from './registry';
import { loadInstalledModel } from '../model/model-manager';
import { generateWith, probeRuntime } from '../model/llama-runtime';

let dbRef: SQLiteDatabase | null = null;

/** Called once at startup so the engine can reach the model record. */
export function bindOnDeviceLlmEngine(db: SQLiteDatabase): void {
  dbRef = db;
}

const engine: AiEngine = {
  descriptor: {
    id: 'on-device-llm',
    label: { bn: 'উন্নত (অন-ডিভাইস LLM)', en: 'Advanced (on-device LLM)' },
    description: {
      bn: 'আপনার যোগ করা মডেল ডিভাইসেই চালায় — ইন্টারনেট ছাড়াই আরও ভালো বোঝে ও লেখে।',
      en: 'Runs the model you added, on the device — better understanding and writing, still offline.',
    },
    builtIn: false,
  },
  async isReady() {
    if (!dbRef || !probeRuntime().available) return false;
    const model = await loadInstalledModel(dbRef);
    return Boolean(model?.verifiedAt);
  },
  async generate(prompt, options) {
    if (!dbRef) throw new Error('engine not bound');
    const model = await loadInstalledModel(dbRef);
    if (!model) throw new Error('no model installed');
    return generateWith(model.path, model.summary.contextLength, prompt, options?.maxTokens ?? 256);
  },
};

registerAiEngine(engine);

export { engine as onDeviceLlmEngine };
