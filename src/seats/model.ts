/**
 * An election, as Seats holds it: a chamber, a way of counting and a list of parties.
 *
 * Everything that arrives from outside (a link, a pasted table, a profile file) goes through
 * cleanElection before it is counted or drawn: it is someone else's input.
 */
import { cleanColour, defaultColour } from './colours';

/** The formulas that share out seats in proportion to votes. */
export const FORMULAS = ['dhondt', 'sainte-lague', 'modified-sainte-lague', 'hare', 'droop'] as const;
export type FormulaId = (typeof FORMULAS)[number];

/**
 * How votes become seats. The five formulas, plus:
 * - direct: seats are typed in (first past the post, or any system counted elsewhere);
 * - mixed: district seats are typed in and list seats are worked out.
 */
export const SYSTEMS = [...FORMULAS, 'direct', 'mixed'] as const;
export type SystemId = (typeof SYSTEMS)[number];

/** Mixed systems: list seats beside the districts (parallel) or topping them up (compensatory). */
export const MIXED_MODES = ['compensatory', 'parallel'] as const;
export type MixedMode = (typeof MIXED_MODES)[number];

export const LAYOUTS = ['hemicycle', 'westminster', 'horseshoe'] as const;
export type Layout = (typeof LAYOUTS)[number];

/** Votes are typed as counts (1,443,545) or as percentages (33.1). */
export type VotesAs = 'counts' | 'percent';

export interface Party {
  name: string;
  /** Six-digit hex, lower case. */
  colour: string;
  /** Votes for the party: a whole number of votes, or a percentage with up to three decimals. */
  votes: number;
  /** Seats typed in: every seat when the system is direct, district seats when it is mixed. Otherwise unused. */
  seats: number;
}

export interface Election {
  /** The chamber's name, for example "National Assembly of Teland". */
  chamber: string;
  /** A label for the election, for example "Election 2026". */
  election: string;
  /** Seats in the chamber. */
  size: number;
  system: SystemId;
  /** National threshold: the percentage of all votes a party needs to win list seats. 0 for none. */
  threshold: number;
  /** Majority bonus: seats given to the party with the most votes before the rest are shared out. 0 for none. */
  bonus: number;
  /** For mixed systems only. */
  mixedMode: MixedMode;
  /** For mixed systems only: the formula for the list seats. */
  listFormula: FormulaId;
  votesAs: VotesAs;
  layout: Layout;
  /** The parties picked in the coalition builder, by their place in the list. */
  coalition: number[];
  /** Parties in the order they sit, left to right. */
  parties: Party[];
}

export const MAX_SIZE = 3000;
export const MAX_PARTIES = 30;
export const MAX_NAME = 60;
export const MAX_TITLE = 80;
export const MAX_VOTES = 1e12;
export const MAX_THRESHOLD = 50;

export const SYSTEM_LABELS: Record<SystemId, string> = {
  dhondt: "D'Hondt",
  'sainte-lague': 'Sainte-Laguë',
  'modified-sainte-lague': 'Modified Sainte-Laguë',
  hare: 'Largest remainder (Hare)',
  droop: 'Largest remainder (Droop)',
  direct: 'Seats entered directly',
  mixed: 'Mixed-member',
};

export const LAYOUT_LABELS: Record<Layout, string> = {
  hemicycle: 'Hemicycle',
  westminster: 'Westminster',
  horseshoe: 'Horseshoe',
};

const number = (value: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const whole = (value: unknown, min: number, max: number, fallback: number): number => Math.round(number(value, min, max, fallback));
const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

/** A name or title: plain text on one line, no markup, no control characters, cut to length. */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[<>\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trim();
}

/** Votes as typed: never negative, whole when they are counts, three decimals at most when they are percentages. */
export function cleanVotes(value: unknown, votesAs: VotesAs): number {
  return votesAs === 'percent' ? Math.round(number(value, 0, 100, 0) * 1000) / 1000 : whole(value, 0, MAX_VOTES, 0);
}

export function cleanParty(value: unknown, index: number, votesAs: VotesAs): Party {
  const o = record(value);
  return {
    name: cleanText(o.name, MAX_NAME) || `Party ${index + 1}`,
    colour: cleanColour(o.colour, defaultColour(index)),
    votes: cleanVotes(o.votes, votesAs),
    seats: whole(o.seats, 0, MAX_SIZE, 0),
  };
}

/** Any value, made into an election that is safe to count and draw. */
export function cleanElection(value: unknown): Election {
  const o = record(value);
  const votesAs: VotesAs = o.votesAs === 'counts' ? 'counts' : 'percent';
  const parties = (Array.isArray(o.parties) ? o.parties : []).slice(0, MAX_PARTIES).map((p, i) => cleanParty(p, i, votesAs));
  const size = whole(o.size, 1, MAX_SIZE, 100);
  const picked = (Array.isArray(o.coalition) ? o.coalition : [])
    .map((i) => (typeof i === 'number' && Number.isInteger(i) ? i : -1))
    .filter((i) => i >= 0 && i < parties.length);
  return {
    chamber: cleanText(o.chamber, MAX_TITLE),
    election: cleanText(o.election, MAX_TITLE),
    size,
    system: oneOf(o.system, SYSTEMS, 'dhondt'),
    threshold: Math.round(number(o.threshold, 0, MAX_THRESHOLD, 0) * 100) / 100,
    bonus: whole(o.bonus, 0, size, 0),
    mixedMode: oneOf(o.mixedMode, MIXED_MODES, 'compensatory'),
    listFormula: oneOf(o.listFormula, FORMULAS, 'sainte-lague'),
    votesAs,
    layout: oneOf(o.layout, LAYOUTS, 'hemicycle'),
    coalition: [...new Set(picked)].sort((a, b) => a - b),
    parties,
  };
}

/** An empty chamber of 100 seats, counted by D'Hondt. */
export function emptyElection(): Election {
  return cleanElection({});
}

/**
 * The election Seats opens with: the National Assembly of Teland, a made-up country.
 * Parties are listed as they sit, from left to right.
 */
export function defaultElection(): Election {
  return cleanElection({
    chamber: 'National Assembly of Teland',
    election: 'Election 2026',
    size: 120,
    system: 'dhondt',
    threshold: 5,
    votesAs: 'percent',
    parties: [
      { name: 'National Labour', votes: 26.4, colour: '#ca5a35' },
      { name: 'Civic Alliance', votes: 17.9, colour: '#f5ce44' },
      { name: 'Liberal Union', votes: 33.1, colour: '#2698d4' },
      { name: 'Agrarian League', votes: 11.6, colour: '#00774f' },
      { name: 'Independents', votes: 8.2, colour: '#554c8c' },
      { name: 'Pirate Party', votes: 2.8, colour: '#1b2d61' },
    ],
  });
}

/** A party to add at the end of the list. */
export function newParty(election: Election): Party {
  const index = election.parties.length;
  const used = new Set(election.parties.map((p) => p.colour));
  let colour = defaultColour(index);
  for (let i = 0; i < 10 && used.has(colour); i++) colour = defaultColour(index + i + 1);
  return { name: `Party ${index + 1}`, colour, votes: 0, seats: 0 };
}

/**
 * Votes as whole numbers, so that every comparison in the count is exact: counts as they are,
 * percentages in thousandths of a point.
 */
export function voteUnits(election: Election): number[] {
  return election.parties.map((p) => (election.votesAs === 'percent' ? Math.round(p.votes * 1000) : Math.round(p.votes)));
}

/** True for the systems that work seats out from votes, for the whole chamber. */
export function isFormula(system: SystemId): system is FormulaId {
  return (FORMULAS as readonly string[]).includes(system);
}
