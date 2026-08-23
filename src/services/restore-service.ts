import type { SQLiteDatabase } from 'expo-sqlite';
import { parseM7BackupDocument, type M7BackupDocument } from '../backup/m7-format';
import { restoreSQLiteBackupData } from '../backup/sqlite-restore';

export type BackupDocument = M7BackupDocument;

export function validateBackupDocument(input: unknown): BackupDocument {
  return parseM7BackupDocument(input);
}

/** Restores the complete validated SQLite backup in one transaction. */
export async function restoreBackupDocument(db: SQLiteDatabase, input: unknown): Promise<void> {
  await restoreSQLiteBackupData(db, validateBackupDocument(input));
}
