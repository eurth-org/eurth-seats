import { describe, expect, it } from 'vitest';
import { csv, json, markdown } from '../src/seats/exports';
import { cleanElection, defaultElection } from '../src/seats/model';
import { count } from '../src/seats/results';

const teland = defaultElection();
const outcome = count(teland);
const link = 'https://seats.eurth.org/?d=1.abc';

describe('the result as Markdown', () => {
  const text = markdown(teland, outcome, link);

  it('has a heading, the table, the majority and the link that brings it back', () => {
    const lines = text.split('\n');
    expect(lines[0]).toBe('## National Assembly of Teland, Election 2026');
    expect(lines[2]).toBe("**120 seats**, D'Hondt, 5% threshold. 61 for a majority.");
    expect(text).toContain('| Party | Vote share | Seats | Seat share | Difference |\n| --- | --- | --- | --- | --- |');
    expect(text).toContain('| Liberal Union | 33\\.1% | 41 | 34\\.2% | \\+1\\.1 |');
    expect(text).toContain('| Pirate Party | 2\\.8% | 0 | 0\\.0% | −2\\.8 |');
    expect(text).toContain('No party has a majority: 61 of 120 seats are needed');
    expect(lines[lines.length - 1]).toBe(`[Open this election in Seats](${link})`);
  });

  it('adds vote counts, district and list columns, vacancies, the coalition and notes when they apply', () => {
    const mixed = cleanElection({ size: 100, system: 'mixed', votesAs: 'counts', coalition: [0, 1], parties: [{ name: 'A', votes: 50_000, seats: 30 }, { name: 'B', votes: 40_000, seats: 10 }, { name: 'C', votes: 10_000, seats: 20 }] });
    const out = markdown(mixed, count(mixed), link);
    expect(out).toContain('| Party | Votes | Vote share | Districts | List | Seats | Seat share | Difference |');
    expect(out).toContain('| A | 50,000 | 50\\.0% | 30 | 20 | 50 | 45\\.5% | −4\\.5 |');
    expect(out).toContain('A and B hold 90 of the 110 seats: a majority');
    expect(out).toContain('*10 seats of overhang: the chamber has grown from 100 to 110\\.*');
    const partly = cleanElection({ size: 10, system: 'direct', parties: [{ name: 'A', seats: 4 }] });
    expect(markdown(partly, count(partly), link)).toContain('| Vacant | 6 |  |');
    expect(markdown(partly, count(partly), link).startsWith('## Election result')).toBe(true);
  });

  it('never lets a typed name become markup or break the table', () => {
    const e = cleanElection({ size: 3, system: 'direct', chamber: '# The *Grand* [Hall](x)', parties: [{ name: '**Bold** | Party\\', seats: 3 }] });
    const out = markdown(e, count(e), link);
    expect(out.split('\n')[0]).toBe('## \\# The \\*Grand\\* \\[Hall\\]\\(x\\)');
    expect(out).toContain('| \\*\\*Bold\\*\\* \\| Party\\\\ | 3 |');
    // Every row of the table has the same number of unescaped bars.
    const bars = out.split('\n').filter((l) => l.startsWith('|')).map((l) => l.replace(/\\\|/g, '').split('|').length);
    expect(new Set(bars).size).toBe(1);
  });
});

describe('the result as CSV', () => {
  it('is one party per line, with plain numbers', () => {
    const lines = csv(teland, outcome).trimEnd().split('\n');
    expect(lines[0]).toBe('Party,Colour,Votes,Vote share %,Seats,Seat share %');
    expect(lines[3]).toBe('Liberal Union,#2698d4,33.1,33.1,41,34.2');
    expect(lines).toHaveLength(7);
    expect(csv(teland, outcome).endsWith('\n')).toBe(true);
  });

  it('quotes commas and quotes, and keeps formulas from running in a spreadsheet', () => {
    const e = cleanElection({ size: 3, system: 'direct', parties: [{ name: 'Tom, "Dick" & Harry', seats: 1 }, { name: '=SUM(A1:A9)', seats: 1 }, { name: '+1 Party', seats: 1 }] });
    const lines = csv(e, count(e)).split('\n');
    expect(lines[1]!.startsWith('"Tom, ""Dick"" & Harry",')).toBe(true);
    expect(lines[2]!.startsWith("'=SUM(A1:A9),")).toBe(true);
    expect(lines[3]!.startsWith("'+1 Party,")).toBe(true);
  });

  it('adds district and list columns for mixed systems', () => {
    const mixed = cleanElection({ size: 10, system: 'mixed', votesAs: 'counts', parties: [{ name: 'A', votes: 600, seats: 3 }, { name: 'B', votes: 400, seats: 1 }] });
    expect(csv(mixed, count(mixed)).split('\n').slice(0, 2)).toEqual(['Party,Colour,Votes,Vote share %,Districts,List,Seats,Seat share %', 'A,#2698d4,600,60.0,3,3,6,60.0']);
  });
});

describe('the result as JSON', () => {
  it('is the settings, every party and the link, and reads back', () => {
    const data = JSON.parse(json(teland, outcome, link));
    expect(data).toMatchObject({ chamber: 'National Assembly of Teland', seats: 120, majority: 61, system: "D'Hondt", systemId: 'dhondt', threshold: 5, hung: true, vacant: 0, link });
    expect(data.parties).toHaveLength(6);
    expect(data.parties[2]).toEqual({ name: 'Liberal Union', colour: '#2698d4', votes: 33.1, voteShare: 33.1, seats: 41, seatShare: 34.2 });
    expect(data.parties[5]).toMatchObject({ name: 'Pirate Party', seats: 0, belowThreshold: true });
  });

  it('carries the extras of mixed systems and bonuses', () => {
    const mixed = cleanElection({ size: 100, system: 'mixed', votesAs: 'percent', parties: [{ votes: 50, seats: 30 }, { votes: 40, seats: 10 }, { votes: 10, seats: 20 }] });
    expect(JSON.parse(json(mixed, count(mixed), link)).parties[2]).toMatchObject({ districtSeats: 20, listSeats: 0, overhang: 10 });
    const bonus = cleanElection({ size: 100, system: 'dhondt', bonus: 20, parties: [{ votes: 60 }, { votes: 40 }] });
    expect(JSON.parse(json(bonus, count(bonus), link)).parties[0]).toMatchObject({ bonusSeats: 20 });
  });
});
