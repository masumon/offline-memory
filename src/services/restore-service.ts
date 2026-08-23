import type { SQLiteDatabase } from 'expo-sqlite';
import { parseM7BackupDocument, type M7BackupDocument } from '../backup/m7-format';

export type BackupDocument = M7BackupDocument;

export function validateBackupDocument(input: unknown): BackupDocument {
  return parseM7BackupDocument(input);
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
