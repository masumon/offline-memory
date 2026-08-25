import { strToU8, zipSync } from 'fflate';
import { BACKUP_ARCHIVE_FORMAT, BACKUP_ARCHIVE_VERSION, parseBackupArchive } from '../src/services/backup-archive-service';

describe('backup archive validation', () => {
  const manifest = {
    format: BACKUP_ARCHIVE_FORMAT,
    version: BACKUP_ARCHIVE_VERSION,
    createdAt: '2026-08-26T00:00:00.000Z',
    data: { schemaVersion: 8, tasks: [], subtasks: [], memories: [], notificationDeliveries: [], appMetadata: [] },
    attachments: [],
  };

  it('accepts a valid archive manifest', () => {
    const bytes = zipSync({ 'manifest.json': strToU8(JSON.stringify(manifest)) });
    expect(parseBackupArchive(bytes)).toMatchObject({ format: BACKUP_ARCHIVE_FORMAT, version: BACKUP_ARCHIVE_VERSION });
  });

  it('rejects an unsupported archive version', () => {
    const bytes = zipSync({ 'manifest.json': strToU8(JSON.stringify({ ...manifest, version: 999 })) });
    expect(() => parseBackupArchive(bytes)).toThrow('Unsupported backup archive version');
  });

  it('rejects missing attachment payloads', () => {
    const invalid = { ...manifest, attachments: [{ id: 'a1', ownerType: 'TASK', ownerId: 't1', name: 'x.pdf', mimeType: 'application/pdf', size: 1, createdAt: manifest.createdAt }] };
    const bytes = zipSync({ 'manifest.json': strToU8(JSON.stringify(invalid)) });
    expect(() => parseBackupArchive(bytes)).toThrow('Backup attachment data is missing');
  });
});
