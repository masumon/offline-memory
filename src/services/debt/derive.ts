// The single source of truth. Given an account, its installments and its ledger rows,
// derive every "current" number the UI shows — paid, remaining, status, next due,
// overdue, progress. Nothing here is stored; call it whenever you need fresh figures.
//
// A transaction counts only when it is not soft-deleted, not reversed, and is not
// itself a REVERSAL row — so a reversed payment nets to exactly nothing (spec §48).

import { computeInterest } from './interest';
import { clampNonNegative, percentOf, type Paisa } from './money';
import type {
  Account,
  AccountBalance,
  AccountStatus,
  Allocation,
  Installment,
  Transaction,
} from './types';

export interface AccountLedger {
  account: Account;
  installments: Installment[];
  transactions: Transaction[];
  /** allocations for the account's transactions (installmentId may be null) */
  allocations: Allocation[];
}

export function isCountable(txn: Transaction): boolean {
  return !txn.deletedAt && !txn.reversed && txn.kind !== 'REVERSAL';
}

/** Signed contribution of a countable txn to "amount still owed" on its account. */
function owedDelta(txn: Transaction, direction: Account['direction']): Paisa {
  switch (txn.kind) {
    case 'NEW_DEBT':
    case 'NEW_RECEIVABLE':
      return 0; // principal is summed separately (see `principalPaisa` below) so interest can use it
    case 'PAYMENT':
      return direction === 'DEBT' ? -txn.amountPaisa : 0;
    case 'RECEIPT':
      return direction === 'RECEIVABLE' ? -txn.amountPaisa : 0;
    case 'SETTLEMENT':
      return -txn.amountPaisa;
    case 'ADJUSTMENT':
      return (txn.adjSign ?? 1) * txn.amountPaisa;
    case 'WRITE_OFF':
    case 'INTEREST_ACCRUAL':
    case 'REVERSAL':
      return 0;
  }
}

/**
 * The calendar day of `iso` in the device's own timezone, as `YYYY-MM-DD`.
 *
 * Slicing an ISO string gives the *UTC* day, which in Asia/Dhaka is yesterday for the
 * first six hours of every day — enough to file an instalment due today under
 * "tomorrow", and to report the previous month's flows on the 1st.
 */
export function localDayKey(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Midnight-of-that-day, in local time. Comparisons here are day-granular on purpose:
 * an instalment due *today* is not overdue, whatever the clock reads, and a full ISO
 * timestamp must not sort after a bare `YYYY-MM-DD` for the same calendar day.
 */
function toDateKey(iso: string): number {
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (!Number.isFinite(d.getTime())) return Number.POSITIVE_INFINITY;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Full derived balance for one account. `asOfIso` fixes interest + overdue evaluation. */
export function deriveAccountBalance(ledger: AccountLedger, asOfIso: string): AccountBalance {
  const { account, installments } = ledger;
  const txns = ledger.transactions.filter(isCountable);
  const allocs = ledger.allocations;
  const asOfKey = toDateKey(asOfIso);

  // Principal = the sum of every NEW_DEBT / NEW_RECEIVABLE tranche (append-only — topping
  // up an existing loan is just another tranche). Falls back to the cached account field
  // when no principal tranche has been written yet.
  const principalKind = account.direction === 'DEBT' ? 'NEW_DEBT' : 'NEW_RECEIVABLE';
  const trancheTotal = txns.filter((t) => t.kind === principalKind).reduce((s, t) => s + t.amountPaisa, 0);
  const principalPaisa = clampNonNegative(trancheTotal > 0 ? trancheTotal : account.principalPaisa);

  const interest = computeInterest(
    {
      principalPaisa,
      interestType: account.interestType,
      interestRateBps: account.interestRateBps,
      interestPeriod: account.interestPeriod,
      compoundPeriod: account.compoundPeriod,
      manualTotalPayablePaisa: account.manualTotalPayablePaisa,
      openedDate: account.openedDate,
    },
    asOfIso,
  );
  const accruedInterestPaisa = clampNonNegative(interest.interestPaisa);

  const adjustmentPaisa = txns
    .filter((t) => t.kind === 'ADJUSTMENT')
    .reduce((s, t) => s + (t.adjSign ?? 1) * t.amountPaisa, 0);

  // Base amount owed before any repayment. Adjustments are applied via `owedFromTxns`
  // below (not here) so they are counted exactly once.
  const totalPayablePaisa = clampNonNegative(principalPaisa + accruedInterestPaisa);

  // Everything actually paid in (payments for a debt, receipts for a receivable) + settlement.
  const settlementPaid = txns.filter((t) => t.kind === 'SETTLEMENT').reduce((s, t) => s + t.amountPaisa, 0);
  const regularPaid = txns
    .filter((t) => (account.direction === 'DEBT' ? t.kind === 'PAYMENT' : t.kind === 'RECEIPT'))
    .reduce((s, t) => s + t.amountPaisa, 0);
  const paidPaisa = regularPaid + settlementPaid;

  // Split paid into interest-first then principal, for analytics.
  const paidInterestPaisa = Math.min(paidPaisa, accruedInterestPaisa);
  const paidPrincipalPaisa = clampNonNegative(paidPaisa - paidInterestPaisa);

  const owedFromTxns = txns.reduce((s, t) => s + owedDelta(t, account.direction), 0);
  const rawRemaining = totalPayablePaisa + owedFromTxns; // owedDelta carries the signs (payments −, +adj)
  // Ordinary payments never push remaining negative; the excess is "advance".
  const remainingPaisa = clampNonNegative(rawRemaining);
  const advancePaisa = rawRemaining < 0 ? -rawRemaining : 0;

  // ── installment view ─────────────────────────────────────────────────────────
  const allocByInstallment = new Map<string, Paisa>();
  for (const a of allocs) {
    if (!a.installmentId) continue;
    allocByInstallment.set(a.installmentId, (allocByInstallment.get(a.installmentId) ?? 0) + a.amountPaisa);
  }
  const sortedInst = [...installments].sort((a, b) => a.seq - b.seq);
  let installmentsPaidCount = 0;
  let overduePaisa = 0;
  let earliestOverdueKey = Number.POSITIVE_INFINITY;
  let nextDueDate: string | null = null;
  let nextDuePaisa = 0;

  for (const inst of sortedInst) {
    const paidHere = allocByInstallment.get(inst.id) ?? 0;
    const unpaid = clampNonNegative(inst.amountPaisa - paidHere);
    if (unpaid === 0) {
      installmentsPaidCount += 1;
      continue;
    }
    if (inst.dueDate) {
      const key = toDateKey(inst.dueDate);
      if (key < asOfKey) {
        overduePaisa += unpaid;
        earliestOverdueKey = Math.min(earliestOverdueKey, key);
      }
    }
    if (nextDueDate === null) {
      nextDueDate = inst.dueDate;
      nextDuePaisa = unpaid;
    }
  }

  // No schedule → fall back to the account-level final due date.
  if (sortedInst.length === 0 && remainingPaisa > 0) {
    nextDueDate = account.finalDueDate ?? account.firstDueDate;
    nextDuePaisa = remainingPaisa;
    if (nextDueDate && toDateKey(nextDueDate) < asOfKey) {
      overduePaisa = remainingPaisa;
      earliestOverdueKey = toDateKey(nextDueDate);
    }
  }

  const overdueDays =
    earliestOverdueKey === Number.POSITIVE_INFINITY
      ? 0
      : Math.max(0, Math.floor((asOfKey - earliestOverdueKey) / 86_400_000));

  const status = deriveStatus(account, remainingPaisa, paidPaisa, overduePaisa);
  // A settled / written-off / cancelled account owes nothing further, whatever the raw maths say.
  const effectiveRemaining =
    status === 'SETTLED' || status === 'WRITTEN_OFF' || status === 'CANCELLED' ? 0 : remainingPaisa;

  return {
    accountId: account.id,
    direction: account.direction,
    totalPayablePaisa,
    principalPaisa,
    accruedInterestPaisa,
    paidPaisa,
    paidPrincipalPaisa,
    paidInterestPaisa,
    remainingPaisa: effectiveRemaining,
    advancePaisa,
    adjustmentPaisa,
    progressPct: percentOf(paidPaisa, totalPayablePaisa || paidPaisa, 2),
    status,
    nextDueDate,
    nextDuePaisa,
    overduePaisa,
    overdueDays,
    installmentsPaidCount,
    installmentsTotalCount: sortedInst.length,
  };
}

export function deriveStatus(
  account: Account,
  remainingPaisa: Paisa,
  paidPaisa: Paisa,
  overduePaisa: Paisa,
): AccountStatus {
  // Terminal states set by an explicit user action win.
  if (account.status === 'CANCELLED') return 'CANCELLED';
  if (account.status === 'WRITTEN_OFF') return 'WRITTEN_OFF';
  if (account.status === 'SETTLED') return 'SETTLED';
  if (remainingPaisa <= 0) return 'COMPLETED';
  if (overduePaisa > 0) return 'OVERDUE';
  if (paidPaisa > 0) return 'PARTIAL';
  return 'ACTIVE';
}

// ── portfolio-level roll-ups ───────────────────────────────────────────────────

export interface PortfolioTotals {
  outstandingDebtPaisa: Paisa;
  outstandingReceivablePaisa: Paisa;
  netDebtPaisa: Paisa;
  totalPaidPaisa: Paisa;
  totalReceivedPaisa: Paisa;
  activeDebtCount: number;
  activeReceivableCount: number;
  completedDebtCount: number;
  completedReceivableCount: number;
  overduePaisa: Paisa;
  overdueCount: number;
}

export function derivePortfolio(balances: AccountBalance[]): PortfolioTotals {
  const t: PortfolioTotals = {
    outstandingDebtPaisa: 0,
    outstandingReceivablePaisa: 0,
    netDebtPaisa: 0,
    totalPaidPaisa: 0,
    totalReceivedPaisa: 0,
    activeDebtCount: 0,
    activeReceivableCount: 0,
    completedDebtCount: 0,
    completedReceivableCount: 0,
    overduePaisa: 0,
    overdueCount: 0,
  };
  for (const b of balances) {
    const done = b.status === 'COMPLETED' || b.status === 'SETTLED' || b.status === 'WRITTEN_OFF';
    if (b.direction === 'DEBT') {
      t.outstandingDebtPaisa += b.remainingPaisa;
      t.totalPaidPaisa += b.paidPaisa;
      if (b.status === 'CANCELLED') continue;
      if (done) t.completedDebtCount += 1;
      else t.activeDebtCount += 1;
    } else {
      t.outstandingReceivablePaisa += b.remainingPaisa;
      t.totalReceivedPaisa += b.paidPaisa;
      if (b.status === 'CANCELLED') continue;
      if (done) t.completedReceivableCount += 1;
      else t.activeReceivableCount += 1;
    }
    if (b.overduePaisa > 0) {
      t.overduePaisa += b.overduePaisa;
      t.overdueCount += 1;
    }
  }
  t.netDebtPaisa = t.outstandingDebtPaisa - t.outstandingReceivablePaisa;
  return t;
}
