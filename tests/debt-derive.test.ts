import { deriveAccountBalance, derivePortfolio, localDayKey, type AccountLedger } from '../src/services/debt/derive';
import type { Account, Allocation, Installment, Transaction, TxnKind } from '../src/services/debt/types';

const TK = 100; // paisa per taka
const ASOF = '2026-09-02T00:00:00.000Z';

function account(over: Partial<Account> = {}): Account {
  return {
    id: 'a1', direction: 'DEBT', personId: 'p1', title: null,
    principalPaisa: 100_000 * TK, openedDate: '2026-01-01', openedDateText: null,
    interestType: 'NONE', interestRateBps: null, interestPeriod: null, compoundPeriod: null,
    manualTotalPayablePaisa: null, firstDueDate: null, finalDueDate: null,
    purpose: null, priority: 'MEDIUM', priorityRank: null, status: 'ACTIVE', settledPaisa: null,
    notes: null, createdAt: ASOF, updatedAt: ASOF, deletedAt: null, ...over,
  };
}
let seq = 0;
function txn(kind: TxnKind, amountTk: number, over: Partial<Transaction> = {}): Transaction {
  seq += 1;
  return {
    id: `t${seq}`, kind, accountId: 'a1', personId: 'p1', amountPaisa: amountTk * TK,
    adjSign: null, txnDate: '2026-02-01', method: null, reference: null, note: null,
    reversesTxnId: null, reversed: false, createdAt: ASOF, deletedAt: null, ...over,
  };
}
function inst(s: number, amountTk: number, dueDate: string | null): Installment {
  return { id: `i${s}`, accountId: 'a1', seq: s, dueDate, amountPaisa: amountTk * TK, note: null, createdAt: ASOF, updatedAt: ASOF };
}
function alloc(txnId: string, instId: string | null, amountTk: number): Allocation {
  return { id: `al-${txnId}-${instId}`, transactionId: txnId, installmentId: instId, amountPaisa: amountTk * TK, role: instId ? 'INSTALLMENT' : 'PRINCIPAL' };
}
function ledger(over: Partial<AccountLedger> = {}): AccountLedger {
  return { account: account(), installments: [], transactions: [], allocations: [], ...over };
}

describe('deriveAccountBalance — core', () => {
  it('a fresh debt owes the full principal and is ACTIVE', () => {
    const b = deriveAccountBalance(ledger({ transactions: [txn('NEW_DEBT', 100_000)] }), ASOF);
    expect(b.totalPayablePaisa).toBe(100_000 * TK);
    expect(b.paidPaisa).toBe(0);
    expect(b.remainingPaisa).toBe(100_000 * TK);
    expect(b.status).toBe('ACTIVE');
  });

  it('a partial payment reduces remaining and flips to PARTIAL', () => {
    const b = deriveAccountBalance(
      ledger({ transactions: [txn('NEW_DEBT', 100_000), txn('PAYMENT', 30_000)] }),
      ASOF,
    );
    expect(b.paidPaisa).toBe(30_000 * TK);
    expect(b.remainingPaisa).toBe(70_000 * TK);
    expect(b.status).toBe('PARTIAL');
    expect(b.progressPct).toBe(30);
  });

  it('paying the whole balance completes the account with zero remaining', () => {
    const b = deriveAccountBalance(
      ledger({ transactions: [txn('NEW_DEBT', 100_000), txn('PAYMENT', 60_000), txn('PAYMENT', 40_000)] }),
      ASOF,
    );
    expect(b.remainingPaisa).toBe(0);
    expect(b.status).toBe('COMPLETED');
  });

  it('overpayment leaves zero remaining and records the excess as advance', () => {
    const b = deriveAccountBalance(
      ledger({ transactions: [txn('NEW_DEBT', 100_000), txn('PAYMENT', 120_000)] }),
      ASOF,
    );
    expect(b.remainingPaisa).toBe(0);
    expect(b.advancePaisa).toBe(20_000 * TK);
  });

  it('a reversed payment nets to nothing (payment + REVERSAL both ignored)', () => {
    const pay = txn('PAYMENT', 50_000, { id: 'pay1', reversed: true });
    const rev = txn('REVERSAL', 50_000, { id: 'rev1', reversesTxnId: 'pay1' });
    const b = deriveAccountBalance(
      ledger({ transactions: [txn('NEW_DEBT', 100_000), pay, rev] }),
      ASOF,
    );
    expect(b.paidPaisa).toBe(0);
    expect(b.remainingPaisa).toBe(100_000 * TK);
  });

  it('a soft-deleted transaction is ignored', () => {
    const b = deriveAccountBalance(
      ledger({ transactions: [txn('NEW_DEBT', 100_000), txn('PAYMENT', 25_000, { deletedAt: ASOF })] }),
      ASOF,
    );
    expect(b.paidPaisa).toBe(0);
  });

  it('positive and negative adjustments move the amount owed', () => {
    const up = deriveAccountBalance(
      ledger({ transactions: [txn('NEW_DEBT', 100_000), txn('ADJUSTMENT', 5_000, { adjSign: 1 })] }),
      ASOF,
    );
    expect(up.remainingPaisa).toBe(105_000 * TK);
    const down = deriveAccountBalance(
      ledger({ transactions: [txn('NEW_DEBT', 100_000), txn('ADJUSTMENT', 5_000, { adjSign: -1 })] }),
      ASOF,
    );
    expect(down.remainingPaisa).toBe(95_000 * TK);
  });
});

describe('deriveAccountBalance — installments & due dates', () => {
  const insts = [inst(1, 40_000, '2026-08-15'), inst(2, 30_000, '2026-09-15'), inst(3, 30_000, '2026-10-15')];

  it('flags an unpaid past-due installment as OVERDUE with the right amount and age', () => {
    const b = deriveAccountBalance(ledger({ installments: insts, transactions: [txn('NEW_DEBT', 100_000)] }), ASOF);
    expect(b.status).toBe('OVERDUE');
    expect(b.overduePaisa).toBe(40_000 * TK);
    expect(b.overdueDays).toBe(18); // 15 Aug → 2 Sep
    expect(b.nextDueDate).toBe('2026-08-15');
  });

  it('a fully-allocated overdue installment is no longer overdue; next due moves on', () => {
    const pay = txn('PAYMENT', 40_000, { id: 'payA' });
    const b = deriveAccountBalance(
      ledger({ installments: insts, transactions: [txn('NEW_DEBT', 100_000), pay], allocations: [alloc('payA', 'i1', 40_000)] }),
      ASOF,
    );
    expect(b.overduePaisa).toBe(0);
    expect(b.installmentsPaidCount).toBe(1);
    expect(b.nextDueDate).toBe('2026-09-15');
    expect(b.status).toBe('PARTIAL');
  });

  it('a partial allocation against an installment leaves the rest overdue', () => {
    const pay = txn('PAYMENT', 15_000, { id: 'payB' });
    const b = deriveAccountBalance(
      ledger({ installments: insts, transactions: [txn('NEW_DEBT', 100_000), pay], allocations: [alloc('payB', 'i1', 15_000)] }),
      ASOF,
    );
    expect(b.overduePaisa).toBe(25_000 * TK);
    expect(b.installmentsPaidCount).toBe(0);
  });
});

describe('deriveAccountBalance — terminal states', () => {
  it('SETTLED shows zero remaining even if the settlement paid less than owed', () => {
    const b = deriveAccountBalance(
      ledger({
        account: account({ status: 'SETTLED', settledPaisa: 40_000 * TK }),
        transactions: [txn('NEW_DEBT', 100_000), txn('SETTLEMENT', 40_000)],
      }),
      ASOF,
    );
    expect(b.status).toBe('SETTLED');
    expect(b.remainingPaisa).toBe(0);
    expect(b.paidPaisa).toBe(40_000 * TK);
  });

  it('a written-off receivable owes nothing and is not counted as received', () => {
    const b = deriveAccountBalance(
      ledger({
        account: account({ direction: 'RECEIVABLE', status: 'WRITTEN_OFF' }),
        transactions: [txn('NEW_RECEIVABLE', 100_000), txn('WRITE_OFF', 100_000)],
      }),
      ASOF,
    );
    expect(b.status).toBe('WRITTEN_OFF');
    expect(b.remainingPaisa).toBe(0);
    expect(b.paidPaisa).toBe(0);
  });
});

describe('deriveAccountBalance — interest-bearing', () => {
  it('adds accrued simple interest into the payable total', () => {
    const b = deriveAccountBalance(
      ledger({
        account: account({ interestType: 'SIMPLE', interestRateBps: 1_200, interestPeriod: 'YEAR', openedDate: '2025-09-02' }),
        transactions: [txn('NEW_DEBT', 100_000)],
      }),
      ASOF,
    );
    expect(b.accruedInterestPaisa).toBe(12_000 * TK); // 12% for exactly one year
    expect(b.totalPayablePaisa).toBe(112_000 * TK);
    expect(b.remainingPaisa).toBe(112_000 * TK);
  });
});

describe('derivePortfolio — Net Debt', () => {
  it('nets outstanding debt against outstanding receivable', () => {
    const debt = deriveAccountBalance(ledger({ transactions: [txn('NEW_DEBT', 180_000)] }), ASOF);
    const recv = deriveAccountBalance(
      ledger({ account: account({ id: 'a2', direction: 'RECEIVABLE' }), transactions: [txn('NEW_RECEIVABLE', 70_000, { accountId: 'a2' })] }),
      ASOF,
    );
    const t = derivePortfolio([debt, recv]);
    expect(t.outstandingDebtPaisa).toBe(180_000 * TK);
    expect(t.outstandingReceivablePaisa).toBe(70_000 * TK);
    expect(t.netDebtPaisa).toBe(110_000 * TK);
    expect(t.activeDebtCount).toBe(1);
    expect(t.activeReceivableCount).toBe(1);
  });
});

describe('deriveAccountBalance — "due today" is not overdue', () => {
  // Regression: `asOf` used to be compared at full timestamp precision, so any check
  // made after midnight flagged an instalment due that same day as overdue.
  const today = '2026-09-04';
  const ledger = (): AccountLedger => ({
    account: account({ principalPaisa: 50_000 * TK }),
    installments: [inst(1, 12_500, today), inst(2, 12_500, '2026-10-04')],
    transactions: [txn('NEW_DEBT', 50_000)],
    allocations: [],
  });

  it('stays ACTIVE at any hour of the due date', () => {
    for (const at of [`${today}T00:00:00`, `${today}T03:38:00`, `${today}T23:59:59`]) {
      const b = deriveAccountBalance(ledger(), new Date(at).toISOString());
      expect(b.overduePaisa).toBe(0);
      expect(b.overdueDays).toBe(0);
      expect(b.status).toBe('ACTIVE');
      expect(b.nextDueDate).toBe(today);
    }
  });

  it('turns OVERDUE the next day, counting whole days', () => {
    const b = deriveAccountBalance(ledger(), new Date('2026-09-06T11:20:00').toISOString());
    expect(b.overduePaisa).toBe(12_500 * TK);
    expect(b.overdueDays).toBe(2);
    expect(b.status).toBe('OVERDUE');
  });
});

describe('localDayKey', () => {
  it('reports the device calendar day, not the UTC one', () => {
    // 03:38 on 4 Sep in Asia/Dhaka is still 3 Sep in UTC; "today" must follow the device.
    const local = new Date(2026, 8, 4, 3, 38);
    expect(localDayKey(local.toISOString())).toBe('2026-09-04');
    expect(localDayKey(new Date(2026, 0, 1, 0, 5).toISOString())).toBe('2026-01-01');
  });
  it('falls back to a plain slice for an unparseable value', () => {
    expect(localDayKey('sometime next month')).toBe('sometime n');
  });
});
