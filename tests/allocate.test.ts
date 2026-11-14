import { describe, expect, it } from 'vitest';
import {
  allocate,
  dhondtDivisors,
  highestAverages,
  largestRemainder,
  modifiedSainteLagueDivisors,
  sainteLagueDivisors,
} from '../src/seats/allocate';
import { FORMULAS } from '../src/seats/model';

const sum = (numbers: readonly number[]): number => numbers.reduce((a, b) => a + b, 0);

/** A small seeded random number generator (mulberry32), so the property tests are the same every run. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('highest averages, textbook examples', () => {
  // The example on Wikipedia's "D'Hondt method" and "Sainte-Laguë method" pages: 230,000 votes, 8 seats.
  const votes = [100_000, 80_000, 30_000, 20_000];

  it("D'Hondt gives 4, 3, 1, 0", () => {
    expect(allocate('dhondt', votes, 8)).toEqual({ seats: [4, 3, 1, 0], tie: null });
  });

  it('Sainte-Laguë gives 3, 3, 1, 1', () => {
    expect(allocate('sainte-lague', votes, 8)).toEqual({ seats: [3, 3, 1, 1], tie: null });
  });

  it('modified Sainte-Laguë makes the first seat harder: the smallest party goes without', () => {
    // Plain Sainte-Laguë seats the smallest party sixth (20,000 ÷ 1 = 20,000).
    expect(allocate('sainte-lague', votes, 7).seats).toEqual([3, 2, 1, 1]);
    // With 1.4 its first quotient is 14,286, behind everyone's first seven.
    expect(allocate('modified-sainte-lague', votes, 7)).toEqual({ seats: [3, 3, 1, 0], tie: null });
    // The eighth seat is a dead heat: 100,000 ÷ 7 and 20,000 ÷ 1.4 are the same number. More votes wins.
    expect(allocate('modified-sainte-lague', votes, 8)).toEqual({ seats: [4, 3, 1, 0], tie: { won: [0], lost: [3] } });
  });

  it('the divisors are 1, 2, 3; 1, 3, 5; and 1.4, 3, 5 (times five)', () => {
    expect([0, 1, 2, 3].map(dhondtDivisors)).toEqual([1, 2, 3, 4]);
    expect([0, 1, 2, 3].map(sainteLagueDivisors)).toEqual([1, 3, 5, 7]);
    expect([0, 1, 2, 3].map(modifiedSainteLagueDivisors).map((d) => d / 5)).toEqual([1.4, 3, 5, 7]);
  });
});

describe('largest remainder, textbook example', () => {
  // The example on Wikipedia's "Largest remainders method" page: 100,000 votes, 10 seats.
  const votes = [47_000, 16_000, 15_800, 12_000, 6_100, 3_100];

  it('the Hare quota gives 5, 2, 1, 1, 1, 0', () => {
    expect(allocate('hare', votes, 10)).toEqual({ seats: [5, 2, 1, 1, 1, 0], tie: null });
  });

  it('the Droop quota gives 5, 2, 2, 1, 0, 0', () => {
    expect(allocate('droop', votes, 10)).toEqual({ seats: [5, 2, 2, 1, 0, 0], tie: null });
  });

  it('shows the Alabama paradox: a bigger chamber can cost a party a seat', () => {
    expect(largestRemainder([6, 6, 2], 10, 'hare').seats).toEqual([4, 4, 2]);
    expect(largestRemainder([6, 6, 2], 11, 'hare').seats).toEqual([5, 5, 1]);
  });
});

describe('a real election', () => {
  // New Zealand, 2020 general election: party votes of the five parties that won seats, and their
  // seats in the 120-seat parliament (Sainte-Laguë). Source: Electoral Commission, electionresults.govt.nz.
  it('New Zealand 2020 by Sainte-Laguë: Labour 65, National 33, Green 10, ACT 10, Māori 2', () => {
    const votes = [1_443_545, 738_275, 226_757, 219_031, 33_630];
    expect(allocate('sainte-lague', votes, 120).seats).toEqual([65, 33, 10, 10, 2]);
  });
});

describe('dead heats', () => {
  it('more votes wins an equal quotient, and the tie is reported', () => {
    // Sixth seat: 100,000 ÷ 5 and 20,000 ÷ 1 are both 20,000.
    expect(allocate('sainte-lague', [100_000, 80_000, 30_000, 20_000], 6)).toEqual({
      seats: [3, 2, 1, 0],
      tie: { won: [0], lost: [3] },
    });
  });

  it('with equal votes, the party listed first wins', () => {
    for (const formula of FORMULAS) {
      const result = allocate(formula, [100, 100], 1);
      expect(result.seats, formula).toEqual([1, 0]);
      expect(result.tie, formula).toEqual({ won: [0], lost: [1] });
    }
  });

  it('a tie that both sides win is not reported', () => {
    expect(allocate('dhondt', [100, 100], 2)).toEqual({ seats: [1, 1], tie: null });
    expect(allocate('hare', [100, 100], 2)).toEqual({ seats: [1, 1], tie: null });
    expect(allocate('sainte-lague', [100_000, 80_000, 30_000, 20_000], 7).tie).toBeNull();
  });

  it('a three-way tie for two seats names two winners and one loser', () => {
    expect(allocate('dhondt', [50, 50, 50], 2)).toEqual({ seats: [1, 1, 0], tie: { won: [0, 1], lost: [2] } });
    expect(allocate('hare', [50, 50, 50], 2)).toEqual({ seats: [1, 1, 0], tie: { won: [0, 1], lost: [2] } });
  });

  it('the exact Droop quota never hands out a seat too many', () => {
    // Quota 100 ÷ 2 = 50: both parties have a full quota, but there is one seat.
    expect(allocate('droop', [50, 50], 1)).toEqual({ seats: [1, 0], tie: { won: [0], lost: [1] } });
    // Quota 120 ÷ 4 = 30: 2 + 1 + 1 full quotas for three seats; the smallest party, listed last, gives way.
    expect(allocate('droop', [60, 30, 30], 3)).toEqual({ seats: [2, 1, 0], tie: { won: [0, 1], lost: [2] } });
  });
});

describe('edges', () => {
  it('nobody gets a seat without votes', () => {
    for (const formula of FORMULAS) {
      expect(allocate(formula, [0, 0, 0], 10), formula).toEqual({ seats: [0, 0, 0], tie: null });
      expect(allocate(formula, [], 10), formula).toEqual({ seats: [], tie: null });
      expect(allocate(formula, [10, 0, 5], 4).seats[1], formula).toBe(0);
    }
  });

  it('no seats means no seats', () => {
    for (const formula of FORMULAS) expect(allocate(formula, [10, 20], 0).seats, formula).toEqual([0, 0]);
  });

  it('a single party takes everything', () => {
    for (const formula of FORMULAS) expect(allocate(formula, [0, 7], 13).seats, formula).toEqual([0, 13]);
  });

  it('refuses votes or seats that are not whole numbers, zero or more', () => {
    expect(() => allocate('dhondt', [1.5], 1)).toThrow(RangeError);
    expect(() => allocate('hare', [-1], 1)).toThrow(RangeError);
    expect(() => allocate('dhondt', [1], -1)).toThrow(RangeError);
    expect(() => allocate('droop', [1], 1.5)).toThrow(RangeError);
    expect(() => highestAverages([Number.NaN], 1, dhondtDivisors)).toThrow(RangeError);
  });

  it('stays exact with the largest numbers Seats allows', () => {
    // 30 parties with up to a million million votes each, 3,000 seats: far beyond what a double can multiply exactly.
    const votes = Array.from({ length: 30 }, (_, i) => 1_000_000_000_000 - i * 7);
    for (const formula of FORMULAS) {
      const { seats } = allocate(formula, votes, 3000);
      expect(sum(seats), formula).toBe(3000);
      expect(seats, formula).toEqual(Array.from({ length: 30 }, () => 100));
    }
    // One vote more than the rest must be worth exactly one seat when there is one seat to spare.
    const edge = allocate('dhondt', [1_000_000_000_001, 1_000_000_000_000, 1_000_000_000_000], 4);
    expect(edge).toEqual({ seats: [2, 1, 1], tie: null });
  });
});

describe('properties, over a thousand random elections', () => {
  const next = random(2026);
  const elections = Array.from({ length: 1000 }, () => {
    const parties = 1 + Math.floor(next() * 12);
    const votes = Array.from({ length: parties }, () => (next() < 0.1 ? 0 : Math.floor(next() ** 3 * 1_000_000)));
    const seats = Math.floor(next() * 400);
    return { votes, seats };
  });

  it('every seat is filled, as long as somebody has votes', () => {
    for (const { votes, seats } of elections) {
      for (const formula of FORMULAS) {
        expect(sum(allocate(formula, votes, seats).seats)).toBe(sum(votes) > 0 ? seats : 0);
      }
    }
  });

  it('more votes never means fewer seats', () => {
    for (const { votes, seats } of elections) {
      for (const formula of FORMULAS) {
        const won = allocate(formula, votes, seats).seats;
        for (let a = 0; a < votes.length; a++) {
          for (let b = 0; b < votes.length; b++) {
            if (votes[a]! > votes[b]!) expect(won[a]!).toBeGreaterThanOrEqual(won[b]!);
          }
        }
      }
    }
  });

  it('largest remainder stays within one seat of the exact share, and Hare never goes below or above it rounded', () => {
    for (const { votes, seats } of elections) {
      const all = sum(votes);
      if (all === 0) continue;
      const hare = allocate('hare', votes, seats).seats;
      hare.forEach((won, i) => {
        const exact = (votes[i]! * seats) / all;
        expect(won).toBeGreaterThanOrEqual(Math.floor(exact - 1e-9));
        expect(won).toBeLessThanOrEqual(Math.ceil(exact + 1e-9));
      });
    }
  });

  it("D'Hondt never gives a party less than its exact share rounded down", () => {
    for (const { votes, seats } of elections) {
      const all = sum(votes);
      if (all === 0) continue;
      allocate('dhondt', votes, seats).seats.forEach((won, i) => {
        expect(won).toBeGreaterThanOrEqual(Math.floor((votes[i]! * seats) / all - 1e-9));
      });
    }
  });

  it('the divisor formulas never take a seat away when the chamber grows', () => {
    for (const { votes, seats } of elections.slice(0, 300)) {
      for (const formula of ['dhondt', 'sainte-lague', 'modified-sainte-lague'] as const) {
        const before = allocate(formula, votes, seats).seats;
        const after = allocate(formula, votes, seats + 1).seats;
        before.forEach((won, i) => expect(after[i]!).toBeGreaterThanOrEqual(won));
      }
    }
  });

  it("D'Hondt is the kindest of the five to the largest party, Hare and Sainte-Laguë the least", () => {
    let dhondtAhead = 0;
    let other = 0;
    for (const { votes, seats } of elections) {
      const top = votes.indexOf(Math.max(...votes));
      const d = allocate('dhondt', votes, seats).seats[top]!;
      const s = allocate('sainte-lague', votes, seats).seats[top]!;
      expect(d).toBeGreaterThanOrEqual(s);
      if (d > s) dhondtAhead++;
      else other++;
    }
    expect(dhondtAhead).toBeGreaterThan(0);
    expect(other).toBeGreaterThan(0);
  });
});
