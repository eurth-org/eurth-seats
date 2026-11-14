import { describe, expect, it } from 'vitest';
import { parsePaste, readNumber } from '../src/seats/paste';

describe('numbers as people type them', () => {
  it('reads thousands separators of every kind', () => {
    for (const text of ['1443545', '1,443,545', '1.443.545', '1 443 545', "1'443'545", '1 443 545', '1 443 545']) {
      expect(readNumber(text), text).toBe(1_443_545);
    }
    expect(readNumber('12,345')).toBe(12_345);
    expect(readNumber('12.345')).toBe(12_345);
  });

  it('reads decimals with a point or a comma', () => {
    expect(readNumber('26.4')).toBe(26.4);
    expect(readNumber('26,4')).toBe(26.4);
    expect(readNumber('0,345')).toBe(0.345);
    expect(readNumber('0.345')).toBe(0.345);
    expect(readNumber('1,234.56')).toBe(1234.56);
    expect(readNumber('1.234,56')).toBe(1234.56);
    expect(readNumber('33.1%')).toBe(33.1);
    expect(readNumber('33,1 %')).toBe(33.1);
    expect(readNumber('.5')).toBe(0.5);
  });

  it('says no to anything else', () => {
    for (const text of ['', 'votes', '-5', '12a', '1,2,3', '1e9', '٣', '12,34,567']) expect(readNumber(text), text).toBeNull();
  });
});

describe('pasted results', () => {
  it('reads what a spreadsheet copies: tabs, with a header row', () => {
    const pasted = parsePaste('Party\tVotes\nLiberal Union\t331,000\nNational Labour\t264,000\nCivic Alliance\t179,000\n');
    expect(pasted).toEqual({
      parties: [
        { name: 'Liberal Union', votes: 331_000, seats: null },
        { name: 'National Labour', votes: 264_000, seats: null },
        { name: 'Civic Alliance', votes: 179_000, seats: null },
      ],
      votesAs: 'counts',
      hasSeats: false,
      skipped: 0,
      dropped: 0,
    });
  });

  it('reads percentages, with or without the sign', () => {
    const signed = parsePaste('Liberal Union; 33,1%\nNational Labour; 26,4%\nOthers; 40,5 %');
    expect(signed.votesAs).toBe('percent');
    expect(signed.parties.map((p) => p.votes)).toEqual([33.1, 26.4, 40.5]);
    const bare = parsePaste('Liberal Union 33.1\nNational Labour 26.4\nOthers 40.5');
    expect(bare.votesAs).toBe('percent');
    expect(bare.parties.map((p) => p.name)).toEqual(['Liberal Union', 'National Labour', 'Others']);
  });

  it('takes whole numbers that happen to add up to 100 as votes, not percentages', () => {
    expect(parsePaste('A 60\nB 40').votesAs).toBe('counts');
  });

  it('reads comma-separated lines, telling columns from thousands', () => {
    const pasted = parsePaste('Liberal Union, 331,000\nNational Labour,264000\nCivic Alliance, 1,179,000');
    expect(pasted.parties.map((p) => p.votes)).toEqual([331_000, 264_000, 1_179_000]);
    expect(pasted.hasSeats).toBe(false);
  });

  it('reads a third column as seats', () => {
    const tabs = parsePaste('Conservatives\t13,966,454\t365\nLabour\t10,269,051\t202');
    expect(tabs.parties).toEqual([
      { name: 'Conservatives', votes: 13_966_454, seats: 365 },
      { name: 'Labour', votes: 10_269_051, seats: 202 },
    ]);
    expect(tabs.hasSeats).toBe(true);
    const commas = parsePaste('Conservatives,13966454,365\nLabour, 10,269,051, 202');
    expect(commas.parties.map((p) => [p.votes, p.seats])).toEqual([
      [13_966_454, 365],
      [10_269_051, 202],
    ]);
  });

  it('keeps commas inside quoted names, and colons before numbers out of them', () => {
    expect(parsePaste('"Agrarian League, The",116000').parties[0]).toEqual({ name: 'Agrarian League, The', votes: 116_000, seats: null });
    expect(parsePaste('Pirates: 28 000').parties[0]).toEqual({ name: 'Pirates', votes: 28_000, seats: null });
  });

  it('skips lines it cannot read and says how many', () => {
    const pasted = parsePaste('Liberal Union\t331000\nno number here\n\n\t500\nNational Labour\t264000');
    expect(pasted.parties).toHaveLength(2);
    expect(pasted.skipped).toBe(2);
  });

  it('cleans names and clamps numbers: a paste is someone else\'s input', () => {
    const pasted = parsePaste('<script>alert(1)</script>\t5\nA\t99999999999999999999\nB\t5\t99999');
    expect(pasted.parties[0]!.name).toBe('script alert(1) /script');
    expect(pasted.parties[1]!.votes).toBe(1e12);
    expect(pasted.parties[2]!.seats).toBe(3000);
    const long = parsePaste(`${'x'.repeat(200)}\t5`);
    expect(long.parties[0]!.name).toHaveLength(60);
  });

  it('keeps the first 30 parties and counts the rest', () => {
    const pasted = parsePaste(Array.from({ length: 34 }, (_, i) => `Party ${i + 1}\t${100 + i}`).join('\n'));
    expect(pasted.parties).toHaveLength(30);
    expect(pasted.dropped).toBe(4);
  });

  it('makes nothing of nothing', () => {
    expect(parsePaste('')).toEqual({ parties: [], votesAs: 'counts', hasSeats: false, skipped: 0, dropped: 0 });
    expect(parsePaste('   \n\n')).toMatchObject({ parties: [], skipped: 0 });
  });
});
