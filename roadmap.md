# Roadmap

Seats turns votes into seats and draws the chamber, at seats.eurth.org: one of Eurth's free worldbuilding tools. It opens as door 2 of Eurth's advent calendar, on 11 December 2026 at 00:00 in Brussels.

Three parts: what comes next, what each release added (newest first), and what's not planned.

## Pick up here

**Waiting for Stijn to approve the plan below.** Nothing is built yet. Once approved, start at step 1 of "Next". Steps 1 to 3 need nothing from `@eurth/style`. Step 4 onwards waits for the `@eurth/style` 1.0.0 release (`gh release list --repo eurth-org/eurth-style`); on 14 November 2026 there was none, and no HANDBOOK.md or starter template yet.

## Next

### 1. Core logic, as plain TypeScript with tests (`src/seats/`, `tests/`)

- `model.ts`: the election (chamber name, election label, size, system, threshold, bonus, parties with name, colour and votes or seats), limits and `cleanElection`, which checks and clamps anything that arrives from a link, a paste or a profile.
- `allocate.ts`: D'Hondt, Sainte-Laguë, modified Sainte-Laguë (first divisor 1.4), largest remainder with the Hare and Droop quotas, and seats entered directly (first past the post or anything else). National threshold, optional majority bonus (extra seats to the largest party, the rest shared out by the formula). Exact integer arithmetic, no floating-point ties. Ties are broken by votes, then by the order of the list, and reported so the page can say so.
- `mixed.ts`: mixed-member systems, since Governmint offers "Mixed" and the mock-up shows it: district seats entered per party, list seats computed, either side by side (parallel) or as a top-up (compensatory, with overhang seats reported).
- `results.ts`: the results table (votes, vote share, seats, seat share, the difference), the Gallagher index of disproportionality, the majority line, whether the parliament is hung, and the one-sentence explanation of the method.
- `coalition.ts`: a chosen set of parties gives a total, the majority needed and the margin, written out in words; also every minimal winning coalition.
- `chamber.ts`: seat positions for the hemicycle (Wikipedia's parliament-diagram arrangement: rows of an arch, seats filled party by party from left to right), the Westminster layout (government benches facing opposition, crossbench at the end) and the horseshoe; `render.ts` turns them into SVG with a majority line, a title and a text alternative.
- `paste.ts`: reads "party, votes" lines from a spreadsheet (tabs, commas or semicolons; thousands separators; percentages).
- `describe.ts`: Copy description ("120 seats; Liberal Union 41, ...") and the longer written description for screen readers.
- `wikitext.ts`: a wikitext seat table with colour cells, votes, shares and seats.
- `link.ts`: the whole election in the query string, compact and versioned, read back through `cleanElection`.
- `profile.ts`: to and from the profile's `seats` section, leaving every other section untouched; a starting point from the `government` section (legislature name; Governmint's majoritarian, proportional and mixed map to seats entered directly, D'Hondt and mixed).
- `colours.ts`: the default party colours, a colour-blind-safe set whose members differ in lightness, tested for it.
- Tests: every formula against the worked examples in the guide and against published real results, plus properties (seats always add up to the chamber, no seats below the threshold, more votes never means fewer seats within one formula).

### 2. Content and data (`src/content/`)

- The guide: how electoral systems work (proportional, majoritarian, mixed), thresholds, what each formula favours, coalition maths, with sources and a last-updated date. Every worked example in it is a test.
- The glossary: every term the calculator and the guide use.
- Examples: four made-up elections, one per family (proportional with a threshold, first past the post, mixed-member, proportional with a majority bonus), each a link into the calculator.
- Presets: chamber sizes and thresholds of well-known legislatures, as starting points.

### 3. Repo basics

README.md (opening with the advent-calendar note), docs/feedback-log.md, LICENSE (Apache 2.0), package.json, tsconfig, Vitest, and a CI workflow that checks and tests.

### 4. The site, once `@eurth/style` 1.0.0 is out

From the starter template: Calculator, Guide, Glossary and Examples as real HTML pages; the Svelte calculator (parties, system, results table, chamber, coalition builder, paste); exports (SVG, PNG, WebP at the handbook's sizes, wikitext, Copy description, Copy link, Share dialog); the profile file (save, load, drag and drop); service worker, manifest, security headers, SEO and JSON-LD, Open Graph images.

### 5. Delight

Seats fill in party by party, left to right. "Hung." when no party has a majority. The suite's "Nice." when a party lands on exactly 69 seats.

### 6. Launch

The launch workflow (22:30 UTC on 10 December, waits for `LAUNCH_AT`, deploys, creating seats.eurth.org), Lighthouse and axe on main, and the handbook's checklist.

## Releases

None yet.

## Not planned

- **Constituency-by-constituency counts.** Seats works on national totals; district results are entered as seats won. A district simulator is a different tool.
- **Single transferable vote and other ranked counts.** They need ballots, not totals. The guide explains them; the calculator takes their results as seats entered directly.
- **Saving in the browser.** A design lives in its link or in the profile file, as the handbook says.
