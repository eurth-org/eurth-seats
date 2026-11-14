import { createProfile, getSection, setSection, validateProfile } from '@eurth/profile';
import { describe, expect, it } from 'vitest';
import { electionLink } from '../src/seats/link';
import { cleanElection, defaultElection } from '../src/seats/model';
import {
  fromGovernment,
  fromSeatsSection,
  GOVERNMINT_SYSTEMS,
  readGovernmintLink,
  startFromGovernment,
  toSeatsSection,
} from '../src/seats/profile';
import { count } from '../src/seats/results';

const teland = defaultElection();
const outcome = count(teland);
const link = electionLink(teland, 'https://seats.eurth.org/');

describe('writing the "seats" section', () => {
  const section = toSeatsSection(teland, outcome, { link });

  it("holds the legislature's name, size, system, threshold, parties and the last result", () => {
    expect(section).toMatchObject({
      link,
      chamber: 'National Assembly of Teland',
      total: 120,
      system: "D'Hondt",
      election: 'Election 2026',
      systemId: 'dhondt',
      threshold: 5,
      majority: 61,
    });
    expect(section.parties).toEqual([
      { name: 'Liberal Union', seats: 41, colour: '#2698d4', votes: 33.1, voteShare: 33.1 },
      { name: 'National Labour', seats: 33, colour: '#806220', votes: 26.4, voteShare: 26.4 },
      { name: 'Civic Alliance', seats: 22, colour: '#47e9f4', votes: 17.9, voteShare: 17.9 },
      { name: 'Agrarian League', seats: 14, colour: '#144800', votes: 11.6, voteShare: 11.6 },
      { name: 'Independents', seats: 10, colour: '#a69af9', votes: 8.2, voteShare: 8.2 },
    ]);
    expect(section.summary).toContain('National Assembly of Teland, Election 2026. 120 seats');
  });

  it('is a valid section of a valid profile, by the profile package\'s own check', () => {
    const profile = setSection(createProfile('Teland'), 'seats', section);
    const result = validateProfile(profile);
    expect(result.ok ? [] : result.errors).toEqual([]);
    expect(getSection(profile, 'seats')).toMatchObject({ chamber: 'National Assembly of Teland', total: 120 });
    // Another tool's section, and one nobody knows, are left exactly as they were.
    const other = { ...profile, flag: { link: 'https://flag.eurth.org/?s=x' }, futuretool: { anything: [1, 2, 3] } };
    const again = setSection(other as typeof profile, 'seats', toSeatsSection(teland, outcome, { link, previous: getSection(other as typeof profile, 'seats') }));
    expect((again as Record<string, unknown>).flag).toEqual({ link: 'https://flag.eurth.org/?s=x' });
    expect((again as Record<string, unknown>).futuretool).toEqual({ anything: [1, 2, 3] });
  });

  it('keeps to the profile schema: its types, lengths and patterns', () => {
    // The limits in @eurth/profile's schema/eurth-profile.schema.json, "seats".
    const elections = [
      teland,
      cleanElection({ size: 3000, system: 'direct', chamber: 'C'.repeat(200), election: 'E'.repeat(200), parties: Array.from({ length: 30 }, () => ({ name: 'N'.repeat(200), seats: 3000 })) }),
      cleanElection({}),
    ];
    for (const e of elections) {
      const s = toSeatsSection(e, count(e), { link });
      expect(s.link).toMatch(/^https:\/\/[!-~]+$/);
      expect(s.summary!.length).toBeLessThanOrEqual(600);
      expect((s.chamber ?? '').length).toBeLessThanOrEqual(80);
      expect((s.election ?? '').length).toBeLessThanOrEqual(80);
      expect(s.system!.length).toBeLessThanOrEqual(80);
      expect(Number.isInteger(s.total) && s.total! >= 1 && s.total! <= 10_000).toBe(true);
      expect(s.parties!.length).toBeLessThanOrEqual(100);
      for (const p of s.parties!) {
        expect(p.name.length >= 1 && p.name.length <= 80).toBe(true);
        expect(Number.isInteger(p.seats) && p.seats >= 0 && p.seats <= 10_000).toBe(true);
        expect(p.colour).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
      expect('updated' in s).toBe(false);
      expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    }
  });

  it('lists the parties that hold seats, largest first', () => {
    expect(section.parties!.map((p) => p.seats)).toEqual([41, 33, 22, 14, 10]);
    expect(section.parties!.some((p) => p.name === 'Pirate Party')).toBe(false);
  });

  it('keeps fields it does not know, and clears its own when they are empty', () => {
    const previous = { note: 'kept by a later version of Seats', link: 'https://seats.eurth.org/?d=old', chamber: 'Old name', bonus: 9, updated: '2026-11-14T09:30:00Z' };
    const bare = cleanElection({ size: 10, system: 'direct', parties: [{ seats: 6 }, { seats: 4 }] });
    const next = toSeatsSection(bare, count(bare), { previous });
    expect(next.note).toBe('kept by a later version of Seats');
    expect('link' in next).toBe(false);
    expect('chamber' in next).toBe(false);
    expect('bonus' in next).toBe(false);
    expect('updated' in next).toBe(false);
    expect(next.parties).toEqual([
      { name: 'Party 1', seats: 6, colour: '#2698d4' },
      { name: 'Party 2', seats: 4, colour: '#806220' },
    ]);
  });

  it('only ever writes an https link', () => {
    for (const bad of ['http://seats.eurth.org/', 'javascript:alert(1)', 'https://seats.eurth.org/ x', `https://seats.eurth.org/?d=${'x'.repeat(4000)}`]) {
      expect('link' in toSeatsSection(teland, outcome, { link: bad })).toBe(false);
    }
  });
});

describe('reading the "seats" section', () => {
  it('brings back the whole election that Seats wrote, parties without seats and all', () => {
    const picked = { ...teland, coalition: [1, 2], layout: 'horseshoe' as const };
    const section = JSON.parse(JSON.stringify(toSeatsSection(picked, count(picked), { link: electionLink(picked, 'https://seats.eurth.org/') })));
    expect(fromSeatsSection(section)).toEqual(picked);
    expect(fromSeatsSection({ ...section, updated: '2026-11-14T09:30:00Z' })).toEqual(picked);
  });

  it('reads a section written by hand, with only what the schema asks for, as seats entered directly', () => {
    const election = fromSeatsSection({
      chamber: 'National Assembly',
      total: 120,
      system: 'First past the post',
      election: 'Election 2026',
      parties: [
        { name: 'Liberal Union', seats: 70, colour: '#2698D4' },
        { name: 'National Labour', seats: 50 },
      ],
    });
    expect(election).toMatchObject({ chamber: 'National Assembly', election: 'Election 2026', size: 120, system: 'direct' });
    expect(election!.parties).toEqual([
      { name: 'Liberal Union', colour: '#2698d4', votes: 0, seats: 70 },
      { name: 'National Labour', colour: '#806220', votes: 0, seats: 50 },
    ]);
    expect(count(election!).parties.map((p) => p.seats)).toEqual([70, 50]);
  });

  it('counts again when the parties have votes and the system is one it knows', () => {
    const section = toSeatsSection(teland, outcome);
    expect('link' in section).toBe(false);
    const election = fromSeatsSection(section)!;
    expect(election).toMatchObject({ system: 'dhondt', threshold: 5, votesAs: 'percent', size: 120 });
    // Only the five parties with seats are in the section, so the Pirates' 2.8% is gone and the shares shift a little.
    expect(count(election).parties.map((p) => p.seats)).toEqual([41, 33, 22, 14, 10]);
    const counts = fromSeatsSection({ total: 10, systemId: 'hare', parties: [{ name: 'A', seats: 6, votes: 6000 }, { name: 'B', seats: 4, votes: 4000 }] })!;
    expect(counts).toMatchObject({ system: 'hare', votesAs: 'counts' });
  });

  it('falls back to the plain fields when the link is not one it can read', () => {
    const section = { ...toSeatsSection(teland, outcome), link: 'https://seats.eurth.org/?d=99.eyJmdXR1cmUiOnRydWV9' };
    expect(fromSeatsSection({ ...section, link: 'https://example.org/?d=nonsense' })).toMatchObject({ size: 120, system: 'dhondt' });
    expect(fromSeatsSection(section)).toMatchObject({ chamber: 'National Assembly of Teland', size: 120, system: 'dhondt' });
  });

  it('makes nothing of nothing, and never throws on nonsense', () => {
    for (const nothing of [undefined, null, {}, [], 'seats', 7, { updated: '2026-11-14T09:30:00Z' }]) expect(fromSeatsSection(nothing)).toBeNull();
    expect(fromSeatsSection({ parties: 'many', total: 'lots', chamber: 5, link: 7 })).toBeNull();
    expect(fromSeatsSection({ total: 12 })).toMatchObject({ size: 12, parties: [] });
    expect(fromSeatsSection({ parties: [null, 'x', { name: '<b>', seats: 1e9 }] })!.parties).toEqual([
      { name: 'Party 1', colour: '#2698d4', votes: 0, seats: 0 },
      { name: 'Party 2', colour: '#806220', votes: 0, seats: 0 },
      { name: 'b', colour: '#47e9f4', votes: 0, seats: 3000 },
    ]);
  });
});

describe("Governmint's legislature settings", () => {
  // Governmint's link, version 3: "3", then one character per setting in the order it asks them.
  // Places 5, 6 and 7 are the legislature, the chambers and the electoral system.
  const governmint = (legislature: number, chambers: number, electoral: number): string =>
    `https://gov.eurth.org/?c=3${'00000'}${legislature}${chambers}${electoral}${'0'.repeat(20)}&n=Teland`;

  it('map onto a Seats system', () => {
    expect(GOVERNMINT_SYSTEMS).toEqual({ majoritarian: 'direct', proportional: 'dhondt', mixed: 'mixed' });
  });

  it('are read from a Governmint link', () => {
    expect(readGovernmintLink(governmint(0, 0, 1))).toEqual({ legislature: 'elected', chambers: 'one', electoralSystem: 'proportional' });
    expect(readGovernmintLink(governmint(1, 1, 0))).toEqual({ legislature: 'partly-elected', chambers: 'two', electoralSystem: 'majoritarian' });
    expect(readGovernmintLink(governmint(6, 0, 2))).toEqual({ legislature: 'none', chambers: 'one', electoralSystem: 'mixed' });
  });

  it('are not guessed from a link Seats cannot read', () => {
    for (const bad of [
      undefined,
      42,
      '',
      'not a link',
      'https://gov.eurth.org/',
      'https://gov.eurth.org/?c=2000000010000',
      'https://gov.eurth.org/?c=3000',
      'https://gov.eurth.org/?c=300000z00',
      'https://gov.eurth.org/?c=3000001%3C0',
      governmint(0, 0, 9),
    ]) {
      expect(readGovernmintLink(bad), String(bad)).toBeNull();
    }
  });

  it("give Seats a place to start: the legislature's name and the system", () => {
    const start = fromGovernment({ form: 'Parliamentary republic', legislature: 'National Assembly', link: governmint(0, 0, 1) });
    expect(start).toMatchObject({ chamber: 'National Assembly', system: 'dhondt' });
    expect(fromGovernment({ link: governmint(0, 1, 0) })!.system).toBe('direct');
    expect(fromGovernment({ link: governmint(1, 1, 2) })!.system).toBe('mixed');
    expect(fromGovernment({ legislature: 'Senate' })).toEqual({ chamber: 'Senate', system: null, governmint: null });
    for (const nothing of [undefined, null, {}, 'x', { form: 'Republic' }]) expect(fromGovernment(nothing)).toBeNull();
  });

  it('start a legislature that is not elected with seats entered directly', () => {
    for (const legislature of [2, 3, 4, 5, 6]) expect(fromGovernment({ link: governmint(legislature, 0, 1) })!.system).toBe('direct');
  });

  it('take the electoral system from the section itself when Governmint writes it there', () => {
    expect(fromGovernment({ electoralSystem: 'mixed' })).toMatchObject({ system: 'mixed', chamber: '' });
    expect(fromGovernment({ electoralSystem: 'proportional', link: governmint(0, 0, 0) })!.system).toBe('dhondt');
    expect(fromGovernment({ electoralSystem: 'lottery' })).toBeNull();
  });

  it('fill in an election without overwriting a name that is already there', () => {
    const start = fromGovernment({ legislature: 'Grand Council', link: governmint(0, 0, 2) });
    expect(startFromGovernment(cleanElection({}), start)).toMatchObject({ chamber: 'Grand Council', system: 'mixed' });
    expect(startFromGovernment(teland, start)).toMatchObject({ chamber: 'National Assembly of Teland', system: 'mixed' });
    expect(startFromGovernment(teland, null)).toEqual(teland);
    expect(startFromGovernment(teland, fromGovernment({ legislature: 'Senate' }))).toEqual(teland);
  });
});
