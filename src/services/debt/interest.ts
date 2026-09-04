// Interest engine for the Personal Debt & Receivable module.
//
// Pure, deterministic, integer-paisa in / integer-paisa out. Five models (spec §60,
// "পূর্ণ সুদের ইঞ্জিন"):
//
//   NONE          total payable = principal.
//   FLAT_TOTAL    the user states the final total directly; interest = total − principal.
//   SIMPLE        I = P × r × t        (r per `interestPeriod`, t = elapsed periods, no compounding)
//   COMPOUND      A = P × (1 + rc)^n   (rc = rate per `compoundPeriod`, n = elapsed compound periods)
//   MONTHLY_FLAT  simple interest fixed to whole calendar months (the common informal
//                 "X% per month" loan) — like SIMPLE with period = MONTH, months floored.
//
// `interestRateBps` is basis points for the given period (1% = 100 bps, 12% = 1200 bps).

import { addPaisa, applyBps, type Paisa } from './money';
import type { Account, InterestType, RatePeriod } from './types';

const MS_PER_DAY = 86_400_000;

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

/** Fractional number of `period`s between two ISO dates (>= 0; 0 if `to` <= `from`). */
export function elapsedPeriods(fromIso: string, toIso: string, period: RatePeriod): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) return 0;
  if (to.getTime() <= from.getTime()) return 0;

  if (period === 'DAY') return (to.getTime() - from.getTime()) / MS_PER_DAY;
  if (period === 'WEEK') return (to.getTime() - from.getTime()) / (MS_PER_DAY * 7);

  // Calendar-month counting with a day-of-month fraction, then /12 for years.
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  const dayFraction = (to.getDate() - from.getDate()) / daysInMonth(to.getFullYear(), to.getMonth());
  months += dayFraction;
  if (months < 0) months = 0;
  return period === 'YEAR' ? months / 12 : months;
}

export interface InterestBreakdown {
  principalPaisa: Paisa;
  interestPaisa: Paisa;
  totalPayablePaisa: Paisa;
  asOf: string;
}

export interface InterestParams {
  principalPaisa: Paisa;
  interestType: InterestType;
  interestRateBps?: number | null;
  interestPeriod?: RatePeriod | null;
  compoundPeriod?: RatePeriod | null;
  manualTotalPayablePaisa?: Paisa | null;
  openedDate?: string | null;
}

/**
 * Total interest accrued on `principal` from `openedDate` up to `asOfIso`.
 * Deterministic; call with a fixed `asOf` (e.g. a statement date) for stable output.
 */
export function computeInterest(params: InterestParams, asOfIso: string): InterestBreakdown {
  const principalPaisa = Math.max(0, Math.trunc(params.principalPaisa));
  const zero: InterestBreakdown = {
    principalPaisa,
    interestPaisa: 0,
    totalPayablePaisa: principalPaisa,
    asOf: asOfIso,
  };

  switch (params.interestType) {
    case 'NONE':
      return zero;

    case 'FLAT_TOTAL': {
      const total = Math.max(principalPaisa, Math.trunc(params.manualTotalPayablePaisa ?? principalPaisa));
      return { principalPaisa, interestPaisa: total - principalPaisa, totalPayablePaisa: total, asOf: asOfIso };
    }

    case 'SIMPLE': {
      const rateBps = params.interestRateBps ?? 0;
      const period = params.interestPeriod ?? 'YEAR';
      const t = params.openedDate ? elapsedPeriods(params.openedDate, asOfIso, period) : 0;
      const interestPaisa = Math.round(applyBps(principalPaisa, rateBps) * t);
      return {
        principalPaisa,
        interestPaisa,
        totalPayablePaisa: addPaisa(principalPaisa, interestPaisa),
        asOf: asOfIso,
      };
    }

    case 'MONTHLY_FLAT': {
      const rateBps = params.interestRateBps ?? 0;
      const monthsExact = params.openedDate ? elapsedPeriods(params.openedDate, asOfIso, 'MONTH') : 0;
      const months = Math.floor(monthsExact);
      const interestPaisa = applyBps(principalPaisa, rateBps) * months;
      return {
        principalPaisa,
        interestPaisa,
        totalPayablePaisa: addPaisa(principalPaisa, interestPaisa),
        asOf: asOfIso,
      };
    }

    case 'COMPOUND': {
      const rateBps = params.interestRateBps ?? 0;
      const ratePeriod = params.interestPeriod ?? 'YEAR';
      const compPeriod = params.compoundPeriod ?? ratePeriod;
      if (!params.openedDate || rateBps <= 0 || principalPaisa <= 0) return zero;

      // Rate per compounding step = nominal period rate scaled by (compound / rate) period length.
      const periodDays = periodInDays(ratePeriod);
      const compDays = periodInDays(compPeriod);
      const ratePerComp = (rateBps / 10_000) * (compDays / periodDays);
      const n = elapsedPeriods(params.openedDate, asOfIso, compPeriod);
      if (n <= 0) return zero;

      const growth = Math.pow(1 + ratePerComp, n);
      const totalPayablePaisa = Math.round(principalPaisa * growth);
      return {
        principalPaisa,
        interestPaisa: totalPayablePaisa - principalPaisa,
        totalPayablePaisa,
        asOf: asOfIso,
      };
    }

    default:
      return zero;
  }
}

function periodInDays(period: RatePeriod): number {
  switch (period) {
    case 'DAY': return 1;
    case 'WEEK': return 7;
    case 'MONTH': return 30.4375;
    case 'YEAR': return 365.25;
  }
}

/** Convenience: run {@link computeInterest} straight off a stored account row. */
export function accountInterest(account: Account, asOfIso: string): InterestBreakdown {
  return computeInterest(
    {
      principalPaisa: account.principalPaisa,
      interestType: account.interestType,
      interestRateBps: account.interestRateBps,
      interestPeriod: account.interestPeriod,
      compoundPeriod: account.compoundPeriod,
      manualTotalPayablePaisa: account.manualTotalPayablePaisa,
      openedDate: account.openedDate,
    },
    asOfIso,
  );
}
