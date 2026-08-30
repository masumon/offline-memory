import { embed, cosineSimilarity, VectorIndex } from '../src/ai/semantic';

describe('on-device text embeddings', () => {
  it('produces an L2-normalised vector for real text and a zero vector for empty text', () => {
    const v = embed('পাসপোর্টের মেয়াদ ২০৩০ সাল');
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeGreaterThan(0.99);
    expect(norm).toBeLessThan(1.01);

    const zero = embed('   ');
    expect(zero.reduce((s, x) => s + Math.abs(x), 0)).toBe(0);
  });

  it('is deterministic and self-similar', () => {
    expect(cosineSimilarity(embed('call the bank tomorrow'), embed('call the bank tomorrow'))).toBeCloseTo(1, 5);
  });

  it('rates related text higher than unrelated text', () => {
    const anchor = embed('পাসপোর্টের মেয়াদ শেষ হবে ২০৩০ সালে');
    const related = embed('আমার পাসপোর্ট কবে expire করবে');
    const unrelated = embed('বাসার বিদ্যুৎ বিল পরিশোধ করতে হবে');
    expect(cosineSimilarity(anchor, related)).toBeGreaterThan(cosineSimilarity(anchor, unrelated));
  });
});

describe('in-memory vector index', () => {
  const docs = [
    { id: 'passport', text: 'পাসপোর্টের মেয়াদ ২০৩০ সাল পর্যন্ত', meta: { id: 'passport' } },
    { id: 'wifi', text: 'বাসার wifi পাসওয়ার্ড hunter2', meta: { id: 'wifi' } },
    { id: 'doctor', text: 'ডাক্তারের অ্যাপয়েন্টমেন্ট শুক্রবার সকাল ১০টা', meta: { id: 'doctor' } },
  ];

  it('retrieves the topically matching document across languages (synonym-aware query)', () => {
    const index = new VectorIndex<{ id: string }>();
    index.rebuild(docs);

    expect(index.query('passport expiry date', 1)[0]?.id).toBe('passport');
    expect(index.query('wifi password', 1)[0]?.id).toBe('wifi');
    expect(index.query('doctor appointment', 1)[0]?.id).toBe('doctor');
  });

  it('returns nothing for an empty index and respects minScore', () => {
    const empty = new VectorIndex();
    expect(empty.query('anything', 5)).toEqual([]);

    const index = new VectorIndex<{ id: string }>();
    index.rebuild(docs);
    expect(index.query('completely unrelated quantum chromodynamics', 3, 0.4)).toEqual([]);
  });
});
