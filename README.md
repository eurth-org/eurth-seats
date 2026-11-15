# Seats

> A friendly note: Seats is part of Eurth's advent calendar, and its door opens on 11 December 2026. The site is up early for testing. Please don't spoil the surprise before the door opens.

Seats turns votes into seats and draws the chamber. It is one of the free worldbuilding tools by [Eurth](https://eurth.org), a worldbuilding and roleplay community since 2004, and lives at seats.eurth.org.

What's next, and what each release added, is in [roadmap.md](roadmap.md).

## What it does

- **Parties:** a name, a colour and votes, as percentages or counts. Paste them from a spreadsheet, one party per line.
- **Systems:** D'Hondt, Sainte-Laguë, modified Sainte-Laguë, largest remainder with the Hare or the Droop quota, mixed-member systems (district seats entered, list seats worked out, as a top-up or side by side), or seats entered directly for first past the post and anything else. A national threshold and an optional majority bonus.
- **Results:** votes, seats, both shares and the difference between them, the Gallagher index, and the method explained in one sentence.
- **The chamber:** a hemicycle in the style of Wikipedia's parliament diagrams, a horseshoe, or Westminster benches, with a majority line.
- **Coalition builder:** pick parties and read, in words, whether they have a majority and by how much.
- **Take it with you:** a link that holds the whole election; SVG, PNG and WebP in six sizes; a wikitext table; a written description; and the nation's profile file.

There are four pages: the calculator, a guide to electoral systems with every formula worked through, a glossary, and four example elections.

## How it is built

Seats follows the [Eurth tools handbook](https://github.com/eurth-org/eurth-style/blob/main/HANDBOOK.md) (`node_modules/@eurth/style/HANDBOOK.md`), which wins on everything the tools share. It began as a copy of the handbook's starter.

- **Astro**, static output, with one **Svelte 5** component for the calculator. TypeScript, Vitest.
- The header, footer, theme switch, share dialog, offline note and delights come from `@eurth/style`; the profile file from `@eurth/profile`. Both are installed from GitHub and built in.
- Nothing is stored: no cookies or browser storage, no analytics, no accounts, no requests to anyone else. An election lives in its link.

```
src/seats/      the logic, free of the page: every file runs the same in the browser, at build time and in tests
  model.ts        an election, and cleanElection(), which checks and clamps anything from outside
  allocate.ts     the five formulas, in exact whole-number arithmetic
  mixed.ts        mixed-member systems
  results.ts      the count: the results table, majority, hung parliament, the method in a sentence
  coalition.ts    coalition maths
  chamber.ts      where every seat goes, for the three layouts
  render.ts       the chamber as a standalone SVG; picture.ts gives it the suite's colours
  describe.ts     the result in words
  wikitext.ts     the wikitext table
  paste.ts        results pasted from a spreadsheet
  link.ts         the election in its link, compact and versioned
  profile.ts      the profile's "seats" section, and a start from Governmint's settings
  colours.ts      the default party colours
  explain.ts      the working shown in the guide's tables
src/content/    worked examples, glossary, example elections and presets of real chambers
src/ui/         the Svelte components of the calculator
src/pages/      the four pages and the 404
tests/          the logic, the content, and the suite's standard checks of the built site
```

### The profile

Seats owns the `seats` section of the nation profile (`<nation>.eurth.json`) and leaves every other section as it finds it. It writes the chamber's name, its size, the system, the election's label, the parties that hold seats (largest first, with colour, votes and vote share), the threshold, the majority, a summary and the link that brings the whole election back.

From the `government` section, which Governmint owns, it reads the legislature's name and, from Governmint's link, the electoral setting: "winner takes the seat" starts with seats entered directly, "proportional" with D'Hondt, "mixed" with the mixed-member system.

## Development

Node 22.23.4 or later (CI runs on Node 26).

```bash
npm install
```

```bash
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | The site with live reload. |
| `npm run check` | Types, in pages, components and logic. |
| `npm run build` | The static site, into `dist/`. |
| `npm test` | The logic and content tests, and the suite's checks of the built site. Build first. |
| `npm run axe` | Accessibility checks on every built page, in both themes. |
| `npm run preview` | Builds, then serves `dist/` with its real headers (`wrangler dev`). |
| `npm run images` | Remakes the icons and the sharing image in `public/`. |

Every formula is tested against the worked examples in the guide (`src/content/worked.ts`), against textbook examples and a real election, and against properties checked over a thousand random elections: every seat is filled, more votes never means fewer seats, nothing is decided by a rounding error.

## Deployment

Seats is a Cloudflare Worker that serves static files, on the custom domain seats.eurth.org (`wrangler.jsonc`). It needs nothing beyond the Workers Free plan.

- **Before the door opens**, pushes to `main` are checked, built and tested but not deployed. The site was put up early, on 15 November 2026, by hand: until the door, run `npm run deploy` after a change (Wrangler must be signed in to the account that holds eurth.org).
- **The launch workflow** (`.github/workflows/launch.yml`) runs at 22:30 UTC on 10 December 2026: it builds, tests, waits for the time in `LAUNCH_AT` and deploys. If the scheduled run hasn't started by 22:45 UTC, start it by hand from the Actions tab. Once Seats is live, delete that workflow.
- **After the door**, every green push to `main` deploys, and the nightly run picks up new releases of `@eurth/style` and `@eurth/profile`.
- Deploying uses `CLOUDFLARE_API_TOKEN`, a secret set once for the whole eurth-org organisation. Without it the deploy step is skipped with a warning.

## Licence

[Apache 2.0](LICENSE). Icons: Font Awesome Free (CC BY 4.0) and line-md (MIT).
