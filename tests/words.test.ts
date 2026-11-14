import { describe, expect, it } from 'vitest';
import { coalition, minimalWinning } from '../src/seats/coalition';
import { bySeats, chamberDescription, description, issueNotes, majoritySentence, profileSummary, summaryLine, title } from '../src/seats/describe';
import { formatNumber, formatPercent, formatPoints, formatShare, listWords, seatWords } from '../src/seats/format';
import { cleanElection, defaultElection } from '../src/seats/model';
import { count } from '../src/seats/results';
import { wikiEscape, wikitext } from '../src/seats/wikitext';

const teland = defaultElection();
const outcome = count(teland);

describe('numbers and lists in words', () => {
  it('groups thousands with commas and keeps decimals', () => {
    expect(formatNumber(1_443_545)).toBe('1,443,545');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(26.4)).toBe('26.4');
    expect(formatNumber(1234.5678)).toBe('1,234.568');
    expect(formatNumber(Number.NaN)).toBe('0');
  });

  it('writes shares, thresholds and differences', () => {
    expect(formatShare(0.331)).toBe('33.1%');
    expect(formatShare(41 / 120)).toBe('34.2%');
    expect(formatShare(0)).toBe('0.0%');
    expect(formatPercent(5)).toBe('5%');
    expect(formatPercent(3.25)).toBe('3.25%');
    expect(formatPoints(0.011)).toBe('+1.1');
    expect(formatPoints(-0.028)).toBe('−2.8');
    expect(formatPoints(0.0001)).toBe('0.0');
  });

  it('joins names the British way, without a comma before "and"', () => {
    expect(listWords([])).toBe('');
    expect(listWords(['A'])).toBe('A');
    expect(listWords(['A', 'B'])).toBe('A and B');
    expect(listWords(['A', 'B', 'C'])).toBe('A, B and C');
    expect(seatWords(1)).toBe('1 seat');
    expect(seatWords(1200)).toBe('1,200 seats');
  });
});

describe('the coalition builder', () => {
  it('writes out a majority and its margin', () => {
    // Civic Alliance (22) and Liberal Union (41), as picked in the mock-up.
    expect(coalition(outcome, [2, 1])).toEqual({
      members: [1, 2],
      seats: 63,
      majority: 61,
      margin: 2,
      status: 'majority',
      text: 'Civic Alliance and Liberal Union hold 63 of the 120 seats: a majority, with 2 seats to spare over the 61 needed.',
    });
  });

  it('writes out a shortfall', () => {
    expect(coalition(outcome, [2]).text).toBe('Liberal Union holds 41 of the 120 seats: 20 seats short of the 61 needed for a majority.');
    expect(coalition(outcome, [0, 3, 4])).toMatchObject({ seats: 57, margin: -4, status: 'short' });
    expect(coalition(outcome, [0, 3, 4]).text).toBe(
      'National Labour, Agrarian League and Independents hold 57 of the 120 seats: 4 seats short of the 61 needed for a majority.',
    );
  });

  it('knows a bare majority, exactly half, and one seat', () => {
    const level = count(cleanElection({ size: 100, system: 'direct', parties: [{ name: 'A', seats: 51 }, { name: 'B', seats: 49 }, { name: 'C', seats: 0 }] }));
    expect(coalition(level, [0]).text).toBe('A holds 51 of the 100 seats: a majority, with none to spare.');
    const half = count(cleanElection({ size: 100, system: 'direct', parties: [{ name: 'A', seats: 50 }, { name: 'B', seats: 50 }] }));
    expect(coalition(half, [1]).text).toBe('B holds 50 of the 100 seats: exactly half, 1 seat short of the 61 needed for a majority.'.replace('61', '51'));
    const one = count(cleanElection({ size: 99, system: 'direct', parties: [{ name: 'A', seats: 51 }, { name: 'B', seats: 48 }] }));
    expect(coalition(one, [0]).text).toBe('A holds 51 of the 99 seats: a majority, with 1 seat to spare over the 50 needed.');
  });

  it('ignores parties without seats, repeats and picks that do not exist', () => {
    expect(coalition(outcome, [5]).status).toBe('empty');
    expect(coalition(outcome, []).text).toBe('Pick parties to see whether they have a majority together.');
    expect(coalition(outcome, [2, 2, 5, 99, -1]).members).toEqual([2]);
  });

  it('lists every minimal winning coalition, smallest first', () => {
    const names = minimalWinning(outcome).map((members) => members.map((i) => outcome.parties[i]!.name).join(' + '));
    expect(names).toEqual([
      'Civic Alliance + Liberal Union', // 63
      'National Labour + Liberal Union', // 74
      'Liberal Union + Agrarian League + Independents', // 65
      'National Labour + Civic Alliance + Independents', // 65
      'National Labour + Civic Alliance + Agrarian League', // 69
    ]);
    // Each one wins, and loses its majority if any member leaves.
    for (const members of minimalWinning(outcome)) {
      const seats = members.map((i) => outcome.parties[i]!.seats);
      const total = seats.reduce((a, b) => a + b, 0);
      expect(total).toBeGreaterThanOrEqual(61);
      for (const s of seats) expect(total - s).toBeLessThan(61);
    }
  });

  it('a party with a majority is its own minimal winning coalition, and the only one', () => {
    const won = count(cleanElection({ size: 100, system: 'direct', parties: [{ seats: 60 }, { seats: 30 }, { seats: 10 }] }));
    expect(minimalWinning(won)).toEqual([[0]]);
    expect(minimalWinning(count(cleanElection({ size: 10, parties: [] })))).toEqual([]);
  });
});

describe('the result in words', () => {
  it('fits on one line, largest party first', () => {
    expect(summaryLine(outcome)).toBe('120 seats; Liberal Union 41, National Labour 33, Civic Alliance 22, Agrarian League 14, Independents 10.');
    expect(bySeats(outcome).map((p) => p.seats)).toEqual([41, 33, 22, 14, 10]);
  });

  it('mentions vacant seats and empty chambers', () => {
    const partly = count(cleanElection({ size: 10, system: 'direct', parties: [{ name: 'A', seats: 4 }, { name: 'B', seats: 3 }] }));
    expect(summaryLine(partly)).toBe('10 seats; A 4, B 3, vacant 3.');
    expect(summaryLine(count(cleanElection({ size: 10, parties: [] })))).toBe('10 seats; none filled.');
  });

  it('has a title when the chamber or the election has a name', () => {
    expect(title(teland)).toBe('National Assembly of Teland, Election 2026');
    expect(title(cleanElection({ election: 'Spring vote' }))).toBe('Spring vote');
    expect(title(cleanElection({}))).toBe('');
  });

  it('describes the whole result in a paragraph', () => {
    expect(description(teland, outcome)).toBe(
      "National Assembly of Teland, Election 2026. 120 seats, D'Hondt, 5% threshold. " +
        'Liberal Union 41 seats (33.1% of the vote), National Labour 33 (26.4%), Civic Alliance 22 (17.9%), Agrarian League 14 (11.6%), Independents 10 (8.2%). ' +
        'Below the threshold, with no seats: Pirate Party (2.8%). ' +
        'No party has a majority: 61 of 120 seats are needed, and the largest party, Liberal Union, has 41.',
    );
  });

  it('adds the coalition when one is picked', () => {
    const picked = { ...teland, coalition: [1, 2] };
    expect(description(picked, count(picked))).toContain('Civic Alliance and Liberal Union hold 63 of the 120 seats: a majority');
  });

  it('says who has the majority', () => {
    const won = count(cleanElection({ size: 100, system: 'direct', parties: [{ name: 'Unity', seats: 60 }, { name: 'Others', seats: 40 }] }));
    expect(majoritySentence(won)).toBe('Unity has a majority: 60 of 100 seats, 9 more than the 51 needed.');
    const partly = count(cleanElection({ size: 100, system: 'direct', parties: [{ name: 'Unity', seats: 30 }] }));
    expect(majoritySentence(partly)).toBe('No party has a majority yet: 51 of 100 seats are needed.');
    expect(majoritySentence(count(cleanElection({ parties: [] })))).toBe('');
  });

  it('mentions overhang, bonus seats, vacancies and dead heats', () => {
    const mixed = cleanElection({
      size: 100,
      system: 'mixed',
      votesAs: 'percent',
      parties: [{ name: 'A', votes: 50, seats: 30 }, { name: 'B', votes: 40, seats: 10 }, { name: 'C', votes: 10, seats: 20 }],
    });
    expect(description(mixed, count(mixed))).toContain('C 20 (10.0%, 10 overhang)');
    const bonus = cleanElection({ size: 100, system: 'dhondt', bonus: 20, votesAs: 'percent', parties: [{ name: 'A', votes: 42 }, { name: 'B', votes: 58 }] });
    expect(description(bonus, count(bonus))).toContain('B 66 seats (58.0% of the vote, 20 as a bonus)');
    const tied = cleanElection({ size: 1, system: 'dhondt', votesAs: 'counts', parties: [{ name: 'A', votes: 10 }, { name: 'B', votes: 10 }] });
    expect(description(tied, count(tied))).toContain('A dead heat between A and B was settled for A, on more votes or on being listed first.');
    const direct = cleanElection({ size: 10, system: 'direct', parties: [{ name: 'A', seats: 4 }, { name: 'B', seats: 0 }] });
    expect(description(direct, count(direct))).toBe(
      '10 seats, Seats entered directly. A 4 seats. 6 seats are vacant. No party has a majority yet: 6 of 10 seats are needed.',
    );
  });

  it('describes the picture: the layout and the blocks as drawn', () => {
    expect(chamberDescription(teland, outcome)).toBe(
      'A hemicycle chamber of 120 seats. From left to right: National Labour 33, Civic Alliance 22, Liberal Union 41, Agrarian League 14, Independents 10. A majority is 61.',
    );
    const benches = { ...teland, layout: 'westminster' as const };
    expect(chamberDescription(benches, outcome)).toContain('Government benches above, opposition below:');
    expect(chamberDescription(cleanElection({ size: 7, parties: [] }), count(cleanElection({ size: 7, parties: [] })))).toBe('An empty hemicycle chamber of 7 seats.');
  });

  it("fits the profile's summary, ending on a whole sentence", () => {
    expect(profileSummary(teland, outcome)).toBe(description(teland, outcome));
    const many = cleanElection({
      size: 600,
      system: 'sainte-lague',
      votesAs: 'counts',
      chamber: 'The Most Serene and Long-Winded Assembly of the United Provinces',
      parties: Array.from({ length: 30 }, (_, i) => ({ name: `The Party of Considerable Length Number ${i + 1}`, votes: 1000 + i * 37 })),
    });
    const short = profileSummary(many, count(many));
    expect(short.length).toBeLessThanOrEqual(600);
    expect(short.length).toBeGreaterThan(0);
    expect(short.endsWith('.') || short.endsWith('…')).toBe(true);
  });
});

describe('notes about a result', () => {
  const notes = (value: unknown): string[] => {
    const e = cleanElection(value);
    return issueNotes(e, count(e));
  };

  it('are none when all is well', () => {
    expect(issueNotes(teland, outcome)).toEqual([]);
  });

  it('say what happened and what to do next', () => {
    expect(notes({ parties: [] })).toEqual(['Add a party to begin.']);
    expect(notes({ parties: [{ votes: 0 }] })).toEqual(['Enter some votes, and the seats will be shared out.']);
    expect(notes({ threshold: 40, parties: [{ votes: 30 }, { votes: 35 }, { votes: 35 }] })).toEqual(['Every party is below the 40% threshold, so nobody wins a seat. Lower the threshold.']);
    expect(notes({ size: 10, system: 'direct', parties: [{ seats: 4 }, { seats: 3 }] })).toEqual(['3 seats are vacant: the seats entered add up to 7, and the chamber holds 10.']);
    expect(notes({ size: 10, system: 'direct', parties: [{ seats: 9 }] })).toEqual(['1 seat is vacant: the seats entered add up to 9, and the chamber holds 10.']);
    expect(notes({ size: 10, system: 'direct', parties: [{ seats: 8 }, { seats: 5 }] })).toEqual(["The seats entered add up to more than the chamber's 10. The chart shows all 13."]);
    expect(notes({ size: 100, system: 'mixed', votesAs: 'percent', parties: [{ votes: 50, seats: 30 }, { votes: 40, seats: 10 }, { votes: 10, seats: 20 }] })).toEqual([
      '10 seats of overhang: the chamber has grown from 100 to 110.',
    ]);
    expect(notes({ size: 1, system: 'dhondt', votesAs: 'counts', parties: [{ name: 'A', votes: 10 }, { name: 'B', votes: 10 }] })).toEqual([
      'A dead heat between A and B was settled for A: more votes wins, then the party listed first. Real laws mostly draw lots.',
    ]);
  });
});

describe('the wikitext table', () => {
  const table = wikitext(teland, outcome);

  it('is a sortable table with a caption, a row per party and a totals row', () => {
    const lines = table.split('\n');
    expect(lines[0]).toBe('{| class="wikitable sortable" style="text-align:right"');
    expect(lines[1]).toBe('|+ National Assembly of Teland, Election 2026: D&#39;Hondt, 5% threshold; 61 seats for a majority');
    expect(lines[lines.length - 1]).toBe('|}');
    expect(lines.filter((l) => l.startsWith('| style="background:#'))).toHaveLength(6);
    expect(table).toContain('|- class="sortbottom"\n! colspan="2" style="text-align:left" | Total\n! 100.0%\n! 120\n! 100.0%\n!');
  });

  it('shows share of the vote, seats, share of the seats and the difference', () => {
    expect(table).toContain(
      ['| style="background:#2698d4; width:4px" |', '| style="text-align:left" | Liberal Union', '| 33.1%', "| '''41'''", '| 34.2%', '| +1.1'].join('\n'),
    );
    expect(table).toContain(['| style="text-align:left" | Pirate Party', '| 2.8%', "| '''0'''", '| 0.0%', '| −2.8'].join('\n'));
  });

  it('adds vote counts when votes are counts, and district and list columns when the system is mixed', () => {
    const mixed = cleanElection({
      size: 100,
      system: 'mixed',
      votesAs: 'counts',
      parties: [{ name: 'A', votes: 50_000, seats: 30 }, { name: 'B', votes: 40_000, seats: 10 }, { name: 'C', votes: 10_000, seats: 20 }],
    });
    const text = wikitext(mixed, count(mixed));
    expect(text).toContain('! colspan="2" | Party\n! Votes\n! %\n! Districts\n! List\n! Seats\n! Seats %\n! +/−');
    expect(text).toContain("| style=\"text-align:left\" | A\n| 50,000\n| 50.0%\n| 30\n| 20\n| '''50'''\n| 45.5%\n| −4.5");
    expect(text).toContain('! 100,000\n! 100.0%\n! 60\n! 50\n! 110\n! 100.0%');
  });

  it('leaves the vote columns out when there are no votes, and adds a row for vacant seats', () => {
    const direct = cleanElection({ size: 10, system: 'direct', parties: [{ name: 'A', seats: 4 }, { name: 'B', seats: 3 }] });
    const text = wikitext(direct, count(direct));
    expect(text).toContain('! colspan="2" | Party\n! Seats\n! Seats %\n|-');
    expect(text).toContain('| style="text-align:left" | Vacant\n| 3\n|\n|-');
    expect(text).not.toContain('+/−');
  });

  it('every row has as many cells as the heading', () => {
    for (const e of [teland, cleanElection({ size: 10, system: 'direct', parties: [{ seats: 4 }, { seats: 3 }] }), cleanElection({ size: 9, system: 'mixed', votesAs: 'counts', parties: [{ votes: 5, seats: 2 }, { votes: 4, seats: 9 }] })]) {
      const rows = wikitext(e, count(e)).split('\n|-').slice(1);
      const cells = rows.map((row) => row.split('\n').filter((l) => l.startsWith('|') || l.startsWith('!')).reduce((n, l) => n + (l.includes('colspan="2"') ? 2 : 1), 0));
      // The last row also holds the table's closing "|}".
      cells[cells.length - 1]!--;
      expect(new Set(cells).size, JSON.stringify(cells)).toBe(1);
    }
  });

  it('keeps markup in names from breaking the table', () => {
    expect(wikiEscape("A|B's [[x]] {{y}} <b> = !! ~~~~")).toBe(
      'A&#124;B&#39;s &#91;&#91;x&#93;&#93; &#123;&#123;y&#125;&#125; &lt;b&gt; &#61; &#33;&#33; &#126;&#126;&#126;&#126;',
    );
    const e = cleanElection({ size: 3, system: 'direct', chamber: 'The {{Senate}}', parties: [{ name: "People's | Party", seats: 3 }] });
    const text = wikitext(e, count(e));
    expect(text).toContain('|+ The &#123;&#123;Senate&#125;&#125;: Seats entered directly; 2 seats for a majority');
    expect(text).toContain('| style="text-align:left" | People&#39;s &#124; Party');
  });
});
