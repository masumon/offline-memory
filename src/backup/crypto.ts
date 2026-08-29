// Optional passphrase encryption for backup archives. Pure-JS (aes-js + js-sha256) so it
// works without a native module. AES-256-CBC with PKCS7 padding; key derived with
// PBKDF2-HMAC-SHA256 (150k iterations). Not a substitute for full-disk encryption, but it
// means an exported/shared backup file is unreadable without the passphrase.
import aesjs from 'aes-js';
import { sha256 } from 'js-sha256';

const MAGIC = [0x4f, 0x4d, 0x45, 0x4e, 0x43, 0x32]; // "OMENC2" (v2 stores the iteration count)
const SALT_LEN = 16;
const IV_LEN = 16;
const KEY_LEN = 32;
const ITER_LEN = 4;
const DEFAULT_ITERATIONS = 150_000;

export function isEncryptedArchive(bytes: Uint8Array): boolean {
  return bytes.length > MAGIC.length && MAGIC.every((b, i) => bytes[i] === b);
}

function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  const g = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => void } }).crypto;
  if (g?.getRandomValues) { g.getRandomValues(out); return out; }
  for (let i = 0; i < length; i += 1) out[i] = Math.floor(Math.random() * 256);
  return out;
}

function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  const hmac = sha256.hmac as unknown as { array: (k: unknown, m: unknown) => number[] };
  return new Uint8Array(hmac.array(Array.from(key), Array.from(message)));
}

function pbkdf2(passphrase: string, salt: Uint8Array, iterations: number, keyLen: number): Uint8Array {
  const pass = new Uint8Array(aesjs.utils.utf8.toBytes(passphrase));
  const blocks = Math.ceil(keyLen / 32);
  const derived = new Uint8Array(blocks * 32);
  for (let block = 1; block <= blocks; block += 1) {
    const blockIndex = new Uint8Array([(block >>> 24) & 0xff, (block >>> 16) & 0xff, (block >>> 8) & 0xff, block & 0xff]);
    const saltBlock = new Uint8Array(salt.length + 4);
    saltBlock.set(salt, 0);
    saltBlock.set(blockIndex, salt.length);
    let u = hmacSha256(pass, saltBlock);
    const t = u.slice();
    for (let i = 1; i < iterations; i += 1) {
      u = hmacSha256(pass, u);
      for (let j = 0; j < t.length; j += 1) t[j] = (t[j] ?? 0) ^ (u[j] ?? 0);
    }
    derived.set(t, (block - 1) * 32);
  }
  return derived.slice(0, keyLen);
}

export function encryptArchive(plaintext: Uint8Array, passphrase: string, iterations = DEFAULT_ITERATIONS): Uint8Array {
  if (!passphrase) throw new Error('A passphrase is required to encrypt the backup');
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = pbkdf2(passphrase, salt, iterations, KEY_LEN);
  const padded = aesjs.padding.pkcs7.pad(plaintext);
  const cbc = new aesjs.ModeOfOperation.cbc(key, iv);
  const ciphertext = cbc.encrypt(padded);
  const iterBytes = new Uint8Array([(iterations >>> 24) & 0xff, (iterations >>> 16) & 0xff, (iterations >>> 8) & 0xff, iterations & 0xff]);
  const out = new Uint8Array(MAGIC.length + ITER_LEN + SALT_LEN + IV_LEN + ciphertext.length);
  let o = 0;
  out.set(MAGIC, o); o += MAGIC.length;
  out.set(iterBytes, o); o += ITER_LEN;
  out.set(salt, o); o += SALT_LEN;
  out.set(iv, o); o += IV_LEN;
  out.set(ciphertext, o);
  return out;
}

export function decryptArchive(payload: Uint8Array, passphrase: string): Uint8Array {
  if (!isEncryptedArchive(payload)) throw new Error('Not an encrypted Offline Memory backup');
  let o = MAGIC.length;
  const iterations = ((payload[o]! << 24) | (payload[o + 1]! << 16) | (payload[o + 2]! << 8) | payload[o + 3]!) >>> 0;
  o += ITER_LEN;
  const salt = payload.slice(o, o + SALT_LEN); o += SALT_LEN;
  const iv = payload.slice(o, o + IV_LEN); o += IV_LEN;
  const ciphertext = payload.slice(o);
  if (!iterations || iterations > 5_000_000) throw new Error('Wrong passphrase or corrupt backup');
  const key = pbkdf2(passphrase, salt, iterations, KEY_LEN);
  const cbc = new aesjs.ModeOfOperation.cbc(key, iv);
  let padded: Uint8Array;
  try { padded = cbc.decrypt(ciphertext); } catch { throw new Error('Wrong passphrase or corrupt backup'); }
  try { return aesjs.padding.pkcs7.strip(padded); } catch { throw new Error('Wrong passphrase or corrupt backup'); }
}
