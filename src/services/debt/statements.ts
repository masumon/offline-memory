// Statements (spec §79-§81). A person statement rolls every account they are party to
// into one opening → movement → closing view; an account statement is the single-loan
// detail. Both read through debt-service so the numbers match the dashboard exactly.

import type { SQLiteDatabase } from 'expo-sqlite';
import { getAccountView, getPortfolio } from './debt-service';
import { localDayKey } from './derive';
import * as repo from './repository';
import type { Paisa } from './money';
import type { Account, AccountBalance, Person, Transaction } from './types';

export interface PersonStatement {
  person: Person;
  accounts: { account: Account; balance: AccountBalance }[];
  totalDebtRemainingPaisa: Paisa;
  totalReceivableRemainingPaisa: Paisa;
  /** > 0 means the person owes you more than you owe them */
  netToYouPaisa: Paisa;
  totalPaidToThemPaisa: Paisa;
  totalReceivedFromThemPaisa: Paisa;
  transactions: Transaction[];
  lastTransactionDate: string | null;
  nextDueDate: string | null;
}

export async function getPersonStatement(db: SQLiteDatabase, personId: string, asOf = new Date().toISOString()): Promise<PersonStatement | null> {
  const person = await repo.getPerson(db, personId);
  if (!person) return null;
  const accounts = await repo.listAccounts(db, { personId });
  const rows: { account: Account; balance: AccountBalance }[] = [];
  const allTxns: Transaction[] = [];
  for (const a of accounts) {
    const view = await getAccountView(db, a.id, asOf);
    rows.push({ account: a, balance: view.balance });
    allTxns.push(...view.transactions);
  }
  allTxns.sort((x, y) => (x.txnDate < y.txnDate ? 1 : -1));

  let totalDebtRemainingPaisa = 0, totalReceivableRemainingPaisa = 0, totalPaidToThemPaisa = 0, totalReceivedFromThemPaisa = 0;
  let nextDueDate: string | null = null;
  for (const r of rows) {
    if (r.account.direction === 'DEBT') { totalDebtRemainingPaisa += r.balance.remainingPaisa; totalPaidToThemPaisa += r.balance.paidPaisa; }
    else { totalReceivableRemainingPaisa += r.balance.remainingPaisa; totalReceivedFromThemPaisa += r.balance.paidPaisa; }
    if (r.balance.nextDueDate && (!nextDueDate || r.balance.nextDueDate < nextDueDate)) nextDueDate = r.balance.nextDueDate;
  }
  return {
    person,
    accounts: rows,
    totalDebtRemainingPaisa,
    totalReceivableRemainingPaisa,
    netToYouPaisa: totalReceivableRemainingPaisa - totalDebtRemainingPaisa,
    totalPaidToThemPaisa,
    totalReceivedFromThemPaisa,
    transactions: allTxns,
    lastTransactionDate: allTxns[0]?.txnDate ?? null,
    nextDueDate,
  };
}

export interface DebtConsolidation {
  count: number;
  totalRemainingPaisa: Paisa;
  averagePaisa: Paisa;
  largestPaisa: Paisa;
  smallestPaisa: Paisa;
  highestInterestAccountId: string | null;
  earliestDueDate: string | null;
  monthlyObligationPaisa: Paisa;
}

/** Portfolio-wide "debt consolidation" view (spec §64, §65). */
export async function getDebtConsolidation(db: SQLiteDatabase, asOf = new Date().toISOString()): Promise<DebtConsolidation> {
  const { accounts, balances } = await getPortfolio(db, { direction: 'DEBT', asOf });
  const live = balances.filter((b) => b.remainingPaisa > 0);
  const remaining = live.map((b) => b.remainingPaisa);
  const total = remaining.reduce((s, v) => s + v, 0);
  const accById = new Map(accounts.map((a) => [a.id, a]));
  let highestInterestAccountId: string | null = null;
  let highestBps = -1;
  let earliestDueDate: string | null = null;
  let monthlyObligationPaisa = 0;
  const asOfMonth = localDayKey(asOf).slice(0, 7);
  for (const b of live) {
    const a = accById.get(b.accountId);
    const bps = a?.interestRateBps ?? 0;
    if (bps > highestBps) { highestBps = bps; highestInterestAccountId = b.accountId; }
    if (b.nextDueDate && (!earliestDueDate || b.nextDueDate < earliestDueDate)) earliestDueDate = b.nextDueDate;
    if (b.nextDueDate && b.nextDueDate.slice(0, 7) <= asOfMonth) monthlyObligationPaisa += b.nextDuePaisa;
  }
  return {
    count: live.length,
    totalRemainingPaisa: total,
    averagePaisa: live.length ? Math.round(total / live.length) : 0,
    largestPaisa: remaining.length ? Math.max(...remaining) : 0,
    smallestPaisa: remaining.length ? Math.min(...remaining) : 0,
    highestInterestAccountId,
    earliestDueDate,
    monthlyObligationPaisa,
  };
}
