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

export function normalizeText(input: string): string {
  const base = toAsciiDigits(input)
    .normalize('NFKC')
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
  return numberWordsToDigits(base);
}

export function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(/[\s,;!?।:()[\]{}]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
}
