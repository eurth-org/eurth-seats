/**
 * Four made-up elections, one for each family of electoral system. The Examples page opens
 * each in the calculator through its link. The countries and parties are invented.
 */
import type { Election, Party } from '../seats/model';

export interface Example {
  id: string;
  /** The family of systems it shows. */
  family: string;
  name: string;
  /** What to notice, in two or three sentences. */
  note: string;
  election: Omit<Partial<Election>, 'parties'> & { parties: Partial<Party>[] };
}

export const EXAMPLES: Example[] = [
  {
    id: 'teland',
    family: 'Proportional representation',
    name: 'Teland: a list election with a threshold',
    note: "Six parties, 120 seats, D'Hondt and a 5% threshold. The Pirate Party's 2.8% wins nothing, and its votes lift everyone else a little. Nobody has a majority, so the interesting part starts after the count: there are five ways to build one.",
    election: {
      chamber: 'National Assembly of Teland',
      election: 'Election 2026',
      size: 120,
      system: 'dhondt',
      threshold: 5,
      votesAs: 'percent',
      coalition: [1, 2],
      parties: [
        { name: 'National Labour', votes: 26.4, colour: '#806220' },
        { name: 'Civic Alliance', votes: 17.9, colour: '#47e9f4' },
        { name: 'Liberal Union', votes: 33.1, colour: '#2698d4' },
        { name: 'Agrarian League', votes: 11.6, colour: '#144800' },
        { name: 'Independents', votes: 8.2, colour: '#a69af9' },
        { name: 'Pirate Party', votes: 2.8, colour: '#540012' },
      ],
    },
  },
  {
    id: 'brackland',
    family: 'Majoritarian',
    name: 'Brackland: first past the post',
    note: 'Four hundred districts, one winner each, so the seats are entered as won. The Crown Party turns 38% of the vote into 55% of the seats; Liberal Reform gets 19% of the vote and under 6% of the seats, because its voters are spread thin. The Highland Party, small but all in one place, does well.',
    election: {
      chamber: 'House of Commons of Brackland',
      election: 'General election 2026',
      size: 400,
      system: 'direct',
      votesAs: 'percent',
      layout: 'westminster',
      parties: [
        { name: 'Crown Party', votes: 38.2, seats: 221, colour: '#2698d4' },
        { name: "Workers' Alliance", votes: 31.4, seats: 139, colour: '#804070' },
        { name: 'Liberal Reform', votes: 18.9, seats: 22, colour: '#806220' },
        { name: 'Highland Party', votes: 4.1, seats: 15, colour: '#a69af9' },
        { name: 'Greens', votes: 6.1, seats: 2, colour: '#6ed25d' },
        { name: 'Independents', votes: 1.3, seats: 1, colour: '#540012' },
      ],
    },
  },
  {
    id: 'nine-rivers',
    family: 'Mixed-member',
    name: 'The Nine Rivers: districts with a top-up',
    note: 'Half of the 200 seats are won in districts, and list seats top every party up to its share by Sainte-Laguë. The Rivers Union wins more than half the districts on a third of the vote, and the lists hand the difference back to the others. Switch the mode to side by side to see what it would have kept.',
    election: {
      chamber: 'Federal Council of the Nine Rivers',
      election: 'Federal election 2026',
      size: 200,
      system: 'mixed',
      mixedMode: 'compensatory',
      listFormula: 'sainte-lague',
      threshold: 5,
      votesAs: 'percent',
      layout: 'horseshoe',
      parties: [
        { name: 'Social Democrats', votes: 29, seats: 38, colour: '#804070' },
        { name: 'Green Meadow', votes: 14, seats: 4, colour: '#6ed25d' },
        { name: 'Free Citizens', votes: 11, seats: 3, colour: '#47e9f4' },
        { name: 'Rivers Union', votes: 34, seats: 52, colour: '#2698d4' },
        { name: 'Mountain Bloc', votes: 8, seats: 3, colour: '#806220' },
        { name: 'Unity List', votes: 4, seats: 0, colour: '#540012' },
      ],
    },
  },
  {
    id: 'calvessa',
    family: 'Proportional with a majority bonus',
    name: 'Calvessa: a bonus for the winner',
    note: 'Three hundred seats: 250 shared out by largest remainder among parties over 3%, and 50 handed to whoever came first. The Popular Front leads by three points and ends up 58 seats ahead, close enough to a majority to govern with one small partner.',
    election: {
      chamber: 'Senate of Calvessa',
      election: 'Election 2026',
      size: 300,
      system: 'hare',
      threshold: 3,
      bonus: 50,
      votesAs: 'percent',
      parties: [
        { name: 'Left Bloc', votes: 9.1, colour: '#a69af9' },
        { name: 'Popular Front', votes: 33.5, colour: '#804070' },
        { name: 'Centre Pact', votes: 13.8, colour: '#47e9f4' },
        { name: 'Reform Now', votes: 2.7, colour: '#540012' },
        { name: 'Coastal League', votes: 4.3, colour: '#009074' },
        { name: 'Republican Rally', votes: 30.2, colour: '#2698d4' },
        { name: 'Hearth and Home', votes: 6.4, colour: '#806220' },
      ],
    },
  },
];
