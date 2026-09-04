import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 13;

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS app_metadata (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL);`);
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 1, new Date().toISOString());
    await db.execAsync(`PRAGMA user_version = 1;`);
  }
  if (currentVersion < 2) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, notes TEXT, status TEXT NOT NULL DEFAULT 'INBOX', priority TEXT NOT NULL DEFAULT 'MEDIUM', due_at TEXT, completed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, CHECK (length(trim(title)) > 0), CHECK (status IN ('INBOX','PLANNED','IN_PROGRESS','COMPLETED','RESCHEDULED','ARCHIVED','CANCELLED')), CHECK (priority IN ('URGENT','HIGH','MEDIUM','LOW')));
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status); CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority); CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at); CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);`);
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 2, new Date().toISOString());
    await db.execAsync(`PRAGMA user_version = 2;`);
  }
  if (currentVersion < 3) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS subtasks (id TEXT PRIMARY KEY NOT NULL, task_id TEXT NOT NULL, title TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, CHECK (length(trim(title)) > 0), CHECK (completed IN (0, 1)), FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE);
      CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id, position);`);
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 3, new Date().toISOString());
    await db.execAsync(`PRAGMA user_version = 3;`);
  }
  if (currentVersion < 4) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY NOT NULL, title TEXT, content TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'NOTE', source TEXT NOT NULL DEFAULT 'USER', tags_json TEXT NOT NULL DEFAULT '[]', importance INTEGER NOT NULL DEFAULT 3, archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_accessed_at TEXT, CHECK (length(trim(content)) > 0), CHECK (kind IN ('NOTE','FACT','PREFERENCE','EVENT','REFLECTION')), CHECK (source IN ('USER','SYSTEM','IMPORTED')), CHECK (importance BETWEEN 1 AND 5), CHECK (archived IN (0, 1)));
      CREATE INDEX IF NOT EXISTS idx_memories_kind ON memories(kind); CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance); CREATE INDEX IF NOT EXISTS idx_memories_updated_at ON memories(updated_at); CREATE INDEX IF NOT EXISTS idx_memories_archived ON memories(archived);`);
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 4, new Date().toISOString());
    await db.execAsync(`PRAGMA user_version = 4;`);
  }
  if (currentVersion < 5) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS notification_deliveries (task_id TEXT NOT NULL, due_at TEXT NOT NULL, delivered_at TEXT NOT NULL, PRIMARY KEY (task_id, due_at), FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE);
      CREATE INDEX IF NOT EXISTS idx_notification_deliveries_delivered_at ON notification_deliveries(delivered_at);`);
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 5, new Date().toISOString());
    await db.execAsync(`PRAGMA user_version = 5;`);
  }
  if (currentVersion < 6) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(tasks);');
    if (!columns.some((column) => column.name === 'planned_date')) await db.execAsync('ALTER TABLE tasks ADD COLUMN planned_date TEXT;');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_planned_date ON tasks(planned_date);');
    await db.execAsync('UPDATE tasks SET planned_date = substr(due_at, 1, 10) WHERE planned_date IS NULL AND due_at IS NOT NULL;');
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 6, new Date().toISOString());
    await db.execAsync(`PRAGMA user_version = 6;`);
  }
  if (currentVersion < 7) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS app_preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`);
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 7, new Date().toISOString());
    await db.execAsync(`PRAGMA user_version = 7;`);
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
    await db.execAsync(`PRAGMA user_version = 8;`);
  }
  if (currentVersion < 9) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(tasks);');
    if (!columns.some((column) => column.name === 'recurrence')) {
      await db.execAsync("ALTER TABLE tasks ADD COLUMN recurrence TEXT;");
    }
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 9, new Date().toISOString());
    await db.execAsync(`PRAGMA user_version = 9;`);
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
    await db.execAsync(`PRAGMA user_version = 10;`);
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
    await db.execAsync(`PRAGMA user_version = 11;`);
  }
  if (currentVersion < 12) {
    // Soft delete → a 30-day recovery trash. `deleted_at` NULL means live; a timestamp
    // means it's in the bin. Every read query filters `deleted_at IS NULL`; an auto-purge
    // on launch hard-removes rows past 30 days.
    const taskCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(tasks);');
    if (!taskCols.some((c) => c.name === 'deleted_at')) await db.execAsync('ALTER TABLE tasks ADD COLUMN deleted_at TEXT;');
    const memCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(memories);');
    if (!memCols.some((c) => c.name === 'deleted_at')) await db.execAsync('ALTER TABLE memories ADD COLUMN deleted_at TEXT;');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_memories_deleted_at ON memories(deleted_at);');
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 12, new Date().toISOString());
    await db.execAsync(`PRAGMA user_version = 12;`);
  }
  if (currentVersion < 13) {
    // ── Personal Debt & Receivable module ──────────────────────────────────────
    // A fully isolated data domain: every table is `dr_` prefixed, nothing here
    // touches tasks / memories / any existing feature. All money is stored as an
    // integer number of minor units (paisa) — never a float. Paid / remaining /
    // outstanding / status are ALWAYS derived from `dr_transactions`; they are
    // never stored, so the ledger is the single source of truth.
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS dr_people (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        relationship TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS dr_accounts (
        id TEXT PRIMARY KEY NOT NULL,
        direction TEXT NOT NULL,                 -- 'DEBT' | 'RECEIVABLE'
        person_id TEXT NOT NULL REFERENCES dr_people(id),
        title TEXT,
        principal_paisa INTEGER NOT NULL,
        opened_date TEXT,
        opened_date_text TEXT,                   -- original text when a real date can't be parsed
        interest_type TEXT NOT NULL DEFAULT 'NONE',   -- NONE | FLAT_TOTAL | SIMPLE | COMPOUND | MONTHLY_FLAT
        interest_rate_bps INTEGER,               -- basis points (1% = 100)
        interest_period TEXT,                    -- YEAR | MONTH | WEEK | DAY  (accrual base for SIMPLE/COMPOUND)
        compound_period TEXT,                    -- YEAR | MONTH | WEEK | DAY  (compounding frequency)
        manual_total_payable_paisa INTEGER,     -- when interest_type = FLAT_TOTAL
        first_due_date TEXT,
        final_due_date TEXT,
        purpose TEXT,
        priority TEXT NOT NULL DEFAULT 'MEDIUM', -- CRITICAL | HIGH | MEDIUM | LOW
        priority_rank INTEGER,                   -- manual order for the CUSTOM strategy
        status TEXT NOT NULL DEFAULT 'ACTIVE',   -- ACTIVE|PARTIAL|OVERDUE|COMPLETED|CANCELLED|SETTLED|WRITTEN_OFF
        settled_paisa INTEGER,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS dr_installments (
        id TEXT PRIMARY KEY NOT NULL,
        account_id TEXT NOT NULL REFERENCES dr_accounts(id),
        seq INTEGER NOT NULL,
        due_date TEXT,
        amount_paisa INTEGER NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS dr_transactions (
        id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL,                      -- NEW_DEBT|NEW_RECEIVABLE|PAYMENT|RECEIPT|ADJUSTMENT|REVERSAL|SETTLEMENT|WRITE_OFF|INTEREST_ACCRUAL
        account_id TEXT NOT NULL REFERENCES dr_accounts(id),
        person_id TEXT NOT NULL REFERENCES dr_people(id),
        amount_paisa INTEGER NOT NULL,           -- always positive; direction implied by kind / adj_sign
        adj_sign INTEGER,                        -- +1 or -1 for ADJUSTMENT
        txn_date TEXT NOT NULL,
        method TEXT,
        reference TEXT,
        note TEXT,
        reverses_txn_id TEXT REFERENCES dr_transactions(id),
        reversed INTEGER NOT NULL DEFAULT 0,     -- 1 once reversed → excluded from every calculation
        created_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS dr_allocations (
        id TEXT PRIMARY KEY NOT NULL,
        transaction_id TEXT NOT NULL REFERENCES dr_transactions(id),
        installment_id TEXT REFERENCES dr_installments(id),
        amount_paisa INTEGER NOT NULL,
        role TEXT NOT NULL DEFAULT 'INSTALLMENT' -- INSTALLMENT | PRINCIPAL | ADVANCE | INTEREST
      );

      CREATE TABLE IF NOT EXISTS dr_transaction_sources (
        id TEXT PRIMARY KEY NOT NULL,
        transaction_id TEXT NOT NULL REFERENCES dr_transactions(id),
        source_key TEXT NOT NULL,                -- SALARY | SAVINGS | BORROWED | ... | custom
        amount_paisa INTEGER NOT NULL,
        linked_account_id TEXT REFERENCES dr_accounts(id),  -- BORROWED → the debt that funded this payment
        note TEXT
      );

      CREATE TABLE IF NOT EXISTS dr_promises (
        id TEXT PRIMARY KEY NOT NULL,
        account_id TEXT NOT NULL REFERENCES dr_accounts(id),
        amount_paisa INTEGER NOT NULL,
        promised_date TEXT NOT NULL,
        follow_up_date TEXT,
        status TEXT NOT NULL DEFAULT 'OPEN',     -- OPEN | FULFILLED | BROKEN
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS dr_targets (
        id TEXT PRIMARY KEY NOT NULL,
        period_type TEXT NOT NULL,               -- MONTH | YEAR
        period_key TEXT NOT NULL,                -- '2026-09' | '2026'
        kind TEXT NOT NULL DEFAULT 'REPAYMENT',  -- REPAYMENT | REDUCTION_PCT | CLOSE_COUNT
        target_value INTEGER NOT NULL,           -- paisa, or pct×100, or a count
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(period_type, period_key, kind)
      );

      CREATE TABLE IF NOT EXISTS dr_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);

      CREATE TABLE IF NOT EXISTS dr_attachments (
        id TEXT PRIMARY KEY NOT NULL,
        owner_type TEXT NOT NULL,                -- ACCOUNT | TRANSACTION
        owner_id TEXT NOT NULL,
        name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER,
        uri TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS dr_audit (
        id TEXT PRIMARY KEY NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        field TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        action TEXT NOT NULL,                    -- CREATE | UPDATE | DELETE | REVERSE
        at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_dr_people_deleted ON dr_people(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_dr_accounts_person ON dr_accounts(person_id);
      CREATE INDEX IF NOT EXISTS idx_dr_accounts_dir_status ON dr_accounts(direction, status);
      CREATE INDEX IF NOT EXISTS idx_dr_accounts_deleted ON dr_accounts(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_dr_installments_account ON dr_installments(account_id, seq);
      CREATE INDEX IF NOT EXISTS idx_dr_txn_account ON dr_transactions(account_id, txn_date);
      CREATE INDEX IF NOT EXISTS idx_dr_txn_person ON dr_transactions(person_id, txn_date);
      CREATE INDEX IF NOT EXISTS idx_dr_txn_kind_date ON dr_transactions(kind, txn_date);
      CREATE INDEX IF NOT EXISTS idx_dr_txn_deleted ON dr_transactions(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_dr_alloc_txn ON dr_allocations(transaction_id);
      CREATE INDEX IF NOT EXISTS idx_dr_alloc_inst ON dr_allocations(installment_id);
      CREATE INDEX IF NOT EXISTS idx_dr_src_txn ON dr_transaction_sources(transaction_id);
      CREATE INDEX IF NOT EXISTS idx_dr_src_linked ON dr_transaction_sources(linked_account_id);
      CREATE INDEX IF NOT EXISTS idx_dr_promises_account ON dr_promises(account_id, promised_date);
      CREATE INDEX IF NOT EXISTS idx_dr_attach_owner ON dr_attachments(owner_type, owner_id);
      CREATE INDEX IF NOT EXISTS idx_dr_audit_entity ON dr_audit(entity_type, entity_id);
    `);
    await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', 13, new Date().toISOString());
    await db.execAsync(`PRAGMA user_version = 13;`);
  }
  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
}

export { DATABASE_VERSION };
