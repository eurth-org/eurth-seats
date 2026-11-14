/**
 * Results pasted from a spreadsheet: one party per line, its name and its votes, and optionally
 * the seats it won. Columns may be separated by tabs (as spreadsheets copy them), semicolons or
 * commas, or just by space before the number.
 *
 *   Liberal Union	331,000
 *   National Labour; 26.4%
 *   Civic Alliance, 179000, 22
 *
 * What is pasted is someone else's input: names are cleaned, numbers are clamped, and lines that
 * make no sense are skipped and counted.
 */
import { cleanText, MAX_NAME, MAX_PARTIES, MAX_SIZE, MAX_VOTES, type VotesAs } from './model';

export interface PastedParty {
  name: string;
  votes: number;
  /** Seats, when the paste had a third column. */
  seats: number | null;
}

export interface Pasted {
  parties: PastedParty[];
  /** Percentages if most numbers carried a % sign, or if the numbers look like shares of 100. */
  votesAs: VotesAs;
  /** True when at least one line had a seats column. */
  hasSeats: boolean;
  /** Lines that could not be read (a header row is not counted). */
  skipped: number;
  /** Lines left out because the list was full. */
  dropped: number;
}

/**
 * A number as people type it: "1,443,545", "1.443.545", "1 443 545", "1'443'545", "26.4", "26,4", "26.4%".
 * Null when it is not a number.
 */
export function readNumber(text: string): number | null {
  let t = text.trim().replace(/%$/, '').trim();
  // Spaces (also the narrow and non-breaking kinds) and apostrophes only ever group thousands.
  t = t.replace(/[\s   '’]/g, '');
  if (!/^\d[\d.,]*$/.test(t) && !/^[.,]\d+$/.test(t)) return null;
  const commas = (t.match(/,/g) ?? []).length;
  const dots = (t.match(/\./g) ?? []).length;
  const grouped = (separator: string): boolean => new RegExp(`^\\d{1,3}(\\${separator}\\d{3})+$`).test(t);
  let normal: string;
  if (commas > 0 && dots > 0) {
    // Both: whichever comes last is the decimal mark.
    const decimal = t.lastIndexOf(',') > t.lastIndexOf('.') ? ',' : '.';
    const thousands = decimal === ',' ? '.' : ',';
    normal = t.split(thousands).join('').replace(decimal, '.');
  } else if (commas + dots > 1) {
    // One kind, more than once: thousands ("1,443,545"), or nonsense.
    const separator = commas > 0 ? ',' : '.';
    if (!grouped(separator)) return null;
    normal = t.split(separator).join('');
  } else if (commas + dots === 1) {
    // One separator: thousands if it is followed by exactly three digits and the number does not
    // start with 0 ("12,345" is twelve thousand; "0,345" and "26,4" are decimals).
    const separator = commas > 0 ? ',' : '.';
    normal = grouped(separator) && !t.startsWith('0') ? t.replace(separator, '') : t.replace(separator, '.');
  } else {
    normal = t;
  }
  const value = Number(normal);
  return Number.isFinite(value) ? value : null;
}

const isNumber = (text: string): boolean => readNumber(text) !== null;

/** One line into its columns. */
function columns(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim());
  if (line.includes(';')) return line.split(';').map((c) => c.trim());
  // Commas may separate columns or group thousands. Take numbers from the right for as long as
  // they read as whole columns; "Party, 12,345" has one number, "Party, 12345, 41" has two.
  const quoted = /^\s*"((?:[^"]|"")*)"\s*,(.*)$/.exec(line);
  if (quoted) return [quoted[1]!.replace(/""/g, '"'), ...quoted[2]!.split(',').map((c) => c.trim())];
  if (line.includes(',')) {
    const raw = line.split(',');
    const name = (raw[0] ?? '').trim();
    const rest = raw.slice(1);
    if (rest.length > 0 && rest.every((c) => /^[\d.\s'’%]+$/.test(c) && c.trim() !== '')) {
      // All numeric after the name. A piece of exactly three digits, written straight after the
      // comma with no space, continues the number before it: "10,269,051, 202" is 10,269,051 and 202.
      const groups: string[] = [];
      for (const piece of rest) {
        const previous = groups[groups.length - 1];
        const last = previous?.split(',').pop() ?? '';
        if (previous !== undefined && /^\d{3}\s*$/.test(piece) && /^\d{1,3}$/.test(last) && !previous.startsWith('0')) {
          groups[groups.length - 1] = `${previous},${piece.trim()}`;
        } else {
          groups.push(piece.trim());
        }
      }
      return [name, ...groups];
    }
  }
  // No separator: the name, then space, then the number at the end of the line.
  const tail = /^(.*?)[\s:]+(\d[\d.,'’   ]*(?: \d{3})*\s*%?)$/.exec(line.trim());
  if (tail && tail[1]!.trim() !== '') return [tail[1]!.trim(), tail[2]!.trim()];
  return [line.trim()];
}

/** Reads pasted results. */
export function parsePaste(text: string): Pasted {
  const lines = String(text)
    .slice(0, 20_000)
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '');
  const rows: { name: string; votes: string; seats: string | undefined }[] = [];
  let skipped = 0;
  lines.forEach((line, n) => {
    const cells = columns(line);
    const name = cleanText(cells[0], MAX_NAME);
    const votes = cells[1] ?? '';
    if (name === '' || !isNumber(votes)) {
      // A first line with words where the numbers go is a header, not a mistake.
      if (!(n === 0 && cells.length > 1 && name !== '')) skipped++;
      return;
    }
    const seats = cells[2] !== undefined && isNumber(cells[2]) ? cells[2] : undefined;
    rows.push({ name, votes, seats });
  });

  const numbers = rows.map((r) => readNumber(r.votes) ?? 0);
  const total = numbers.reduce((a, b) => a + b, 0);
  const percent =
    rows.filter((r) => r.votes.includes('%')).length * 2 > rows.length ||
    (rows.length > 1 && numbers.every((v) => v <= 100) && total > 99 && total < 101 && numbers.some((v) => !Number.isInteger(v)));
  const kept = rows.slice(0, MAX_PARTIES);
  return {
    parties: kept.map((r, i) => {
      const votes = numbers[i]!;
      const seats = r.seats === undefined ? null : Math.round(Math.min(MAX_SIZE, readNumber(r.seats) ?? 0));
      return {
        name: r.name,
        votes: percent ? Math.round(Math.min(100, votes) * 1000) / 1000 : Math.round(Math.min(MAX_VOTES, votes)),
        seats,
      };
    }),
    votesAs: percent ? 'percent' : 'counts',
    hasSeats: kept.some((r) => r.seats !== undefined),
    skipped,
    dropped: rows.length - kept.length,
  };
}
