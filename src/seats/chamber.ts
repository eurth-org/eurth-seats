/**
 * Where every seat goes: the geometry of the three chambers.
 *
 * Hemicycle: rows of an arch, as in Wikipedia's parliament diagrams. Seats are filled in order
 * of their angle, so each party is a wedge and the parties run from left to right.
 *
 * Horseshoe: the same arch on two straight arms, open at the bottom.
 *
 * Westminster: two banks of benches facing each other across an aisle, the government above
 * and the opposition below, both filling from the Speaker's end on the left.
 *
 * Everything is worked out on a canvas 1,000 units wide; the height follows from the layout.
 * `order` is the order in which seats fill in: party by party, left to right.
 */
import type { Layout } from './model';
import type { Outcome } from './results';

/** A run of seats for one party. Party -1 is a vacant seat. */
export interface Block {
  party: number;
  seats: number;
}

export interface Seat {
  x: number;
  y: number;
  /** Index of the party, or -1 for a vacant seat. */
  party: number;
  /** Place in the filling order, from 0. */
  order: number;
}

export interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Chamber {
  layout: Layout;
  width: number;
  height: number;
  /** Radius of one seat. */
  radius: number;
  /** Rows of seats: per arch, or per bank of benches. */
  rows: number;
  seats: Seat[];
  /** The majority line: the middle of the arch. Empty for Westminster, where the benches show it. */
  marks: Line[];
  /** The middle of the open floor, where a label fits, and how wide it may be. Null for Westminster. */
  floor: { x: number; y: number; width: number } | null;
}

export const CANVAS = 1000;
const PAD = 8;
/** Length of the horseshoe's straight arms, where the arch's outer radius is 1.75. */
const ARMS = 1.1;

const round = (n: number): number => Math.round(n * 100) / 100;

/** The blocks to draw for a result: parties with seats in list order, then any vacant seats. */
export function blocksOf(outcome: Outcome): Block[] {
  const blocks = outcome.parties.filter((p) => p.seats > 0).map((p) => ({ party: p.index, seats: p.seats }));
  if (outcome.vacant > 0) blocks.push({ party: -1, seats: outcome.vacant });
  return blocks;
}

const total = (blocks: readonly Block[]): number => blocks.reduce((sum, b) => sum + Math.max(0, Math.floor(b.seats)), 0);

/** One party index per seat, in filling order. */
const sequence = (blocks: readonly Block[]): number[] => blocks.flatMap((b) => Array.from({ length: Math.max(0, Math.floor(b.seats)) }, () => b.party));

interface Row {
  /** Radius of the row's arc. */
  radius: number;
  /** Length of the row's whole path: up one arm, round the arc, down the other. */
  length: number;
  capacity: number;
}

/** The rows of an arch with this many rows, in units where the outer radius is about 1.75. */
function archRows(rows: number, arms: number): Row[] {
  const seat = 0.4 / rows;
  const gap = 1 / rows;
  return Array.from({ length: rows }, (_, i) => {
    const radius = (3 * rows + 4 * (i + 1) - 2) / (4 * rows);
    const length = 2 * arms + Math.PI * radius;
    return { radius, length, capacity: Math.floor((length - 2 * seat) / gap + 1e-9) + 1 };
  });
}

/** The fewest rows that hold this many seats. */
export function rowsFor(seats: number, arms = 0): number {
  let rows = 1;
  while (archRows(rows, arms).reduce((sum, r) => sum + r.capacity, 0) < seats) rows++;
  return rows;
}

/** Shares `seats` over rows in proportion to what each can hold (largest remainder), never overfilling one. */
function spread(seats: number, capacities: readonly number[]): number[] {
  const room = capacities.reduce((a, b) => a + b, 0);
  const exact = capacities.map((c) => (seats * c) / room);
  const counts = exact.map(Math.floor);
  const order = exact.map((e, i) => ({ i, rest: e - Math.floor(e) })).sort((a, b) => b.rest - a.rest || b.i - a.i);
  let left = seats - counts.reduce((a, b) => a + b, 0);
  for (const { i } of order) {
    if (left === 0) break;
    if (counts[i]! < capacities[i]!) {
      counts[i]!++;
      left--;
    }
  }
  return counts;
}

function arch(layout: 'hemicycle' | 'horseshoe', blocks: readonly Block[]): Chamber {
  const n = total(blocks);
  const arms = layout === 'horseshoe' ? ARMS : 0;
  const rowCount = rowsFor(Math.max(1, n), arms);
  const rows = archRows(rowCount, arms);
  const seat = 0.4 / rowCount;
  const outer = rows[rowCount - 1]!.radius + seat;
  const inner = rows[0]!.radius - seat;
  // Headroom above the arch for the end of the majority line.
  const head = seat * 1.6;
  const scale = (CANVAS - 2 * PAD) / (2 * outer);
  const px = (x: number): number => round(PAD + (x + outer) * scale);
  const py = (y: number): number => round(PAD + (outer + head - y) * scale);

  const counts = spread(n, rows.map((r) => r.capacity));
  const placed: { x: number; y: number; t: number; row: number }[] = [];
  rows.forEach((row, r) => {
    const count = counts[r]!;
    for (let k = 0; k < count; k++) {
      // Distance along the row's path, from the foot of the left arm to the foot of the right.
      const along = count === 1 ? row.length / 2 : seat + (k * (row.length - 2 * seat)) / (count - 1);
      let x: number;
      let y: number;
      if (along < arms) {
        x = -row.radius;
        y = along - arms;
      } else if (along <= arms + Math.PI * row.radius) {
        const angle = Math.PI - (along - arms) / row.radius;
        x = row.radius * Math.cos(angle);
        y = row.radius * Math.sin(angle);
      } else {
        x = row.radius;
        y = -(along - arms - Math.PI * row.radius);
      }
      placed.push({ x: px(x), y: py(y), t: along / row.length, row: r });
    }
  });
  // Filling order: by how far round the arch a seat is, so each party becomes a wedge.
  placed.sort((a, b) => a.t - b.t || b.row - a.row);
  const parties = sequence(blocks);
  const seats = placed.map((p, order) => ({ x: p.x, y: p.y, party: parties[order] ?? -1, order }));

  const centre = px(0);
  return {
    layout,
    width: CANVAS,
    height: round(2 * PAD + (outer + head + arms) * scale),
    radius: round(seat * scale),
    rows: rowCount,
    seats,
    marks: [{ x1: centre, y1: py(outer + head), x2: centre, y2: py(inner - seat * 0.8) }],
    floor: {
      x: centre,
      y: layout === 'horseshoe' ? py(inner * 0.1 - arms / 2) : py(inner * 0.32),
      width: round(inner * 2 * scale * (layout === 'horseshoe' ? 0.86 : 0.8)),
    },
  };
}

function westminster(blocks: readonly Block[], government: ReadonlySet<number>): Chamber {
  const above = blocks.filter((b) => government.has(b.party));
  const below = blocks.filter((b) => !government.has(b.party));
  const most = Math.max(1, total(above), total(below));
  const rows = Math.max(1, Math.min(12, Math.round(Math.sqrt(most / 5))));
  const columns = Math.ceil(most / rows);
  const cell = Math.min(48, (CANVAS - 2 * PAD) / columns);
  const aisle = cell * 1.4;
  const left = (CANVAS - columns * cell) / 2;
  const floorTop = PAD + rows * cell;

  const seats: Seat[] = [];
  const bank = (side: readonly Block[], y: (row: number) => number): void => {
    sequence(side).forEach((party, j) => {
      // Column by column from the Speaker's end; within a column, from the aisle outwards.
      seats.push({ x: round(left + (Math.floor(j / rows) + 0.5) * cell), y: round(y(j % rows)), party, order: seats.length });
    });
  };
  bank(above, (row) => floorTop - (row + 0.5) * cell);
  bank(below, (row) => floorTop + aisle + (row + 0.5) * cell);

  return {
    layout: 'westminster',
    width: CANVAS,
    height: round(2 * PAD + 2 * rows * cell + aisle),
    radius: round(cell * 0.4),
    rows,
    seats,
    marks: [],
    floor: null,
  };
}

/**
 * Places every seat.
 * @param blocks parties in the order they sit, left to right (see blocksOf)
 * @param government Westminster only: the parties on the government benches. If none of them
 *   has a seat, the largest party governs alone.
 */
export function drawChamber(layout: Layout, blocks: readonly Block[], government: readonly number[] = []): Chamber {
  const seated = blocks.filter((b) => b.seats > 0);
  if (layout !== 'westminster') return arch(layout, seated);
  let side = new Set(government.filter((i) => seated.some((b) => b.party === i && i >= 0)));
  if (side.size === 0) {
    const parties = seated.filter((b) => b.party >= 0);
    const largest = parties.reduce<Block | null>((best, b) => (best === null || b.seats > best.seats ? b : best), null);
    side = new Set(largest ? [largest.party] : []);
  }
  return westminster(seated, side);
}
