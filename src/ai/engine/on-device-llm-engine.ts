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

// isReady() runs on every turn; cache the (filesystem + runtime) check briefly so a
// burst of assistant calls does not re-stat the model file each time.
let readyCache: { value: boolean; at: number } | null = null;
const READY_TTL_MS = 5000;

/** Called once at startup so the engine can reach the model record. */
export function bindOnDeviceLlmEngine(db: SQLiteDatabase): void {
  dbRef = db;
  readyCache = null;
}

// A provider-neutral instruct wrapper. Small Llama/Qwen/Gemma/Phi GGUF builds all
// tolerate the Alpaca-style layout, and the stop strings keep the model from running
// past its answer.
const STOP = ['### Instruction:', '### Input:', '\n\n\n'];
function wrapInstruct(prompt: string): string {
  return `Below is an instruction. Write a response that appropriately completes it.\n\n### Instruction:\n${prompt}\n\n### Response:\n`;
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
    if (readyCache && Date.now() - readyCache.at < READY_TTL_MS) return readyCache.value;
    let value = false;
    if (dbRef && probeRuntime().available) {
      const model = await loadInstalledModel(dbRef);
      value = Boolean(model?.verifiedAt);
    }
    readyCache = { value, at: Date.now() };
    return value;
  },
  async generate(prompt, options) {
    if (!dbRef) throw new Error('engine not bound');
    const model = await loadInstalledModel(dbRef);
    if (!model) throw new Error('no model installed');
    return generateWith(model.path, model.summary.contextLength, wrapInstruct(prompt), {
      maxTokens: options?.maxTokens ?? 256,
      temperature: options?.temperature ?? 0.3,
      stop: STOP,
      signal: options?.signal,
    });
  },
};

registerAiEngine(engine);

export { engine as onDeviceLlmEngine };
