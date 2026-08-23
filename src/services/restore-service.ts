import type { SQLiteDatabase } from 'expo-sqlite';
import { BACKUP_FORMAT_VERSION, type BackupDocument } from './backup-service';

export function validateBackupDocument(input: unknown): BackupDocument {
  if (!input || typeof input !== 'object') throw new Error('Backup must be an object');
  const value = input as Record<string, unknown>;
  if (value.format !== 'offline-memory-backup') throw new Error('Unsupported backup format');
  if (value.version !== BACKUP_FORMAT_VERSION) throw new Error('Unsupported backup version');
  if (typeof value.exportedAt !== 'string' || Number.isNaN(Date.parse(value.exportedAt))) throw new Error('Invalid backup timestamp');
  if (!value.data || typeof value.data !== 'object' || Array.isArray(value.data)) throw new Error('Backup data must be an object');
  return value as unknown as BackupDocument;
}

export async function restoreBackupDocument(
  db: SQLiteDatabase,
  input: unknown,
  apply: (db: SQLiteDatabase, data: Record<string, unknown>) => Promise<void>,
): Promise<void> {
  const backup = validateBackupDocument(input);
  await db.withTransactionAsync(async () => {
    await apply(db, backup.data);
  });
}
