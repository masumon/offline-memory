import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 11;

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS app_metadata (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL);`);
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 1, new Date().toISOString());
  }
  if (currentVersion < 2) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, notes TEXT, status TEXT NOT NULL DEFAULT 'INBOX', priority TEXT NOT NULL DEFAULT 'MEDIUM', due_at TEXT, completed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, CHECK (length(trim(title)) > 0), CHECK (status IN ('INBOX','PLANNED','IN_PROGRESS','COMPLETED','RESCHEDULED','ARCHIVED','CANCELLED')), CHECK (priority IN ('URGENT','HIGH','MEDIUM','LOW')));
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status); CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority); CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at); CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);`);
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 2, new Date().toISOString());
  }
  if (currentVersion < 3) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS subtasks (id TEXT PRIMARY KEY NOT NULL, task_id TEXT NOT NULL, title TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, CHECK (length(trim(title)) > 0), CHECK (completed IN (0, 1)), FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE);
      CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id, position);`);
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 3, new Date().toISOString());
  }
  if (currentVersion < 4) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY NOT NULL, title TEXT, content TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'NOTE', source TEXT NOT NULL DEFAULT 'USER', tags_json TEXT NOT NULL DEFAULT '[]', importance INTEGER NOT NULL DEFAULT 3, archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_accessed_at TEXT, CHECK (length(trim(content)) > 0), CHECK (kind IN ('NOTE','FACT','PREFERENCE','EVENT','REFLECTION')), CHECK (source IN ('USER','SYSTEM','IMPORTED')), CHECK (importance BETWEEN 1 AND 5), CHECK (archived IN (0, 1)));
      CREATE INDEX IF NOT EXISTS idx_memories_kind ON memories(kind); CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance); CREATE INDEX IF NOT EXISTS idx_memories_updated_at ON memories(updated_at); CREATE INDEX IF NOT EXISTS idx_memories_archived ON memories(archived);`);
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 4, new Date().toISOString());
  }
  if (currentVersion < 5) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS notification_deliveries (task_id TEXT NOT NULL, due_at TEXT NOT NULL, delivered_at TEXT NOT NULL, PRIMARY KEY (task_id, due_at), FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE);
      CREATE INDEX IF NOT EXISTS idx_notification_deliveries_delivered_at ON notification_deliveries(delivered_at);`);
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 5, new Date().toISOString());
  }
  if (currentVersion < 6) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(tasks);');
    if (!columns.some((column) => column.name === 'planned_date')) await db.execAsync('ALTER TABLE tasks ADD COLUMN planned_date TEXT;');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_planned_date ON tasks(planned_date);');
    await db.execAsync('UPDATE tasks SET planned_date = substr(due_at, 1, 10) WHERE planned_date IS NULL AND due_at IS NOT NULL;');
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 6, new Date().toISOString());
  }
  if (currentVersion < 7) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS app_preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`);
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 7, new Date().toISOString());
  }
  if (currentVersion < 8) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY NOT NULL,
      owner_type TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      size INTEGER,
      uri TEXT NOT NULL,
      created_at TEXT NOT NULL,
      CHECK (owner_type IN ('TASK','MEMORY'))
    );
    CREATE INDEX IF NOT EXISTS idx_attachments_owner ON attachments(owner_type, owner_id);
    CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON attachments(created_at);`);
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 8, new Date().toISOString());
  }
  if (currentVersion < 9) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(tasks);');
    if (!columns.some((column) => column.name === 'recurrence')) {
      await db.execAsync("ALTER TABLE tasks ADD COLUMN recurrence TEXT;");
    }
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 9, new Date().toISOString());
  }
  if (currentVersion < 10) {
    // On-device learning: local, per-user statistics that make capture smarter over time.
    // No content is ever sent anywhere; rows are plain counters.
    await db.execAsync(`CREATE TABLE IF NOT EXISTS learning (
      kind TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL DEFAULT '',
      count INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (kind, key, value),
      CHECK (kind IN ('time_pattern','intent_correction','frequent_task','tag_pair','dismissed_suggestion'))
    );
    CREATE INDEX IF NOT EXISTS idx_learning_kind ON learning(kind, count DESC);`);
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 10, new Date().toISOString());
  }
  if (currentVersion < 11) {
    // Explicit task ↔ memory links. Stored canonically (task on the "from" side,
    // memory on the "to" side) so both directions are a single indexed lookup.
    await db.execAsync(`CREATE TABLE IF NOT EXISTS relations (
      id TEXT PRIMARY KEY NOT NULL,
      from_type TEXT NOT NULL,
      from_id TEXT NOT NULL,
      to_type TEXT NOT NULL,
      to_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      CHECK (from_type IN ('TASK','MEMORY')),
      CHECK (to_type IN ('TASK','MEMORY')),
      UNIQUE (from_type, from_id, to_type, to_id)
    );
    CREATE INDEX IF NOT EXISTS idx_relations_from ON relations(from_type, from_id);
    CREATE INDEX IF NOT EXISTS idx_relations_to ON relations(to_type, to_id);`);
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 11, new Date().toISOString());
  }
  await db.execAsync('PRAGMA user_version = 11;');
}

export { DATABASE_VERSION };
