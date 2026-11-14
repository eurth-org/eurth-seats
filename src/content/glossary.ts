/**
 * The glossary: every term the calculator and the guide use, in a sentence or two each.
 * In alphabetical order; `id` is the anchor on the glossary page. A test keeps the order, the
 * ids and the cross-references honest.
 */
export interface Term {
  id: string;
  term: string;
  definition: string;
  /** Ids of related terms. */
  see?: string[];
}

export const GLOSSARY: Term[] = [
  {
    id: 'alabama-paradox',
    term: 'Alabama paradox',
    definition:
      'A quirk of largest remainder: making the chamber one seat bigger can cost a party a seat it had. Divisor formulas such as D\'Hondt and Sainte-Laguë can never do this.',
    see: ['largest-remainder', 'highest-averages'],
  },
  {
    id: 'bonus',
    term: 'Bonus seats',
    definition:
      'Seats given to the party with the most votes before the rest are shared out, to make a governing majority more likely. Also called a majority bonus.',
    see: ['majority', 'proportional-representation'],
  },
  {
    id: 'chamber',
    term: 'Chamber',
    definition: 'One house of a legislature, and the room it meets in. A legislature has one chamber (unicameral) or two (bicameral); Seats draws one at a time.',
    see: ['hemicycle', 'westminster-layout', 'horseshoe'],
  },
  {
    id: 'coalition',
    term: 'Coalition',
    definition: 'Two or more parties that govern together because none of them has a majority alone.',
    see: ['majority', 'minimal-winning-coalition', 'hung-parliament'],
  },
  {
    id: 'compensatory-seats',
    term: 'Compensatory seats',
    definition:
      'List seats in a mixed-member system that top each party up to its proportional share of the whole chamber, making up for a lopsided result in the districts. Also called top-up seats.',
    see: ['mixed-member', 'overhang', 'parallel-voting'],
  },
  {
    id: 'constituency',
    term: 'Constituency',
    definition: 'The area that elects one or more members, also called a district or an electorate. Seats counts one national constituency; district results are entered as seats won.',
    see: ['first-past-the-post', 'district-magnitude'],
  },
  {
    id: 'dhondt',
    term: "D'Hondt method",
    definition:
      "A highest-averages formula with divisors 1, 2, 3, 4 and so on, named after the Belgian mathematician Victor D'Hondt. The most widely used list formula, and the one kindest to large parties. In the United States it is called the Jefferson method.",
    see: ['highest-averages', 'sainte-lague'],
  },
  {
    id: 'dead-heat',
    term: 'Dead heat',
    definition:
      'An exact tie for a seat. Real laws mostly settle it by drawing lots. Seats gives the seat to the party with more votes, then to the party listed first, and says when it has done so.',
  },
  {
    id: 'disproportionality',
    term: 'Disproportionality',
    definition: "How far the seat shares stray from the vote shares. Seats measures it with the Gallagher index and shows each party's own difference in the results table.",
    see: ['gallagher-index', 'proportional-representation'],
  },
  {
    id: 'district-magnitude',
    term: 'District magnitude',
    definition:
      'The number of seats filled in one constituency. The smaller it is, the harder it is for small parties to win anything, whatever the formula: with five seats, a party needs roughly a sixth of the vote.',
    see: ['constituency', 'threshold'],
  },
  {
    id: 'divisor',
    term: 'Divisor',
    definition: 'One of the numbers a party\'s votes are divided by in a highest-averages formula: 1, 2, 3… for D\'Hondt, 1, 3, 5… for Sainte-Laguë.',
    see: ['highest-averages', 'quotient'],
  },
  {
    id: 'droop-quota',
    term: 'Droop quota',
    definition:
      'Votes divided by one more than the number of seats. Smaller than the Hare quota, so more seats are won outright and fewer are left to remainders, which suits large parties a little better. Many laws round it up to the next whole vote.',
    see: ['quota', 'hare-quota', 'largest-remainder'],
  },
  {
    id: 'first-past-the-post',
    term: 'First past the post',
    definition:
      'Each constituency elects the one candidate with the most votes, majority or not. Simple, and usually far from proportional. In Seats, enter the seats each party won.',
    see: ['majoritarian', 'plurality', 'constituency'],
  },
  {
    id: 'gallagher-index',
    term: 'Gallagher index',
    definition:
      'A single number for disproportionality: the square root of half the sum of the squared differences between each party\'s vote share and seat share, in percentage points. 0 is perfectly proportional; proportional systems usually score under 5, and first past the post often over 10.',
    see: ['disproportionality'],
  },
  {
    id: 'hare-quota',
    term: 'Hare quota',
    definition: 'Votes divided by the number of seats: the "price" of one seat if every vote counted equally. The simplest quota, and the kindest to small parties.',
    see: ['quota', 'droop-quota', 'largest-remainder'],
  },
  {
    id: 'hemicycle',
    term: 'Hemicycle',
    definition: 'A chamber laid out as a half circle of rows facing the chair, with parties usually seated from left to right. The usual shape of a parliament chart.',
    see: ['chamber', 'horseshoe', 'westminster-layout'],
  },
  {
    id: 'highest-averages',
    term: 'Highest averages',
    definition:
      'A family of formulas, also called divisor methods: each seat in turn goes to the party with the highest quotient, its votes divided by a divisor that grows with the seats it already has. D\'Hondt and Sainte-Laguë are the best known.',
    see: ['dhondt', 'sainte-lague', 'divisor', 'quotient'],
  },
  {
    id: 'horseshoe',
    term: 'Horseshoe',
    definition: 'A chamber with two straight banks of seats joined by a curve at one end, halfway between a hemicycle and facing benches.',
    see: ['chamber', 'hemicycle', 'westminster-layout'],
  },
  {
    id: 'hung-parliament',
    term: 'Hung parliament',
    definition: 'A chamber in which no single party has a majority, so that governing takes a coalition or a minority government. The usual outcome under proportional representation.',
    see: ['majority', 'coalition', 'minority-government'],
  },
  {
    id: 'largest-remainder',
    term: 'Largest remainder',
    definition:
      'A family of formulas: a party gets one seat for every full quota of votes, and the seats left over go to the parties with the largest remainders. Also called the Hamilton method or the Hare-Niemeyer method.',
    see: ['quota', 'hare-quota', 'droop-quota', 'remainder', 'alabama-paradox'],
  },
  {
    id: 'legislature',
    term: 'Legislature',
    definition: 'The body that makes the laws: a parliament, congress, assembly, diet or council, with one chamber or two.',
    see: ['chamber'],
  },
  {
    id: 'majoritarian',
    term: 'Majoritarian system',
    definition:
      'A system that gives each seat to whoever leads in its constituency, such as first past the post or the two-round system. It tends to turn the largest party\'s lead in votes into a larger lead in seats.',
    see: ['first-past-the-post', 'proportional-representation', 'mixed-member'],
  },
  {
    id: 'majority',
    term: 'Majority',
    definition: 'More than half of the seats: 61 of 120, 51 of 100 or of 101. Exactly half is not a majority. Seats draws the majority line down the middle of the chamber.',
    see: ['plurality', 'supermajority', 'hung-parliament'],
  },
  {
    id: 'margin',
    term: 'Margin',
    definition: 'How many seats a party or coalition has above the majority it needs, or how many it falls short. Seats writes it out: "2 seats to spare" or "4 seats short".',
    see: ['majority', 'coalition'],
  },
  {
    id: 'minimal-winning-coalition',
    term: 'Minimal winning coalition',
    definition: 'A coalition with a majority that would lose it if any one of its parties left. Parties that are not needed tend not to be invited.',
    see: ['coalition', 'majority'],
  },
  {
    id: 'minority-government',
    term: 'Minority government',
    definition: 'A government of a party or coalition without a majority, which survives because the other parties do not unite to vote it out.',
    see: ['hung-parliament', 'coalition'],
  },
  {
    id: 'mixed-member',
    term: 'Mixed-member system',
    definition:
      'A system in which some members are elected in constituencies and the rest from party lists. The list seats either top parties up to a proportional chamber (mixed-member proportional) or are simply added (parallel voting).',
    see: ['compensatory-seats', 'parallel-voting', 'overhang'],
  },
  {
    id: 'modified-sainte-lague',
    term: 'Modified Sainte-Laguë',
    definition:
      "Sainte-Laguë with a first divisor of 1.4 instead of 1, so that a party's first seat costs more votes. It keeps very small parties out without a formal threshold. Used in Norway; Sweden now uses 1.2.",
    see: ['sainte-lague', 'threshold'],
  },
  {
    id: 'overhang',
    term: 'Overhang seat',
    definition:
      'In a mixed-member system with a top-up, a district seat won beyond the party\'s proportional share. The party keeps it, and in Seats the chamber grows by that many seats.',
    see: ['mixed-member', 'compensatory-seats'],
  },
  {
    id: 'parallel-voting',
    term: 'Parallel voting',
    definition:
      'A mixed-member system in which the list seats are shared out on their own, beside the constituency seats, without making up for them. The overall result is only partly proportional.',
    see: ['mixed-member', 'compensatory-seats'],
  },
  {
    id: 'list',
    term: 'Party list',
    definition:
      "The candidates a party puts forward for the seats it wins in a proportional election. With a closed list the party fixes the order; with an open list voters can move candidates up. Seats works out how many seats a list wins, not who fills them.",
    see: ['proportional-representation'],
  },
  {
    id: 'plurality',
    term: 'Plurality',
    definition: 'More votes or seats than anyone else, but not necessarily more than half. A party with 41 of 120 seats has a plurality, not a majority.',
    see: ['majority', 'first-past-the-post'],
  },
  {
    id: 'proportional-representation',
    term: 'Proportional representation',
    definition: "Any system that aims to give each party a share of the seats close to its share of the votes. How close depends on the formula, the threshold and the size of the constituencies.",
    see: ['highest-averages', 'largest-remainder', 'disproportionality', 'majoritarian'],
  },
  {
    id: 'quota',
    term: 'Quota',
    definition: 'The number of votes that earns one seat outright in a largest-remainder count. The Hare and Droop quotas are the common ones.',
    see: ['hare-quota', 'droop-quota', 'largest-remainder'],
  },
  {
    id: 'quotient',
    term: 'Quotient',
    definition: "A party's votes divided by one of the divisors of a highest-averages formula. The seats go to the highest quotients, one each.",
    see: ['divisor', 'highest-averages'],
  },
  {
    id: 'remainder',
    term: 'Remainder',
    definition: 'What is left of a party\'s votes after its full quotas are taken out. The seats not won outright go to the largest remainders.',
    see: ['largest-remainder', 'quota'],
  },
  {
    id: 'sainte-lague',
    term: 'Sainte-Laguë method',
    definition:
      'A highest-averages formula with divisors 1, 3, 5, 7 and so on, named after the French mathematician André Sainte-Laguë. It treats large and small parties about alike. In the United States it is called the Webster method.',
    see: ['highest-averages', 'dhondt', 'modified-sainte-lague'],
  },
  {
    id: 'seat-share',
    term: 'Seat share',
    definition: "A party's seats as a percentage of all the seats that are filled.",
    see: ['vote-share', 'disproportionality'],
  },
  {
    id: 'supermajority',
    term: 'Supermajority',
    definition: 'A higher bar than a simple majority, often two thirds or three fifths of the seats, usually required to change a constitution.',
    see: ['majority'],
  },
  {
    id: 'threshold',
    term: 'Threshold',
    definition:
      'The share of the vote a party must reach to win list seats at all, often 3 to 5 per cent. Votes for parties below it are set aside, and the seats are shared among the rest. Seats applies one national threshold.',
    see: ['wasted-votes', 'modified-sainte-lague', 'district-magnitude'],
  },
  {
    id: 'vote-share',
    term: 'Vote share',
    definition: "A party's votes as a percentage of all the votes for the parties listed.",
    see: ['seat-share', 'disproportionality'],
  },
  {
    id: 'wasted-votes',
    term: 'Wasted votes',
    definition: 'Votes that help elect nobody: those for parties below the threshold, or for losing candidates in a constituency.',
    see: ['threshold', 'first-past-the-post'],
  },
  {
    id: 'westminster-layout',
    term: 'Westminster layout',
    definition: 'A chamber with two banks of benches facing each other across an aisle, the government on one side and the opposition on the other, after the British House of Commons.',
    see: ['chamber', 'hemicycle', 'horseshoe'],
  },
];

const PROPER = /^(Alabama|D'Hondt|Droop|Gallagher|Hare|Sainte|Westminster)/;

/** A term as it reads in the middle of a sentence: lower case, unless it starts with a name. */
export function inSentence(term: string): string {
  return PROPER.test(term) ? term : term.charAt(0).toLowerCase() + term.slice(1);
}
