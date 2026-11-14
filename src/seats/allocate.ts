/**
 * The formulas that turn votes into seats.
 *
 * Votes come in as whole numbers and every comparison is made on whole numbers (BigInt
 * cross-multiplication), so nothing is ever decided by a rounding error.
 *
 * A dead heat is settled the same way everywhere: the party with more votes wins, and if those
 * are equal too, the party listed first. Real laws mostly draw lots; whenever the tie-break
 * decided who got a seat, the result says so in `tie`, so the page can tell people.
 */
import type { FormulaId } from './model';

export interface Tie {
  /** Parties that won a seat on the tie-break, by index. */
  won: number[];
  /** Parties with an equal claim that went without, by index. */
  lost: number[];
}

export interface Allocation {
  /** Seats per party, in the order of the votes given. */
  seats: number[];
  /** Set when a dead heat was settled by the tie-break. */
  tie: Tie | null;
}

const checked = (votes: readonly number[]): bigint[] =>
  votes.map((v) => {
    if (!Number.isSafeInteger(v) || v < 0) throw new RangeError('Votes must be whole numbers, zero or more.');
    return BigInt(v);
  });

const seatCount = (seats: number): number => {
  if (!Number.isSafeInteger(seats) || seats < 0) throw new RangeError('Seats must be a whole number, zero or more.');
  return seats;
};

/** The divisor a party's votes are divided by when it already holds `won` seats. Whole numbers only. */
export type Divisors = (won: number) => number;

/** 1, 2, 3, 4… */
export const dhondtDivisors: Divisors = (won) => won + 1;
/** 1, 3, 5, 7… */
export const sainteLagueDivisors: Divisors = (won) => 2 * won + 1;
/** 1.4, 3, 5, 7…, written five times larger to stay in whole numbers: 7, 15, 25, 35… */
export const modifiedSainteLagueDivisors: Divisors = (won) => (won === 0 ? 7 : 5 * (2 * won + 1));

/**
 * Highest averages: each seat in turn goes to the party whose votes, divided by its divisor,
 * are highest. D'Hondt, Sainte-Laguë and modified Sainte-Laguë differ only in their divisors.
 */
export function highestAverages(votes: readonly number[], seats: number, divisors: Divisors): Allocation {
  const v = checked(votes);
  const total = seatCount(seats);
  const won = v.map(() => 0);
  const divisor = (held: number): bigint => BigInt(divisors(held));
  // Is party a's next quotient higher than party b's? Equal quotients: more votes, then listed first.
  const ahead = (a: number, b: number): boolean => {
    const left = v[a]! * divisor(won[b]!);
    const right = v[b]! * divisor(won[a]!);
    if (left !== right) return left > right;
    if (v[a] !== v[b]) return v[a]! > v[b]!;
    return a < b;
  };
  for (let s = 0; s < total; s++) {
    let best = -1;
    for (let i = 0; i < v.length; i++) {
      if (v[i]! === 0n) continue;
      if (best < 0 || ahead(i, best)) best = i;
    }
    if (best < 0) break; // nobody has any votes
    won[best]!++;
  }

  // A dead heat: the lowest quotient that won a seat equals the highest that did not.
  let tie: Tie | null = null;
  const holders = won.map((_, i) => i).filter((i) => won[i]! > 0);
  const waiting = won.map((_, i) => i).filter((i) => v[i]! > 0n);
  if (holders.length > 0 && waiting.length > 0) {
    // Quotients as fractions votes / divisor; compare a/b with c/d as a*d against c*b.
    const last = (i: number): [bigint, bigint] => [v[i]!, divisor(won[i]! - 1)];
    const next = (i: number): [bigint, bigint] => [v[i]!, divisor(won[i]!)];
    const compare = (p: [bigint, bigint], q: [bigint, bigint]): number => {
      const d = p[0] * q[1] - q[0] * p[1];
      return d > 0n ? 1 : d < 0n ? -1 : 0;
    };
    let lowest = last(holders[0]!);
    for (const i of holders) if (compare(last(i), lowest) < 0) lowest = last(i);
    const lost = waiting.filter((i) => compare(next(i), lowest) === 0);
    if (lost.length > 0) {
      tie = { won: holders.filter((i) => compare(last(i), lowest) === 0), lost };
    }
  }
  return { seats: won, tie };
}

export type Quota = 'hare' | 'droop';

/**
 * Largest remainder: a party gets one seat for every full quota of votes, and the seats left
 * over go to the parties with the largest remainders.
 *
 * The Hare quota is votes ÷ seats. The Droop quota is taken exactly, as votes ÷ (seats + 1);
 * many laws round it up to the next whole vote, which only ever matters in a dead heat.
 */
export function largestRemainder(votes: readonly number[], seats: number, quota: Quota): Allocation {
  const v = checked(votes);
  const total = seatCount(seats);
  const all = v.reduce((sum, x) => sum + x, 0n);
  const won = v.map(() => 0);
  if (all === 0n || total === 0) return { seats: won, tie: null };

  // quota = all / parts, so full quotas = floor(votes * parts / all) and the remainder is what is left over all.
  const parts = BigInt(quota === 'hare' ? total : total + 1);
  const remainder = v.map((x, i) => {
    won[i] = Number((x * parts) / all);
    return (x * parts) % all;
  });
  let left = total - won.reduce((sum, x) => sum + x, 0);
  let tie: Tie | null = null;

  if (left < 0) {
    // Only with the exact Droop quota, when every party lands exactly on whole quotas:
    // one seat too many. The party with the fewest votes (listed last, if equal) gives one up.
    const holders = won.map((_, i) => i).filter((i) => won[i]! > 0);
    const loser = holders.reduce((a, b) => (v[b]! < v[a]! || (v[b] === v[a] && b > a) ? b : a));
    won[loser]!--;
    return { seats: won, tie: { won: holders.filter((i) => i !== loser), lost: [loser] } };
  }

  // Largest remainders first; equal remainders: more votes, then listed first.
  const order = v
    .map((_, i) => i)
    .filter((i) => v[i]! > 0n)
    .sort((a, b) => {
      if (remainder[a] !== remainder[b]) return remainder[a]! > remainder[b]! ? -1 : 1;
      if (v[a] !== v[b]) return v[a]! > v[b]! ? -1 : 1;
      return a - b;
    });
  const takers = order.slice(0, left);
  for (const i of takers) won[i]!++;
  left -= takers.length;

  const lastIn = takers[takers.length - 1];
  const firstOut = order[takers.length];
  if (lastIn !== undefined && firstOut !== undefined && remainder[lastIn] === remainder[firstOut]) {
    const level = remainder[lastIn];
    tie = { won: takers.filter((i) => remainder[i] === level), lost: order.slice(takers.length).filter((i) => remainder[i] === level) };
  }
  return { seats: won, tie };
}

/** Shares out `seats` among parties by the named formula. Parties with no votes get nothing. */
export function allocate(formula: FormulaId, votes: readonly number[], seats: number): Allocation {
  switch (formula) {
    case 'dhondt':
      return highestAverages(votes, seats, dhondtDivisors);
    case 'sainte-lague':
      return highestAverages(votes, seats, sainteLagueDivisors);
    case 'modified-sainte-lague':
      return highestAverages(votes, seats, modifiedSainteLagueDivisors);
    case 'hare':
      return largestRemainder(votes, seats, 'hare');
    case 'droop':
      return largestRemainder(votes, seats, 'droop');
  }
}
