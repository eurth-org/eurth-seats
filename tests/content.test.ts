import { decodeState, encodeState } from '@eurth/style';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXAMPLES } from '../src/content/examples';
import { GLOSSARY } from '../src/content/glossary';
import { PRESETS, PRESETS_CHECKED } from '../src/content/presets';
import { WORKED, worked } from '../src/content/worked';
import { minimalWinning } from '../src/seats/coalition';
import { quotientTable, remainderTable } from '../src/seats/explain';
import { fromCompact, LINK_VERSION, toCompact } from '../src/seats/link';
import { cleanElection, FORMULAS, isFormula, SYSTEMS } from '../src/seats/model';
import { count } from '../src/seats/results';

const seats = (value: unknown): number[] => count(cleanElection(value)).parties.map((p) => p.seats);
const page = (name: string): string => readFileSync(new URL(`../src/pages/${name}.astro`, import.meta.url), 'utf8');

describe("the guide's worked examples", () => {
  it('every one gives the seats the guide says it does', () => {
    for (const w of WORKED) expect(seats(w.election), w.id).toEqual(w.expected);
  });

  it('cover every formula, and thresholds, bonuses and both kinds of mixed system', () => {
    const elections = WORKED.map((w) => cleanElection(w.election));
    for (const formula of FORMULAS) {
      expect(elections.some((e) => e.system === formula || (e.system === 'mixed' && e.listFormula === formula)), formula).toBe(true);
    }
    expect(elections.some((e) => e.threshold > 0)).toBe(true);
    expect(elections.some((e) => e.bonus > 0)).toBe(true);
    expect(elections.some((e) => e.system === 'mixed' && e.mixedMode === 'compensatory')).toBe(true);
    expect(elections.some((e) => e.system === 'mixed' && e.mixedMode === 'parallel')).toBe(true);
  });

  it('are all used in the guide, and the guide uses no others', () => {
    const guide = page('guide');
    const used = new Set([...guide.matchAll(/<Working id="([a-z0-9-]+)"/g)].map((m) => m[1]));
    expect([...used].sort()).toEqual(WORKED.map((w) => w.id).sort());
  });

  it('have ids that are unique, and a lookup that fails loudly on a typo', () => {
    expect(new Set(WORKED.map((w) => w.id)).size).toBe(WORKED.length);
    expect(worked('dhondt').expected).toEqual([4, 4, 1, 1]);
    expect(() => worked('dhont')).toThrow();
  });

  it('show the differences the guide talks about', () => {
    // The same votes, five formulas: D'Hondt and Droop favour the large, Sainte-Laguë and Hare the small.
    expect(worked('dhondt').expected).toEqual(worked('droop').expected);
    expect(worked('sainte-lague').expected).toEqual(worked('hare').expected);
    expect(worked('dhondt').expected).not.toEqual(worked('sainte-lague').expected);
    // The 1.4 divisor keeps the smallest party out where plain Sainte-Laguë lets it in.
    expect(worked('sainte-lague-six').expected[3]).toBe(1);
    expect(worked('modified-six').expected[3]).toBe(0);
    // The Alabama paradox: one more seat in the chamber, one fewer for the Island.
    expect(worked('alabama-eleven').expected[2]).toBeLessThan(worked('alabama-ten').expected[2]!);
    // An overhang seat makes the chamber one seat larger.
    expect(count(cleanElection(worked('overhang').election)).total).toBe(11);
  });
});

describe("the working shown in the guide's tables", () => {
  const votes = [41_600, 33_800, 15_200, 9_400];

  it("D'Hondt: the ten highest quotients win", () => {
    const table = quotientTable('dhondt', votes, 10);
    expect(table.divisors).toEqual([1, 2, 3, 4, 5]);
    expect(table.rows.map((r) => r.seats)).toEqual([4, 4, 1, 1]);
    expect(table.rows[0]!.quotients.map(Math.round)).toEqual([41_600, 20_800, 13_867, 10_400, 8_320]);
    const all = table.rows.flatMap((r) => r.quotients.map((q, i) => ({ q, win: r.wins[i]! })));
    const winners = all.filter((x) => x.win).map((x) => x.q);
    const losers = all.filter((x) => !x.win).map((x) => x.q);
    expect(winners).toHaveLength(10);
    expect(Math.min(...winners)).toBeGreaterThan(Math.max(...losers));
  });

  it('Sainte-Laguë and its modified form use their own divisors', () => {
    expect(quotientTable('sainte-lague', votes, 10).divisors).toEqual([1, 3, 5, 7, 9]);
    const modified = quotientTable('modified-sainte-lague', votes, 6);
    expect(modified.divisors).toEqual([1.4, 3, 5, 7]);
    expect(modified.rows[3]!.quotients[0]).toBeCloseTo(9_400 / 1.4, 6);
    expect(modified.rows.map((r) => r.seats)).toEqual([3, 2, 1, 0]);
  });

  it('largest remainder: full quotas first, then the largest remainders', () => {
    const hare = remainderTable('hare', votes, 10);
    expect(hare.quota).toBe(10_000);
    expect(hare.rows.map((r) => r.full)).toEqual([4, 3, 1, 0]);
    expect(hare.left).toBe(2);
    expect(hare.rows.map((r) => r.extra)).toEqual([0, 0, 1, 1]);
    expect(hare.rows.map((r) => Math.round(r.remainder * 100) / 100)).toEqual([0.16, 0.38, 0.52, 0.94]);
    const droop = remainderTable('droop', votes, 10);
    expect(droop.quota).toBeCloseTo(100_000 / 11, 6);
    expect(droop.rows.map((r) => r.full)).toEqual([4, 3, 1, 1]);
    expect(droop.rows.map((r) => r.extra)).toEqual([0, 1, 0, 0]);
    expect(droop.rows.map((r) => r.seats)).toEqual([4, 4, 1, 1]);
  });

  it('copes with nothing to count', () => {
    expect(remainderTable('hare', [0, 0], 5).rows.map((r) => r.seats)).toEqual([0, 0]);
    expect(quotientTable('dhondt', [], 5).rows).toEqual([]);
  });
});

describe('the example elections', () => {
  const results = Object.fromEntries(EXAMPLES.map((x) => [x.id, count(cleanElection(x.election))]));

  it('are four, one for each family of system', () => {
    expect(EXAMPLES.map((x) => x.id)).toEqual(['teland', 'brackland', 'nine-rivers', 'calvessa']);
    expect(EXAMPLES.map((x) => cleanElection(x.election).system)).toEqual(['dhondt', 'direct', 'mixed', 'hare']);
    expect(new Set(EXAMPLES.map((x) => x.family)).size).toBe(4);
  });

  it('are clean as written, fill their chambers and raise no issues', () => {
    for (const x of EXAMPLES) {
      const e = cleanElection(x.election);
      expect(x.election, x.id).toMatchObject({ size: e.size, chamber: e.chamber });
      expect(e.parties.map((p) => p.name), x.id).toEqual(x.election.parties.map((p) => p.name));
      expect(e.parties.map((p) => p.colour), x.id).toEqual(x.election.parties.map((p) => p.colour));
      expect(e.parties.reduce((sum, p) => sum + p.votes, 0), x.id).toBeCloseTo(100, 6);
      expect(results[x.id]).toMatchObject({ vacant: 0, issues: [], tie: null });
    }
  });

  it('turn out as their notes say', () => {
    const named = (id: string): Record<string, number> => Object.fromEntries(results[id]!.parties.map((p) => [p.name, p.seats]));
    expect(named('teland')).toEqual({ 'National Labour': 33, 'Civic Alliance': 22, 'Liberal Union': 41, 'Agrarian League': 14, Independents: 10, 'Pirate Party': 0 });
    expect(results.teland!.hung).toBe(true);
    expect(minimalWinning(results.teland!)).toHaveLength(5);

    expect(named('brackland')['Crown Party']).toBe(221);
    expect(results.brackland!).toMatchObject({ total: 400, hung: false, majority: 201 });
    expect(results.brackland!.parties[0]!.seatShare).toBeCloseTo(0.5525, 4);
    expect(results.brackland!.parties[2]!.seatShare!).toBeLessThan(0.06);
    expect(results.brackland!.gallagher!).toBeGreaterThan(15);

    expect(named('nine-rivers')).toEqual({ 'Social Democrats': 60, 'Green Meadow': 29, 'Free Citizens': 23, 'Rivers Union': 71, 'Mountain Bloc': 17, 'Unity List': 0 });
    expect(results['nine-rivers']!.parties.reduce((sum, p) => sum + p.district, 0)).toBe(100);
    expect(results['nine-rivers']!.parties[3]).toMatchObject({ district: 52, list: 19, overhang: 0 });
    expect(results['nine-rivers']!.gallagher!).toBeLessThan(4);

    expect(named('calvessa')).toEqual({ 'Left Bloc': 23, 'Popular Front': 136, 'Centre Pact': 36, 'Reform Now': 0, 'Coastal League': 11, 'Republican Rally': 78, 'Hearth and Home': 16 });
    expect(named('calvessa')['Popular Front']! - named('calvessa')['Republican Rally']!).toBe(58);
    expect(results.calvessa!.hung).toBe(true);
    expect(minimalWinning(results.calvessa!)[0]).toEqual([1, 6]);
  });

  it('open in the calculator through their links, exactly as written', () => {
    for (const x of EXAMPLES) {
      const e = cleanElection(x.election);
      const link = encodeState(toCompact(e), LINK_VERSION);
      expect(link.length, x.id).toBeLessThan(700);
      const back = decodeState(link);
      expect(fromCompact(back?.value, back?.version), x.id).toEqual(e);
    }
  });

  it('have notes of a few sentences, and names that say which family they show', () => {
    for (const x of EXAMPLES) {
      expect(x.note.length, x.id).toBeGreaterThan(120);
      expect(x.note.length, x.id).toBeLessThan(420);
      expect(x.name).toContain(':');
    }
  });
});

describe('the glossary', () => {
  it('is in alphabetical order', () => {
    const terms = GLOSSARY.map((t) => t.term);
    expect(terms).toEqual([...terms].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
  });

  it('has ids fit for an address, each used once', () => {
    for (const t of GLOSSARY) expect(t.id).toMatch(/^[a-z][a-z0-9-]*$/);
    expect(new Set(GLOSSARY.map((t) => t.id)).size).toBe(GLOSSARY.length);
    expect(new Set(GLOSSARY.map((t) => t.term)).size).toBe(GLOSSARY.length);
  });

  it('points only at terms that exist, and never at itself', () => {
    const ids = new Set(GLOSSARY.map((t) => t.id));
    for (const t of GLOSSARY) {
      for (const other of t.see ?? []) {
        expect(ids.has(other), `${t.id} → ${other}`).toBe(true);
        expect(other).not.toBe(t.id);
      }
    }
  });

  it('defines each term in a sentence or two, ending in a full stop', () => {
    for (const t of GLOSSARY) {
      expect(t.definition.length, t.id).toBeGreaterThan(40);
      expect(t.definition.length, t.id).toBeLessThan(330);
      expect(t.definition.endsWith('.'), t.id).toBe(true);
    }
  });

  it('covers every system, layout and column the calculator shows', () => {
    const ids = new Set(GLOSSARY.map((t) => t.id));
    for (const id of [
      'dhondt', 'sainte-lague', 'modified-sainte-lague', 'largest-remainder', 'hare-quota', 'droop-quota', 'first-past-the-post', 'mixed-member',
      'compensatory-seats', 'parallel-voting', 'overhang', 'threshold', 'bonus', 'majority', 'coalition', 'hung-parliament', 'margin',
      'hemicycle', 'westminster-layout', 'horseshoe', 'vote-share', 'seat-share', 'gallagher-index', 'dead-heat', 'quota', 'quotient', 'divisor', 'remainder',
    ]) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it('is linked from the guide only by ids that exist', () => {
    const ids = new Set(GLOSSARY.map((t) => t.id));
    const links = [...page('guide').matchAll(/term\('([a-z0-9-]+)'\)/g)].map((m) => m[1]!);
    expect(links.length).toBeGreaterThan(10);
    for (const id of links) expect(ids.has(id), id).toBe(true);
  });
});

describe('the presets', () => {
  it('are sound settings for the calculator', () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
    for (const p of PRESETS) {
      const e = cleanElection({ size: p.size, system: p.system, threshold: p.threshold, bonus: p.bonus, mixedMode: p.mixedMode, listFormula: p.listFormula });
      expect(e, p.id).toMatchObject({ size: p.size, system: p.system, threshold: p.threshold, bonus: p.bonus ?? 0 });
      expect(SYSTEMS).toContain(p.system);
      if (p.system === 'mixed') expect(e, p.id).toMatchObject({ mixedMode: p.mixedMode, listFormula: p.listFormula });
      else expect(p.mixedMode ?? p.listFormula, p.id).toBeUndefined();
      if (!isFormula(p.system)) expect(p.bonus, p.id).toBeUndefined();
      if (p.system === 'direct') expect(p.threshold, p.id).toBe(0);
      expect(p.note.endsWith('.'), p.id).toBe(true);
      expect(p.wikipedia.length, p.id).toBeGreaterThan(3);
    }
  });

  it('are listed by system family, then by country', () => {
    const family = (p: (typeof PRESETS)[number]): number => (p.system === 'direct' ? 2 : p.system === 'mixed' ? 1 : 0);
    const order = PRESETS.map(family);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('say when they were last checked', () => {
    expect(PRESETS_CHECKED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
