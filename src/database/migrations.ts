import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 3;

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS app_metadata (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    await db.runAsync(
      'INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)',
      1,
      new Date().toISOString(),
    );
  }

  if (currentVersion < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'INBOX',
        priority TEXT NOT NULL DEFAULT 'MEDIUM',
        due_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK (length(trim(title)) > 0),
        CHECK (status IN ('INBOX','PLANNED','IN_PROGRESS','COMPLETED','RESCHEDULED','ARCHIVED','CANCELLED')),
        CHECK (priority IN ('URGENT','HIGH','MEDIUM','LOW'))
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
      CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
    `);

    await db.runAsync(
      'INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)',
      2,
      new Date().toISOString(),
    );
  }

  if (currentVersion < 3) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS subtasks (
        id TEXT PRIMARY KEY NOT NULL,
        task_id TEXT NOT NULL,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK (length(trim(title)) > 0),
        CHECK (completed IN (0, 1)),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id, position);
    `);

    await db.runAsync(
      'INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)',
      3,
      new Date().toISOString(),
    );

    await db.execAsync('PRAGMA user_version = 3;');
  }
}

export { DATABASE_VERSION };
