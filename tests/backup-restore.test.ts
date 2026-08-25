import { BACKUP_FORMAT_VERSION, LEGACY_BACKUP_FORMAT_VERSION } from '../src/services/backup-service';
import { validateBackupDocument } from '../src/services/restore-service';

describe('versioned backup validation', () => {
  it('accepts a current versioned backup', () => {
    expect(validateBackupDocument({
      format: 'offline-memory-backup',
      version: BACKUP_FORMAT_VERSION,
      exportedAt: '2026-08-24T00:00:00.000Z',
      data: { tasks: [], memories: [], attachments: [], attachmentBinaries: [], schemaVersion: 8, appMetadata: [], subtasks: [], notificationDeliveries: [] },
    }).version).toBe(BACKUP_FORMAT_VERSION);
  });

  it('keeps legacy M7 restore compatibility', () => {
    expect(validateBackupDocument({
      format: 'offline-memory-backup',
      version: LEGACY_BACKUP_FORMAT_VERSION,
      exportedAt: '2026-08-24T00:00:00.000Z',
      data: { tasks: [], memories: [], subtasks: [], notificationDeliveries: [], appMetadata: [], schemaVersion: 8 },
    }).version).toBe(LEGACY_BACKUP_FORMAT_VERSION);
  });

  it('rejects an unknown format before restore', () => {
    expect(() => validateBackupDocument({ format: 'unknown', version: 1, exportedAt: new Date().toISOString(), data: {} })).toThrow('Unsupported backup format');
  });

  it('rejects a future backup version', () => {
    expect(() => validateBackupDocument({ format: 'offline-memory-backup', version: 999, exportedAt: new Date().toISOString(), data: {} })).toThrow('Unsupported backup version');
  });

  it('rejects malformed data', () => {
    expect(() => validateBackupDocument({ format: 'offline-memory-backup', version: BACKUP_FORMAT_VERSION, exportedAt: new Date().toISOString(), data: [] })).toThrow('Backup data must be an object');
  });
});
