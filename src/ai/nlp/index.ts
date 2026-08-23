import { extractEntities } from './entities';
import { classifyIntent } from './intent';
import { normalizeText, tokenize } from './normalize';
import type { NlpResult } from './types';

export * from './types';
export * from './normalize';
export * from './intent';
export * from './entities';

export function parseLocalNlp(input: string, now = new Date()): NlpResult {
  const normalizedText = normalizeText(input);
  const tokens = tokenize(normalizedText);
  const { intent, confidence } = classifyIntent(normalizedText);
  const entities = extractEntities(normalizedText, intent, now);

  return { normalizedText, tokens, intent, confidence, entities };
}
