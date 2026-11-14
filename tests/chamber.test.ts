import { describe, expect, it } from 'vitest';
import { blocksOf, CANVAS, drawChamber, rowsFor, type Block, type Chamber } from '../src/seats/chamber';
import { chamberDescription } from '../src/seats/describe';
import { cleanElection, defaultElection, LAYOUTS } from '../src/seats/model';
import { escapeXml, renderSvg } from '../src/seats/render';
import { count } from '../src/seats/results';

const teland = defaultElection();
const outcome = count(teland);
const blocks = blocksOf(outcome);
const one = (seats: number): Block[] => [{ party: 0, seats }];

/** The smallest distance between two seat centres. */
function closest(chamber: Chamber): number {
  let best = Infinity;
  const s = chamber.seats;
  for (let a = 0; a < s.length; a++) {
    for (let b = a + 1; b < s.length; b++) {
      const d = Math.hypot(s[a]!.x - s[b]!.x, s[a]!.y - s[b]!.y);
      if (d < best) best = d;
    }
  }
  return best;
}

describe('blocks to draw', () => {
  it('are the parties with seats in list order, then the vacant seats', () => {
    expect(blocks).toEqual([
      { party: 0, seats: 33 },
      { party: 1, seats: 22 },
      { party: 2, seats: 41 },
      { party: 3, seats: 14 },
      { party: 4, seats: 10 },
    ]);
    const partly = count(cleanElection({ size: 10, system: 'direct', parties: [{ seats: 0 }, { seats: 4 }] }));
    expect(blocksOf(partly)).toEqual([
      { party: 1, seats: 4 },
      { party: -1, seats: 6 },
    ]);
  });
});

describe('every layout', () => {
  const sizes = [1, 2, 3, 4, 5, 7, 15, 16, 34, 35, 60, 99, 100, 101, 120, 150, 349, 465, 650, 733];

  it('draws exactly one seat per seat, in filling order', () => {
    for (const layout of LAYOUTS) {
      for (const n of [...sizes, 1500, 3000]) {
        const chamber = drawChamber(layout, one(n));
        expect(chamber.seats, `${layout} ${n}`).toHaveLength(n);
        expect(chamber.seats.map((s) => s.order)).toEqual(Array.from({ length: n }, (_, i) => i));
      }
    }
  });

  it('never lets two seats overlap, and keeps them all on the canvas', () => {
    for (const layout of LAYOUTS) {
      for (const n of sizes) {
        const chamber = drawChamber(layout, [{ party: 0, seats: Math.ceil(n * 0.55) }, { party: 1, seats: Math.floor(n * 0.45) }]);
        if (n > 1) expect(closest(chamber), `${layout} ${n}`).toBeGreaterThanOrEqual(chamber.radius * 2 * 0.999);
        for (const seat of chamber.seats) {
          expect(seat.x - chamber.radius, `${layout} ${n}`).toBeGreaterThanOrEqual(0);
          expect(seat.x + chamber.radius, `${layout} ${n}`).toBeLessThanOrEqual(chamber.width);
          expect(seat.y - chamber.radius, `${layout} ${n}`).toBeGreaterThanOrEqual(0);
          expect(seat.y + chamber.radius, `${layout} ${n}`).toBeLessThanOrEqual(chamber.height);
        }
      }
    }
  });

  it('gives each party its seats, as one run', () => {
    for (const layout of LAYOUTS) {
      const chamber = drawChamber(layout, blocks, [1, 2]);
      const counts = new Map<number, number>();
      for (const seat of chamber.seats) counts.set(seat.party, (counts.get(seat.party) ?? 0) + 1);
      expect(Object.fromEntries(counts), layout).toEqual({ 0: 33, 1: 22, 2: 41, 3: 14, 4: 10 });
      const runs = chamber.seats.map((s) => s.party).filter((p, i, all) => i === 0 || p !== all[i - 1]);
      expect(runs, layout).toHaveLength(5);
    }
  });

  it('draws an empty chamber as nothing at all, without falling over', () => {
    for (const layout of LAYOUTS) {
      const chamber = drawChamber(layout, []);
      expect(chamber.seats).toEqual([]);
      expect(Number.isFinite(chamber.height) && chamber.height > 0).toBe(true);
    }
  });

  it('is 1,000 units wide', () => {
    for (const layout of LAYOUTS) expect(drawChamber(layout, blocks).width).toBe(CANVAS);
  });
});

describe('the hemicycle', () => {
  const chamber = drawChamber('hemicycle', blocks);

  it('uses as few rows as will hold the seats', () => {
    expect([1, 4, 5, 15, 16, 34, 35].map((n) => rowsFor(n))).toEqual([1, 1, 2, 2, 3, 3, 4]);
    expect(chamber.rows).toBe(6);
    expect(drawChamber('hemicycle', one(650)).rows).toBe(13);
  });

  it('is symmetrical: every seat has a mirror image', () => {
    for (const n of [7, 120, 349]) {
      const seats = drawChamber('hemicycle', one(n)).seats;
      for (const seat of seats) {
        expect(seats.some((other) => Math.abs(other.x - (CANVAS - seat.x)) < 0.05 && Math.abs(other.y - seat.y) < 0.05), `${n}`).toBe(true);
      }
    }
  });

  it('seats the parties from left to right', () => {
    const middle = (party: number): number => {
      const xs = chamber.seats.filter((s) => s.party === party).map((s) => s.x);
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    };
    const middles = [0, 1, 2, 3, 4].map(middle);
    expect([...middles].sort((a, b) => a - b)).toEqual(middles);
    // The first seat to fill is at the foot of the arch on the left; the last, on the right.
    expect(chamber.seats[0]!.x).toBeLessThan(100);
    expect(chamber.seats[119]!.x).toBeGreaterThan(900);
  });

  it('draws the majority line down the middle, with half the seats on either side', () => {
    expect(chamber.marks).toHaveLength(1);
    const line = chamber.marks[0]!;
    expect(line.x1).toBe(500);
    expect(line.x2).toBe(500);
    expect(line.y1).toBeLessThan(line.y2);
    const leftOf = chamber.seats.filter((s) => s.x < 499.9).length;
    const rightOf = chamber.seats.filter((s) => s.x > 500.1).length;
    expect(leftOf).toBe(rightOf);
    // A party past the line has a majority: the 61st seat to fill is on or past the middle.
    expect(chamber.seats[60]!.x).toBeGreaterThanOrEqual(499.9);
    expect(chamber.seats[58]!.x).toBeLessThan(500.1);
  });

  it('leaves the floor open for a label', () => {
    expect(chamber.floor).not.toBeNull();
    expect(chamber.floor!.x).toBe(500);
    const { x, y, width } = chamber.floor!;
    for (const seat of chamber.seats) {
      const inside = Math.abs(seat.x - x) < width / 2 && Math.abs(seat.y - y) < 40;
      expect(inside).toBe(false);
    }
  });
});

describe('the horseshoe', () => {
  const chamber = drawChamber('horseshoe', blocks);

  it('is taller than the hemicycle: it stands on two straight arms', () => {
    expect(chamber.height).toBeGreaterThan(drawChamber('hemicycle', blocks).height * 1.3);
    const lowest = Math.max(...chamber.seats.map((s) => s.y));
    const feet = chamber.seats.filter((s) => s.y > lowest - 0.05);
    // The feet of the arms are on the outside: left and right, nothing in the middle.
    expect(feet.every((s) => s.x < 350 || s.x > 650)).toBe(true);
    // Seats on the arms sit straight above one another.
    const column = chamber.seats.filter((s) => Math.abs(s.x - feet[0]!.x) < 0.05);
    expect(column.length).toBeGreaterThan(2);
  });

  it('fills from the foot of the left arm round to the foot of the right', () => {
    expect(chamber.seats[0]!.x).toBeLessThan(300);
    expect(chamber.seats[0]!.y).toBeGreaterThan(chamber.height * 0.8);
    expect(chamber.seats[119]!.x).toBeGreaterThan(700);
    expect(chamber.marks[0]!.x1).toBe(500);
  });
});

describe('the Westminster layout', () => {
  const aisle = (chamber: Chamber): number => chamber.height / 2;

  it('puts the largest party on the government benches when no coalition is picked', () => {
    const chamber = drawChamber('westminster', blocks);
    const above = new Set(chamber.seats.filter((s) => s.y < aisle(chamber)).map((s) => s.party));
    const below = new Set(chamber.seats.filter((s) => s.y > aisle(chamber)).map((s) => s.party));
    expect([...above]).toEqual([2]);
    expect([...below].sort()).toEqual([0, 1, 3, 4]);
  });

  it('puts the picked coalition on the government benches', () => {
    const chamber = drawChamber('westminster', blocks, [1, 2]);
    const above = new Set(chamber.seats.filter((s) => s.y < aisle(chamber)).map((s) => s.party));
    expect([...above].sort()).toEqual([1, 2]);
    expect(chamber.seats.filter((s) => s.y < aisle(chamber))).toHaveLength(63);
    // Government first in the filling order, then the opposition.
    expect(chamber.seats.slice(0, 63).every((s) => s.y < aisle(chamber))).toBe(true);
  });

  it('ignores picks that hold no seats, and seats vacancies with the opposition', () => {
    const partly = count(cleanElection({ size: 20, system: 'direct', parties: [{ seats: 9 }, { seats: 6 }, { seats: 0 }] }));
    const chamber = drawChamber('westminster', blocksOf(partly), [2, 7]);
    const above = chamber.seats.filter((s) => s.y < aisle(chamber));
    expect(new Set(above.map((s) => s.party))).toEqual(new Set([0]));
    expect(chamber.seats.filter((s) => s.party === -1 && s.y > aisle(chamber))).toHaveLength(5);
  });

  it('has benches in straight rows and no majority line or floor label', () => {
    const chamber = drawChamber('westminster', blocks);
    expect(chamber.marks).toEqual([]);
    expect(chamber.floor).toBeNull();
    expect(new Set(chamber.seats.map((s) => s.y)).size).toBe(chamber.rows * 2);
    // Both banks start at the Speaker's end, on the left.
    expect(chamber.seats[0]!.x).toBe(Math.min(...chamber.seats.map((s) => s.x)));
  });
});

describe('the picture', () => {
  const parties = teland.parties.map((p, i) => ({ name: p.name, colour: p.colour, seats: outcome.parties[i]!.seats }));
  const options = { parties, total: outcome.total, majority: outcome.majority, title: teland.chamber, subtitle: 'Election 2026', description: chamberDescription(teland, outcome) };
  const svg = renderSvg(drawChamber('hemicycle', blocks), options);

  /** True when every tag that opens is closed, in order. */
  const wellFormed = (markup: string): boolean => {
    const stack: string[] = [];
    for (const tag of markup.match(/<[^>]+>/g) ?? []) {
      if (tag.endsWith('/>')) continue;
      const name = /^<\/?([A-Za-z]+)/.exec(tag)?.[1] ?? '';
      if (tag.startsWith('</')) {
        if (stack.pop() !== name) return false;
      } else stack.push(name);
    }
    return stack.length === 0;
  };

  it('is one well-formed SVG with a title and a description for screen readers', () => {
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(wellFormed(svg)).toBe(true);
    expect(svg).toContain('role="img" aria-labelledby="seats-title seats-desc"');
    expect(svg).toContain('<title id="seats-title">National Assembly of Teland</title>');
    expect(svg).toContain('<desc id="seats-desc">A hemicycle chamber of 120 seats. From left to right: National Labour 33,');
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('draws a circle per seat, plus one per party in the key', () => {
    expect(svg.match(/<circle /g)).toHaveLength(120 + 5);
  });

  it('names every party with seats beside its colour, and leaves out those without', () => {
    for (const p of parties.filter((x) => x.seats > 0)) {
      expect(svg).toContain(`${p.name} <tspan font-weight="700">${p.seats}</tspan>`);
      expect(svg).toContain(`<g fill="${p.colour}"`);
      expect(svg).toContain(`<title>${p.name}: ${p.seats} seats</title>`);
    }
    expect(svg).not.toContain('Pirate Party');
  });

  it('writes the size of the chamber and the majority on the floor', () => {
    expect(svg).toContain('>120</text>');
    expect(svg).toContain('seats · 61 for a majority');
    expect(svg).toContain('stroke-dasharray');
    const benches = renderSvg(drawChamber('westminster', blocks), options);
    expect(benches).toContain('120 seats · 61 for a majority');
    expect(benches).not.toContain('stroke-dasharray');
    expect(wellFormed(benches)).toBe(true);
  });

  it('uses only the device\'s own fonts', () => {
    expect(svg).toContain('font-family="system-ui, Arial, sans-serif"');
    expect(svg.match(/font-family/g)).toHaveLength(1);
  });

  it('takes the theme\'s colours, and can go without a background', () => {
    const night = renderSvg(drawChamber('hemicycle', blocks), { ...options, ink: '#fcf6e1', muted: '#bac1b5', paper: '#002b36' });
    expect(night).toContain('<rect width="1000"');
    expect(night).toContain('fill="#002b36"');
    expect(night).toContain('fill="#fcf6e1"');
    expect(renderSvg(drawChamber('hemicycle', blocks), { ...options, paper: null })).not.toContain('<rect');
    // Anything that is not a six-digit hex colour is replaced, never written into the markup.
    const odd = renderSvg(drawChamber('hemicycle', blocks), { ...options, ink: 'red" onload="x', paper: 'url(#a)' });
    expect(odd).not.toContain('onload');
    expect(odd).not.toContain('url(');
  });

  it('fits itself into a frame for sharing sizes', () => {
    for (const [width, height] of [[1200, 630], [1080, 1080], [1080, 1350], [1080, 1920], [1000, 1500], [1600, 900]] as const) {
      for (const layout of LAYOUTS) {
        const framed = renderSvg(drawChamber(layout, blocks), { ...options, frame: { width, height } });
        expect(framed).toContain(`viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"`);
        expect(wellFormed(framed)).toBe(true);
        const scale = Number(/scale\(([\d.]+)\)/.exec(framed)![1]);
        const [tx, ty] = /translate\(([\d.]+) ([\d.]+)\) scale/.exec(framed)!.slice(1).map(Number) as [number, number];
        expect(scale).toBeGreaterThan(0.3);
        expect(tx).toBeGreaterThan(0);
        expect(ty).toBeGreaterThan(0);
        expect(tx + 1000 * scale).toBeLessThanOrEqual(width);
      }
    }
  });

  it('shows vacant seats as empty rings, with a word in the key', () => {
    const partly = count(cleanElection({ size: 10, system: 'direct', parties: [{ name: 'A', seats: 4 }] }));
    const drawn = renderSvg(drawChamber('hemicycle', blocksOf(partly)), { parties: [{ name: 'A', colour: '#2698d4', seats: 4 }], total: 10, majority: 6 });
    expect(drawn).toContain('<g fill="none"');
    expect(drawn).toContain('<title>Vacant: 6 seats</title>');
    expect(drawn).toContain('Vacant <tspan font-weight="700">6</tspan>');
    expect(drawn).toContain('<title id="seats-title">Seats in the chamber</title>');
  });

  it('keeps names from becoming markup, and long ones from running off the picture', () => {
    expect(escapeXml(`<a href="x">Tom & Jerry's</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;');
    const e = { parties: [{ name: 'Fish & Chips "Party"', colour: '#2698d4', seats: 3 }], total: 3, majority: 2, title: 'A & B', id: 'x y<z' };
    const drawn = renderSvg(drawChamber('hemicycle', one(3)), e);
    expect(drawn).toContain('Fish &amp; Chips &quot;Party&quot;');
    expect(drawn).toContain('id="xyz-title"');
    expect(wellFormed(drawn)).toBe(true);
    const long = renderSvg(drawChamber('hemicycle', one(3)), { ...e, title: 'W'.repeat(80) });
    expect(long).toContain('…</text>');
  });

  it('is a reasonable size, even for the largest chamber', () => {
    const big = renderSvg(drawChamber('hemicycle', one(3000)), { parties: [{ name: 'Everyone', colour: '#2698d4', seats: 3000 }], total: 3000, majority: 1501 });
    expect(big.length).toBeLessThan(200_000);
    expect(big.match(/<circle /g)).toHaveLength(3001);
  });
});
