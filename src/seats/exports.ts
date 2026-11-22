/**
 * The result as text, for the Export card: Markdown (the forum and most wikis take it), CSV
 * for a spreadsheet and JSON for other tools. Wikitext is in wikitext.ts.
 *
 * Whatever a visitor typed goes through markdownText() or is quoted, so a party called
 * "**Bold** | Party" can't turn into markup or break a table.
 */
import { markdownTable, markdownText } from '@eurth/style';
import { coalition } from './coalition';
import { issueNotes, majoritySentence, title } from './describe';
import { formatNumber, formatPoints, formatShare, seatWords } from './format';
import { SYSTEM_LABELS, type Election } from './model';
import { methodSentence, systemCaption, type Outcome } from './results';

/** The result as Markdown: a heading, the table, who has the majority, and the link that brings it back. */
export function markdown(election: Election, outcome: Outcome, link: string): string {
  const hasVotes = outcome.totalVotes > 0;
  const counts = election.votesAs === 'counts';
  const mixed = election.system === 'mixed';

  const head = ['Party'];
  if (hasVotes && counts) head.push('Votes');
  if (hasVotes) head.push('Vote share');
  if (mixed) head.push('Districts', 'List');
  head.push('Seats', 'Seat share');
  if (hasVotes) head.push('Difference');

  const rows: (string | number)[][] = outcome.parties.map((p) => {
    const row: (string | number)[] = [p.name];
    if (hasVotes && counts) row.push(formatNumber(p.votes));
    if (hasVotes) row.push(p.voteShare === null ? '' : formatShare(p.voteShare));
    if (mixed) row.push(p.district, p.list);
    row.push(p.seats, p.seatShare === null ? '' : formatShare(p.seatShare));
    if (hasVotes) row.push(p.difference === null ? '' : formatPoints(p.difference));
    return row;
  });
  if (outcome.vacant > 0) {
    const row: (string | number)[] = ['Vacant'];
    if (hasVotes && counts) row.push('');
    if (hasVotes) row.push('');
    if (mixed) row.push('', '');
    row.push(outcome.vacant, '');
    if (hasVotes) row.push('');
    rows.push(row);
  }

  const picked = coalition(outcome, election.coalition);
  const lines = [
    `## ${markdownText(title(election) || 'Election result')}`,
    '',
    `**${seatWords(outcome.total)}**, ${markdownText(systemCaption(election))}. ${formatNumber(outcome.majority)} for a majority.`,
    '',
    markdownTable(head, rows),
    '',
  ];
  const majority = majoritySentence(outcome);
  if (majority) lines.push(markdownText(majority), '');
  if (picked.status !== 'empty' && picked.members.length > 1) lines.push(markdownText(picked.text), '');
  for (const note of issueNotes(election, outcome)) lines.push(`*${markdownText(note)}*`, '');
  lines.push(markdownText(methodSentence(election)), '', `[Open this election in Seats](${link})`);
  return lines.join('\n');
}

const quoted = (value: string | number): string => {
  const text = String(value);
  // A cell that starts with =, +, - or @ is a formula to a spreadsheet: keep it text.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** The results table as CSV, for a spreadsheet: one party per line, plain numbers. */
export function csv(election: Election, outcome: Outcome): string {
  const mixed = election.system === 'mixed';
  const head = ['Party', 'Colour', 'Votes', 'Vote share %', ...(mixed ? ['Districts', 'List'] : []), 'Seats', 'Seat share %'];
  const percent = (share: number | null): string => (share === null ? '' : (Math.round(share * 1000) / 10).toFixed(1));
  const rows = outcome.parties.map((p) => [p.name, p.colour, p.votes, percent(p.voteShare), ...(mixed ? [p.district, p.list] : []), p.seats, percent(p.seatShare)]);
  return [head, ...rows].map((row) => row.map(quoted).join(',')).join('\n') + '\n';
}

/** The result as JSON, for other tools: the settings, every party's numbers, and the link. */
export function json(election: Election, outcome: Outcome, link: string): string {
  const share = (value: number | null): number | null => (value === null ? null : Math.round(value * 1000) / 10);
  return JSON.stringify(
    {
      chamber: election.chamber,
      election: election.election,
      seats: outcome.total,
      majority: outcome.majority,
      system: SYSTEM_LABELS[election.system],
      systemId: election.system,
      threshold: election.threshold,
      bonus: election.bonus,
      hung: outcome.hung,
      parties: outcome.parties.map((p) => ({
        name: p.name,
        colour: p.colour,
        votes: p.votes,
        voteShare: share(p.voteShare),
        seats: p.seats,
        seatShare: share(p.seatShare),
        ...(election.system === 'mixed' ? { districtSeats: p.district, listSeats: p.list, overhang: p.overhang } : {}),
        ...(p.bonus > 0 ? { bonusSeats: p.bonus } : {}),
        ...(p.qualified ? {} : { belowThreshold: true }),
      })),
      vacant: outcome.vacant,
      link,
    },
    null,
    2,
  );
}
