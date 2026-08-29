import { isArchitectureSupported, parseGgufHeader, summarizeGguf } from '../src/ai/model/gguf';

// --- tiny GGUF writer, just enough for the header + a few KV entries ------------

class Writer {
  private parts: number[] = [];
  bytes(arr: number[]) { this.parts.push(...arr); return this; }
  u32(v: number) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, v, true); return this.bytes([...b]); }
  u64(v: number) { const b = new Uint8Array(8); new DataView(b.buffer).setBigUint64(0, BigInt(v), true); return this.bytes([...b]); }
  str(s: string) { const enc = [...s].map((ch) => ch.charCodeAt(0)); this.u64(enc.length); return this.bytes(enc); }
  kvString(key: string, value: string) { this.str(key); this.u32(8); return this.str(value); }
  kvU32(key: string, value: number) { this.str(key); this.u32(4); return this.u32(value); }
  build() { return new Uint8Array(this.parts); }
}

type KvSpec = ['s', string, string] | ['u', string, number];
function makeGguf(kv: KvSpec[]): Uint8Array {
  const w = new Writer();
  w.bytes([0x47, 0x47, 0x55, 0x46]); // "GGUF"
  w.u32(3); // version
  w.u64(0); // tensor count
  w.u64(kv.length); // kv count
  for (const entry of kv) {
    if (entry[0] === 's') w.kvString(entry[1], entry[2]);
    else w.kvU32(entry[1], entry[2]);
  }
  return w.build();
}

describe('GGUF header parser', () => {
  it('rejects non-GGUF bytes', () => {
    expect(parseGgufHeader(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]))).toBeNull();
    expect(parseGgufHeader(new Uint8Array([0x47, 0x47, 0x55, 0x46]))).toBeNull(); // too short
  });

  it('parses version, counts and string/uint metadata', () => {
    const buf = makeGguf([
      ['s', 'general.architecture', 'llama'],
      ['s', 'general.name', 'Test 1B Instruct'],
      ['u', 'general.file_type', 15], // Q4_K_M
      ['u', 'llama.context_length', 4096],
    ]);
    const header = parseGgufHeader(buf);
    expect(header).not.toBeNull();
    expect(header!.version).toBe(3);
    expect(header!.kvCount).toBe(4);
    expect(header!.truncated).toBe(false);
    expect(header!.metadata['general.architecture']).toBe('llama');
    expect(header!.metadata['general.file_type']).toBe(15);
  });

  it('summarises into a human-friendly, mobile-aware shape', () => {
    const header = parseGgufHeader(makeGguf([
      ['s', 'general.architecture', 'qwen2'],
      ['s', 'general.name', 'Qwen2.5 1.5B'],
      ['u', 'general.file_type', 15],
      ['u', 'qwen2.context_length', 32768],
    ]))!;
    const s = summarizeGguf(header);
    expect(s.architecture).toBe('qwen2');
    expect(s.name).toBe('Qwen2.5 1.5B');
    expect(s.quantLabel).toBe('Q4_K_M');
    expect(s.quantIsMobileFriendly).toBe(true);
    expect(s.contextLength).toBe(32768);
    expect(isArchitectureSupported(s.architecture)).toBe(true);
  });

  it('flags an unquantised (F16) model as not mobile-friendly', () => {
    const header = parseGgufHeader(makeGguf([
      ['s', 'general.architecture', 'llama'],
      ['u', 'general.file_type', 1], // F16
    ]))!;
    const s = summarizeGguf(header);
    expect(s.quantLabel).toBe('F16');
    expect(s.quantIsMobileFriendly).toBe(false);
  });

  it('marks the header truncated when the KV block is cut off', () => {
    const full = makeGguf([
      ['s', 'general.architecture', 'llama'],
      ['s', 'general.name', 'Cut Off Model'],
      ['u', 'general.file_type', 15],
    ]);
    const header = parseGgufHeader(full.subarray(0, full.length - 6));
    expect(header).not.toBeNull();
    expect(header!.truncated).toBe(true);
  });

  it('does not vouch for an unknown architecture', () => {
    expect(isArchitectureSupported('rwkv7')).toBe(false);
    expect(isArchitectureSupported(null)).toBe(false);
  });
});
