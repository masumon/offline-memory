// Orchestration for the Personal Debt & Receivable module — the layer that keeps the
// "single source of truth" promise (spec §108). Creating a debt writes an account + a
// principal tranche + an installment plan in one go; recording a payment writes the
// ledger row, its installment allocations and its funding sources together; the derived
// balance / portfolio numbers are recomputed from the ledger on demand, never stored.

import type { SQLiteDatabase } from 'expo-sqlite';
import { deriveAccountBalance, derivePortfolio, localDayKey, type AccountLedger, type PortfolioTotals } from './derive';
import { splitEven } from './money';
import * as repo from './repository';
import type {
  Account,
  AccountBalance,
  Allocation,
  TransactionSource,
  CreateAccountInput,
  Direction,
  Installment,
  Person,
  RecordPaymentInput,
  RecordReceiptInput,
  Transaction,
} from './types';

const iso = () => new Date().toISOString();
/** Today, on the device's own calendar — never the UTC day. */
const today = () => localDayKey(iso());

// ── creating debts / receivables ───────────────────────────────────────────────

export interface CreateDebtInput extends Omit<CreateAccountInput, 'direction'> {
  /** convenience: equal installments starting `firstDueDate`, monthly, when `installments` omitted */
  installmentCount?: number;
}

async function createAccountWithPlan(db: SQLiteDatabase, input: CreateAccountInput & { installmentCount?: number }): Promise<Account> {
  const account = await repo.insertAccount(db, input);
  // The principal tranche — the first ledger row for this account.
  await repo.insertTransaction(db, {
    kind: input.direction === 'DEBT' ? 'NEW_DEBT' : 'NEW_RECEIVABLE',
    accountId: account.id,
    personId: input.personId,
    amountPaisa: input.principalPaisa,
    txnDate: input.openedDate ?? today(),
    note: input.title ?? null,
  });
  await repo.writeAudit(db, {
    entityType: 'account', entityId: account.id, field: 'principal',
    newValue: String(input.principalPaisa), action: 'CREATE',
  });

  const plan = buildInstallmentPlan(input);
  if (plan.length) await repo.replaceInstallments(db, account.id, plan);
  return account;
}

export function buildInstallmentPlan(input: CreateAccountInput & { installmentCount?: number }): { seq: number; dueDate: string | null; amountPaisa: number; note?: string | null }[] {
  if (input.installments && input.installments.length) {
    return input.installments
      .filter((i) => i.amountPaisa > 0)
      .map((i, idx) => ({ seq: i.seq || idx + 1, dueDate: i.dueDate ?? null, amountPaisa: i.amountPaisa, note: i.note ?? null }));
  }
  const count = input.installmentCount ?? 0;
  if (count < 1) return [];
  // Total to schedule = the stated flat total if given, else the principal.
  const total = input.interestType === 'FLAT_TOTAL' && input.manualTotalPayablePaisa
    ? input.manualTotalPayablePaisa
    : input.principalPaisa;
  const amounts = splitEven(total, count);
  const start = input.firstDueDate ?? input.openedDate ?? today();
  return amounts.map((amt, i) => ({ seq: i + 1, dueDate: addMonthsIso(start, i), amountPaisa: amt }));
}

function addMonthsIso(startDate: string, months: number): string {
  const d = new Date(startDate.length <= 10 ? `${startDate}T00:00:00` : startDate);
  if (Number.isNaN(d.getTime())) return startDate;
  const targetMonth = d.getMonth() + months;
  const y = d.getFullYear() + Math.floor(targetMonth / 12);
  const m = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const day = Math.min(d.getDate(), lastDay);
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function createDebt(db: SQLiteDatabase, input: CreateDebtInput): Promise<Account> {
  return createAccountWithPlan(db, { ...input, direction: 'DEBT' });
}
export function createReceivable(db: SQLiteDatabase, input: CreateDebtInput): Promise<Account> {
  return createAccountWithPlan(db, { ...input, direction: 'RECEIVABLE' });
}

/** Add another principal tranche to an existing account (borrowed more from the same person). */
export async function topUpAccount(db: SQLiteDatabase, accountId: string, amountPaisa: number, date: string, note?: string): Promise<Transaction> {
  const account = await repo.getAccount(db, accountId);
  if (!account) throw new Error('হিসাব পাওয়া যায়নি / Account not found');
  if (amountPaisa <= 0) throw new Error('পরিমাণ সঠিক নয় / Amount is invalid');
  return repo.insertTransaction(db, {
    kind: account.direction === 'DEBT' ? 'NEW_DEBT' : 'NEW_RECEIVABLE',
    accountId, personId: account.personId, amountPaisa, txnDate: date, note: note ?? null,
  });
}

// ── payments & receipts ────────────────────────────────────────────────────────

/** Fill a payment across the oldest still-unpaid installments first; overflow → advance. */
export async function autoAllocate(
  db: SQLiteDatabase, accountId: string, amountPaisa: number,
): Promise<{ installmentId: string | null; amountPaisa: number; role: 'INSTALLMENT' | 'ADVANCE' }[]> {
  const installments = await repo.listInstallments(db, accountId);
  const allocs = await repo.listAccountAllocations(db, accountId);
  const paidByInst = new Map<string, number>();
  for (const a of allocs) if (a.installmentId) paidByInst.set(a.installmentId, (paidByInst.get(a.installmentId) ?? 0) + a.amountPaisa);

  const out: { installmentId: string | null; amountPaisa: number; role: 'INSTALLMENT' | 'ADVANCE' }[] = [];
  let left = amountPaisa;
  for (const inst of [...installments].sort((a, b) => a.seq - b.seq)) {
    if (left <= 0) break;
    const unpaid = Math.max(0, inst.amountPaisa - (paidByInst.get(inst.id) ?? 0));
    if (unpaid <= 0) continue;
    const take = Math.min(unpaid, left);
    out.push({ installmentId: inst.id, amountPaisa: take, role: 'INSTALLMENT' });
    left -= take;
  }
  if (left > 0) out.push({ installmentId: null, amountPaisa: left, role: 'ADVANCE' });
  return out;
}

export async function recordPayment(db: SQLiteDatabase, input: RecordPaymentInput): Promise<Transaction> {
  const account = await repo.getAccount(db, input.accountId);
  if (!account) throw new Error('হিসাব পাওয়া যায়নি / Account not found');
  if (account.direction !== 'DEBT') throw new Error('এটি দেনা নয় / This is not a debt account');
  if (input.amountPaisa <= 0) throw new Error('পরিমাণ সঠিক নয় / Amount is invalid');

  const allocations = (input.allocations && input.allocations.length
    ? input.allocations.map((a) => ({ installmentId: a.installmentId ?? null, amountPaisa: a.amountPaisa, role: a.role ?? (a.installmentId ? 'INSTALLMENT' as const : 'PRINCIPAL' as const) }))
    : await autoAllocate(db, input.accountId, input.amountPaisa));
  const allocSum = allocations.reduce((s, a) => s + a.amountPaisa, 0);
  if (allocSum !== input.amountPaisa) throw new Error('বণ্টনের যোগফল মিলছে না / Allocations must sum to the payment');

  // Resolve funding sources. A BORROWED line may open (or top up) a debt to the lender —
  // this is the "ধার করে ধার শোধ" case: money moves, but the total debt does not fall.
  const sources: { sourceKey: string; amountPaisa: number; linkedAccountId?: string | null; note?: string | null }[] = [];
  for (const s of input.sources ?? []) {
    if (s.amountPaisa <= 0) continue;
    let linkedAccountId = s.linkedAccountId ?? null;
    if (s.sourceKey === 'BORROWED') {
      if (s.newBorrowAccount) {
        const borrowAcc = await createDebt(db, {
          personId: s.newBorrowAccount.personId,
          title: s.newBorrowAccount.title ?? null,
          principalPaisa: s.amountPaisa,
          openedDate: input.txnDate,
          purpose: 'OLD_DEBT',
        });
        linkedAccountId = borrowAcc.id;
      } else if (linkedAccountId) {
        await topUpAccount(db, linkedAccountId, s.amountPaisa, input.txnDate, 'ধার করে ঋণ পরিশোধ / borrowed to repay');
      }
    }
    sources.push({ sourceKey: s.sourceKey, amountPaisa: s.amountPaisa, linkedAccountId, note: s.note ?? null });
  }
  if (sources.length) {
    const srcSum = sources.reduce((sum, s) => sum + s.amountPaisa, 0);
    if (srcSum !== input.amountPaisa) throw new Error('উৎসের যোগফল মিলছে না / Sources must sum to the payment');
  }

  const txn = await repo.insertTransaction(db, {
    kind: 'PAYMENT',
    accountId: input.accountId,
    personId: account.personId,
    amountPaisa: input.amountPaisa,
    txnDate: input.txnDate,
    method: input.method ?? null,
    reference: input.reference ?? null,
    note: input.note ?? null,
    allocations,
    sources,
  });
  await maybeAutoComplete(db, input.accountId, input.txnDate);
  return txn;
}

export async function recordReceipt(db: SQLiteDatabase, input: RecordReceiptInput): Promise<Transaction> {
  const account = await repo.getAccount(db, input.accountId);
  if (!account) throw new Error('হিসাব পাওয়া যায়নি / Account not found');
  if (account.direction !== 'RECEIVABLE') throw new Error('এটি পাওনা নয় / This is not a receivable account');
  if (input.amountPaisa <= 0) throw new Error('পরিমাণ সঠিক নয় / Amount is invalid');

  const allocations = (input.allocations && input.allocations.length
    ? input.allocations.map((a) => ({ installmentId: a.installmentId ?? null, amountPaisa: a.amountPaisa, role: a.role ?? (a.installmentId ? 'INSTALLMENT' as const : 'PRINCIPAL' as const) }))
    : await autoAllocate(db, input.accountId, input.amountPaisa));
  const allocSum = allocations.reduce((s, a) => s + a.amountPaisa, 0);
  if (allocSum !== input.amountPaisa) throw new Error('বণ্টনের যোগফল মিলছে না / Allocations must sum to the receipt');

  const txn = await repo.insertTransaction(db, {
    kind: 'RECEIPT',
    accountId: input.accountId,
    personId: account.personId,
    amountPaisa: input.amountPaisa,
    txnDate: input.txnDate,
    method: input.method ?? null,
    reference: input.reference ?? null,
    note: input.note ?? null,
    allocations,
  });
  await maybeAutoComplete(db, input.accountId, input.txnDate);
  return txn;
}

// ── adjustments, settlement, write-off, reversal ───────────────────────────────

export async function addAdjustment(
  db: SQLiteDatabase, accountId: string, amountPaisa: number, sign: 1 | -1, reason: string, date: string,
): Promise<Transaction> {
  const account = await repo.getAccount(db, accountId);
  if (!account) throw new Error('হিসাব পাওয়া যায়নি / Account not found');
  if (amountPaisa <= 0) throw new Error('পরিমাণ সঠিক নয় / Amount is invalid');
  return repo.insertTransaction(db, {
    kind: 'ADJUSTMENT', accountId, personId: account.personId, amountPaisa, adjSign: sign,
    txnDate: date, note: reason,
  });
}

export async function settleAccount(db: SQLiteDatabase, accountId: string, settledPaisa: number, date: string, note?: string): Promise<void> {
  const account = await repo.getAccount(db, accountId);
  if (!account) throw new Error('হিসাব পাওয়া যায়নি / Account not found');
  await repo.insertTransaction(db, {
    kind: 'SETTLEMENT', accountId, personId: account.personId, amountPaisa: Math.max(0, settledPaisa),
    txnDate: date, note: note ?? 'মিটমাট / settlement',
  });
  await repo.patchAccount(db, accountId, { status: 'SETTLED', settledPaisa });
  await repo.writeAudit(db, { entityType: 'account', entityId: accountId, field: 'status', newValue: 'SETTLED', action: 'UPDATE' });
}

export async function writeOffReceivable(db: SQLiteDatabase, accountId: string, date: string, note?: string): Promise<void> {
  const account = await repo.getAccount(db, accountId);
  if (!account) throw new Error('হিসাব পাওয়া যায়নি / Account not found');
  if (account.direction !== 'RECEIVABLE') throw new Error('শুধু পাওনা write-off করা যায় / Only receivables can be written off');
  const bal = await getAccountBalance(db, accountId);
  await repo.insertTransaction(db, {
    kind: 'WRITE_OFF', accountId, personId: account.personId, amountPaisa: bal.remainingPaisa,
    txnDate: date, note: note ?? 'অনাদায়ী / uncollectable',
  });
  await repo.patchAccount(db, accountId, { status: 'WRITTEN_OFF' });
  await repo.writeAudit(db, { entityType: 'account', entityId: accountId, field: 'status', newValue: 'WRITTEN_OFF', action: 'UPDATE' });
}

/** Reverse a transaction (never delete). If it funded a borrow, reverse that tranche too. */
export async function reverseTransaction(db: SQLiteDatabase, txnId: string, date: string): Promise<void> {
  const rows = await db.getAllAsync<{ id: string; kind: string; account_id: string; person_id: string; amount_paisa: number; reversed: number }>(
    'SELECT id, kind, account_id, person_id, amount_paisa, reversed FROM dr_transactions WHERE id = ? AND deleted_at IS NULL', txnId,
  );
  const src = rows[0];
  if (!src) throw new Error('লেনদেন পাওয়া যায়নি / Transaction not found');
  if (src.reversed) throw new Error('এটি ইতিমধ্যে বাতিল / Already reversed');

  await repo.markTransactionReversed(db, txnId);
  await repo.insertTransaction(db, {
    kind: 'REVERSAL', accountId: src.account_id, personId: src.person_id, amountPaisa: src.amount_paisa,
    txnDate: date, reversesTxnId: txnId, note: 'বাতিল / reversal',
  });

  // Undo any borrow this payment created.
  const linked = await repo.listTransactionSources(db, txnId);
  for (const s of linked) {
    if (s.sourceKey === 'BORROWED' && s.linkedAccountId) {
      const tranche = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM dr_transactions WHERE account_id = ? AND kind IN ('NEW_DEBT') AND amount_paisa = ? AND reversed = 0 ORDER BY created_at DESC LIMIT 1`,
        s.linkedAccountId, s.amountPaisa,
      );
      if (tranche) {
        await repo.markTransactionReversed(db, tranche.id);
        await repo.insertTransaction(db, {
          kind: 'REVERSAL', accountId: s.linkedAccountId, personId: src.person_id, amountPaisa: s.amountPaisa,
          txnDate: date, reversesTxnId: tranche.id, note: 'ধার-বাতিল / borrow reversal',
        });
      }
    }
  }
  await repo.writeAudit(db, { entityType: 'transaction', entityId: txnId, field: '*', action: 'REVERSE' });
}

async function maybeAutoComplete(db: SQLiteDatabase, accountId: string, date: string): Promise<void> {
  const bal = await getAccountBalance(db, accountId);
  const account = await repo.getAccount(db, accountId);
  if (!account) return;
  if (bal.remainingPaisa <= 0 && account.status !== 'COMPLETED' && !['SETTLED', 'WRITTEN_OFF', 'CANCELLED'].includes(account.status)) {
    await repo.patchAccount(db, accountId, { status: 'COMPLETED' });
    await repo.writeAudit(db, { entityType: 'account', entityId: accountId, field: 'status', newValue: 'COMPLETED', action: 'UPDATE' });
  } else if (bal.remainingPaisa > 0 && account.status === 'COMPLETED') {
    await repo.patchAccount(db, accountId, { status: 'ACTIVE' });
  }
  void date;
}

// ── read models ────────────────────────────────────────────────────────────────

export interface AccountView {
  account: Account;
  person: Person | null;
  installments: Installment[];
  transactions: Transaction[];
  balance: AccountBalance;
}

async function loadLedger(db: SQLiteDatabase, account: Account): Promise<AccountLedger> {
  const [installments, transactions, allocations] = await Promise.all([
    repo.listInstallments(db, account.id),
    repo.listAccountTransactions(db, account.id),
    repo.listAccountAllocations(db, account.id),
  ]);
  return { account, installments, transactions, allocations };
}

export async function getAccountBalance(db: SQLiteDatabase, accountId: string, asOf = iso()): Promise<AccountBalance> {
  const account = await repo.getAccount(db, accountId);
  if (!account) throw new Error('হিসাব পাওয়া যায়নি / Account not found');
  return deriveAccountBalance(await loadLedger(db, account), asOf);
}

export async function getAccountView(db: SQLiteDatabase, accountId: string, asOf = iso()): Promise<AccountView> {
  const account = await repo.getAccount(db, accountId);
  if (!account) throw new Error('হিসাব পাওয়া যায়নি / Account not found');
  const ledger = await loadLedger(db, account);
  const person = await repo.getPerson(db, account.personId);
  return {
    account,
    person,
    installments: ledger.installments,
    transactions: ledger.transactions,
    balance: deriveAccountBalance(ledger, asOf),
  };
}

export interface PortfolioView extends PortfolioTotals {
  balances: AccountBalance[];
  accounts: Account[];
  /** Everyone party to an account — an account with no title is shown by their name. */
  people: Person[];
}

export async function getPortfolio(db: SQLiteDatabase, opts: { direction?: Direction; asOf?: string } = {}): Promise<PortfolioView> {
  const asOf = opts.asOf ?? iso();
  const accounts = await repo.listAccounts(db, opts.direction ? { direction: opts.direction } : {});
  const balances = await Promise.all(
    accounts.map(async (a) => deriveAccountBalance(await loadLedger(db, a), asOf)),
  );
  return { ...derivePortfolio(balances), balances, accounts, people: await repo.listPeople(db) };
}

// ── installment editing (spec §18, §19, §68) ──────────────────────────────────

export async function saveInstallmentPlan(
  db: SQLiteDatabase,
  accountId: string,
  plan: { seq: number; dueDate?: string | null; amountPaisa: number; note?: string | null }[],
): Promise<void> {
  const account = await repo.getAccount(db, accountId);
  if (!account) throw new Error('হিসাব পাওয়া যায়নি / Account not found');
  await repo.replaceInstallments(db, accountId, plan.filter((p) => p.amountPaisa > 0).map((p, i) => ({ ...p, seq: p.seq || i + 1 })));
  await repo.writeAudit(db, { entityType: 'account', entityId: accountId, field: 'installments', action: 'UPDATE' });
}

// ── every dashboard number in one call (spec §1) ──────────────────────────────

export interface DashboardMetrics {
  portfolio: PortfolioView;
  startingDebtPaisa: number;
  currentDebtPaisa: number;
  debtReductionPct: number;
  newDebtThisMonthPaisa: number;
  debtPaidThisMonthPaisa: number;
  receivableCollectedThisMonthPaisa: number;
  borrowedFundedThisMonthPaisa: number;
  realDebtReductionThisMonthPaisa: number;
  monthlyTargetPaisa: number;
  monthlyTargetRemainingPaisa: number;
  monthlyTargetProgressPct: number;
  dueTodayPaisa: number;
  dueTomorrowPaisa: number;
  dueNext3Paisa: number;
  dueNext7Paisa: number;
  overduePaisa: number;
  overdueCount: number;
  expectedCollectionNext7Paisa: number;
}

/** The borrowed-source total per PAYMENT/SETTLEMENT transaction id, across all accounts. */
export async function borrowedFundedByTxn(db: SQLiteDatabase): Promise<Map<string, number>> {
  const rows = await db.getAllAsync<{ transaction_id: string; amount_paisa: number }>(
    "SELECT transaction_id, amount_paisa FROM dr_transaction_sources WHERE source_key = 'BORROWED'",
  );
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.transaction_id, (map.get(r.transaction_id) ?? 0) + Number(r.amount_paisa));
  return map;
}

export interface TransactionDetail {
  txn: Transaction;
  account: Account | null;
  person: Person | null;
  allocations: Allocation[];
  installments: Installment[];
  sources: TransactionSource[];
}

/** Everything shown on one ledger row's detail screen, in a single round trip. */
export async function getTransactionDetail(db: SQLiteDatabase, txnId: string): Promise<TransactionDetail | null> {
  const all = await repo.listLedger(db, { limit: 100000 });
  const txn = all.find((t) => t.id === txnId) ?? null;
  if (!txn) return null;
  const account = await repo.getAccount(db, txn.accountId);
  const [person, allocations, installments, sources] = await Promise.all([
    repo.getPerson(db, txn.personId),
    repo.listAccountAllocations(db, txn.accountId),
    repo.listInstallments(db, txn.accountId),
    repo.listTransactionSources(db, txn.id),
  ]);
  return { txn, account, person, allocations: allocations.filter((a) => a.transactionId === txn.id), installments, sources };
}

export interface DueItem {
  installmentId: string;
  accountId: string;
  direction: Direction;
  title: string | null;
  personName: string | null;
  dueDate: string;
  seq: number;
  amountPaisa: number;
  paidPaisa: number;
}

/** Every dated installment slice in one `YYYY-MM` month, with how much of it is paid. */
export async function monthDueItems(db: SQLiteDatabase, monthKey: string): Promise<DueItem[]> {
  const rows = await db.getAllAsync<{
    id: string; account_id: string; direction: string; title: string | null; person_name: string | null;
    due_date: string; seq: number; amount_paisa: number; paid_paisa: number;
  }>(
    `SELECT i.id, i.account_id, i.due_date, i.seq, i.amount_paisa,
            a.direction, a.title, p.name AS person_name,
            COALESCE((SELECT SUM(al.amount_paisa) FROM dr_allocations al
                        JOIN dr_transactions t ON t.id = al.transaction_id
                       WHERE al.installment_id = i.id AND t.reversed = 0 AND t.deleted_at IS NULL), 0) AS paid_paisa
       FROM dr_installments i
       JOIN dr_accounts a ON a.id = i.account_id
       LEFT JOIN dr_people p ON p.id = a.person_id
      WHERE a.deleted_at IS NULL AND i.due_date IS NOT NULL AND substr(i.due_date, 1, 7) = ?
      ORDER BY i.due_date ASC, i.seq ASC`,
    monthKey,
  );
  return rows.map((r) => ({
    installmentId: r.id, accountId: r.account_id, direction: r.direction as Direction, title: r.title,
    personName: r.person_name, dueDate: r.due_date.slice(0, 10), seq: Number(r.seq),
    amountPaisa: Number(r.amount_paisa), paidPaisa: Number(r.paid_paisa),
  }));
}

/**
 * Where the repayment money came from (spec §46) — one pair per source line, ready for
 * `breakdown()`. Reversed and deleted transactions are excluded, same as everywhere else.
 */
export async function paymentSourcePairs(db: SQLiteDatabase, monthKey?: string): Promise<{ key: string; amountPaisa: number }[]> {
  const sql = `SELECT s.source_key AS source_key, s.amount_paisa AS amount_paisa
                 FROM dr_transaction_sources s
                 JOIN dr_transactions t ON t.id = s.transaction_id
                WHERE t.deleted_at IS NULL AND t.reversed = 0${monthKey ? ' AND substr(t.txn_date, 1, 7) = ?' : ''}`;
  const rows = monthKey
    ? await db.getAllAsync<{ source_key: string; amount_paisa: number }>(sql, monthKey)
    : await db.getAllAsync<{ source_key: string; amount_paisa: number }>(sql);
  return rows.map((r) => ({ key: r.source_key, amountPaisa: Number(r.amount_paisa) }));
}

export async function getDashboardMetrics(db: SQLiteDatabase, asOf = iso()): Promise<DashboardMetrics> {
  const portfolio = await getPortfolio(db, { asOf });
  const asOfKey = localDayKey(asOf);
  const monthKey = asOfKey.slice(0, 7);
  const dayMs = 86_400_000;
  const asOfMs = new Date(`${asOfKey}T00:00:00`).getTime();

  // period flows from the full ledger
  const ledger = await repo.listLedger(db, { limit: 1000 });
  const borrowedMap = await borrowedFundedByTxn(db);
  let newDebtThisMonthPaisa = 0, debtPaidThisMonthPaisa = 0, receivableCollectedThisMonthPaisa = 0, borrowedFundedThisMonthPaisa = 0;
  for (const t of ledger) {
    if (t.reversed || t.deletedAt || t.txnDate.slice(0, 7) !== monthKey) continue;
    if (t.kind === 'NEW_DEBT') newDebtThisMonthPaisa += t.amountPaisa;
    else if (t.kind === 'PAYMENT' || t.kind === 'SETTLEMENT') {
      debtPaidThisMonthPaisa += t.amountPaisa;
      borrowedFundedThisMonthPaisa += borrowedMap.get(t.id) ?? 0;
    } else if (t.kind === 'RECEIPT') receivableCollectedThisMonthPaisa += t.amountPaisa;
  }

  const startingDebtPaisa = Number((await repo.getSetting(db, 'startingDebtPaisa')) ?? '0') || portfolio.outstandingDebtPaisa;
  const currentDebtPaisa = portfolio.outstandingDebtPaisa;

  // due buckets from live installment slices
  let dueTodayPaisa = 0, dueTomorrowPaisa = 0, dueNext3Paisa = 0, dueNext7Paisa = 0, expectedCollectionNext7Paisa = 0;
  for (const b of portfolio.balances) {
    if (!b.nextDueDate || b.nextDuePaisa <= 0) continue;
    const diff = Math.round((new Date(`${b.nextDueDate.slice(0, 10)}T00:00:00`).getTime() - asOfMs) / dayMs);
    if (diff < 0) continue;
    if (b.direction === 'DEBT') {
      if (diff === 0) dueTodayPaisa += b.nextDuePaisa;
      if (diff === 1) dueTomorrowPaisa += b.nextDuePaisa;
      if (diff <= 3) dueNext3Paisa += b.nextDuePaisa;
      if (diff <= 7) dueNext7Paisa += b.nextDuePaisa;
    } else if (diff <= 7) expectedCollectionNext7Paisa += b.nextDuePaisa;
  }

  const monthlyTargetPaisa = (await repo.getTarget(db, 'MONTH', monthKey, 'REPAYMENT'))?.targetValue ?? 0;
  const monthlyTargetRemainingPaisa = Math.max(0, monthlyTargetPaisa - debtPaidThisMonthPaisa);
  const monthlyTargetProgressPct = monthlyTargetPaisa > 0
    ? Math.round((Math.min(debtPaidThisMonthPaisa, monthlyTargetPaisa) / monthlyTargetPaisa) * 10000) / 100
    : 0;

  return {
    portfolio,
    startingDebtPaisa,
    currentDebtPaisa,
    debtReductionPct: startingDebtPaisa > 0 ? Math.round(((startingDebtPaisa - currentDebtPaisa) / startingDebtPaisa) * 10000) / 100 : 0,
    newDebtThisMonthPaisa,
    debtPaidThisMonthPaisa,
    receivableCollectedThisMonthPaisa,
    borrowedFundedThisMonthPaisa,
    realDebtReductionThisMonthPaisa: debtPaidThisMonthPaisa - borrowedFundedThisMonthPaisa - newDebtThisMonthPaisa,
    monthlyTargetPaisa,
    monthlyTargetRemainingPaisa,
    monthlyTargetProgressPct,
    dueTodayPaisa,
    dueTomorrowPaisa,
    dueNext3Paisa,
    dueNext7Paisa,
    overduePaisa: portfolio.overduePaisa,
    overdueCount: portfolio.overdueCount,
    expectedCollectionNext7Paisa,
  };
}
