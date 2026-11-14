/**
 * A result in words: for "Copy description", for screen readers, for the picture's text
 * alternative and for the profile's summary.
 */
import { coalition } from './coalition';
import { formatShare, listWords, seatWords } from './format';
import { LAYOUT_LABELS, type Election } from './model';
import { systemCaption, type Outcome, type PartyResult } from './results';

/** Parties with seats, largest first; equal seats keep their order in the list. */
export function bySeats(outcome: Outcome): PartyResult[] {
  return outcome.parties.filter((p) => p.seats > 0).sort((a, b) => b.seats - a.seats || a.index - b.index);
}

/** "National Assembly of Teland, Election 2026", or whichever of the two is set, or "". */
export function title(election: Election): string {
  return [election.chamber, election.election].filter(Boolean).join(', ');
}

/** The result on one line: "120 seats; Liberal Union 41, National Labour 33, Civic Alliance 22." */
export function summaryLine(outcome: Outcome): string {
  const parties = bySeats(outcome).map((p) => `${p.name} ${p.seats}`);
  if (parties.length === 0) return `${seatWords(outcome.total)}; none filled.`;
  const vacant = outcome.vacant > 0 ? `, vacant ${outcome.vacant}` : '';
  return `${seatWords(outcome.total)}; ${parties.join(', ')}${vacant}.`;
}

/** Who has the majority, or that nobody does, in a sentence. */
export function majoritySentence(outcome: Outcome): string {
  if (outcome.seated === 0) return '';
  const leader = bySeats(outcome)[0]!;
  if (leader.seats >= outcome.majority) {
    const spare = leader.seats - outcome.majority;
    return `${leader.name} has a majority: ${leader.seats} of ${seatWords(outcome.total)}, ${spare === 0 ? 'none' : spare} more than the ${outcome.majority} needed.`;
  }
  if (outcome.vacant > 0) return `No party has a majority yet: ${outcome.majority} of ${seatWords(outcome.total)} are needed.`;
  return `No party has a majority: ${outcome.majority} of ${seatWords(outcome.total)} are needed, and the largest party, ${leader.name}, has ${leader.seats}.`;
}

/**
 * The whole result as a short paragraph of plain text.
 *
 * "National Assembly of Teland, Election 2026. 120 seats, D'Hondt, 5% threshold. Liberal Union
 * 41 seats (33.1% of the vote), … Pirate Party won no seats (2.8%, below the threshold). No
 * party has a majority: …"
 */
export function description(election: Election, outcome: Outcome): string {
  const sentences: string[] = [];
  const heading = title(election);
  if (heading) sentences.push(`${heading}.`);
  sentences.push(`${seatWords(outcome.total)}, ${systemCaption(election)}.`);

  const share = (p: PartyResult): string => (p.voteShare === null || outcome.totalVotes === 0 ? '' : formatShare(p.voteShare));
  const winners = bySeats(outcome).map((p, i) => {
    const votes = share(p);
    const seats = i === 0 ? seatWords(p.seats) : String(p.seats);
    const detail = [votes && (i === 0 ? `${votes} of the vote` : votes), p.overhang > 0 ? `${p.overhang} overhang` : '', p.bonus > 0 ? `${p.bonus} as a bonus` : '']
      .filter(Boolean)
      .join(', ');
    return `${p.name} ${seats}${detail ? ` (${detail})` : ''}`;
  });
  if (winners.length > 0) sentences.push(`${winners.join(', ')}.`);
  else sentences.push('No seats are filled.');

  const without = outcome.parties.filter((p) => p.seats === 0 && (p.votes > 0 || !p.qualified));
  if (without.length > 0 && winners.length > 0) {
    const below = without.filter((p) => !p.qualified && p.votes > 0);
    const others = without.filter((p) => !below.includes(p));
    const named = (list: PartyResult[]): string => listWords(list.map((p) => (share(p) ? `${p.name} (${share(p)})` : p.name)));
    if (below.length > 0) sentences.push(`Below the threshold, with no seats: ${named(below)}.`);
    if (others.length > 0) sentences.push(`No seats: ${named(others)}.`);
  }
  if (outcome.vacant > 0 && winners.length > 0) sentences.push(`${seatWords(outcome.vacant)} ${outcome.vacant === 1 ? 'is' : 'are'} vacant.`);
  const majority = majoritySentence(outcome);
  if (majority) sentences.push(majority);
  const picked = coalition(outcome, election.coalition);
  if (picked.status !== 'empty' && picked.members.length > 1) sentences.push(picked.text);
  if (outcome.tie) {
    const names = (list: number[]): string => listWords(list.map((i) => outcome.parties[i]?.name ?? ''));
    sentences.push(`A dead heat between ${names([...outcome.tie.won, ...outcome.tie.lost])} was settled for ${names(outcome.tie.won)}, on more votes or on being listed first.`);
  }
  return sentences.join(' ');
}

/**
 * What the chamber picture shows, for its text alternative: the layout and the blocks in the
 * order they are drawn.
 */
export function chamberDescription(election: Election, outcome: Outcome): string {
  const blocks = outcome.parties.filter((p) => p.seats > 0).map((p) => `${p.name} ${p.seats}`);
  const layout = LAYOUT_LABELS[election.layout].toLowerCase();
  if (blocks.length === 0) return `An empty ${layout} chamber of ${seatWords(outcome.total)}.`;
  const vacant = outcome.vacant > 0 ? `, then ${seatWords(outcome.vacant)} vacant` : '';
  const order =
    election.layout === 'westminster'
      ? 'Government benches above, opposition below'
      : 'From left to right';
  return `A ${layout} chamber of ${seatWords(outcome.total)}. ${order}: ${blocks.join(', ')}${vacant}. A majority is ${outcome.majority}.`;
}

/** The description cut to fit the profile's summary (600 characters), ending on a whole sentence. */
export function profileSummary(election: Election, outcome: Outcome, max = 600): string {
  const full = description(election, outcome);
  if (full.length <= max) return full;
  let out = '';
  for (const sentence of full.match(/[^.]+(?:\.(?!\s)[^.]*)*\.(\s|$)/g) ?? []) {
    if ((out + sentence).trimEnd().length > max) break;
    out += sentence;
  }
  return out.trimEnd() || `${full.slice(0, max - 1).trimEnd()}…`;
}
