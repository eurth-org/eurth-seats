import { describe, expect, it } from 'vitest';
import {
  cleanColour,
  contrast,
  DEFAULT_COLOURS,
  defaultColour,
  labOf,
  lightness,
  seenAs,
  type ColourVision,
} from '../src/seats/colours';
import { electionFromLink, electionLink, encodeElection, fromCompact, LINK_VERSION, toCompact } from '../src/seats/link';
import {
  cleanElection,
  cleanText,
  defaultElection,
  emptyElection,
  FORMULAS,
  LAYOUTS,
  MAX_PARTIES,
  MAX_SIZE,
  MIXED_MODES,
  moveParty,
  newParty,
  removeParty,
  SYSTEM_LABELS,
  SYSTEMS,
  voteUnits,
} from '../src/seats/model';

describe('the default party colours', () => {
  const pairs = DEFAULT_COLOURS.flatMap((a, i) => DEFAULT_COLOURS.slice(i + 1).map((b) => [a, b] as const));

  it('are ten different six-digit hex colours, starting with eurth-blue', () => {
    expect(DEFAULT_COLOURS).toHaveLength(10);
    expect(new Set(DEFAULT_COLOURS).size).toBe(10);
    for (const c of DEFAULT_COLOURS) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    expect(DEFAULT_COLOURS[0]).toBe('#2698d4');
  });

  it('each sit on their own step of lightness: no two within 5 L*', () => {
    for (const [a, b] of pairs) expect(Math.abs(lightness(a) - lightness(b)), `${a} ${b}`).toBeGreaterThanOrEqual(5);
  });

  it('stay apart for red-green and blue-yellow colour blindness', () => {
    for (const vision of ['protanopia', 'deuteranopia', 'tritanopia'] as ColourVision[]) {
      for (const [a, b] of pairs) {
        const [l1, a1, b1] = seenAs(a, vision);
        const [l2, a2, b2] = seenAs(b, vision);
        const difference = Math.hypot(l1 - l2, a1 - a2, b1 - b2);
        expect(difference, `${vision} ${a} ${b}`).toBeGreaterThanOrEqual(10);
        // Lightness alone still tells them apart, as it would in a greyscale print.
        expect(Math.abs(l1 - l2), `${vision} ${a} ${b}`).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it('are handed out so that neighbours differ a great deal in lightness', () => {
    for (let i = 1; i < DEFAULT_COLOURS.length; i++) {
      expect(Math.abs(lightness(defaultColour(i)) - lightness(defaultColour(i - 1))), `${i}`).toBeGreaterThanOrEqual(15);
    }
  });

  it('come round again after ten', () => {
    expect(defaultColour(10)).toBe(DEFAULT_COLOURS[0]);
    expect(defaultColour(23)).toBe(DEFAULT_COLOURS[3]);
    expect(defaultColour(-1)).toBe(DEFAULT_COLOURS[9]);
  });
});

describe('colour helpers', () => {
  it('clean any value into a six-digit lower-case hex colour', () => {
    expect(cleanColour('#ABCDEF')).toBe('#abcdef');
    expect(cleanColour('abc')).toBe('#aabbcc');
    expect(cleanColour(' #2698d4 ')).toBe('#2698d4');
    for (const bad of ['red', '#12345', '#1234567', 'url(#x)', '', null, 7, {}]) expect(cleanColour(bad, '#111111')).toBe('#111111');
  });

  it('measure lightness and contrast as the standards do', () => {
    expect(lightness('#000000')).toBeCloseTo(0, 5);
    expect(lightness('#ffffff')).toBeCloseTo(100, 3);
    expect(lightness('#777777')).toBeCloseTo(50, 0);
    expect(labOf([1, 1, 1])[1]).toBeCloseTo(0, 2);
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    // The handbook's figure: parchment on night is 13.9 to 1.
    expect(contrast('#fcf6e1', '#002b36')).toBeCloseTo(13.9, 1);
  });

});

describe('cleaning an election', () => {
  it('gives a sound election from nothing at all', () => {
    for (const nothing of [undefined, null, 'x', 7, [], {}]) {
      expect(cleanElection(nothing)).toEqual({
        chamber: '',
        election: '',
        size: 100,
        system: 'dhondt',
        threshold: 0,
        bonus: 0,
        mixedMode: 'compensatory',
        listFormula: 'sainte-lague',
        votesAs: 'percent',
        layout: 'hemicycle',
        coalition: [],
        parties: [],
      });
    }
    expect(emptyElection()).toEqual(cleanElection({}));
  });

  it('is unchanged by cleaning twice', () => {
    const once = cleanElection({ chamber: ' A  <b>big</b> hall ', size: '250', threshold: 3.256, parties: [{ name: '', votes: '12.34567' }, { votes: -4, seats: 2.6 }] });
    expect(cleanElection(once)).toEqual(once);
    expect(cleanElection(defaultElection())).toEqual(defaultElection());
  });

  it('clamps every number to what Seats can count and draw', () => {
    const e = cleanElection({ size: 1e9, threshold: 99, bonus: -3, votesAs: 'counts', parties: [{ votes: 1e30, seats: 1e9 }, { votes: Number.NaN, seats: 'lots' }, { votes: 12.6 }] });
    expect(e.size).toBe(MAX_SIZE);
    expect(e.threshold).toBe(50);
    expect(e.bonus).toBe(0);
    expect(e.parties.map((p) => p.votes)).toEqual([1e12, 0, 13]);
    expect(e.parties.map((p) => p.seats)).toEqual([MAX_SIZE, 0, 0]);
    expect(cleanElection({ size: 0 }).size).toBe(1);
    expect(cleanElection({ size: 12.4 }).size).toBe(12);
    expect(cleanElection({ size: 'abc' }).size).toBe(100);
    expect(cleanElection({ votesAs: 'percent', parties: [{ votes: 250 }, { votes: 33.33333 }] }).parties.map((p) => p.votes)).toEqual([100, 33.333]);
  });

  it('accepts only the systems, formulas, modes and layouts it knows', () => {
    for (const system of SYSTEMS) expect(cleanElection({ system }).system).toBe(system);
    for (const listFormula of FORMULAS) expect(cleanElection({ listFormula }).listFormula).toBe(listFormula);
    for (const mixedMode of MIXED_MODES) expect(cleanElection({ mixedMode }).mixedMode).toBe(mixedMode);
    for (const layout of LAYOUTS) expect(cleanElection({ layout }).layout).toBe(layout);
    const odd = cleanElection({ system: 'stv', listFormula: 'direct', mixedMode: 'both', layout: 'circle', votesAs: 'fractions' });
    expect(odd).toMatchObject({ system: 'dhondt', listFormula: 'sainte-lague', mixedMode: 'compensatory', layout: 'hemicycle', votesAs: 'percent' });
    expect(Object.keys(SYSTEM_LABELS).sort()).toEqual([...SYSTEMS].sort());
  });

  it('keeps names as plain text on one line', () => {
    expect(cleanText('  The\tGrand\n<i>Old</i>  Party\u0000 ', 60)).toBe('The Grand i Old /i Party');
    expect(cleanText('x'.repeat(100), 60)).toHaveLength(60);
    expect(cleanText(42, 60)).toBe('');
    const e = cleanElection({ parties: [{ name: '   ' }, { name: 'Greens' }, {}] });
    expect(e.parties.map((p) => p.name)).toEqual(['Party 1', 'Greens', 'Party 3']);
  });

  it('gives each party a colour, and keeps the list to thirty', () => {
    const e = cleanElection({ parties: Array.from({ length: 45 }, () => ({})) });
    expect(e.parties).toHaveLength(MAX_PARTIES);
    expect(e.parties.slice(0, 10).map((p) => p.colour)).toEqual([...DEFAULT_COLOURS]);
    expect(cleanElection({ parties: [{ colour: '#ABC' }, { colour: 'javascript:alert(1)' }] }).parties.map((p) => p.colour)).toEqual(['#aabbcc', DEFAULT_COLOURS[1]]);
  });

  it('keeps only coalition picks that point at a party, once each, in order', () => {
    const e = cleanElection({ coalition: [3, 1, 1, -1, 99, 2.5, '0', 0], parties: [{}, {}, {}, {}] });
    expect(e.coalition).toEqual([0, 1, 3]);
    expect(cleanElection({ coalition: 'all', parties: [{}] }).coalition).toEqual([]);
  });

  it('turns votes into whole units for the count', () => {
    expect(voteUnits(defaultElection())).toEqual([26400, 17900, 33100, 11600, 8200, 2800]);
    expect(voteUnits(cleanElection({ votesAs: 'counts', parties: [{ votes: 1_443_545 }] }))).toEqual([1_443_545]);
    // 0.1 + 0.2 and friends: thousandths of a point are exact after rounding.
    expect(voteUnits(cleanElection({ parties: [{ votes: 0.3 }, { votes: 0.1 + 0.2 }] }))).toEqual([300, 300]);
  });

  it('adds a new party with a name and a colour not yet in use', () => {
    const e = defaultElection();
    const added = newParty(e);
    expect(added.name).toBe('Party 7');
    expect(e.parties.map((p) => p.colour)).not.toContain(added.colour);
    expect(newParty(emptyElection())).toEqual({ name: 'Party 1', colour: '#2698d4', votes: 0, seats: 0 });
  });
});

describe('changing the list of parties', () => {
  const picked = { ...defaultElection(), coalition: [1, 2] }; // Civic Alliance and Liberal Union

  it('removing a party keeps the coalition pointing at the same parties', () => {
    const without = removeParty(picked, 0);
    expect(without.parties.map((p) => p.name)).toEqual(['Civic Alliance', 'Liberal Union', 'Agrarian League', 'Independents', 'Pirate Party']);
    expect(without.coalition).toEqual([0, 1]);
    expect(removeParty(picked, 1).coalition).toEqual([1]);
    expect(removeParty(picked, 5).coalition).toEqual([1, 2]);
    expect(removeParty(picked, 9)).toBe(picked);
    expect(cleanElection(without)).toEqual(without);
  });

  it('moving a party moves its place in the chamber, and the coalition follows', () => {
    const moved = moveParty(picked, 2, -1);
    expect(moved.parties.slice(0, 3).map((p) => p.name)).toEqual(['National Labour', 'Liberal Union', 'Civic Alliance']);
    expect(moved.coalition).toEqual([1, 2]);
    const right = moveParty(picked, 2, 1);
    expect(right.parties[3]!.name).toBe('Liberal Union');
    expect(right.coalition).toEqual([1, 3]);
    expect(moveParty(picked, 0, -1)).toBe(picked);
    expect(moveParty(picked, 5, 1)).toBe(picked);
    expect(picked.parties[2]!.name).toBe('Liberal Union');
  });
});

describe('the election in its link', () => {
  const roundTrip = (value: unknown) => fromCompact(JSON.parse(JSON.stringify(toCompact(cleanElection(value)))), LINK_VERSION);

  it('comes back exactly as it went in', () => {
    const elections = [
      defaultElection(),
      { ...defaultElection(), coalition: [1, 2], layout: 'westminster' as const },
      emptyElection(),
      cleanElection({ size: 300, system: 'hare', threshold: 3, bonus: 50, votesAs: 'percent', parties: [{ votes: 36 }, { votes: 32.125 }] }),
      cleanElection({ size: 120, system: 'mixed', mixedMode: 'parallel', listFormula: 'dhondt', votesAs: 'counts', layout: 'horseshoe', parties: [{ name: 'Labour', votes: 1_443_545, seats: 46 }, { name: 'Māori', votes: 33_630, seats: 1 }] }),
      cleanElection({ size: 650, system: 'direct', chamber: 'House of “Commons” & Lords', election: 'Élection générale ✓', parties: [{ name: 'Blå', seats: 365 }, { name: '緑の党', seats: 1 }] }),
    ];
    for (const e of elections) expect(roundTrip(e)).toEqual(e);
    for (const system of SYSTEMS) for (const layout of LAYOUTS) expect(roundTrip({ system, layout })).toEqual(cleanElection({ system, layout }));
  });

  it('is compact: defaults are left out and parties are small arrays', () => {
    expect(toCompact(defaultElection())).toEqual({
      n: 'National Assembly of Teland',
      e: 'Election 2026',
      s: 120,
      y: 'dh',
      t: 5,
      p: [
        ['National Labour', '806220', 26.4],
        ['Civic Alliance', '47e9f4', 17.9],
        ['Liberal Union', '2698d4', 33.1],
        ['Agrarian League', '144800', 11.6],
        ['Independents', 'a69af9', 8.2],
        ['Pirate Party', '540012', 2.8],
      ],
    });
    expect(toCompact(emptyElection())).toEqual({ s: 100, y: 'dh', p: [] });
    // As the query string will carry it: comfortably short.
    expect(encodeElection(defaultElection()).length).toBeLessThan(420);
  });

  it('fits the largest election into a link', () => {
    const big = cleanElection({
      size: 3000,
      system: 'mixed',
      votesAs: 'counts',
      chamber: 'C'.repeat(80),
      election: 'E'.repeat(80),
      threshold: 12.34,
      coalition: Array.from({ length: 30 }, (_, i) => i),
      parties: Array.from({ length: 30 }, (_, i) => ({ name: 'N'.repeat(60), votes: 999_999_999_999 - i, seats: 3000 })),
    });
    expect(roundTrip(big)).toEqual(big);
    // Base64 makes it a third longer; @eurth/style's decodeState reads up to 8,000 characters.
    expect(Math.ceil((JSON.stringify(toCompact(big)).length * 4) / 3)).toBeLessThan(8000);
  });

  it('makes a whole link and reads it back', () => {
    const link = electionLink(defaultElection(), 'https://seats.eurth.org/examples/?x=1#top');
    expect(link.startsWith('https://seats.eurth.org/examples/?d=1.')).toBe(true);
    expect(link).toBe(`https://seats.eurth.org/examples/?d=${encodeElection(defaultElection())}`);
    expect(electionFromLink(link)).toEqual(defaultElection());
    for (const bad of [null, 7, '', 'not a link', 'https://seats.eurth.org/', 'https://seats.eurth.org/?d=nonsense', 'https://seats.eurth.org/?d=2.e30', `https://seats.eurth.org/?d=1.${'A'.repeat(20_000)}`]) {
      expect(electionFromLink(bad), String(bad).slice(0, 40)).toBeNull();
    }
  });

  it("treats whatever arrives as someone else's input", () => {
    for (const bad of [null, undefined, 'x', 7, [], [1, 2]]) expect(fromCompact(bad)).toBeNull();
    expect(fromCompact({ s: 10 }, 2)).toBeNull();
    expect(fromCompact({})).toEqual(emptyElection());
    const odd = fromCompact({ n: '<img onerror=x>', s: -5, y: 'zz', t: 'high', l: 'x', m: 9, c: [0, 0, 5], p: [['<b>', 'nope', 'many', -3], 'party', [null], { name: 'x' }] });
    expect(odd).toEqual(
      cleanElection({ chamber: 'img onerror=x', size: 1, coalition: [0], parties: [{ name: 'b' }, {}, {}, {}] }),
    );
    expect(odd!.parties).toHaveLength(4);
  });
});

describe('a random election', () => {
  // The same seeded generator as the allocation tests, so these are the same elections every run.
  const seeded = (seed: number) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  it('is always a clean election with a full chamber', async () => {
    const { randomElection } = await import('../src/seats/random');
    const { count } = await import('../src/seats/results');
    const next = seeded(11);
    for (let i = 0; i < 300; i++) {
      const e = randomElection(next);
      expect(cleanElection(e)).toEqual(e);
      expect(e.parties.length).toBeGreaterThanOrEqual(3);
      expect(e.parties.length).toBeLessThanOrEqual(7);
      expect(new Set(e.parties.map((p) => p.name)).size).toBe(e.parties.length);
      expect(new Set(e.parties.map((p) => p.colour)).size).toBe(e.parties.length);
      expect(e.parties.reduce((sum, p) => sum + p.votes, 0)).toBeCloseTo(100, 6);
      for (const p of e.parties) expect(p.votes).toBeGreaterThan(0);
      const outcome = count(e);
      expect(outcome.seated).toBe(e.size);
      expect(roundTripOf(e)).toEqual(e);
    }
  });

  it('is the same election for the same random numbers', async () => {
    const { randomElection } = await import('../src/seats/random');
    expect(randomElection(seeded(5))).toEqual(randomElection(seeded(5)));
    expect(randomElection(seeded(5))).not.toEqual(randomElection(seeded(6)));
  });
});

function roundTripOf(value: unknown) {
  return electionFromLink(electionLink(cleanElection(value), 'https://seats.eurth.org/'));
}
