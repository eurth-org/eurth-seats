/**
 * An election lives in its link. This is the compact form that goes into the query string:
 * short keys, defaults left out, parties as small arrays. It is wrapped by @eurth/style's
 * encodeState(value, LINK_VERSION), which gives "?d=1.<base64url JSON>".
 *
 * Whatever comes back out of a link goes through cleanElection: it is someone else's input.
 *
 * Version 1:
 *   n  chamber name            e  election label        s  size
 *   y  system (two letters)    t  threshold, percent    b  bonus seats
 *   m  mixed mode (c or p)     f  list formula          u  "c" when votes are counts
 *   l  layout (w or u)         c  coalition, indices
 *   p  parties: [name, colour without #, votes, seats]
 *
 * To change the format: raise LINK_VERSION, and keep reading every older version.
 */
import { decodeState, encodeState } from '@eurth/style';
import { cleanElection, type Election, type FormulaId, type Layout, type MixedMode, type SystemId } from './model';

export const LINK_VERSION = 1;

const SYSTEM_CODES: Record<SystemId, string> = {
  dhondt: 'dh',
  'sainte-lague': 'sl',
  'modified-sainte-lague': 'ms',
  hare: 'ha',
  droop: 'dr',
  direct: 'di',
  mixed: 'mx',
};
const LAYOUT_CODES: Record<Layout, string> = { hemicycle: 'h', westminster: 'w', horseshoe: 'u' };
const MODE_CODES: Record<MixedMode, string> = { compensatory: 'c', parallel: 'p' };

const decode = <T extends string>(codes: Record<T, string>, value: unknown): T | undefined =>
  (Object.keys(codes) as T[]).find((key) => codes[key] === value);

export type Compact = Record<string, unknown>;

/** The election, as small as it will go. */
export function toCompact(election: Election): Compact {
  const out: Compact = {};
  if (election.chamber) out.n = election.chamber;
  if (election.election) out.e = election.election;
  out.s = election.size;
  out.y = SYSTEM_CODES[election.system];
  if (election.threshold > 0) out.t = election.threshold;
  if (election.bonus > 0) out.b = election.bonus;
  if (election.system === 'mixed') {
    out.m = MODE_CODES[election.mixedMode];
    out.f = SYSTEM_CODES[election.listFormula];
  }
  if (election.votesAs === 'counts') out.u = 'c';
  if (election.layout !== 'hemicycle') out.l = LAYOUT_CODES[election.layout];
  if (election.coalition.length > 0) out.c = election.coalition;
  out.p = election.parties.map((p) => {
    const party: (string | number)[] = [p.name, p.colour.slice(1), p.votes];
    if (p.seats > 0) party.push(p.seats);
    return party;
  });
  return out;
}

/**
 * An election from its compact form. Never throws: anything missing or wrong falls back to
 * the default for that field. Returns null only when the value is not a compact election at
 * all, or comes from a version this code does not know.
 */
export function fromCompact(value: unknown, version: number = LINK_VERSION): Election | null {
  if (version !== 1 || !value || typeof value !== 'object' || Array.isArray(value)) return null;
  const o = value as Compact;
  const parties = (Array.isArray(o.p) ? o.p : []).map((p) => {
    const [name, colour, votes, seats] = Array.isArray(p) ? p : [];
    return { name, colour, votes, seats };
  });
  return cleanElection({
    chamber: o.n,
    election: o.e,
    size: o.s,
    system: decode(SYSTEM_CODES, o.y),
    threshold: o.t,
    bonus: o.b,
    mixedMode: decode(MODE_CODES, o.m),
    listFormula: decode(SYSTEM_CODES, o.f) as FormulaId | undefined,
    votesAs: o.u === 'c' ? 'counts' : 'percent',
    layout: decode(LAYOUT_CODES, o.l),
    coalition: o.c,
    parties,
  });
}

/** The value of the link's "d" parameter for this election: "1.<base64url JSON>". */
export function encodeElection(election: Election): string {
  return encodeState(toCompact(election), LINK_VERSION);
}

/** The election's whole link, on this address: "https://seats.eurth.org/?d=1.…". */
export function electionLink(election: Election, base: string): string {
  const url = new URL(base);
  url.search = '';
  url.hash = '';
  url.searchParams.set('d', encodeElection(election));
  return url.toString();
}

/** The election in a link made by electionLink, or null when the link holds none that this code can read. */
export function electionFromLink(link: unknown): Election | null {
  if (typeof link !== 'string' || link.length > 12_000) return null;
  let state: string | null;
  try {
    state = new URL(link).searchParams.get('d');
  } catch {
    return null;
  }
  const decoded = decodeState(state);
  return decoded ? fromCompact(decoded.value, decoded.version) : null;
}
