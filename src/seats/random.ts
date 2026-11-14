/**
 * A made-up election out of the hat, for the Random button: a chamber with a name, between
 * three and seven parties, and a system. Give it a random number source to get the same
 * election twice (the tests do).
 */
import { DEFAULT_COLOURS } from './colours';
import { cleanElection, type Election, type SystemId } from './model';

const PLACES = ['Saltmarsh', 'Brackland', 'Calvessa', 'Teland', 'the Nine Rivers', 'Hollowmere', 'Vandermeer', 'Port Sable', 'the Amber Coast', 'Stonewick', 'Larkhaven', 'Upper Dunmore'];
const CHAMBERS = ['National Assembly', 'Senate', 'House of Commons', 'Grand Council', 'Diet', 'Chamber of Deputies', 'Peoples’ Congress', 'Estates General', 'Parliament'];
const FIRST = ['National', 'Liberal', 'Civic', 'Agrarian', 'Radical', 'Moderate', 'United', 'Free', 'Popular', 'Green', 'Social', 'Royal', 'Coastal', 'Mountain', 'Reform', 'Workers’', 'Maritime', 'Rural'];
const SECOND = ['Union', 'Alliance', 'League', 'Party', 'Front', 'Bloc', 'Movement', 'Rally', 'Pact', 'Centre', 'Democrats', 'Coalition', 'Guild', 'List'];
const ODD = ['Pirate Party', 'Party of Moderate Progress', 'Independents', 'Beer Drinkers’ League', 'Committee for Longer Lunches', 'Friends of the Emu', 'Sensible Shoes Alliance'];
const SIZES = [60, 80, 100, 101, 120, 150, 151, 200, 240, 300, 349, 400];
const SYSTEMS: SystemId[] = ['dhondt', 'dhondt', 'sainte-lague', 'sainte-lague', 'modified-sainte-lague', 'hare', 'droop'];
const THRESHOLDS = [0, 0, 2, 3, 4, 5, 5];

export function randomElection(random: () => number = Math.random): Election {
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(random() * list.length)]!;
  const count = 3 + Math.floor(random() * 5);

  const names = new Set<string>();
  while (names.size < count - 1) names.add(`${pick(FIRST)} ${pick(SECOND)}`);
  names.add(pick(ODD));

  // Shares that fall away from a clear leader to a small last party, adding up to 100.0.
  const weights = [...names].map((_, i) => (0.35 + random()) / (i + 1) ** 0.9);
  const sum = weights.reduce((a, b) => a + b, 0);
  const votes = weights.map((w) => Math.round((w / sum) * 1000) / 10);
  votes[0] = Math.round((votes[0]! + 100 - votes.reduce((a, b) => a + b, 0)) * 10) / 10;

  // Parties sit left to right, not in order of size: shuffle the bench.
  const colours = [...DEFAULT_COLOURS];
  const parties = [...names].map((name, i) => ({ name, votes: votes[i]!, colour: colours[i % colours.length]! }));
  for (let i = parties.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [parties[i], parties[j]] = [parties[j]!, parties[i]!];
  }

  return cleanElection({
    chamber: `${pick(CHAMBERS)} of ${pick(PLACES)}`,
    election: `Election ${2020 + Math.floor(random() * 10)}`,
    size: pick(SIZES),
    system: pick(SYSTEMS),
    threshold: pick(THRESHOLDS),
    votesAs: 'percent',
    layout: random() < 0.7 ? 'hemicycle' : random() < 0.5 ? 'horseshoe' : 'westminster',
    parties,
  });
}
