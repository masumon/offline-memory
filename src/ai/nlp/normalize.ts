import { NUMBER_WORDS } from './lexicon';

const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';
const ASCII_DIGITS = '0123456789';

export function toAsciiDigits(value: string): string {
  return value.replace(/[০-৯]/g, (digit) => ASCII_DIGITS[BENGALI_DIGITS.indexOf(digit)] ?? digit);
}

/** Replace standalone number words with digits ("three" → "3", "তিনটা" → "3টা"). */
export function numberWordsToDigits(value: string): string {
  let out = value;
  for (const [word, digit] of Object.entries(NUMBER_WORDS)) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Bengali words carry combining marks; English uses ASCII boundaries.
    const boundary = /^[a-z]/u.test(word) ? `\\b${escaped}\\b` : `(?<![\\p{L}\\p{M}])${escaped}`;
    out = out.replace(new RegExp(boundary, 'giu'), String(digit));
  }
  return out;
}

/** NFKC + Bengali→ASCII digits + smart-quote/dash normalisation + whitespace collapse,
 * WITHOUT lower-casing or number-word expansion. Used to recover the user's original
 * capitalisation for stored content (passwords, names) after the lower-cased pipeline
 * has decided *what* to keep. */
export function normalizeKeepCase(input: string): string {
  return toAsciiDigits(input)
    .normalize('NFKC')
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeText(input: string): string {
  const base = normalizeKeepCase(input).toLocaleLowerCase();
  return numberWordsToDigits(base);
}

/**
 * Re-apply the original capitalisation of `source` onto `lowered` (a cleaned, lower-cased
 * fragment). Matches token-by-token, forward-only, so it survives the cleaner having
 * removed date/time spans or leading verbs. Unmatched tokens keep their lower-cased form.
 */
export function recoverCase(source: string, lowered: string): string {
  const low = lowered.trim();
  if (!low) return low;
  const srcTokens = source.split(/\s+/).filter(Boolean);
  const lowTokens = low.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cursor = 0;
  for (const token of lowTokens) {
    let matched: string | undefined;
    for (let k = cursor; k < srcTokens.length; k += 1) {
      if (srcTokens[k]!.toLocaleLowerCase() === token) { matched = srcTokens[k]; cursor = k + 1; break; }
    }
    out.push(matched ?? token);
  }
  return out.join(' ');
}

export function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(/[\s,;!?।:()[\]{}]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
}
