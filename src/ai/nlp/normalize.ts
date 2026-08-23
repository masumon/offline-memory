const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';
const ASCII_DIGITS = '0123456789';

export function toAsciiDigits(value: string): string {
  return value.replace(/[০-৯]/g, (digit) => ASCII_DIGITS[BENGALI_DIGITS.indexOf(digit)] ?? digit);
}

export function normalizeText(input: string): string {
  return toAsciiDigits(input)
    .normalize('NFKC')
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

export function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(/[\s,;!?।:()[\]{}]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
}
