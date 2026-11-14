You're building Seats (seats.eurth.org), which turns votes into seats and draws the chamber, one of Eurth's free worldbuilding tools. Eurth (eurth.org) is a worldbuilding and roleplay community since 2004. The attached repo is eurth-org/eurth-seats.

Working order (Foundations and many other tools are being built at the same time tonight):
1. Save this brief as CLAUDE.md.
2. If the repo named above doesn't exist on GitHub yet, create it as a public, empty repo in eurth-org with the gh CLI and connect this folder; if you can't, ask me.
3. Read what already exists of github.com/eurth-org/eurth-style (HANDBOOK.md) and github.com/eurth-org/eurth-profile; they may still be in progress. Write the plan and show it to me.
4. Build the tool's core logic as plain TypeScript modules with thorough tests, and its content and data (guide text, presets, examples, data snapshots). None of that needs eurth-style.
5. Only once @eurth/style 1.0.0 is released (check the releases of github.com/eurth-org/eurth-style), start the site from its starter template and carry on to the end of this brief. Until then, don't scaffold the site, pages or styles.
6. Commit and push after every finished step, and keep roadmap.md up to date with exactly where to pick up, so a new session can continue if this one stops.

Background for every step: Read HANDBOOK.md in github.com/eurth-org/eurth-style and start from its starter template; read the profile schema in github.com/eurth-org/eurth-profile; look at github.com/eurth-org/eurth-flag, the reference build, and github.com/eurth-org/eurth-government (Governmint), whose electoral settings Seats should match. The handbook wins over this brief on everything shared. Then write a plan and show it to me before you build.

Mock-up: the "seats.eurth.org, seat chart and election" board on https://claude.ai/artifact/32RKDdVTtCfHsL6Qc6LxV6.

Pages: Calculator, Guide, Glossary, Examples.

The calculator, v1
- Parties: name, colour and votes (counts or percentages). The default colours are a colour-blind-safe set that differ in lightness; every party also shows its name, so colour is never the only key.
- Systems: D'Hondt, Sainte-Laguë, modified Sainte-Laguë, largest remainder (Hare and Droop), and first past the post or any other system by entering seats won directly. Chamber size, threshold (national), and an optional majority bonus.
- Results table: votes, seats, seat share, and the difference between vote and seat share. The method is explained in one sentence under the table.
- The chamber: a hemicycle in Wikipedia's parliament-diagram style (seats in rows, parties left to right, majority line), plus a westminster layout and a horseshoe.
- Coalition builder: pick parties, see the total, the majority and the margin, written out in words.
- Paste results from a spreadsheet (party, votes per line).

Guide: how electoral systems work (proportional, majoritarian, mixed), thresholds, what each formula favours, coalition maths, with sources. Glossary of every term. Examples: four made-up elections, one per system family.

Profile section "seats": the legislature's name, size, system, threshold, parties and the last result. Governmint's legislature settings should map onto it.

Exports: SVG, PNG and WebP of the chamber; a wikitext seat table; Copy description ("120 seats; Liberal Union 41, ...").

Signature touch: seats fill in party by party, left to right. Easter eggs: a hung parliament earns the toast "Hung."; a party landing on exactly 69 seats gets the suite's "Nice."

Done when the handbook's checklist passes and every formula is unit-tested against worked examples from the guide.
