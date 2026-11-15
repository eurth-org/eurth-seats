# Roadmap

Seats turns votes into seats and draws the chamber, at seats.eurth.org: one of Eurth's free worldbuilding tools, and door 2 of Eurth's advent calendar (11 December 2026, 00:00 in Brussels).

Three parts: what comes next, what each release added (newest first), and what's not planned.

## Pick up here

Seats 0.1.0 is built and **live at seats.eurth.org since 15 November 2026**: Stijn asked for it to be put up ahead of its door, so it was deployed by hand (`npm run deploy`). Until the door opens on 11 December, CI checks and tests every push but does not deploy; **deploy by hand after a change**. From the door on, CI and the nightly run deploy by themselves.

Check, build, 254 tests and axe (five pages, both themes) pass. Start with the first items of "Next".

## Next

- **Try the remaining controls by hand:** the three downloads in each size, Copy picture, saving and loading a profile, dropping a profile on the window, and the whole page with a screen reader. Tried on the live site on 15 November and working: the coalition builder and its shortcuts, the three layouts, pasting results, switching systems, the presets, reloading from the link, the share dialog's links, Random and "Hung."
- **The launch workflow still runs on 10 December** and simply deploys again (Stijn decided on 15 November to keep the site public until then). Delete `.github/workflows/launch.yml` afterwards.
- **Propose the extra profile fields to `@eurth/profile`:** `threshold`, `systemId`, `bonus`, `majority`, and `votes` and `voteShare` on each party. Seats writes them already (unknown keys are kept); the schema should describe them.
- **Ask Governmint to write its electoral setting into the `government` section** (`electoralSystem`), so Seats need not read it out of Governmint's link, which only works for Governmint's link version 3.
- **A party that wins a district gets in below the threshold**, as in New Zealand: a switch for mixed-member systems.
- **Sweden's first divisor of 1.2**, and other first divisors for modified Sainte-Laguë.
- **Crossbenches** in the Westminster layout, and a Speaker's chair.
- **Thresholds per coalition of parties** (Poland's 8%), and legal thresholds expressed in seats (the Netherlands' one full seat, exactly).
- **Compare two formulas side by side** on the same votes, as the guide does for Saltmarsh.
- **A second chamber** for bicameral legislatures, and the profile fields to carry it.
- **Seat change since the last election** (+3, −5) in the table and the wikitext.
- **A sound for the signature touch**, behind the footer's sound switch: a gavel when a majority forms.
- **Launch chores:** submit the sitemap in Search Console, add Seats to status.eurth.org and Eurth's Worldbuilding Tools docs, announce it on the forum and Discord when its door opens.

## 15 November 2026: preview (0.1.0)

The first version.

- **Calculator:** parties with a name, a colour and votes as percentages or counts; D'Hondt, Sainte-Laguë, modified Sainte-Laguë, largest remainder with the Hare and the Droop quota; a national threshold and a majority bonus; mixed-member systems with district seats entered and list seats worked out, as a top-up (with overhang seats) or side by side; seats entered directly for first past the post and anything else. Exact whole-number arithmetic; dead heats settled by votes, then by list order, and reported.
- **Results table:** votes, seats, both shares and their difference, the Gallagher index, the method in one sentence, and a note for ties, vacancies, overhang and too many seats.
- **The chamber:** a hemicycle in the style of Wikipedia's parliament diagrams, a horseshoe and Westminster benches, with a majority line; parties sit in list order, left to right. Seats fill in party by party.
- **Coalition builder:** pick parties and read the total, the majority and the margin in words; the smallest majorities are offered as shortcuts.
- **Paste results** from a spreadsheet: tabs, commas or semicolons, thousands separators, percentages, and an optional seats column.
- **Presets:** the size, system and threshold of 21 real chambers, each with a note on how the real thing differs.
- **Random** elections, and **Start again**.
- **Take it with you:** the link holds the whole election (`?d=1.…`); SVG, PNG and WebP in six sizes, in the theme you are looking at; a wikitext table; Copy link, picture and description; the share dialog.
- **The nation profile:** Seats writes the `seats` section and leaves every other section as it was; it starts from Governmint's legislature name and electoral setting when a profile has no seats yet.
- **Guide:** how electoral systems work, with every formula worked through on one small election, thresholds, the majority bonus, mixed-member systems, coalition maths and sources. Its tables are drawn by the calculator's own code, and every worked example is a test.
- **Glossary** of 43 terms, and **four example elections**, one for each family of system.
- **Default party colours** that each sit on their own step of lightness, also for red-green and blue-yellow colour blindness; every block of seats is named beside the chamber.
- **Easter eggs:** "Hung." when a parliament becomes hung, and the suite's "Nice." when a party lands on exactly 69 seats.
- Built from the `@eurth/style` starter on version 1.0.1, with `@eurth/profile` 1.0.0: shared header, footer, theme switch, offline copy, install button, security headers and checks.

## Not planned

- **Constituency-by-constituency counts.** Seats works on national totals; district results are entered as seats won. A district simulator is a different tool.
- **Single transferable vote and other ranked counts.** They need ballots, not totals. The calculator takes their results as seats entered directly.
- **Saving in the browser.** An election lives in its link or in the profile file, as the handbook says.
- **Drawing lots for dead heats.** A result that changes when the page is reloaded can't live in a link; the tie-break is fixed and announced instead.
