/**
 * The working behind a count, for the guide's tables: the quotients a divisor formula
 * compares, and the quotas and remainders of largest remainder. The numbers shown are rounded
 * for reading; which ones win is taken from the exact count in allocate.ts, never from the
 * rounded figures.
 */
import { allocate, dhondtDivisors, modifiedSainteLagueDivisors, sainteLagueDivisors, type Divisors } from './allocate';
import type { FormulaId } from './model';

export type DivisorFormula = 'dhondt' | 'sainte-lague' | 'modified-sainte-lague';

const DIVISORS: Record<DivisorFormula, { divisors: Divisors; scale: number }> = {
  dhondt: { divisors: dhondtDivisors, scale: 1 },
  'sainte-lague': { divisors: sainteLagueDivisors, scale: 1 },
  // Kept five times larger in the count, to stay in whole numbers: 7, 15, 25… for 1.4, 3, 5…
  'modified-sainte-lague': { divisors: modifiedSainteLagueDivisors, scale: 5 },
};

export interface QuotientTable {
  /** The divisors, as people write them: 1, 2, 3… or 1, 3, 5… or 1.4, 3, 5… */
  divisors: number[];
  rows: {
    /** Votes divided by each divisor. */
    quotients: number[];
    /** Whether that quotient won a seat. */
    wins: boolean[];
    seats: number;
  }[];
}

/** The table of quotients for a divisor formula, with enough columns to show every seat won and one more. */
export function quotientTable(formula: DivisorFormula, votes: readonly number[], seats: number): QuotientTable {
  const { divisors, scale } = DIVISORS[formula];
  const won = allocate(formula, votes, seats).seats;
  const columns = Math.max(1, ...won) + 1;
  const shown = Array.from({ length: columns }, (_, i) => divisors(i) / scale);
  return {
    divisors: shown,
    rows: votes.map((v, p) => ({
      quotients: shown.map((d) => v / d),
      wins: shown.map((_, i) => i < won[p]!),
      seats: won[p]!,
    })),
  };
}

export interface RemainderTable {
  /** The quota: votes ÷ seats (Hare) or votes ÷ (seats + 1) (Droop). */
  quota: number;
  rows: {
    /** Votes ÷ quota. */
    quotas: number;
    /** Seats for full quotas. */
    full: number;
    /** What is left of a quota, 0 to 1. */
    remainder: number;
    /** 1 if the remainder won one of the seats left over. */
    extra: number;
    seats: number;
  }[];
  /** Seats left after the full quotas. */
  left: number;
}

/** The working of largest remainder with the Hare or the Droop quota. */
export function remainderTable(formula: 'hare' | 'droop', votes: readonly number[], seats: number): RemainderTable {
  const total = votes.reduce((a, b) => a + b, 0);
  const quota = total / (formula === 'hare' ? seats : seats + 1);
  const won = allocate(formula, votes, seats).seats;
  const rows = votes.map((v, p) => {
    const quotas = quota > 0 ? v / quota : 0;
    const full = Math.min(won[p]!, Math.floor(quotas + 1e-9));
    return { quotas, full, remainder: quotas - Math.floor(quotas + 1e-9), extra: won[p]! - full, seats: won[p]! };
  });
  return { quota, rows, left: seats - rows.reduce((sum, r) => sum + r.full, 0) };
}

export const isDivisorFormula = (formula: FormulaId): formula is DivisorFormula => formula in DIVISORS;
