import { polishAnswer } from '../src/ai/engine/nlg';
import { registerAiEngine } from '../src/ai/engine/registry';
import type { AiEngine } from '../src/ai/engine/types';

const draft = 'Answer: 2030';
const base = { question: 'when does my passport expire?', mustContain: '2030', language: 'en' as const };

describe('optional LLM answer polish (facts stay deterministic)', () => {
  it('returns the draft unchanged when no on-device LLM is ready', async () => {
    await expect(polishAnswer({ draft, ...base })).resolves.toBe(draft);
  });

  it('uses a good rewrite that preserves the value', async () => {
    const fake: AiEngine = {
      descriptor: { id: 'fake-good', label: { bn: '', en: '' }, description: { bn: '', en: '' }, builtIn: false },
      isReady: async () => true,
      generate: async () => 'Your passport is valid until 2030.',
    };
    registerAiEngine(fake);
    await expect(polishAnswer({ draft, ...base, preferredEngineId: 'fake-good' }))
      .resolves.toBe('Your passport is valid until 2030.');
  });

  it('rejects a rewrite that drops the answer value and keeps the draft', async () => {
    const fake: AiEngine = {
      descriptor: { id: 'fake-drift', label: { bn: '', en: '' }, description: { bn: '', en: '' }, builtIn: false },
      isReady: async () => true,
      generate: async () => 'Your passport is valid for many more years.',
    };
    registerAiEngine(fake);
    await expect(polishAnswer({ draft, ...base, preferredEngineId: 'fake-drift' })).resolves.toBe(draft);
  });

  it('rejects a rewrite that adds a link or is too long', async () => {
    const fake: AiEngine = {
      descriptor: { id: 'fake-spam', label: { bn: '', en: '' }, description: { bn: '', en: '' }, builtIn: false },
      isReady: async () => true,
      generate: async () => 'See 2030 details at https://example.com now',
    };
    registerAiEngine(fake);
    await expect(polishAnswer({ draft, ...base, preferredEngineId: 'fake-spam' })).resolves.toBe(draft);
  });

  it('falls back to the draft if generation throws or times out', async () => {
    const fake: AiEngine = {
      descriptor: { id: 'fake-throw', label: { bn: '', en: '' }, description: { bn: '', en: '' }, builtIn: false },
      isReady: async () => true,
      generate: async () => { throw new Error('runtime blew up'); },
    };
    registerAiEngine(fake);
    await expect(polishAnswer({ draft, ...base, preferredEngineId: 'fake-throw' })).resolves.toBe(draft);
  });
});
