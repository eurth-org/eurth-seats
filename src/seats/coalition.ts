/**
 * Coalition maths: who has a majority together, and by how much.
 */
import { listWords, seatWords } from './format';
import type { Outcome } from './results';

export interface Coalition {
  /** The parties picked, by index, in list order. Parties without seats are left out. */
  members: number[];
  /** Their seats together. */
  seats: number;
  /** Seats needed for a majority. */
  majority: number;
  /** Seats above the majority needed (0 or more), or below it (negative). */
  margin: number;
  status: 'empty' | 'majority' | 'short';
  /** The same, written out: "Liberal Union and Civic Alliance hold 63 of the 120 seats: a majority, with 2 seats to spare over the 61 needed." */
  text: string;
}

/** The parties picked, counted together. */
export function coalition(outcome: Outcome, picks: readonly number[]): Coalition {
  const members = [...new Set(picks)]
    .filter((i) => (outcome.parties[i]?.seats ?? 0) > 0)
    .sort((a, b) => a - b);
  const seats = members.reduce((sum, i) => sum + outcome.parties[i]!.seats, 0);
  const { majority, total } = outcome;
  const margin = seats - majority;
  if (members.length === 0) {
    return { members, seats: 0, majority, margin: -majority, status: 'empty', text: 'Pick parties to see whether they have a majority together.' };
  }
  const names = listWords(members.map((i) => outcome.parties[i]!.name));
  const hold = `${names} ${members.length === 1 ? 'holds' : 'hold'} ${seats} of the ${seatWords(total)}`;
  let text: string;
  if (margin > 0) text = `${hold}: a majority, with ${seatWords(margin)} to spare over the ${majority} needed.`;
  else if (margin === 0) text = `${hold}: a majority, with none to spare.`;
  else if (seats * 2 === total) text = `${hold}: exactly half, 1 seat short of the ${majority} needed for a majority.`;
  else text = `${hold}: ${seatWords(-margin)} short of the ${majority} needed for a majority.`;
  return { members, seats, majority, margin, status: margin >= 0 ? 'majority' : 'short', text };
}

/**
 * Every minimal winning coalition: a set of parties with a majority that would lose it if any
 * one member left. Fewest parties first, then fewest seats. With more than 20 seated parties
 * there are too many to list, and the answer is empty.
 */
export function minimalWinning(outcome: Outcome, limit = 24): number[][] {
  const seated = outcome.parties.filter((p) => p.seats > 0).sort((a, b) => b.seats - a.seats || a.index - b.index);
  if (seated.length > 20) return [];
  const found: { members: number[]; seats: number }[] = [];
  // Largest first, so the party added last is always the smallest: the set is minimal
  // exactly when it wins and did not win before that last party joined.
  const walk = (from: number, members: number[], seats: number): void => {
    for (let i = from; i < seated.length; i++) {
      const party = seated[i]!;
      const together = seats + party.seats;
      if (together >= outcome.majority) found.push({ members: [...members, party.index], seats: together });
      else walk(i + 1, [...members, party.index], together);
    }
  };
  walk(0, [], 0);
  return found
    .sort((a, b) => a.members.length - b.members.length || a.seats - b.seats)
    .slice(0, limit)
    .map((c) => c.members.sort((a, b) => a - b));
}
