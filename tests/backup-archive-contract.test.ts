import { strToU8, zipSync } from 'fflate';
import { BACKUP_ARCHIVE_FORMAT, BACKUP_ARCHIVE_VERSION, bytesToBase64, parseBackupArchive } from '../src/services/backup-archive-service';

describe('attachment backup archive contract', () => {
  const validManifest = {
    format: BACKUP_ARCHIVE_FORMAT,
    version: BACKUP_ARCHIVE_VERSION,
    createdAt: '2026-08-25T00:00:00.000Z',
    data: {
      schemaVersion: 8,
      appMetadata: [],
      appPreferences: [],
      tasks: [{ id: 'task-1' }],
      subtasks: [],
      memories: [],
      notificationDeliveries: [],
    },
    attachments: [{
      id: 'attachment-1',
      ownerType: 'TASK',
      ownerId: 'task-1',
      name: 'note.txt',
      mimeType: 'text/plain',
      size: 5,
      createdAt: '2026-08-25T00:00:00.000Z',
    }],
  } as const;

  it('accepts an attachment archive with matching binary payload', () => {
    const payload = strToU8('hello');
    const archive = zipSync({
      'manifest.json': strToU8(JSON.stringify(validManifest)),
      'attachments/attachment-1': payload,
    });
    expect(parseBackupArchive(archive).attachments).toHaveLength(1);
  });

  it('rejects an attachment archive when the binary payload is missing', () => {
    const archive = zipSync({ 'manifest.json': strToU8(JSON.stringify(validManifest)) });
    expect(() => parseBackupArchive(archive)).toThrow('Backup attachment data is missing: attachment-1');
  });

  it('rejects an attachment archive when the binary size is inconsistent', () => {
    const archive = zipSync({
      'manifest.json': strToU8(JSON.stringify(validManifest)),
      'attachments/attachment-1': strToU8('no'),
    });
    expect(() => parseBackupArchive(archive)).toThrow('Backup attachment size mismatch: attachment-1');
  });

  it('keeps binary base64 conversion lossless', () => {
    const bytes = strToU8('offline-memory-attachment');
    expect(bytesToBase64(bytes)).toBe('b2ZmbGluZS1tZW1vcnktYXR0YWNobWVudA==');
  });
});
