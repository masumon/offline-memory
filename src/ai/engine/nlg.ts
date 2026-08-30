import { resolveActiveEngine } from './registry';
import type { AiEngineId } from './types';

// Optional natural-language polish for a *already-decided* answer.
//
// The fact and the number always come from deterministic retrieval. If — and only if —
// an on-device LLM is installed and ready, we let it rephrase the sentence to sound
// more natural. Everything about that is guarded:
//   • hard timeout, then fall back to the deterministic text
//   • the model's output must still contain the exact answer value (`mustContain`)
//   • it must be short, single-paragraph, and free of links / markup
// Any violation → we keep the deterministic text. The model can only ever make the
// wording nicer, never change the answer.

export interface PolishRequest {
  /** The deterministic answer sentence to rephrase. Returned unchanged on any failure. */
  draft: string;
  /** The user's question, for phrasing context. */
  question: string;
  /** The exact substring the rewrite must preserve (the answer value). */
  mustContain: string;
  language: 'bn' | 'en';
  preferredEngineId?: AiEngineId | null;
  timeoutMs?: number;
}

const MAX_OUT = 240;

function acceptable(text: string, mustContain: string): boolean {
  const t = text.trim();
  if (!t || t.length > MAX_OUT) return false;
  if (/\n\s*\n/.test(t)) return false; // multi-paragraph
  if (/https?:\/\/|www\.|[|*`#<>]/.test(t)) return false; // links / markup
  if (mustContain && !t.includes(mustContain)) return false;
  return true;
}

export async function polishAnswer(req: PolishRequest): Promise<string> {
  const engine = await resolveActiveEngine(req.preferredEngineId ?? null).catch(() => null);
  if (!engine?.generate || !(await engine.isReady().catch(() => false))) return req.draft;

  const langName = req.language === 'bn' ? 'Bengali' : 'English';
  const prompt =
    `Rewrite the ANSWER as one short, natural ${langName} sentence that directly replies to the QUESTION. ` +
    `Keep it factual. Do NOT add any information. Keep the exact value "${req.mustContain}". No lists, no links.\n\n` +
    `QUESTION: ${req.question}\nANSWER: ${req.draft}\n\nREWRITE:`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 6000);
  try {
    const out = await engine.generate(prompt, { maxTokens: 96, temperature: 0.2, signal: controller.signal });
    const firstLine = out.split('\n').map((l) => l.trim()).find(Boolean) ?? '';
    return acceptable(firstLine, req.mustContain) ? firstLine : req.draft;
  } catch {
    return req.draft;
  } finally {
    clearTimeout(timer);
  }
}
