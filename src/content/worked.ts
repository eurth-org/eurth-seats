/**
 * The guide's worked examples. The guide's tables are drawn from these by the same code the
 * calculator runs, and tests/content.test.ts holds every one to its expected seats: a formula
 * explained in the guide is a formula tested against the guide.
 *
 * Most use one small made-up election, so the formulas can be compared: the town council of
 * Saltmarsh, ten seats, 100,000 votes, four parties.
 */
import type { Election, Party } from '../seats/model';

type Input = Omit<Partial<Election>, 'parties'> & { parties: Partial<Party>[] };

export interface Worked {
  id: string;
  /** What the example shows, in a few words. */
  title: string;
  election: Input;
  /** Seats per party, in list order. */
  expected: number[];
  /** Where a real example's numbers come from. */
  source?: string;
}

const saltmarsh = [
  { name: 'Harbour Party', votes: 41_600 },
  { name: 'Meadow League', votes: 33_800 },
  { name: 'Guild of Trades', votes: 15_200 },
  { name: 'Lantern Club', votes: 9_400 },
];
const council = { chamber: 'Saltmarsh Town Council', size: 10, votesAs: 'counts' as const, parties: saltmarsh };

export const WORKED: Worked[] = [
  { id: 'dhondt', title: "D'Hondt, ten seats", election: { ...council, system: 'dhondt' }, expected: [4, 4, 1, 1] },
  { id: 'sainte-lague', title: 'Sainte-Laguë, ten seats', election: { ...council, system: 'sainte-lague' }, expected: [4, 3, 2, 1] },
  {
    id: 'sainte-lague-six',
    title: 'Sainte-Laguë, six seats',
    election: { ...council, size: 6, system: 'sainte-lague' },
    expected: [2, 2, 1, 1],
  },
  {
    id: 'modified-six',
    title: 'Modified Sainte-Laguë, six seats',
    election: { ...council, size: 6, system: 'modified-sainte-lague' },
    expected: [3, 2, 1, 0],
  },
  { id: 'hare', title: 'Largest remainder with the Hare quota, ten seats', election: { ...council, system: 'hare' }, expected: [4, 3, 2, 1] },
  { id: 'droop', title: 'Largest remainder with the Droop quota, ten seats', election: { ...council, system: 'droop' }, expected: [4, 4, 1, 1] },
  {
    id: 'threshold',
    title: "D'Hondt with a 10% threshold",
    election: { ...council, system: 'dhondt', threshold: 10 },
    expected: [5, 4, 1, 0],
  },
  {
    id: 'bonus',
    title: 'Sainte-Laguë with a two-seat bonus',
    election: { ...council, system: 'sainte-lague', bonus: 2 },
    expected: [5, 3, 1, 1],
  },
  {
    id: 'alabama-ten',
    title: 'The Alabama paradox: ten seats',
    election: { size: 10, system: 'hare', votesAs: 'counts', parties: [{ name: 'North', votes: 6_000 }, { name: 'South', votes: 6_000 }, { name: 'Island', votes: 2_000 }] },
    expected: [4, 4, 2],
  },
  {
    id: 'alabama-eleven',
    title: 'The Alabama paradox: eleven seats',
    election: { size: 11, system: 'hare', votesAs: 'counts', parties: [{ name: 'North', votes: 6_000 }, { name: 'South', votes: 6_000 }, { name: 'Island', votes: 2_000 }] },
    expected: [5, 5, 1],
  },
  {
    id: 'mixed-top-up',
    title: 'Mixed-member with a top-up',
    election: {
      ...council,
      system: 'mixed',
      mixedMode: 'compensatory',
      listFormula: 'sainte-lague',
      parties: [
        { ...saltmarsh[0], seats: 4 },
        { ...saltmarsh[1], seats: 1 },
        { ...saltmarsh[2], seats: 0 },
        { ...saltmarsh[3], seats: 0 },
      ],
    },
    expected: [4, 3, 2, 1],
  },
  {
    id: 'mixed-parallel',
    title: 'Mixed-member, side by side',
    election: {
      ...council,
      system: 'mixed',
      mixedMode: 'parallel',
      listFormula: 'sainte-lague',
      parties: [
        { ...saltmarsh[0], seats: 4 },
        { ...saltmarsh[1], seats: 1 },
        { ...saltmarsh[2], seats: 0 },
        { ...saltmarsh[3], seats: 0 },
      ],
    },
    expected: [6, 3, 1, 0],
  },
  {
    id: 'overhang',
    title: 'Overhang seats',
    election: {
      ...council,
      system: 'mixed',
      mixedMode: 'compensatory',
      listFormula: 'sainte-lague',
      parties: [
        { ...saltmarsh[0], seats: 5 },
        { ...saltmarsh[1], seats: 0 },
        { ...saltmarsh[2], seats: 0 },
        { ...saltmarsh[3], seats: 0 },
      ],
    },
    expected: [5, 3, 2, 1],
  },
  {
    id: 'new-zealand-2020',
    title: 'New Zealand, 2020',
    election: {
      chamber: 'New Zealand House of Representatives',
      election: 'General election 2020',
      size: 120,
      system: 'mixed',
      mixedMode: 'compensatory',
      listFormula: 'sainte-lague',
      votesAs: 'counts',
      parties: [
        { name: 'Labour', votes: 1_443_545, seats: 46 },
        { name: 'National', votes: 738_275, seats: 23 },
        { name: 'Green', votes: 226_757, seats: 1 },
        { name: 'ACT', votes: 219_031, seats: 1 },
        { name: 'Māori Party', votes: 33_630, seats: 1 },
      ],
    },
    expected: [65, 33, 10, 10, 2],
    source: 'https://www.electionresults.govt.nz/electionresults_2020/',
  },
];

/** A worked example by its id. Throws for an id that does not exist, so a typo in the guide fails the build. */
export function worked(id: string): Worked {
  const found = WORKED.find((w) => w.id === id);
  if (!found) throw new Error(`No worked example called "${id}".`);
  return found;
}
