import type { SQLiteDatabase } from 'expo-sqlite';
import { parseM7BackupDocument, type BackupDocument } from '../backup/m7-format';
import { restoreSQLiteBackupData } from '../backup/sqlite-restore';

export type RestoreBackupDocument = BackupDocument;

export function validateBackupDocument(input: unknown): RestoreBackupDocument {
  return parseM7BackupDocument(input);
}

/** Restores the complete validated SQLite backup, including attachment binaries for v2. */
export async function restoreBackupDocument(db: SQLiteDatabase, input: unknown): Promise<void> {
  await restoreSQLiteBackupData(db, validateBackupDocument(input));
}
