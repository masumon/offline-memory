import type { SQLiteDatabase } from 'expo-sqlite';

export const BACKUP_FORMAT_VERSION = 1 as const;

export interface BackupDocument {
  format: 'offline-memory-backup';
  version: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  data: Record<string, unknown>;
}

export async function createBackupDocument(
  db: SQLiteDatabase,
  readData: (db: SQLiteDatabase) => Promise<Record<string, unknown>>,
  exportedAt = new Date().toISOString(),
): Promise<BackupDocument> {
  if (Number.isNaN(Date.parse(exportedAt))) throw new Error('Invalid backup timestamp');
  const data = await readData(db);
  return { format: 'offline-memory-backup', version: BACKUP_FORMAT_VERSION, exportedAt, data };
}
