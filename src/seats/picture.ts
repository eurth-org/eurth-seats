/**
 * The chamber picture in the suite's colours. A picture that leaves the site can't use the
 * stylesheet's custom properties, so its colours are read from the same tokens as plain
 * values (HANDBOOK.md, Look).
 */
import { resolveColors } from '@eurth/style';
import tokens from '@eurth/style/tokens.json';
import { blocksOf, drawChamber } from './chamber';
import { chamberDescription } from './describe';
import type { Election } from './model';
import { renderSvg } from './render';
import { systemCaption, type Outcome } from './results';

export type Theme = 'light' | 'dark';

export interface PictureOptions {
  /** Night (dark) by default: the suite's own look. */
  theme?: Theme;
  /** A fixed size to fit into, such as 1200 by 630. Without it, the picture's natural size. */
  frame?: { width: number; height: number };
  /** Leave the background out, for a picture laid on something else. */
  transparent?: boolean;
  id?: string;
}

/** The second line of the picture: "Election 2026 · D'Hondt, 5% threshold". */
export function pictureSubtitle(election: Election): string {
  return [election.election, systemCaption(election)].filter(Boolean).join(' · ');
}

/** The chamber of this result as a standalone SVG, with its title, key and text alternative. */
export function chamberPicture(election: Election, outcome: Outcome, options: PictureOptions = {}): string {
  const colours = resolveColors(tokens, options.theme ?? 'dark');
  const chamber = drawChamber(election.layout, blocksOf(outcome), election.coalition);
  return renderSvg(chamber, {
    parties: outcome.parties.map((p) => ({ name: p.name, colour: p.colour, seats: p.seats })),
    total: outcome.total,
    majority: outcome.majority,
    title: election.chamber || undefined,
    subtitle: pictureSubtitle(election),
    description: chamberDescription(election, outcome),
    ink: colours.ink,
    muted: colours['ink-muted'],
    paper: options.transparent ? null : colours.surface,
    frame: options.frame,
    id: options.id,
  });
}

/** An SVG as the address of an image, for an <img>. */
export const svgAddress = (svg: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
