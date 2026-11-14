/**
 * The results as a wikitext table, ready to paste into a wiki article (MediaWiki, as the Eurth
 * wiki and Wikipedia use): a colour bar, the party, votes, vote share, seats and seat share,
 * with a totals row. It sorts by clicking a heading.
 */
import { title } from './describe';
import { formatNumber, formatPoints, formatShare } from './format';
import type { Election } from './model';
import { systemCaption, type Outcome } from './results';

/** Text that is safe inside a wikitext table cell: nothing in it can start markup. */
export function wikiEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\|/g, '&#124;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;')
    .replace(/\[/g, '&#91;')
    .replace(/\]/g, '&#93;')
    .replace(/!/g, '&#33;')
    .replace(/=/g, '&#61;')
    .replace(/'/g, '&#39;')
    .replace(/~/g, '&#126;');
}

export function wikitext(election: Election, outcome: Outcome): string {
  const hasVotes = outcome.totalVotes > 0;
  const mixed = election.system === 'mixed';
  const percent = election.votesAs === 'percent';
  const caption = `${[title(election), systemCaption(election)].filter(Boolean).join(': ')}; ${outcome.majority} seats for a majority`;

  const head = ['! colspan="2" | Party'];
  if (hasVotes && !percent) head.push('! Votes');
  if (hasVotes) head.push('! %');
  if (mixed) head.push('! Districts', '! List');
  head.push('! Seats', '! Seats %');
  if (hasVotes) head.push('! +/−');

  const lines = ['{| class="wikitable sortable" style="text-align:right"', `|+ ${wikiEscape(caption)}`, '|-', ...head];
  for (const p of outcome.parties) {
    lines.push('|-');
    lines.push(`| style="background:${p.colour}; width:4px" |`);
    lines.push(`| style="text-align:left" | ${wikiEscape(p.name)}`);
    if (hasVotes && !percent) lines.push(`| ${formatNumber(p.votes)}`);
    if (hasVotes) lines.push(`| ${p.voteShare === null ? '' : formatShare(p.voteShare)}`);
    if (mixed) lines.push(`| ${p.district}`, `| ${p.list}`);
    lines.push(`| '''${p.seats}'''`);
    lines.push(`| ${p.seatShare === null ? '' : formatShare(p.seatShare)}`);
    if (hasVotes) lines.push(`| ${p.difference === null ? '' : formatPoints(p.difference)}`);
  }
  if (outcome.vacant > 0) {
    lines.push('|-');
    lines.push('| |', '| style="text-align:left" | Vacant');
    if (hasVotes && !percent) lines.push('|');
    if (hasVotes) lines.push('|');
    if (mixed) lines.push('|', '|');
    lines.push(`| ${outcome.vacant}`, '|');
    if (hasVotes) lines.push('|');
  }
  lines.push('|- class="sortbottom"');
  lines.push('! colspan="2" style="text-align:left" | Total');
  if (hasVotes && !percent) lines.push(`! ${formatNumber(outcome.totalVotes)}`);
  if (hasVotes) lines.push('! 100.0%');
  if (mixed) lines.push(`! ${outcome.parties.reduce((s, p) => s + p.district, 0)}`, `! ${outcome.parties.reduce((s, p) => s + p.list, 0)}`);
  lines.push(`! ${outcome.total}`, outcome.seated > 0 ? '! 100.0%' : '!');
  if (hasVotes) lines.push('!');
  lines.push('|}');
  return lines.join('\n');
}
