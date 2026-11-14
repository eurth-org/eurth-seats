/**
 * Starting points: the size and system of some real chambers, as a snapshot. Picking one sets
 * the chamber's size, the system and the threshold, and leaves the parties alone.
 *
 * Every one is a simplification. Seats counts a whole country as one constituency; most of
 * these chambers are elected in many, so a real result will differ. `note` says how.
 */
import type { FormulaId, MixedMode, SystemId } from '../seats/model';

/** The day this list was last checked against its sources. */
export const PRESETS_CHECKED = '2026-11-14';

export interface Preset {
  id: string;
  country: string;
  chamber: string;
  size: number;
  system: SystemId;
  /** National threshold in percent; 0 for none. */
  threshold: number;
  bonus?: number;
  mixedMode?: MixedMode;
  listFormula?: FormulaId;
  /** How the real system differs from what Seats counts. */
  note: string;
  /** The title of the Wikipedia article about the chamber. */
  wikipedia: string;
}

export const PRESETS: Preset[] = [
  { id: 'be', country: 'Belgium', chamber: 'Chamber of Representatives', size: 150, system: 'dhondt', threshold: 5, note: 'Counted in 11 constituencies, each with its own 5% threshold.', wikipedia: 'Chamber of Representatives (Belgium)' },
  { id: 'fi', country: 'Finland', chamber: 'Parliament', size: 200, system: 'dhondt', threshold: 0, note: 'Counted in 13 constituencies; no legal threshold.', wikipedia: 'Parliament of Finland' },
  { id: 'il', country: 'Israel', chamber: 'Knesset', size: 120, system: 'dhondt', threshold: 3.25, note: 'One national constituency, as Seats counts it.', wikipedia: 'Knesset' },
  { id: 'nl', country: 'Netherlands', chamber: 'House of Representatives', size: 150, system: 'dhondt', threshold: 0.67, note: 'One national count. The threshold is one full seat: a 150th of the vote.', wikipedia: 'House of Representatives (Netherlands)' },
  { id: 'pl', country: 'Poland', chamber: 'Sejm', size: 460, system: 'dhondt', threshold: 5, note: 'Counted in 41 constituencies; the threshold is national, and 8% for coalitions.', wikipedia: 'Sejm' },
  { id: 'pt', country: 'Portugal', chamber: 'Assembly of the Republic', size: 230, system: 'dhondt', threshold: 0, note: 'Counted in 22 constituencies; no legal threshold.', wikipedia: 'Assembly of the Republic (Portugal)' },
  { id: 'es', country: 'Spain', chamber: 'Congress of Deputies', size: 350, system: 'dhondt', threshold: 3, note: 'Counted in 52 constituencies, most of them small, each with its own 3% threshold.', wikipedia: 'Congress of Deputies' },
  { id: 'tr', country: 'Türkiye', chamber: 'Grand National Assembly', size: 600, system: 'dhondt', threshold: 7, note: 'Counted in 87 constituencies; the threshold is national.', wikipedia: 'Grand National Assembly of Turkey' },
  { id: 'no', country: 'Norway', chamber: 'Storting', size: 169, system: 'modified-sainte-lague', threshold: 4, note: 'Counted in 19 constituencies; the 4% threshold applies only to the 19 levelling seats.', wikipedia: 'Storting' },
  { id: 'za', country: 'South Africa', chamber: 'National Assembly', size: 400, system: 'droop', threshold: 0, note: 'Half the seats come from regional lists and half from a national one, with no threshold.', wikipedia: 'National Assembly of South Africa' },
  { id: 'gr', country: 'Greece', chamber: 'Hellenic Parliament, 2012 to 2019', size: 300, system: 'hare', threshold: 3, bonus: 50, note: 'The rules used from 2012 to 2019: 250 seats in proportion and 50 to the largest party. Later laws changed the bonus.', wikipedia: 'Hellenic Parliament' },
  { id: 'nz', country: 'New Zealand', chamber: 'House of Representatives', size: 120, system: 'mixed', mixedMode: 'compensatory', listFormula: 'sainte-lague', threshold: 5, note: 'A party that wins an electorate is let in below the threshold; to copy that here, lower the threshold.', wikipedia: 'New Zealand House of Representatives' },
  { id: 'de', country: 'Germany', chamber: 'Bundestag', size: 630, system: 'mixed', mixedMode: 'compensatory', listFormula: 'sainte-lague', threshold: 5, note: 'Fixed at 630 seats since 2023: there are no overhang seats any more, so a district winner can go without a seat.', wikipedia: 'Bundestag' },
  { id: 'jp', country: 'Japan', chamber: 'House of Representatives', size: 465, system: 'mixed', mixedMode: 'parallel', listFormula: 'dhondt', threshold: 0, note: '289 district seats and 176 list seats, the lists counted in 11 regional blocks.', wikipedia: 'House of Representatives (Japan)' },
  { id: 'au', country: 'Australia', chamber: 'House of Representatives', size: 150, system: 'direct', threshold: 0, note: 'Single-member districts with preferential voting: enter the seats won.', wikipedia: 'Australian House of Representatives' },
  { id: 'ca', country: 'Canada', chamber: 'House of Commons', size: 343, system: 'direct', threshold: 0, note: 'First past the post: enter the seats won.', wikipedia: 'House of Commons of Canada' },
  { id: 'fr', country: 'France', chamber: 'National Assembly', size: 577, system: 'direct', threshold: 0, note: 'Single-member districts over two rounds: enter the seats won.', wikipedia: 'National Assembly (France)' },
  { id: 'in', country: 'India', chamber: 'Lok Sabha', size: 543, system: 'direct', threshold: 0, note: 'First past the post: enter the seats won.', wikipedia: 'Lok Sabha' },
  { id: 'ie', country: 'Ireland', chamber: 'Dáil Éireann', size: 174, system: 'direct', threshold: 0, note: 'The single transferable vote needs ranked ballots, not totals: enter the seats won.', wikipedia: 'Dáil Éireann' },
  { id: 'uk', country: 'United Kingdom', chamber: 'House of Commons', size: 650, system: 'direct', threshold: 0, note: 'First past the post: enter the seats won.', wikipedia: 'House of Commons of the United Kingdom' },
  { id: 'us', country: 'United States', chamber: 'House of Representatives', size: 435, system: 'direct', threshold: 0, note: 'Single-member districts, nearly all first past the post: enter the seats won.', wikipedia: 'United States House of Representatives' },
];
