/**
 * Pictures for the written pages, drawn at build time by the calculator's own code: an
 * election in, its chamber out, with the words that describe it and the link that opens it
 * in the calculator. A guide that shows what it explains can never drift from the tool.
 */
import { description } from '../seats/describe';
import { encodeElection } from '../seats/link';
import { cleanElection, type Election } from '../seats/model';
import { chamberPicture, svgAddress } from '../seats/picture';
import { count, type Outcome } from '../seats/results';

export interface Illustration {
  /** The picture, as the address of an image: 1200 by 630. */
  src: string;
  /** What it shows, in words. */
  alt: string;
  /** Opens this election in the calculator. */
  href: string;
  election: Election;
  outcome: Outcome;
}

/** The chamber of an election as a picture for a page. Anything cleanElection accepts will do. */
export function illustrate(input: unknown, change: Partial<Election> = {}): Illustration {
  const election = cleanElection({ ...cleanElection(input), ...change });
  const outcome = count(election);
  return {
    src: svgAddress(chamberPicture(election, outcome, { frame: { width: 1200, height: 630 } })),
    alt: description(election, outcome),
    href: `/?d=${encodeElection(election)}`,
    election,
    outcome,
  };
}
