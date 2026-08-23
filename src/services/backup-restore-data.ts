import type { SQLiteDatabase } from 'expo-sqlite';

export interface BackupDataReaders {
  tasks: (db: SQLiteDatabase) => Promise<unknown[]>;
  memories: (db: SQLiteDatabase) => Promise<unknown[]>;
}

export async function readBackupData(db: SQLiteDatabase, readers: BackupDataReaders) {
  const [tasks, memories] = await Promise.all([readers.tasks(db), readers.memories(db)]);
  return { tasks, memories };
}
