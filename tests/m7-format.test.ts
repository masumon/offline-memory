import { createM7BackupDocument, parseM7BackupDocument } from '../src/backup/m7-format';

describe('M7 backup format', () => {
  it('creates and parses a versioned document', () => {
    const document = createM7BackupDocument({ tasks: [] }, '2026-08-24T00:00:00.000Z');
    expect(parseM7BackupDocument(document)).toEqual(document);
  });

  it('rejects unsupported versions', () => {
    expect(() => parseM7BackupDocument({
      format: 'offline-memory-backup', version: 999, createdAt: '2026-08-24T00:00:00.000Z', data: {},
    })).toThrow('Unsupported backup version');
  });

  it('rejects malformed data', () => {
    expect(() => parseM7BackupDocument({
      format: 'offline-memory-backup', version: 1, createdAt: 'bad-date', data: {},
    })).toThrow('Backup createdAt must be a valid ISO date');
  });
});
