/**
 * The count: an election in, the results table out.
 */
import { allocate, type Tie } from './allocate';
import { formatPercent, seatWords } from './format';
import { compensatorySeats, parallelSeats } from './mixed';
import { isFormula, SYSTEM_LABELS, voteUnits, type Election, type FormulaId } from './model';

export interface PartyResult {
  /** The party's place in the election's list. */
  index: number;
  name: string;
  colour: string;
  /** Votes as typed. */
  votes: number;
  /** Share of all votes, 0 to 1. Null when there are no votes at all. */
  voteShare: number | null;
  /** False when the party is below the threshold. Always true when seats are entered directly. */
  qualified: boolean;
  seats: number;
  /** Share of the seats held, 0 to 1. Null while the chamber is empty. */
  seatShare: number | null;
  /** Seat share minus vote share: above 0, the system favoured the party. Null without both shares. */
  difference: number | null;
  /** Mixed systems: seats won in districts. Otherwise 0. */
  district: number;
  /** Mixed systems: seats from the list. Otherwise 0. */
  list: number;
  /** Seats from the majority bonus. */
  bonus: number;
  /** Mixed systems with a top-up: district seats beyond the party's proportional share. */
  overhang: number;
}

/** Things worth telling the person about a result. */
export type Issue =
  /** Nobody has any votes, so no seats could be shared out. */
  | 'no-votes'
  /** Every party is below the threshold. */
  | 'none-qualified'
  /** A dead heat was settled by the tie-break (more votes, then listed first). */
  | 'tie'
  /** More seats were typed in than the chamber holds. */
  | 'too-many-seats'
  /** Some seats are empty. */
  | 'vacant'
  /** Overhang seats made the chamber larger than its nominal size. */
  | 'overhang';

export interface Outcome {
  parties: PartyResult[];
  /** The chamber's nominal size, as set. */
  size: number;
  /** Seats that exist: the nominal size, or more when overhang seats or typed-in seats exceed it. */
  total: number;
  /** Seats that are held by a party. */
  seated: number;
  /** Seats nobody holds: total minus seated. */
  vacant: number;
  /** Seats needed for a majority: more than half of the total. */
  majority: number;
  /** The party with the most seats, by index, or null when there is none or several share the lead. */
  largest: number | null;
  /** True when every seat is filled and no single party has a majority. */
  hung: boolean;
  /** Sum of all votes, as typed. */
  totalVotes: number;
  /** The Gallagher index of disproportionality, in percentage points: 0 is perfectly proportional. Null without votes or seats. */
  gallagher: number | null;
  tie: Tie | null;
  issues: Issue[];
}

const add = (numbers: readonly number[]): number => numbers.reduce((sum, n) => sum + n, 0);

const mergeTies = (...ties: (Tie | null)[]): Tie | null => {
  const real = ties.filter((t): t is Tie => t !== null);
  if (real.length === 0) return null;
  const unique = (lists: number[][]): number[] => [...new Set(lists.flat())].sort((a, b) => a - b);
  return { won: unique(real.map((t) => t.won)), lost: unique(real.map((t) => t.lost)) };
};

/** Seats needed for a majority in a chamber of this size: more than half. */
export function majorityOf(total: number): number {
  return Math.floor(total / 2) + 1;
}

/** Counts an election. Give it a clean election (see cleanElection). */
export function count(election: Election): Outcome {
  const { parties, size, system } = election;
  const units = voteUnits(election);
  const allUnits = add(units);
  const issues: Issue[] = [];
  const zeros = (): number[] => parties.map(() => 0);

  // The threshold is a share of every vote cast for a listed party, compared in whole numbers:
  // votes / all >= threshold / 100, with the threshold in hundredths of a point.
  const hundredths = BigInt(Math.round(election.threshold * 100));
  const clears = (v: number): boolean => v > 0 && BigInt(v) * 10000n >= hundredths * BigInt(allUnits);
  const qualified = system === 'direct' ? parties.map(() => true) : units.map(clears);
  const eligible = units.map((v, i) => (qualified[i] ? v : 0));

  let seats = zeros();
  let district = zeros();
  let list = zeros();
  let bonus = zeros();
  let overhang = zeros();
  let tie: Tie | null = null;

  if (system === 'direct') {
    seats = parties.map((p) => p.seats);
  } else {
    if (allUnits === 0) issues.push('no-votes');
    else if (!qualified.some(Boolean)) issues.push('none-qualified');

    if (system === 'mixed') {
      district = parties.map((p) => p.seats);
      const mixed =
        election.mixedMode === 'parallel'
          ? parallelSeats(election.listFormula, units, qualified, district, size)
          : compensatorySeats(election.listFormula, units, qualified, district, size);
      ({ list, overhang, tie } = mixed);
      seats = mixed.total;
      if (add(overhang) > 0) issues.push('overhang');
    } else {
      const formula: FormulaId = system;
      const extra = Math.min(election.bonus, size);
      const shared = allocate(formula, eligible, size - extra);
      seats = shared.seats;
      tie = shared.tie;
      if (extra > 0 && add(eligible) > 0) {
        // The bonus goes to the party with the most votes; equal votes: listed first.
        const most = Math.max(...eligible);
        const leaders = eligible.map((v, i) => (v === most ? i : -1)).filter((i) => i >= 0);
        const winner = leaders[0]!;
        bonus[winner] = extra;
        seats[winner] = seats[winner]! + extra;
        if (leaders.length > 1) tie = mergeTies(tie, { won: [winner], lost: leaders.slice(1) });
      }
    }
  }

  const seated = add(seats);
  const total = Math.max(size, seated);
  const vacant = total - seated;
  const majority = majorityOf(total);
  if (tie) issues.push('tie');
  if (seated > size && add(overhang) === 0) issues.push('too-many-seats');
  if (vacant > 0 && !issues.includes('no-votes') && !issues.includes('none-qualified')) issues.push('vacant');

  const results: PartyResult[] = parties.map((p, i) => {
    const voteShare = allUnits > 0 ? units[i]! / allUnits : null;
    const seatShare = seated > 0 ? seats[i]! / seated : null;
    return {
      index: i,
      name: p.name,
      colour: p.colour,
      votes: p.votes,
      voteShare,
      qualified: qualified[i]!,
      seats: seats[i]!,
      seatShare,
      difference: voteShare !== null && seatShare !== null ? seatShare - voteShare : null,
      district: district[i]!,
      list: list[i]!,
      bonus: bonus[i]!,
      overhang: overhang[i]!,
    };
  });

  const most = Math.max(0, ...seats);
  const leaders = seats.map((s, i) => (s === most && most > 0 ? i : -1)).filter((i) => i >= 0);
  const gallagher =
    allUnits > 0 && seated > 0
      ? Math.sqrt(results.reduce((sum, r) => sum + ((r.voteShare! - r.seatShare!) * 100) ** 2, 0) / 2)
      : null;

  return {
    parties: results,
    size,
    total,
    seated,
    vacant,
    majority,
    largest: leaders.length === 1 ? leaders[0]! : null,
    hung: seated > 0 && vacant === 0 && most < majority,
    totalVotes: add(parties.map((p) => p.votes)),
    gallagher,
    tie,
    issues,
  };
}

const FORMULA_NAMES: Record<FormulaId, string> = {
  dhondt: "D'Hondt",
  'sainte-lague': 'Sainte-Laguë',
  'modified-sainte-lague': 'modified Sainte-Laguë',
  hare: 'largest remainder with the Hare quota',
  droop: 'largest remainder with the Droop quota',
};

const FORMULA_SENTENCES: Record<FormulaId, string> = {
  dhondt:
    "D'Hondt: each seat in turn goes to the party with the highest votes divided by one more than the seats it already has (so by 1, 2, 3 and so on), which favours large parties",
  'sainte-lague':
    'Sainte-Laguë: each seat in turn goes to the party with the highest votes divided by twice the seats it already has, plus one (so by 1, 3, 5 and so on), which treats large and small parties alike',
  'modified-sainte-lague':
    "Modified Sainte-Laguë: each seat in turn goes to the party with the highest votes divided by 1.4, then 3, 5, 7 and so on, which makes a party's first seat harder to win",
  hare: 'Largest remainder with the Hare quota: a party gets a seat for every full quota (votes ÷ seats) and the seats left over go to the largest remainders, which favours small parties',
  droop:
    'Largest remainder with the Droop quota: a party gets a seat for every full quota (votes ÷ one more than the seats) and the seats left over go to the largest remainders, which suits large parties a little better than Hare',
};

/** The method, explained in one sentence, for under the results table. */
export function methodSentence(election: Election): string {
  const { system, threshold, bonus, size } = election;
  const clauses: string[] = [];
  let lead: string;
  if (system === 'direct') {
    return 'Seats are as entered: no formula is applied, which suits first past the post or any system counted elsewhere.';
  }
  if (system === 'mixed') {
    const formula = FORMULA_NAMES[election.listFormula];
    const districts = add(election.parties.map((p) => p.seats));
    lead =
      election.mixedMode === 'parallel'
        ? `Mixed-member, side by side: district seats are as entered, and the other ${seatWords(Math.max(0, size - districts))} are shared out on their own by ${formula}`
        : `Mixed-member, with a top-up: the whole chamber is shared out by ${formula}, and each party's list seats make up the difference between that share and the districts it won`;
    if (threshold > 0) clauses.push(`parties under ${formatPercent(threshold)} of the vote get no list seats`);
  } else {
    lead = FORMULA_SENTENCES[system];
    if (bonus > 0) clauses.push(`the party with the most votes gets ${seatWords(Math.min(bonus, size))} as a bonus first`);
    if (threshold > 0) clauses.push(`parties under ${formatPercent(threshold)} of the vote get none`);
  }
  return `${[lead, ...clauses].join('; ')}.`;
}

/** The system in a few words, for a caption: "D'Hondt, 5% threshold". */
export function systemCaption(election: Election): string {
  const { system } = election;
  const parts: string[] = [];
  if (system === 'mixed') {
    parts.push(`${SYSTEM_LABELS.mixed} (${election.mixedMode === 'parallel' ? 'parallel' : 'top-up'}, ${FORMULA_NAMES[election.listFormula]})`);
  } else {
    parts.push(SYSTEM_LABELS[system]);
  }
  if (isFormula(system) || system === 'mixed') {
    if (election.threshold > 0) parts.push(`${formatPercent(election.threshold)} threshold`);
  }
  if (isFormula(system) && election.bonus > 0) parts.push(`${seatWords(Math.min(election.bonus, election.size))} bonus`);
  return parts.join(', ');
}
