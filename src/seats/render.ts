/**
 * The chamber as a standalone SVG picture: a title, the seats, the majority line and a key
 * that names every party, so colour is never the only way to tell them apart.
 *
 * The picture carries its own colours, because it leaves the site: it is downloaded, pasted
 * into wikis and turned into PNG and WebP. The site passes in the theme's token values; the
 * defaults here are the light theme's.
 */
import type { Chamber } from './chamber';
import { formatNumber, seatWords } from './format';

export interface RenderParty {
  name: string;
  colour: string;
  seats: number;
}

export interface RenderOptions {
  /** Parties by index, as the chamber's seats refer to them. Those without seats are left out of the key. */
  parties: readonly RenderParty[];
  /** Seats in the chamber, and how many are a majority. */
  total: number;
  majority: number;
  /** The first line above the chamber, for example the chamber's name. */
  title?: string;
  /** The second line, for example "Election 2026 · D'Hondt, 5% threshold". */
  subtitle?: string;
  /** The text alternative: what the picture shows, in words. */
  description?: string;
  /** Text colour. */
  ink?: string;
  /** Colour of secondary text, seat outlines and the majority line. */
  muted?: string;
  /** Background colour, or null for none. */
  paper?: string | null;
  /** Draw the key of parties under the chamber. On by default. */
  key?: boolean;
  /** A fixed size to fit the picture into, for sharing sizes such as 1200 by 630. Without it the picture takes its natural size. */
  frame?: { width: number; height: number };
  /** Prefix for the ids inside the SVG, when several are on one page. */
  id?: string;
}

const FONT = 'system-ui, Arial, sans-serif';

export const escapeXml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const hex = (value: string | undefined | null, fallback: string): string => (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : fallback);
const num = (n: number): string => String(Math.round(n * 100) / 100);

/** A rough width for a run of text in the system font: good enough to wrap a key. */
const textWidth = (text: string, size: number, bold = false): number => [...text].length * size * (bold ? 0.6 : 0.55);

/** Cuts a line that would not fit, ending on an ellipsis. */
const fit = (text: string, size: number, width: number, bold = false): string => {
  const max = Math.max(4, Math.floor(width / (size * (bold ? 0.6 : 0.55))));
  const letters = [...text];
  return letters.length <= max ? text : `${letters.slice(0, max - 1).join('').trimEnd()}…`;
};

/** The chamber as SVG markup. */
export function renderSvg(chamber: Chamber, options: RenderOptions): string {
  const ink = hex(options.ink, '#222222');
  const muted = hex(options.muted, '#646464');
  const paper = options.paper === null ? null : hex(options.paper, '#ffffff');
  const id = (options.id ?? 'seats').replace(/[^A-Za-z0-9_-]/g, '') || 'seats';
  const width = chamber.width;
  const parts: string[] = [];
  let y = 0;

  // Title and subtitle.
  if (options.title) {
    y += 52;
    parts.push(`<text x="${width / 2}" y="${y}" text-anchor="middle" font-size="34" font-weight="700" fill="${ink}">${escapeXml(fit(options.title, 34, width - 40, true))}</text>`);
  }
  if (options.subtitle) {
    y += options.title ? 34 : 40;
    parts.push(`<text x="${width / 2}" y="${y}" text-anchor="middle" font-size="22" fill="${muted}">${escapeXml(fit(options.subtitle, 22, width - 40))}</text>`);
  }
  if (y > 0) y += 26;

  // The chamber.
  const stroke = num(Math.min(2.5, Math.max(1, chamber.radius * 0.09)));
  const drawing: string[] = [];
  for (const mark of chamber.marks) {
    drawing.push(`<line x1="${num(mark.x1)}" y1="${num(mark.y1)}" x2="${num(mark.x2)}" y2="${num(mark.y2)}" stroke="${muted}" stroke-width="3" stroke-dasharray="8 6"/>`);
  }
  const groups = new Map<number, string[]>();
  for (const seat of chamber.seats) {
    const list = groups.get(seat.party) ?? [];
    list.push(`<circle cx="${num(seat.x)}" cy="${num(seat.y)}" r="${num(chamber.radius - Number(stroke) / 2)}"/>`);
    groups.set(seat.party, list);
  }
  for (const [party, circles] of groups) {
    const info = options.parties[party];
    const label = info ? `${info.name}: ${seatWords(circles.length)}` : `Vacant: ${seatWords(circles.length)}`;
    const fill = info ? hex(info.colour, muted) : 'none';
    drawing.push(`<g fill="${fill}" stroke="${muted}" stroke-width="${stroke}"><title>${escapeXml(label)}</title>${circles.join('')}</g>`);
  }
  if (chamber.floor && chamber.floor.width >= 150) {
    const big = Math.min(96, chamber.floor.width * 0.3);
    const small = Math.max(15, Math.min(22, chamber.floor.width * 0.075));
    drawing.push(`<text x="${num(chamber.floor.x)}" y="${num(chamber.floor.y)}" text-anchor="middle" font-size="${num(big)}" font-weight="700" fill="${ink}">${formatNumber(options.total)}</text>`);
    drawing.push(`<text x="${num(chamber.floor.x)}" y="${num(chamber.floor.y + small * 1.7)}" text-anchor="middle" font-size="${num(small)}" fill="${muted}">seats · ${formatNumber(options.majority)} for a majority</text>`);
  } else {
    // No room on the floor (Westminster, or a very small arch): say it under the chamber.
    drawing.push(`<text x="${width / 2}" y="${num(chamber.height + 26)}" text-anchor="middle" font-size="20" fill="${muted}">${seatWords(options.total)} · ${formatNumber(options.majority)} for a majority</text>`);
  }
  parts.push(`<g transform="translate(0 ${num(y)})">${drawing.join('')}</g>`);
  y += chamber.height + (chamber.floor && chamber.floor.width >= 150 ? 0 : 38);

  // The key: a dot, the name and the seats for every party in the chamber, in the order drawn.
  if (options.key !== false) {
    const size = 22;
    const entries = [...groups.keys()].map((party) => {
      const info = options.parties[party];
      const name = fit(info ? info.name : 'Vacant', size, width * 0.6);
      const label = `${name} ${formatNumber(groups.get(party)!.length)}`;
      return { fill: info ? hex(info.colour, muted) : 'none', name, seats: groups.get(party)!.length, width: 34 + textWidth(label, size) + 12 };
    });
    const gap = 28;
    const lines: (typeof entries)[] = [];
    for (const entry of entries) {
      const line = lines[lines.length - 1];
      const used = line ? line.reduce((sum, e) => sum + e.width + gap, 0) : Infinity;
      if (!line || used + entry.width > width - 40) lines.push([entry]);
      else line.push(entry);
    }
    y += 30;
    for (const line of lines) {
      const used = line.reduce((sum, e) => sum + e.width, 0) + gap * (line.length - 1);
      let x = (width - used) / 2;
      for (const entry of line) {
        parts.push(
          `<circle cx="${num(x + 11)}" cy="${num(y - 7)}" r="10" fill="${entry.fill}" stroke="${muted}" stroke-width="1.5"/>` +
            `<text x="${num(x + 34)}" y="${num(y)}" font-size="${size}" fill="${ink}">${escapeXml(entry.name)} <tspan font-weight="700">${formatNumber(entry.seats)}</tspan></text>`,
        );
        x += entry.width + gap;
      }
      y += 36;
    }
    y -= 10;
  }
  const height = Math.ceil(y + 20);

  const label = options.title || 'Seats in the chamber';
  const frame = options.frame;
  const outer = frame ? { width: Math.round(frame.width), height: Math.round(frame.height) } : { width, height };
  let content = parts.join('');
  if (frame) {
    // Fit the natural picture into the frame, with a margin, in the middle.
    const margin = Math.min(outer.width, outer.height) * 0.06;
    const scale = Math.min((outer.width - 2 * margin) / width, (outer.height - 2 * margin) / height);
    const tx = (outer.width - width * scale) / 2;
    const ty = (outer.height - height * scale) / 2;
    content = `<g transform="translate(${num(tx)} ${num(ty)}) scale(${Math.round(scale * 10000) / 10000})">${content}</g>`;
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${outer.width} ${outer.height}" width="${outer.width}" height="${outer.height}" role="img" aria-labelledby="${id}-title${options.description ? ` ${id}-desc` : ''}" font-family="${FONT}">` +
    `<title id="${id}-title">${escapeXml(label)}</title>` +
    (options.description ? `<desc id="${id}-desc">${escapeXml(options.description)}</desc>` : '') +
    (paper ? `<rect width="${outer.width}" height="${outer.height}" fill="${paper}"/>` : '') +
    content +
    `</svg>`
  );
}
