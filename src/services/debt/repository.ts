// Raw SQLite access for the Personal Debt & Receivable module. One file, one row-mapper
// per table, thin CRUD. No business rules here — those live in debt-service.ts. Every
// read excludes soft-deleted rows (`deleted_at IS NULL`) where the column exists.

import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  Account,
  Allocation,
  CreateAccountInput,
  CreatePersonInput,
  Installment,
  Person,
  PromiseToPay,
  Target,
  Transaction,
  TransactionSource,
  TxnKind,
} from './types';

const now = () => new Date().toISOString();
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

type Row = Record<string, unknown>;
const str = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
const int = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const reqStr = (v: unknown): string => String(v ?? '');
const reqInt = (v: unknown): number => Number(v ?? 0);
const bool = (v: unknown): boolean => Number(v ?? 0) === 1;

// ── people ─────────────────────────────────────────────────────────────────────

function toPerson(r: Row): Person {
  return {
    id: reqStr(r.id), name: reqStr(r.name), phone: str(r.phone), address: str(r.address),
    relationship: str(r.relationship), notes: str(r.notes),
    createdAt: reqStr(r.created_at), updatedAt: reqStr(r.updated_at), deletedAt: str(r.deleted_at),
  };
}

export async function createPerson(db: SQLiteDatabase, input: CreatePersonInput): Promise<Person> {
  const name = input.name.trim();
  if (!name) throw new Error('ব্যক্তির নাম দিন / Name is required');
  const id = uid('per');
  const ts = now();
  await db.runAsync(
    `INSERT INTO dr_people (id, name, phone, address, relationship, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id, name, input.phone?.trim() || null, input.address?.trim() || null,
    input.relationship?.trim() || null, input.notes?.trim() || null, ts, ts,
  );
  return (await getPerson(db, id))!;
}

export async function getPerson(db: SQLiteDatabase, id: string): Promise<Person | null> {
  const r = await db.getFirstAsync<Row>('SELECT * FROM dr_people WHERE id = ? AND deleted_at IS NULL LIMIT 1', id);
  return r ? toPerson(r) : null;
}

export async function listPeople(db: SQLiteDatabase): Promise<Person[]> {
  const rows = await db.getAllAsync<Row>('SELECT * FROM dr_people WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE ASC');
  return rows.map(toPerson);
}

export async function updatePerson(db: SQLiteDatabase, id: string, patch: Partial<CreatePersonInput>): Promise<Person | null> {
  const cur = await getPerson(db, id);
  if (!cur) return null;
  const next = {
    name: patch.name?.trim() ?? cur.name,
    phone: patch.phone === undefined ? cur.phone : (patch.phone?.trim() || null),
    address: patch.address === undefined ? cur.address : (patch.address?.trim() || null),
    relationship: patch.relationship === undefined ? cur.relationship : (patch.relationship?.trim() || null),
    notes: patch.notes === undefined ? cur.notes : (patch.notes?.trim() || null),
  };
  if (!next.name) throw new Error('ব্যক্তির নাম দিন / Name is required');
  await db.runAsync(
    `UPDATE dr_people SET name=?, phone=?, address=?, relationship=?, notes=?, updated_at=? WHERE id=?`,
    next.name, next.phone, next.address, next.relationship, next.notes, now(), id,
  );
  return getPerson(db, id);
}

export async function softDeletePerson(db: SQLiteDatabase, id: string): Promise<boolean> {
  // Guard: a person with any live account can't be removed (would orphan money records).
  const live = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM dr_accounts WHERE person_id = ? AND deleted_at IS NULL', id,
  );
  if ((live?.n ?? 0) > 0) throw new Error('এই ব্যক্তির সক্রিয় হিসাব আছে / This person still has accounts');
  const r = await db.runAsync('UPDATE dr_people SET deleted_at=?, updated_at=? WHERE id=? AND deleted_at IS NULL', now(), now(), id);
  return (r.changes ?? 0) > 0;
}

// ── accounts ───────────────────────────────────────────────────────────────────

function toAccount(r: Row): Account {
  return {
    id: reqStr(r.id), direction: reqStr(r.direction) as Account['direction'], personId: reqStr(r.person_id),
    title: str(r.title), principalPaisa: reqInt(r.principal_paisa),
    openedDate: str(r.opened_date), openedDateText: str(r.opened_date_text),
    interestType: reqStr(r.interest_type) as Account['interestType'],
    interestRateBps: int(r.interest_rate_bps),
    interestPeriod: str(r.interest_period) as Account['interestPeriod'],
    compoundPeriod: str(r.compound_period) as Account['compoundPeriod'],
    manualTotalPayablePaisa: int(r.manual_total_payable_paisa),
    firstDueDate: str(r.first_due_date), finalDueDate: str(r.final_due_date),
    purpose: str(r.purpose), priority: reqStr(r.priority) as Account['priority'],
    priorityRank: int(r.priority_rank), status: reqStr(r.status) as Account['status'],
    settledPaisa: int(r.settled_paisa), notes: str(r.notes),
    createdAt: reqStr(r.created_at), updatedAt: reqStr(r.updated_at), deletedAt: str(r.deleted_at),
  };
}

export async function insertAccount(db: SQLiteDatabase, input: CreateAccountInput): Promise<Account> {
  if (!Number.isSafeInteger(input.principalPaisa) || input.principalPaisa <= 0) {
    throw new Error('মূল টাকার পরিমাণ সঠিক নয় / Principal amount is invalid');
  }
  const id = uid('acc');
  const ts = now();
  await db.runAsync(
    `INSERT INTO dr_accounts
       (id, direction, person_id, title, principal_paisa, opened_date, opened_date_text,
        interest_type, interest_rate_bps, interest_period, compound_period, manual_total_payable_paisa,
        first_due_date, final_due_date, purpose, priority, priority_rank, status, settled_paisa,
        notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id, input.direction, input.personId, input.title?.trim() || null, input.principalPaisa,
    input.openedDate ?? null, input.openedDateText ?? null,
    input.interestType ?? 'NONE', input.interestRateBps ?? null, input.interestPeriod ?? null,
    input.compoundPeriod ?? null, input.manualTotalPayablePaisa ?? null,
    input.firstDueDate ?? null, input.finalDueDate ?? null, input.purpose?.trim() || null,
    input.priority ?? 'MEDIUM', input.priorityRank ?? null, 'ACTIVE', null,
    input.notes?.trim() || null, ts, ts,
  );
  return (await getAccount(db, id))!;
}

export async function getAccount(db: SQLiteDatabase, id: string): Promise<Account | null> {
  const r = await db.getFirstAsync<Row>('SELECT * FROM dr_accounts WHERE id = ? AND deleted_at IS NULL LIMIT 1', id);
  return r ? toAccount(r) : null;
}

export async function listAccounts(
  db: SQLiteDatabase,
  filter: { direction?: Account['direction']; personId?: string } = {},
): Promise<Account[]> {
  const where = ['deleted_at IS NULL'];
  const args: (string | number | null)[] = [];
  if (filter.direction) { where.push('direction = ?'); args.push(filter.direction); }
  if (filter.personId) { where.push('person_id = ?'); args.push(filter.personId); }
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM dr_accounts WHERE ${where.join(' AND ')} ORDER BY created_at DESC`, ...args,
  );
  return rows.map(toAccount);
}

export async function patchAccount(db: SQLiteDatabase, id: string, fields: Partial<Record<
  'title' | 'openedDate' | 'openedDateText' | 'interestType' | 'interestRateBps' | 'interestPeriod'
  | 'compoundPeriod' | 'manualTotalPayablePaisa' | 'firstDueDate' | 'finalDueDate' | 'purpose'
  | 'priority' | 'priorityRank' | 'status' | 'settledPaisa' | 'notes' | 'principalPaisa', unknown>>): Promise<Account | null> {
  const map: Record<string, string> = {
    title: 'title', openedDate: 'opened_date', openedDateText: 'opened_date_text', interestType: 'interest_type',
    interestRateBps: 'interest_rate_bps', interestPeriod: 'interest_period', compoundPeriod: 'compound_period',
    manualTotalPayablePaisa: 'manual_total_payable_paisa', firstDueDate: 'first_due_date', finalDueDate: 'final_due_date',
    purpose: 'purpose', priority: 'priority', priorityRank: 'priority_rank', status: 'status',
    settledPaisa: 'settled_paisa', notes: 'notes', principalPaisa: 'principal_paisa',
  };
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  for (const [k, v] of Object.entries(fields)) {
    const col = map[k];
    if (!col) continue;
    sets.push(`${col} = ?`);
    args.push((v ?? null) as string | number | null);
  }
  if (!sets.length) return getAccount(db, id);
  sets.push('updated_at = ?');
  args.push(now(), id);
  await db.runAsync(`UPDATE dr_accounts SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`, ...args);
  return getAccount(db, id);
}

export async function softDeleteAccount(db: SQLiteDatabase, id: string): Promise<boolean> {
  const ts = now();
  const r = await db.runAsync('UPDATE dr_accounts SET deleted_at=?, updated_at=? WHERE id=? AND deleted_at IS NULL', ts, ts, id);
  if ((r.changes ?? 0) > 0) {
    await db.runAsync('UPDATE dr_transactions SET deleted_at=? WHERE account_id=? AND deleted_at IS NULL', ts, id);
  }
  return (r.changes ?? 0) > 0;
}

// ── installments ───────────────────────────────────────────────────────────────

function toInstallment(r: Row): Installment {
  return {
    id: reqStr(r.id), accountId: reqStr(r.account_id), seq: reqInt(r.seq),
    dueDate: str(r.due_date), amountPaisa: reqInt(r.amount_paisa), note: str(r.note),
    createdAt: reqStr(r.created_at), updatedAt: reqStr(r.updated_at),
  };
}

export async function replaceInstallments(
  db: SQLiteDatabase, accountId: string,
  plan: { seq: number; dueDate?: string | null; amountPaisa: number; note?: string | null }[],
): Promise<void> {
  await db.runAsync('DELETE FROM dr_installments WHERE account_id = ?', accountId);
  const ts = now();
  for (const p of plan) {
    if (p.amountPaisa <= 0) continue;
    await db.runAsync(
      `INSERT INTO dr_installments (id, account_id, seq, due_date, amount_paisa, note, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      uid('ins'), accountId, p.seq, p.dueDate ?? null, p.amountPaisa, p.note?.trim() || null, ts, ts,
    );
  }
}

export async function listInstallments(db: SQLiteDatabase, accountId: string): Promise<Installment[]> {
  const rows = await db.getAllAsync<Row>('SELECT * FROM dr_installments WHERE account_id = ? ORDER BY seq ASC', accountId);
  return rows.map(toInstallment);
}

// ── transactions + allocations + sources ───────────────────────────────────────

function toTransaction(r: Row): Transaction {
  return {
    id: reqStr(r.id), kind: reqStr(r.kind) as TxnKind, accountId: reqStr(r.account_id), personId: reqStr(r.person_id),
    amountPaisa: reqInt(r.amount_paisa), adjSign: int(r.adj_sign) as 1 | -1 | null, txnDate: reqStr(r.txn_date),
    method: str(r.method), reference: str(r.reference), note: str(r.note),
    reversesTxnId: str(r.reverses_txn_id), reversed: bool(r.reversed),
    createdAt: reqStr(r.created_at), deletedAt: str(r.deleted_at),
  };
}
function toAllocation(r: Row): Allocation {
  return {
    id: reqStr(r.id), transactionId: reqStr(r.transaction_id), installmentId: str(r.installment_id),
    amountPaisa: reqInt(r.amount_paisa), role: reqStr(r.role) as Allocation['role'],
  };
}
function toSource(r: Row): TransactionSource {
  return {
    id: reqStr(r.id), transactionId: reqStr(r.transaction_id), sourceKey: reqStr(r.source_key),
    amountPaisa: reqInt(r.amount_paisa), linkedAccountId: str(r.linked_account_id), note: str(r.note),
  };
}

export interface InsertTxnInput {
  kind: TxnKind;
  accountId: string;
  personId: string;
  amountPaisa: number;
  txnDate: string;
  adjSign?: 1 | -1 | null;
  method?: string | null;
  reference?: string | null;
  note?: string | null;
  reversesTxnId?: string | null;
  allocations?: { installmentId?: string | null; amountPaisa: number; role?: Allocation['role'] }[];
  sources?: { sourceKey: string; amountPaisa: number; linkedAccountId?: string | null; note?: string | null }[];
}

/** Insert one ledger row plus its allocation and source child rows, atomically. */
export async function insertTransaction(db: SQLiteDatabase, input: InsertTxnInput): Promise<Transaction> {
  const id = uid('txn');
  const ts = now();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO dr_transactions
         (id, kind, account_id, person_id, amount_paisa, adj_sign, txn_date, method, reference, note,
          reverses_txn_id, reversed, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,0,?)`,
      id, input.kind, input.accountId, input.personId, input.amountPaisa, input.adjSign ?? null,
      input.txnDate, input.method ?? null, input.reference ?? null, input.note ?? null,
      input.reversesTxnId ?? null, ts,
    );
    for (const a of input.allocations ?? []) {
      if (a.amountPaisa <= 0) continue;
      await db.runAsync(
        `INSERT INTO dr_allocations (id, transaction_id, installment_id, amount_paisa, role) VALUES (?,?,?,?,?)`,
        uid('alc'), id, a.installmentId ?? null, a.amountPaisa, a.role ?? (a.installmentId ? 'INSTALLMENT' : 'PRINCIPAL'),
      );
    }
    for (const s of input.sources ?? []) {
      if (s.amountPaisa <= 0) continue;
      await db.runAsync(
        `INSERT INTO dr_transaction_sources (id, transaction_id, source_key, amount_paisa, linked_account_id, note)
         VALUES (?,?,?,?,?,?)`,
        uid('src'), id, s.sourceKey, s.amountPaisa, s.linkedAccountId ?? null, s.note ?? null,
      );
    }
  });
  return (await db.getFirstAsync<Row>('SELECT * FROM dr_transactions WHERE id = ?', id).then((r) => (r ? toTransaction(r) : null)))!;
}

export async function listAccountTransactions(db: SQLiteDatabase, accountId: string): Promise<Transaction[]> {
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM dr_transactions WHERE account_id = ? AND deleted_at IS NULL ORDER BY txn_date ASC, created_at ASC', accountId,
  );
  return rows.map(toTransaction);
}

export async function listAccountAllocations(db: SQLiteDatabase, accountId: string): Promise<Allocation[]> {
  const rows = await db.getAllAsync<Row>(
    `SELECT al.* FROM dr_allocations al
     JOIN dr_transactions t ON t.id = al.transaction_id
     WHERE t.account_id = ? AND t.deleted_at IS NULL AND t.reversed = 0`, accountId,
  );
  return rows.map(toAllocation);
}

export async function listTransactionSources(db: SQLiteDatabase, transactionId: string): Promise<TransactionSource[]> {
  const rows = await db.getAllAsync<Row>('SELECT * FROM dr_transaction_sources WHERE transaction_id = ?', transactionId);
  return rows.map(toSource);
}

export async function markTransactionReversed(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('UPDATE dr_transactions SET reversed = 1 WHERE id = ?', id);
}

export async function listLedger(
  db: SQLiteDatabase,
  opts: { limit?: number; fromDate?: string; toDate?: string } = {},
): Promise<Transaction[]> {
  const where = ['deleted_at IS NULL'];
  const args: (string | number | null)[] = [];
  if (opts.fromDate) { where.push('txn_date >= ?'); args.push(opts.fromDate); }
  if (opts.toDate) { where.push('txn_date <= ?'); args.push(opts.toDate); }
  const limit = Math.max(1, Math.min(opts.limit ?? 200, 1000));
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM dr_transactions WHERE ${where.join(' AND ')} ORDER BY txn_date DESC, created_at DESC LIMIT ?`,
    ...args, limit,
  );
  return rows.map(toTransaction);
}

// ── promises / targets / settings ──────────────────────────────────────────────

function toPromise(r: Row): PromiseToPay {
  return {
    id: reqStr(r.id), accountId: reqStr(r.account_id), amountPaisa: reqInt(r.amount_paisa),
    promisedDate: reqStr(r.promised_date), followUpDate: str(r.follow_up_date),
    status: reqStr(r.status) as PromiseToPay['status'], note: str(r.note),
    createdAt: reqStr(r.created_at), updatedAt: reqStr(r.updated_at),
  };
}
export async function createPromise(
  db: SQLiteDatabase, input: { accountId: string; amountPaisa: number; promisedDate: string; followUpDate?: string | null; note?: string | null },
): Promise<PromiseToPay> {
  const id = uid('pms');
  const ts = now();
  await db.runAsync(
    `INSERT INTO dr_promises (id, account_id, amount_paisa, promised_date, follow_up_date, status, note, created_at, updated_at)
     VALUES (?,?,?,?,?, 'OPEN', ?,?,?)`,
    id, input.accountId, input.amountPaisa, input.promisedDate, input.followUpDate ?? null, input.note ?? null, ts, ts,
  );
  return (await db.getFirstAsync<Row>('SELECT * FROM dr_promises WHERE id = ?', id).then((r) => (r ? toPromise(r) : null)))!;
}
export async function listPromises(db: SQLiteDatabase, accountId?: string): Promise<PromiseToPay[]> {
  const rows = accountId
    ? await db.getAllAsync<Row>('SELECT * FROM dr_promises WHERE account_id = ? ORDER BY promised_date ASC', accountId)
    : await db.getAllAsync<Row>('SELECT * FROM dr_promises ORDER BY promised_date ASC');
  return rows.map(toPromise);
}
export async function setPromiseStatus(db: SQLiteDatabase, id: string, status: PromiseToPay['status']): Promise<void> {
  await db.runAsync('UPDATE dr_promises SET status = ?, updated_at = ? WHERE id = ?', status, now(), id);
}

function toTarget(r: Row): Target {
  return {
    id: reqStr(r.id), periodType: reqStr(r.period_type) as Target['periodType'], periodKey: reqStr(r.period_key),
    kind: reqStr(r.kind) as Target['kind'], targetValue: reqInt(r.target_value), note: str(r.note),
    createdAt: reqStr(r.created_at), updatedAt: reqStr(r.updated_at),
  };
}
export async function upsertTarget(
  db: SQLiteDatabase,
  input: { periodType: Target['periodType']; periodKey: string; kind: Target['kind']; targetValue: number; note?: string | null },
): Promise<Target> {
  const ts = now();
  await db.runAsync(
    `INSERT INTO dr_targets (id, period_type, period_key, kind, target_value, note, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?)
     ON CONFLICT(period_type, period_key, kind) DO UPDATE SET target_value = excluded.target_value, note = excluded.note, updated_at = excluded.updated_at`,
    uid('tgt'), input.periodType, input.periodKey, input.kind, input.targetValue, input.note ?? null, ts, ts,
  );
  const r = await db.getFirstAsync<Row>(
    'SELECT * FROM dr_targets WHERE period_type = ? AND period_key = ? AND kind = ?',
    input.periodType, input.periodKey, input.kind,
  );
  return toTarget(r!);
}
export async function listTargets(db: SQLiteDatabase): Promise<Target[]> {
  const rows = await db.getAllAsync<Row>('SELECT * FROM dr_targets ORDER BY period_key DESC');
  return rows.map(toTarget);
}
export async function getTarget(db: SQLiteDatabase, periodType: Target['periodType'], periodKey: string, kind: Target['kind']): Promise<Target | null> {
  const r = await db.getFirstAsync<Row>(
    'SELECT * FROM dr_targets WHERE period_type = ? AND period_key = ? AND kind = ?', periodType, periodKey, kind,
  );
  return r ? toTarget(r) : null;
}

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const r = await db.getFirstAsync<{ value: string }>('SELECT value FROM dr_settings WHERE key = ?', key);
  return r ? r.value : null;
}
export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO dr_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key, value,
  );
}
export async function allSettings(db: SQLiteDatabase): Promise<Record<string, string>> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM dr_settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

// ── audit ──────────────────────────────────────────────────────────────────────

export async function writeAudit(
  db: SQLiteDatabase,
  entry: { entityType: string; entityId: string; field: string; oldValue?: string | null; newValue?: string | null; action: 'CREATE' | 'UPDATE' | 'DELETE' | 'REVERSE' },
): Promise<void> {
  await db.runAsync(
    `INSERT INTO dr_audit (id, entity_type, entity_id, field, old_value, new_value, action, at)
     VALUES (?,?,?,?,?,?,?,?)`,
    uid('aud'), entry.entityType, entry.entityId, entry.field, entry.oldValue ?? null, entry.newValue ?? null, entry.action, now(),
  );
}

export { uid as newDrId };
