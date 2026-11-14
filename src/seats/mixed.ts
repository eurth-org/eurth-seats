/**
 * Mixed-member systems: some seats are won in districts, the rest come from party lists.
 * Seats does not count districts; the district seats each party won are typed in, and the list
 * seats are worked out here, in one of two ways.
 *
 * Parallel (Japan, Lithuania): the list seats are shared out on their own, beside the
 * districts. A party that sweeps the districts keeps that advantage.
 *
 * Compensatory (New Zealand, Germany): the whole chamber is shared out in proportion to the
 * list vote, and a party's list seats make up the difference between that share and the
 * districts it won. A party that won more districts than its share keeps them all: those are
 * overhang seats, and the chamber grows by that many. (There are no levelling seats.)
 */
import { allocate, type Tie } from './allocate';
import type { FormulaId } from './model';

export interface MixedAllocation {
  /** List seats per party. */
  list: number[];
  /** Overhang seats per party: district seats beyond the party's proportional share. Always 0 in parallel. */
  overhang: number[];
  /** District and list seats together, per party. */
  total: number[];
  /** How many seats were shared out by the formula. */
  shared: number;
  tie: Tie | null;
}

const add = (numbers: readonly number[]): number => numbers.reduce((sum, n) => sum + n, 0);

/**
 * List seats beside the districts.
 * @param votes list votes per party, as whole numbers
 * @param qualified whether each party may win list seats (it cleared the threshold)
 * @param districts district seats won per party
 * @param size seats in the chamber, districts and list together
 */
export function parallelSeats(
  formula: FormulaId,
  votes: readonly number[],
  qualified: readonly boolean[],
  districts: readonly number[],
  size: number,
): MixedAllocation {
  const shared = Math.max(0, size - add(districts));
  const { seats: list, tie } = allocate(formula, votes.map((v, i) => (qualified[i] ? v : 0)), shared);
  return { list, overhang: votes.map(() => 0), total: list.map((l, i) => l + (districts[i] ?? 0)), shared, tie };
}

/**
 * List seats that top the districts up to a proportional chamber.
 *
 * District seats won by parties that may not win list seats (below the threshold, or with no
 * list votes: independents, say) are set aside first, and the rest of the chamber is shared out
 * among the qualifying parties.
 */
export function compensatorySeats(
  formula: FormulaId,
  votes: readonly number[],
  qualified: readonly boolean[],
  districts: readonly number[],
  size: number,
): MixedAllocation {
  const counts = votes.map((v, i) => (qualified[i] && v > 0 ? v : 0));
  const aside = add(districts.filter((_, i) => counts[i] === 0));
  const shared = Math.max(0, size - aside);
  const { seats: share, tie } = allocate(formula, counts, shared);
  const list = share.map((s, i) => (counts[i]! > 0 ? Math.max(0, s - (districts[i] ?? 0)) : 0));
  const overhang = share.map((s, i) => (counts[i]! > 0 ? Math.max(0, (districts[i] ?? 0) - s) : 0));
  return { list, overhang, total: list.map((l, i) => l + (districts[i] ?? 0)), shared, tie };
}
