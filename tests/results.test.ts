import { describe, expect, it } from 'vitest';
import { cleanElection, defaultElection, type Election, type Party } from '../src/seats/model';
import { count, majorityOf, methodSentence, systemCaption } from '../src/seats/results';

const election = (value: Omit<Partial<Election>, 'parties'> & { parties: Partial<Party>[] }): Election => cleanElection(value);
const seats = (e: Election): number[] => count(e).parties.map((p) => p.seats);

describe('the election Seats opens with', () => {
  const teland = defaultElection();
  const outcome = count(teland);

  it("is the mock-up's: Liberal Union 41, National Labour 33, Civic Alliance 22, Agrarian League 14, Independents 10", () => {
    expect(Object.fromEntries(outcome.parties.map((p) => [p.name, p.seats]))).toEqual({
      'National Labour': 33,
      'Civic Alliance': 22,
      'Liberal Union': 41,
      'Agrarian League': 14,
      Independents: 10,
      'Pirate Party': 0,
    });
  });

  it('fills all 120 seats, needs 61 for a majority, and is hung', () => {
    expect(outcome).toMatchObject({ size: 120, total: 120, seated: 120, vacant: 0, majority: 61, hung: true, largest: 2, issues: [], tie: null });
  });

  it('keeps the Pirate Party out: 2.8% is below the 5% threshold', () => {
    expect(outcome.parties[5]).toMatchObject({ qualified: false, seats: 0 });
    expect(outcome.parties[5]!.voteShare).toBeCloseTo(0.028, 10);
    expect(outcome.parties[5]!.difference).toBeCloseTo(-0.028, 10);
  });

  it('shows shares and their difference', () => {
    const liberal = outcome.parties[2]!;
    expect(liberal.voteShare).toBeCloseTo(0.331, 10);
    expect(liberal.seatShare).toBeCloseTo(41 / 120, 10);
    expect(liberal.difference).toBeCloseTo(41 / 120 - 0.331, 10);
    expect(outcome.totalVotes).toBeCloseTo(100, 10);
  });

  it('measures disproportionality with the Gallagher index', () => {
    // √(½ Σ (vote% − seat%)²) over the six parties.
    const expected = Math.sqrt(
      outcome.parties.reduce((sum, p) => sum + ((p.voteShare! - p.seatShare!) * 100) ** 2, 0) / 2,
    );
    expect(outcome.gallagher).toBeCloseTo(expected, 10);
    expect(outcome.gallagher!).toBeGreaterThan(2);
    expect(outcome.gallagher!).toBeLessThan(3);
  });
});

describe('thresholds', () => {
  const base = { size: 10, system: 'hare' as const, votesAs: 'counts' as const };

  it('a party exactly on the threshold is in', () => {
    const e = election({ ...base, threshold: 5, parties: [{ votes: 950 }, { votes: 50 }] });
    expect(count(e).parties[1]!.qualified).toBe(true);
    const under = election({ ...base, threshold: 5, parties: [{ votes: 951 }, { votes: 49 }] });
    expect(count(under).parties[1]!.qualified).toBe(false);
  });

  it('is exact at awkward values: 3.25% of 40,000 votes is 1,300', () => {
    const at = election({ ...base, threshold: 3.25, parties: [{ votes: 38_700 }, { votes: 1_300 }] });
    expect(count(at).parties[1]!.qualified).toBe(true);
    const below = election({ ...base, threshold: 3.25, parties: [{ votes: 38_701 }, { votes: 1_299 }] });
    expect(count(below).parties[1]!.qualified).toBe(false);
  });

  it('seats are shared among qualifying parties only, on their votes alone', () => {
    // Without the threshold the small party would take a seat by Hare; with it, the seat goes elsewhere.
    const open = election({ ...base, threshold: 0, parties: [{ votes: 520 }, { votes: 400 }, { votes: 80 }] });
    expect(seats(open)).toEqual([5, 4, 1]);
    const closed = election({ ...base, threshold: 10, parties: [{ votes: 520 }, { votes: 400 }, { votes: 80 }] });
    expect(seats(closed)).toEqual([6, 4, 0]);
  });

  it('says so when everyone is below the threshold, or nobody has votes', () => {
    const none = count(election({ ...base, threshold: 40, parties: [{ votes: 30 }, { votes: 35 }, { votes: 35 }] }));
    expect(none).toMatchObject({ seated: 0, vacant: 10, hung: false, issues: ['none-qualified'], largest: null, gallagher: null });
    const empty = count(election({ ...base, parties: [{ votes: 0 }, { votes: 0 }] }));
    expect(empty).toMatchObject({ seated: 0, issues: ['no-votes'] });
    expect(empty.parties[0]).toMatchObject({ voteShare: null, seatShare: null, difference: null });
  });
});

describe('votes as counts or as percentages', () => {
  it('give the same seats', () => {
    const counts = election({
      size: 120,
      system: 'sainte-lague',
      votesAs: 'counts',
      parties: [{ votes: 264_000 }, { votes: 179_000 }, { votes: 331_000 }, { votes: 116_000 }, { votes: 82_000 }, { votes: 28_000 }],
    });
    const percent = election({
      size: 120,
      system: 'sainte-lague',
      votesAs: 'percent',
      parties: [{ votes: 26.4 }, { votes: 17.9 }, { votes: 33.1 }, { votes: 11.6 }, { votes: 8.2 }, { votes: 2.8 }],
    });
    expect(seats(counts)).toEqual(seats(percent));
  });

  it('percentages need not add up to 100', () => {
    const e = election({ size: 10, system: 'dhondt', votesAs: 'percent', parties: [{ votes: 30 }, { votes: 20 }] });
    expect(seats(e)).toEqual([6, 4]);
    expect(count(e).parties[0]!.voteShare).toBeCloseTo(0.6, 10);
  });
});

describe('the majority bonus', () => {
  it('gives the largest party its bonus first and shares out the rest', () => {
    // 300 seats, 50 as a bonus: 250 are shared by Hare among parties over 3%.
    const e = election({
      size: 300,
      system: 'hare',
      threshold: 3,
      bonus: 50,
      votesAs: 'percent',
      parties: [{ votes: 36 }, { votes: 32 }, { votes: 14 }, { votes: 10 }, { votes: 6 }, { votes: 2 }],
    });
    const outcome = count(e);
    // 250 seats over 98 qualifying points: 91.84, 81.63, 35.71, 25.51, 15.31. Full quotas 91, 81, 35, 25, 15;
    // the three seats left go to the remainders .84, .71 and .63.
    expect(outcome.parties.map((p) => p.seats - p.bonus)).toEqual([92, 82, 36, 25, 15, 0]);
    expect(outcome.parties.map((p) => p.bonus)).toEqual([50, 0, 0, 0, 0, 0]);
    expect(outcome.parties[0]!.seats).toBe(142);
    expect(outcome).toMatchObject({ seated: 300, majority: 151, hung: true });
  });

  it('can turn a plurality into a majority', () => {
    const e = election({ size: 100, system: 'dhondt', bonus: 20, votesAs: 'percent', parties: [{ votes: 42 }, { votes: 38 }, { votes: 20 }] });
    const outcome = count(e);
    expect(outcome.parties.map((p) => p.seats)).toEqual([54, 30, 16]);
    expect(outcome.hung).toBe(false);
    expect(outcome.largest).toBe(0);
  });

  it('goes to the party listed first when the lead is shared, and reports the tie', () => {
    const e = election({ size: 11, system: 'dhondt', bonus: 1, votesAs: 'counts', parties: [{ votes: 100 }, { votes: 100 }] });
    const outcome = count(e);
    expect(outcome.parties.map((p) => p.seats)).toEqual([6, 5]);
    expect(outcome.tie).toEqual({ won: [0], lost: [1] });
    expect(outcome.issues).toContain('tie');
  });

  it('is ignored when seats are entered directly, and never exceeds the chamber', () => {
    expect(cleanElection({ size: 10, bonus: 99 }).bonus).toBe(10);
    const all = election({ size: 10, system: 'dhondt', bonus: 10, votesAs: 'counts', parties: [{ votes: 3 }, { votes: 2 }] });
    expect(seats(all)).toEqual([10, 0]);
    const direct = election({ size: 10, system: 'direct', bonus: 5, parties: [{ seats: 6 }, { seats: 4 }] });
    expect(seats(direct)).toEqual([6, 4]);
    expect(count(direct).parties.every((p) => p.bonus === 0)).toBe(true);
  });
});

describe('seats entered directly', () => {
  it('takes the seats as typed and still compares them with the votes', () => {
    // First past the post exaggerates: 43.6% of the vote, 56.2% of the seats.
    const e = election({
      size: 650,
      system: 'direct',
      votesAs: 'percent',
      parties: [{ votes: 43.6, seats: 365 }, { votes: 32.1, seats: 203 }, { votes: 11.6, seats: 11 }, { votes: 12.7, seats: 71 }],
    });
    const outcome = count(e);
    expect(outcome).toMatchObject({ seated: 650, vacant: 0, majority: 326, hung: false, largest: 0, issues: [] });
    expect(outcome.parties[0]!.difference).toBeCloseTo(365 / 650 - 0.436, 10);
    expect(outcome.parties[2]!.difference!).toBeLessThan(-0.09);
  });

  it('works without any votes', () => {
    const outcome = count(election({ size: 5, system: 'direct', parties: [{ seats: 3 }, { seats: 2 }] }));
    expect(outcome).toMatchObject({ seated: 5, hung: false, gallagher: null, issues: [] });
    expect(outcome.parties[0]).toMatchObject({ voteShare: null, seatShare: 0.6, difference: null, qualified: true });
  });

  it('reports empty seats, and is not called hung until the chamber is full', () => {
    const outcome = count(election({ size: 10, system: 'direct', parties: [{ seats: 4 }, { seats: 3 }] }));
    expect(outcome).toMatchObject({ seated: 7, vacant: 3, total: 10, majority: 6, hung: false, issues: ['vacant'] });
  });

  it('reports more seats than the chamber holds, and counts the majority on what was typed', () => {
    const outcome = count(election({ size: 10, system: 'direct', parties: [{ seats: 8 }, { seats: 5 }] }));
    expect(outcome).toMatchObject({ seated: 13, total: 13, vacant: 0, majority: 7, issues: ['too-many-seats'], hung: false });
  });

  it('a level chamber has no largest party', () => {
    const outcome = count(election({ size: 10, system: 'direct', parties: [{ seats: 5 }, { seats: 5 }] }));
    expect(outcome).toMatchObject({ largest: null, hung: true, majority: 6 });
  });
});

describe('mixed-member systems', () => {
  // New Zealand 2020 again, now with the electorates each party won: 46, 23, 1, 1, 1.
  const nz = (mixedMode: 'compensatory' | 'parallel'): Election =>
    election({
      size: 120,
      system: 'mixed',
      mixedMode,
      listFormula: 'sainte-lague',
      votesAs: 'counts',
      parties: [
        { name: 'Labour', votes: 1_443_545, seats: 46 },
        { name: 'National', votes: 738_275, seats: 23 },
        { name: 'Green', votes: 226_757, seats: 1 },
        { name: 'ACT', votes: 219_031, seats: 1 },
        { name: 'Māori', votes: 33_630, seats: 1 },
      ],
    });

  it('with a top-up, list seats bring each party to its share: New Zealand 2020', () => {
    const outcome = count(nz('compensatory'));
    expect(outcome.parties.map((p) => p.district)).toEqual([46, 23, 1, 1, 1]);
    expect(outcome.parties.map((p) => p.list)).toEqual([19, 10, 9, 9, 1]);
    expect(outcome.parties.map((p) => p.seats)).toEqual([65, 33, 10, 10, 2]);
    expect(outcome).toMatchObject({ total: 120, seated: 120, majority: 61, hung: false, issues: [] });
  });

  it('side by side, the 48 list seats are shared on their own and the district winner keeps its lead', () => {
    const outcome = count(nz('parallel'));
    expect(outcome.parties.map((p) => p.list).reduce((a, b) => a + b, 0)).toBe(48);
    expect(outcome.parties.map((p) => p.list)).toEqual([26, 13, 4, 4, 1]);
    expect(outcome.parties.map((p) => p.seats)).toEqual([72, 36, 5, 5, 2]);
    expect(outcome.total).toBe(120);
  });

  it('overhang seats make the chamber larger', () => {
    // 100 seats. The Regionalists win 20 districts on 10% of the vote: 10 more than their share.
    const e = election({
      size: 100,
      system: 'mixed',
      mixedMode: 'compensatory',
      listFormula: 'sainte-lague',
      votesAs: 'percent',
      parties: [{ votes: 50, seats: 30 }, { votes: 40, seats: 10 }, { votes: 10, seats: 20 }],
    });
    const outcome = count(e);
    expect(outcome.parties.map((p) => p.seats)).toEqual([50, 40, 20]);
    expect(outcome.parties.map((p) => p.overhang)).toEqual([0, 0, 10]);
    expect(outcome.parties.map((p) => p.list)).toEqual([20, 30, 0]);
    expect(outcome).toMatchObject({ size: 100, total: 110, seated: 110, vacant: 0, majority: 56, issues: ['overhang'] });
  });

  it('a party below the threshold keeps its districts, which come off the seats to share', () => {
    const e = election({
      size: 100,
      system: 'mixed',
      mixedMode: 'compensatory',
      listFormula: 'dhondt',
      threshold: 5,
      votesAs: 'percent',
      parties: [{ votes: 58, seats: 30 }, { votes: 39, seats: 18 }, { votes: 3, seats: 2 }],
    });
    const outcome = count(e);
    // 98 seats over 58:39 by D'Hondt → 59 and 39.
    expect(outcome.parties.map((p) => p.seats)).toEqual([59, 39, 2]);
    expect(outcome.parties.map((p) => p.list)).toEqual([29, 21, 0]);
    expect(outcome.parties[2]).toMatchObject({ qualified: false, overhang: 0, district: 2 });
    expect(outcome).toMatchObject({ total: 100, seated: 100, issues: [] });
  });

  it('independents with districts and no list votes sit beside the parties', () => {
    const e = election({
      size: 10,
      system: 'mixed',
      mixedMode: 'compensatory',
      listFormula: 'hare',
      votesAs: 'counts',
      parties: [{ votes: 600, seats: 3 }, { votes: 400, seats: 1 }, { name: 'Independents', votes: 0, seats: 2 }],
    });
    expect(seats(e)).toEqual([5, 3, 2]);
  });

  it('more districts than seats leaves nothing for the lists', () => {
    const e = election({
      size: 10,
      system: 'mixed',
      mixedMode: 'parallel',
      listFormula: 'dhondt',
      votesAs: 'counts',
      parties: [{ votes: 60, seats: 8 }, { votes: 40, seats: 4 }],
    });
    const outcome = count(e);
    expect(outcome.parties.map((p) => p.list)).toEqual([0, 0]);
    expect(outcome).toMatchObject({ seated: 12, total: 12, issues: ['too-many-seats'] });
  });
});

describe('majorities', () => {
  it('a majority is more than half', () => {
    expect([1, 2, 3, 100, 101, 120, 650].map(majorityOf)).toEqual([1, 2, 2, 51, 51, 61, 326]);
  });

  it('exactly half is not a majority', () => {
    const outcome = count(election({ size: 100, system: 'direct', parties: [{ seats: 50 }, { seats: 30 }, { seats: 20 }] }));
    expect(outcome.hung).toBe(true);
    const won = count(election({ size: 100, system: 'direct', parties: [{ seats: 51 }, { seats: 29 }, { seats: 20 }] }));
    expect(won.hung).toBe(false);
  });
});

describe('the method in a sentence', () => {
  const sentence = (value: Partial<Election>): string => methodSentence(cleanElection({ parties: [], ...value }));

  it('is one sentence for every system', () => {
    for (const system of ['dhondt', 'sainte-lague', 'modified-sainte-lague', 'hare', 'droop', 'direct', 'mixed'] as const) {
      for (const mixedMode of ['compensatory', 'parallel'] as const) {
        const text = sentence({ system, mixedMode, threshold: 5, bonus: 10, size: 100 });
        expect(text.endsWith('.'), text).toBe(true);
        expect(text.slice(0, -1).includes('. '), text).toBe(false);
        expect(text.length, text).toBeLessThan(330);
      }
    }
  });

  it('mentions the threshold and the bonus only when they are set', () => {
    expect(sentence({ system: 'dhondt' })).toBe(
      "D'Hondt: each seat in turn goes to the party with the highest votes divided by one more than the seats it already has (so by 1, 2, 3 and so on), which favours large parties.",
    );
    expect(sentence({ system: 'dhondt', threshold: 3.25 })).toContain('; parties under 3.25% of the vote get none.');
    expect(sentence({ system: 'hare', bonus: 50, size: 300 })).toContain('; the party with the most votes gets 50 seats as a bonus first.');
    expect(sentence({ system: 'direct', threshold: 5, bonus: 3 })).toBe(
      'Seats are as entered: no formula is applied, which suits first past the post or any system counted elsewhere.',
    );
  });

  it('names the list formula and the number of list seats for mixed systems', () => {
    const e = cleanElection({ system: 'mixed', mixedMode: 'parallel', listFormula: 'dhondt', size: 100, parties: [{ seats: 40 }, { seats: 20 }] });
    expect(methodSentence(e)).toContain("the other 40 seats are shared out on their own by D'Hondt");
    expect(sentence({ system: 'mixed', mixedMode: 'compensatory', listFormula: 'sainte-lague', threshold: 5 })).toContain(
      'shared out by Sainte-Laguë, and each party',
    );
  });

  it('captions the system in a few words', () => {
    expect(systemCaption(defaultElection())).toBe("D'Hondt, 5% threshold");
    expect(systemCaption(cleanElection({ system: 'hare', bonus: 50, threshold: 3, size: 300 }))).toBe('Largest remainder (Hare), 3% threshold, 50 seats bonus');
    expect(systemCaption(cleanElection({ system: 'direct', threshold: 5 }))).toBe('Seats entered directly');
    expect(systemCaption(cleanElection({ system: 'mixed', listFormula: 'sainte-lague', threshold: 5 }))).toBe('Mixed-member (top-up, Sainte-Laguë), 5% threshold');
  });
});
