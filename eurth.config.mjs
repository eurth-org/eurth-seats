// What this tool is called and where it lives. Read at build time only: astro.config.mjs, the
// frontmatter of .astro pages, tests and tools/. Never import this from a Svelte component or a
// <script>: it pulls in the list of every Eurth tool, and browser code must not carry that
// (HANDBOOK.md, Launch). Hand the component what it needs as props instead.
import { defineSite } from '@eurth/style/build';

export const site = defineSite({
  // The subdomain, and the tool's id in @eurth/style's tools.json.
  id: 'seats',
  name: 'Seats',
  url: 'https://seats.eurth.org',
  // "<Name>: free online <thing> maker for worldbuilders"
  title: 'Seats: free online parliament seat chart maker for worldbuilders',
  description:
    "A free online seat calculator for worldbuilders: turn votes into seats with D'Hondt, Sainte-Laguë or largest remainder, draw the parliament chart and build a coalition. No account needed.",
  tagline: 'Turn votes into seats',
  pages: [
    { href: '/', label: 'Calculator' },
    { href: '/examples/', label: 'Examples' },
    { href: '/guide/', label: 'Guide' },
    { href: '/glossary/', label: 'Glossary' },
  ],
  repo: 'https://github.com/eurth-org/eurth-seats',
  category: 'UtilitiesApplication',
  ogAlt: 'Seats, by Eurth, at seats.eurth.org: its mark, an armchair with the Eurth yurt on its back, beside a parliament chart of 120 seats in a hemicycle, five parties from left to right, with a line at the majority.',
  llms:
    "Seats turns votes into seats (D'Hondt, Sainte-Laguë, modified Sainte-Laguë, largest remainder with the Hare and Droop quotas, mixed-member systems, or seats entered directly), draws the chamber as a hemicycle, a horseshoe or Westminster benches, and works out coalitions.\n\nAn election lives in its link: https://seats.eurth.org/?d=1.<state>. The guide explains every formula with worked examples; the glossary defines every term.",
});
