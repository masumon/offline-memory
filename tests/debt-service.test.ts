import type { SQLiteDatabase } from 'expo-sqlite';
import { buildInstallmentPlan, autoAllocate, recordPayment } from '../src/services/debt/debt-service';
import * as repo from '../src/services/debt/repository';
import type { Account, Installment } from '../src/services/debt/types';

jest.mock('../src/services/debt/repository', () => ({
  getAccount: jest.fn(),
  insertAccount: jest.fn(),
  insertTransaction: jest.fn(),
  listInstallments: jest.fn(),
  listAccountAllocations: jest.fn(),
  listAccountTransactions: jest.fn(),
  getPerson: jest.fn(),
  replaceInstallments: jest.fn(),
  patchAccount: jest.fn(),
  writeAudit: jest.fn(),
  listTransactionSources: jest.fn(),
  markTransactionReversed: jest.fn(),
}));

const db = {} as SQLiteDatabase;
const TK = 100;
const account = (over: Partial<Account> = {}): Account => ({
  id: 'a1', direction: 'DEBT', personId: 'p1', title: null, principalPaisa: 100_000 * TK,
  openedDate: '2026-01-01', openedDateText: null, interestType: 'NONE', interestRateBps: null,
  interestPeriod: null, compoundPeriod: null, manualTotalPayablePaisa: null, firstDueDate: null,
  finalDueDate: null, purpose: null, priority: 'MEDIUM', priorityRank: null, status: 'ACTIVE',
  settledPaisa: null, notes: null, createdAt: '', updatedAt: '', deletedAt: null, ...over,
});
const inst = (id: string, seq: number, amtTk: number, due: string | null): Installment => ({
  id, accountId: 'a1', seq, dueDate: due, amountPaisa: amtTk * TK, note: null, createdAt: '', updatedAt: '',
});

beforeEach(() => jest.clearAllMocks());

describe('buildInstallmentPlan (pure)', () => {
  it('passes an explicit flexible plan straight through, dropping zero rows', () => {
    const plan = buildInstallmentPlan({
      direction: 'DEBT', personId: 'p1', principalPaisa: 30_000 * TK,
      installments: [
        { seq: 1, amountPaisa: 5_000 * TK, dueDate: '2026-10-01' },
        { seq: 2, amountPaisa: 0 },
        { seq: 3, amountPaisa: 25_000 * TK, dueDate: '2026-12-01' },
      ],
    });
    expect(plan).toEqual([
      { seq: 1, dueDate: '2026-10-01', amountPaisa: 5_000 * TK, note: null },
      { seq: 3, dueDate: '2026-12-01', amountPaisa: 25_000 * TK, note: null },
    ]);
  });

  it('generates an even monthly schedule from installmentCount with no rounding drift', () => {
    const plan = buildInstallmentPlan({
      direction: 'DEBT', personId: 'p1', principalPaisa: 100_00, // ৳100 -> 10000 paisa
      installmentCount: 3, firstDueDate: '2026-01-31',
    });
    expect(plan).toHaveLength(3);
    expect(plan.reduce((s, p) => s + p.amountPaisa, 0)).toBe(100_00);
    expect(plan.map((p) => p.amountPaisa)).toEqual([3_334, 3_333, 3_333]);
    // month roll-over clamps 31 Jan -> 28 Feb -> 31 Mar
    expect(plan.map((p) => p.dueDate)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  it('schedules the flat total, not the principal, when interest is FLAT_TOTAL', () => {
    const plan = buildInstallmentPlan({
      direction: 'DEBT', personId: 'p1', principalPaisa: 100_000 * TK,
      interestType: 'FLAT_TOTAL', manualTotalPayablePaisa: 120_000 * TK,
      installmentCount: 2, firstDueDate: '2026-01-01',
    });
    expect(plan.reduce((s, p) => s + p.amountPaisa, 0)).toBe(120_000 * TK);
  });
});

describe('autoAllocate', () => {
  it('fills the oldest unpaid installments first, then marks the overflow as advance', async () => {
    jest.mocked(repo.listInstallments).mockResolvedValue([
      inst('i1', 1, 10_000, '2026-08-01'),
      inst('i2', 2, 10_000, '2026-09-01'),
      inst('i3', 3, 10_000, '2026-10-01'),
    ]);
    jest.mocked(repo.listAccountAllocations).mockResolvedValue([
      { id: 'x', transactionId: 't0', installmentId: 'i1', amountPaisa: 4_000 * TK, role: 'INSTALLMENT' },
    ]);
    // Partly covers i1..i3 — the last slice still lands on i3, not advance (i3 has room).
    expect(await autoAllocate(db, 'a1', 21_000 * TK)).toEqual([
      { installmentId: 'i1', amountPaisa: 6_000 * TK, role: 'INSTALLMENT' }, // 10k - 4k already paid
      { installmentId: 'i2', amountPaisa: 10_000 * TK, role: 'INSTALLMENT' },
      { installmentId: 'i3', amountPaisa: 5_000 * TK, role: 'INSTALLMENT' },
    ]);
  });

  it('marks the overflow as ADVANCE once every installment is full', async () => {
    jest.mocked(repo.listInstallments).mockResolvedValue([
      inst('i1', 1, 10_000, '2026-08-01'),
      inst('i2', 2, 10_000, '2026-09-01'),
    ]);
    jest.mocked(repo.listAccountAllocations).mockResolvedValue([]);
    expect(await autoAllocate(db, 'a1', 25_000 * TK)).toEqual([
      { installmentId: 'i1', amountPaisa: 10_000 * TK, role: 'INSTALLMENT' },
      { installmentId: 'i2', amountPaisa: 10_000 * TK, role: 'INSTALLMENT' },
      { installmentId: null, amountPaisa: 5_000 * TK, role: 'ADVANCE' },
    ]);
  });
});

describe('recordPayment', () => {
  it('rejects a payment whose funding sources do not sum to the amount', async () => {
    jest.mocked(repo.getAccount).mockResolvedValue(account());
    jest.mocked(repo.listInstallments).mockResolvedValue([]);
    jest.mocked(repo.listAccountAllocations).mockResolvedValue([]);
    await expect(
      recordPayment(db, {
        accountId: 'a1', amountPaisa: 20_000 * TK, txnDate: '2026-09-02',
        sources: [{ sourceKey: 'SALARY', amountPaisa: 12_000 * TK }],
      }),
    ).rejects.toThrow(/Sources must sum/);
  });

  it('rejects a payment against a receivable account', async () => {
    jest.mocked(repo.getAccount).mockResolvedValue(account({ direction: 'RECEIVABLE' }));
    await expect(
      recordPayment(db, { accountId: 'a1', amountPaisa: 5_000 * TK, txnDate: '2026-09-02' }),
    ).rejects.toThrow(/not a debt/);
  });

  it('borrowed-to-repay opens a new debt to the lender for exactly the borrowed slice', async () => {
    jest.mocked(repo.getAccount).mockImplementation(async (_db, id) =>
      id === 'a1' ? account() : account({ id: 'borrow1', personId: 'lenderX' }));
    jest.mocked(repo.listInstallments).mockResolvedValue([]);
    jest.mocked(repo.listAccountAllocations).mockResolvedValue([]);
    jest.mocked(repo.listAccountTransactions).mockResolvedValue([]);
    jest.mocked(repo.getPerson).mockResolvedValue(null);
    jest.mocked(repo.insertAccount).mockResolvedValue(account({ id: 'borrow1', personId: 'lenderX' }));
    jest.mocked(repo.insertTransaction).mockImplementation(async (_db, t) => ({
      id: `txn_${t.kind}`, kind: t.kind, accountId: t.accountId, personId: t.personId,
      amountPaisa: t.amountPaisa, adjSign: t.adjSign ?? null, txnDate: t.txnDate, method: t.method ?? null,
      reference: t.reference ?? null, note: t.note ?? null, reversesTxnId: t.reversesTxnId ?? null,
      reversed: false, createdAt: '', deletedAt: null,
    }));

    await recordPayment(db, {
      accountId: 'a1', amountPaisa: 20_000 * TK, txnDate: '2026-09-02',
      sources: [
        { sourceKey: 'SALARY', amountPaisa: 15_000 * TK },
        { sourceKey: 'BORROWED', amountPaisa: 5_000 * TK, newBorrowAccount: { personId: 'lenderX', title: 'from Karim' } },
      ],
    });

    // A new DEBT account was opened for the ৳5,000 borrowed slice...
    expect(repo.insertAccount).toHaveBeenCalledWith(
      db, expect.objectContaining({ direction: 'DEBT', personId: 'lenderX', principalPaisa: 5_000 * TK }),
    );
    // ...and the PAYMENT ledger row carries both source lines, the borrowed one linked.
    const paymentCall = jest.mocked(repo.insertTransaction).mock.calls.find((c) => c[1].kind === 'PAYMENT');
    expect(paymentCall?.[1].sources).toEqual([
      { sourceKey: 'SALARY', amountPaisa: 15_000 * TK, linkedAccountId: null, note: null },
      { sourceKey: 'BORROWED', amountPaisa: 5_000 * TK, linkedAccountId: 'borrow1', note: null },
    ]);
  });
});
