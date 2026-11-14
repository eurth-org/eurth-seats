/**
 * Seats and the Eurth nation profile (<nation>.eurth.json, see @eurth/profile).
 *
 * Seats owns the profile's "seats" section and leaves every other section alone. This file
 * only makes and reads the section's contents; putting it into a profile is
 * @eurth/profile's setSection, which stamps the time and keeps everything else as it was:
 *
 *   setSection(profile, 'seats', toSeatsSection(election, outcome, { link, previous: getSection(profile, 'seats') }))
 *
 * The section is small, as the handbook asks: what the schema names (chamber, total, system,
 * election, and the parties that hold seats, largest first), which any other tool can read,
 * the share link, which brings the whole election back, and a few more fields a reader may
 * want:
 *
 *   systemId    the system's id, for example "dhondt"
 *   threshold   the national threshold, in percent
 *   bonus       majority bonus seats, when there are any
 *   majority    seats needed for a majority
 *   parties[].votes        the party's votes, as typed
 *   parties[].voteShare    its share of the vote, in percent with one decimal
 *
  * It also reads the "government" section, which Governmint owns, for a place to start.
 */
import { bySeats, profileSummary } from './describe';
import { electionFromLink } from './link';
import { cleanElection, cleanText, FORMULAS, MAX_TITLE, SYSTEM_LABELS, SYSTEMS, type Election, type SystemId } from './model';
import type { Outcome } from './results';

export interface SeatsSection {
  link?: string;
  summary?: string;
  updated?: string;
  chamber?: string;
  total?: number;
  system?: string;
  election?: string;
  parties?: { name: string; seats: number; colour?: string; votes?: number; voteShare?: number; [key: string]: unknown }[];
  systemId?: SystemId;
  threshold?: number;
  bonus?: number;
  majority?: number;
  [key: string]: unknown;
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

/**
 * The "seats" section for this election and its result.
 * @param options.link the election's share link (https), if there is one
 * @param options.previous the section as it is in the profile now: fields Seats does not know are kept
 */
export function toSeatsSection(
  election: Election,
  outcome: Outcome,
  options: { link?: string; previous?: unknown } = {},
): SeatsSection {
  const usesVotes = election.system !== 'direct' || outcome.totalVotes > 0;
  const section: SeatsSection = {
    ...record(options.previous),
    summary: profileSummary(election, outcome),
    total: Math.min(10_000, outcome.total), // the schema's ceiling
    system: SYSTEM_LABELS[election.system],
    parties: bySeats(outcome).map((p) => ({
      name: p.name,
      seats: p.seats,
      colour: p.colour,
      ...(usesVotes && p.voteShare !== null ? { votes: p.votes, voteShare: Math.round(p.voteShare * 1000) / 10 } : {}),
    })),
    systemId: election.system,
    threshold: election.threshold,
    majority: outcome.majority,
  };
  // Set, or cleared when empty, so an old value never lingers.
  const optional = (key: 'link' | 'chamber' | 'election' | 'bonus', value: string | number | undefined): void => {
    if (value === undefined || value === '' || value === 0) delete section[key];
    else (section as Record<string, unknown>)[key] = value;
  };
  optional('link', options.link !== undefined && /^https:\/\/[!-~]+$/.test(options.link) && options.link.length <= 4000 ? options.link : undefined);
  optional('chamber', election.chamber);
  optional('election', election.election);
  optional('bonus', election.bonus);
  delete section.updated; // setSection stamps it
  return section;
}

/**
 * The election in a profile's "seats" section, or null when there is nothing to read.
 *
 * If the section has a Seats link, the whole election comes back from it. A section written
 * by hand or by another tool has only the schema's fields: the parties and their seats, which
 * come back as seats entered directly (or with the named system, when every party also has
 * votes).
 */
export function fromSeatsSection(section: unknown): Election | null {
  const s = record(section);
  if (Object.keys(s).length === 0) return null;
  const linked = electionFromLink(s.link);
  if (linked) return linked;
  const parties = (Array.isArray(s.parties) ? s.parties : []).map(record);
  if (parties.length === 0 && typeof s.total !== 'number' && typeof s.chamber !== 'string') return null;
  const withVotes = parties.length > 0 && parties.every((p) => typeof p.votes === 'number');
  const named = (SYSTEMS as readonly unknown[]).includes(s.systemId) ? (s.systemId as SystemId) : undefined;
  const system: SystemId = named && (FORMULAS as readonly string[]).includes(named) && withVotes ? named : 'direct';
  const votes = parties.map((p) => (typeof p.votes === 'number' ? p.votes : 0));
  const counts = votes.some((v) => v > 100 || !Number.isFinite(v)) || (votes.every(Number.isInteger) && votes.reduce((a, b) => a + b, 0) > 101);
  return cleanElection({
    chamber: s.chamber,
    election: s.election,
    size: s.total,
    system,
    threshold: s.threshold,
    bonus: s.bonus,
    votesAs: withVotes && counts ? 'counts' : 'percent',
    parties: parties.map((p) => ({ name: p.name, colour: p.colour, votes: p.votes, seats: p.seats })),
  });
}

/** Governmint's three electoral systems, and the Seats system each one starts from. */
export const GOVERNMINT_SYSTEMS = {
  /** "Winner takes the seat": districts, counted elsewhere, so the seats are typed in. */
  majoritarian: 'direct',
  /** "Proportional": D'Hondt, the commonest list formula. */
  proportional: 'dhondt',
  /** "Mixed": district seats typed in, list seats worked out. */
  mixed: 'mixed',
} as const satisfies Record<string, SystemId>;

export type GovernmintSystem = keyof typeof GOVERNMINT_SYSTEMS;

// Governmint's link, version 3: "?c=3" then one base-36 character per setting, in the order
// it asks them. These are the sixth, seventh and eighth: who makes the laws, how many
// chambers, and how votes turn into seats. (eurth-government, src/model/settings.ts and link.ts.)
const GOVERNMINT_VERSION = '3';
const GOVERNMINT_LEGISLATURES = ['elected', 'partly-elected', 'indirect', 'appointed', 'assembly', 'advisory', 'none'] as const;
const GOVERNMINT_CHAMBERS = ['one', 'two'] as const;
const GOVERNMINT_ELECTORAL = ['majoritarian', 'proportional', 'mixed'] as const;

export interface GovernmintLegislature {
  legislature: (typeof GOVERNMINT_LEGISLATURES)[number];
  chambers: (typeof GOVERNMINT_CHAMBERS)[number];
  electoralSystem: GovernmintSystem;
}

/** The legislature settings in a Governmint link, or null when the link is not one Seats can read. */
export function readGovernmintLink(link: unknown): GovernmintLegislature | null {
  if (typeof link !== 'string' || link.length > 4000) return null;
  let code: string | null;
  try {
    code = new URL(link).searchParams.get('c');
  } catch {
    return null;
  }
  if (!code || !code.startsWith(GOVERNMINT_VERSION) || !/^[0-9a-z]+$/.test(code)) return null;
  const at = (place: number): number => parseInt(code.charAt(GOVERNMINT_VERSION.length + place), 36);
  const legislature = GOVERNMINT_LEGISLATURES[at(5)];
  const chambers = GOVERNMINT_CHAMBERS[at(6)];
  const electoralSystem = GOVERNMINT_ELECTORAL[at(7)];
  return legislature && chambers && electoralSystem ? { legislature, chambers, electoralSystem } : null;
}

export interface GovernmentStart {
  /** The legislature's name, if Governmint has one. */
  chamber: string;
  /** The Seats system to start from, when the Governmint link could be read. */
  system: SystemId | null;
  /** What Governmint says about the legislature, when its link could be read. */
  governmint: GovernmintLegislature | null;
}

/**
 * A place to start from the profile's "government" section: the legislature's name, and the
 * system that matches Governmint's electoral setting. Legislatures that are not elected
 * (appointed, advisory, all citizens, none) start with seats entered directly.
 */
export function fromGovernment(government: unknown): GovernmentStart | null {
  const g = record(government);
  const chamber = cleanText(g.legislature, MAX_TITLE);
  const explicit = typeof g.electoralSystem === 'string' && g.electoralSystem in GOVERNMINT_SYSTEMS ? (g.electoralSystem as GovernmintSystem) : null;
  const governmint = readGovernmintLink(g.link);
  if (!chamber && !governmint && !explicit) return null;
  const elected = !governmint || governmint.legislature === 'elected' || governmint.legislature === 'partly-elected';
  const electoral = explicit ?? governmint?.electoralSystem ?? null;
  return { chamber, system: electoral ? (elected ? GOVERNMINT_SYSTEMS[electoral] : 'direct') : null, governmint };
}

/** An election with the start from Governmint applied: the name if it has none yet, and the system. */
export function startFromGovernment(election: Election, start: GovernmentStart | null): Election {
  if (!start) return election;
  return cleanElection({
    ...election,
    chamber: election.chamber || start.chamber,
    system: start.system ?? election.system,
  });
}
