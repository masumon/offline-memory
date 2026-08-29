# AI engine layer

The app understands what you type/say with a **deterministic on-device engine**
(`local-rules`): `parseLocalNlp` + `orchestrate`. No model, no download, no network.
This is the default and the permanent fallback.

## Optional: an advanced on-device LLM engine

A small language model that runs **entirely on the device** (still no internet) can be
added as a **separate, opt-in module**. It is deliberately not bundled so the default
build stays small and can never be broken by a missing native runtime.

To add it:

1. Add a native LLM runtime to your own fork, e.g.:
   ```
   npx expo install llama.rn
   ```
   and rebuild the dev client / release (`npx expo run:android`).

2. Create a module, e.g. `src/ai/engine/on-device-llm-engine.ts`, that imports that
   runtime and implements `AiEngine`:
   ```ts
   import { initLlama } from 'llama.rn';
   import { registerAiEngine, type AiEngine } from './index';

   const engine: AiEngine = {
     descriptor: {
       id: 'on-device-llm',
       label: { bn: 'উন্নত (অন-ডিভাইস LLM)', en: 'Advanced (on-device LLM)' },
       description: {
         bn: 'একটি ছোট মডেল ডিভাইসেই চালায় — ইন্টারনেট ছাড়াই আরও ভালো বোঝে।',
         en: 'Runs a small model on the device — better understanding, still offline.',
       },
       builtIn: false,
     },
     async isReady() { /* check the model file exists */ return modelFileExists(); },
     async generate(prompt, opts) { /* run llama.rn */ },
   };

   registerAiEngine(engine);
   ```

3. Import that module once at startup (e.g. from `app/_layout.tsx`) so it registers,
   and let the user pick it in **Settings → AI engine** (persisted as the
   `aiEngineId` preference). `resolveActiveEngine()` automatically falls back to
   `local-rules` whenever the model is not present.

Nothing about steps 1–3 touches the default build.
