/**
 * Numbers and lists as Seats writes them: British English, the same in every browser.
 * Nothing here depends on the device's language, so a copied description reads the same everywhere.
 */

/** 1443545 as "1,443,545". Decimals are kept as they are, up to three. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 1000) / 1000;
  const [whole = '0', decimals] = Math.abs(rounded).toString().split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${rounded < 0 ? '−' : ''}${grouped}${decimals ? `.${decimals}` : ''}`;
}

/** A share between 0 and 1 as a percentage with one decimal: 0.331 as "33.1%". */
export function formatShare(share: number): string {
  return `${(Math.round(share * 1000) / 10).toFixed(1)}%`;
}

/** A percentage as typed, without trailing zeros: 5 as "5%", 3.25 as "3.25%". */
export function formatPercent(percent: number): string {
  return `${Math.round(percent * 1000) / 1000}%`;
}

/** A difference between two shares, in percentage points with a sign: "+1.1", "−0.7", "0.0". */
export function formatPoints(difference: number): string {
  const points = Math.round(difference * 1000) / 10;
  if (points === 0) return '0.0';
  return `${points > 0 ? '+' : '−'}${Math.abs(points).toFixed(1)}`;
}

/** "A", "A and B", "A, B and C". */
export function listWords(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** "1 seat", "41 seats". */
export function seatWords(count: number): string {
  return `${formatNumber(count)} ${count === 1 ? 'seat' : 'seats'}`;
}
