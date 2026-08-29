// Build-time generator for the in-app "Advanced on-device AI" guide.
// Opened from Settings -> AI engine so the steps are one tap away, not buried
// in the repo. Dev-only (pdf-lib is a devDependency); the PDF ships as a bundled asset.
// Run: node scripts/generate-guide-pdf.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDoc } from './lib/pdf.mjs';

const assets = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
mkdirSync(assets, { recursive: true });

// English on purpose: every step is a shell command, a file path, or code.
const BLOCKS = [
  { type: 'h1', text: 'Advanced on-device AI' },
  { type: 'p', text: 'Offline Memory understands what you type or say with a built-in, rule-based engine that runs entirely on your device. It needs no model download and no internet, and it is always the fallback.' },
  { type: 'p', text: 'If you want more, you can add an optional on-device LLM. It also runs fully on the device (still no internet), but it is a separate add-on that you install yourself, so the default app stays small and can never be broken by a missing native runtime.' },

  { type: 'h2', text: 'What you need' },
  { type: 'li', text: 'A checkout of the app source (this is a developer step, done once).' },
  { type: 'li', text: 'A machine set up to build the app: Android Studio / Xcode, Node.js, and the Expo tooling.' },
  { type: 'li', text: 'A small GGUF language model file (for example a 1-3B instruct model) that fits comfortably in device memory.' },

  { type: 'h2', text: 'Step 1 - add a native LLM runtime' },
  { type: 'p', text: 'In your fork, install a React Native LLM runtime and rebuild the native app:' },
  { type: 'code', text: 'npx expo install llama.rn\nnpx expo run:android   # or: npx expo run:ios' },
  { type: 'p', text: 'Nothing about this step affects a normal build - you are opting in.' },

  { type: 'h2', text: 'Step 2 - implement the engine' },
  { type: 'p', text: 'Create src/ai/engine/on-device-llm-engine.ts that imports the runtime and implements the AiEngine contract, then registers itself:' },
  { type: 'code', text: [
    "import { initLlama } from 'llama.rn';",
    "import { registerAiEngine, type AiEngine } from './index';",
    '',
    'const engine: AiEngine = {',
    '  descriptor: {',
    "    id: 'on-device-llm',",
    "    label: { bn: '<Bengali label>', en: 'Advanced (on-device LLM)' },",
    "    description: {",
    "      bn: '<Bengali description>',",
    "      en: 'Runs a small model on the device - still offline.',",
    '    },',
    '    builtIn: false,',
    '  },',
    '  async isReady() { return modelFileExists(); },',
    '  async generate(prompt, opts) { /* run llama.rn here */ },',
    '};',
    '',
    'registerAiEngine(engine);',
  ].join('\n') },

  { type: 'h2', text: 'Step 3 - register and select it' },
  { type: 'li', text: 'Import that module once at startup (for example from app/_layout.tsx) so it registers on launch.' },
  { type: 'li', text: 'Ship or download the model file and point isReady() at it.' },
  { type: 'li', text: 'Choose the engine in Settings -> AI engine. The selection is stored as the aiEngineId preference.' },

  { type: 'h2', text: 'How the fallback works' },
  { type: 'p', text: 'resolveActiveEngine() checks your chosen engine first. If it is missing, not registered, or isReady() returns false, it silently returns the built-in rule engine. Free-form features must always keep a non-LLM path, so the app keeps working whether or not the model is present.' },

  { type: 'h2', text: 'Privacy' },
  { type: 'p', text: 'Both engines run on the device. No prompt, no text, and no model output is ever sent to a server. Adding the LLM does not change that.' },

  { type: 'rule' },
  { type: 'p', muted: true, text: 'Reference: src/ai/engine/README.md and src/ai/engine/types.ts in the app source.' },
];

writeFileSync(
  resolve(assets, 'ai-engine-guide.pdf'),
  await renderDoc(BLOCKS, {
    title: 'Offline Memory - Advanced on-device AI guide',
    footer: 'Offline Memory - 100% offline. Nothing is sent to a server.',
  }),
);
console.log('  ✓ assets/ai-engine-guide.pdf');
