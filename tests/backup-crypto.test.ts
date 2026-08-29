import { decryptArchive, encryptArchive, isEncryptedArchive } from '../src/backup/crypto';

const sample = new Uint8Array(Array.from({ length: 300 }, (_, i) => (i * 7 + 3) % 256));

describe('backup archive encryption', () => {
  it('round-trips the payload with the correct passphrase', () => {
    const enc = encryptArchive(sample, 'correct horse battery staple', 500);
    expect(isEncryptedArchive(enc)).toBe(true);
    const dec = decryptArchive(enc, 'correct horse battery staple');
    expect(Array.from(dec)).toEqual(Array.from(sample));
  });

  it('does not resemble the plaintext', () => {
    const enc = encryptArchive(sample, 'pw', 500);
    // header + salt + iv + ciphertext, and ciphertext differs from plaintext
    expect(enc.length).toBeGreaterThan(sample.length);
    expect(Array.from(enc.slice(42, 42 + 16))).not.toEqual(Array.from(sample.slice(0, 16)));
  });

  it('rejects a wrong passphrase', () => {
    const enc = encryptArchive(sample, 'right', 500);
    expect(() => decryptArchive(enc, 'wrong')).toThrow(/passphrase|corrupt/i);
  });

  it('produces a different ciphertext each time (random salt + iv)', () => {
    const a = encryptArchive(sample, 'pw', 500);
    const b = encryptArchive(sample, 'pw', 500);
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });

  it('flags non-encrypted bytes', () => {
    expect(isEncryptedArchive(new Uint8Array([0x50, 0x4b, 3, 4]))).toBe(false);
  });
});
