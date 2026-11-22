// Makes the pictures that aren't drawn by hand, with the Chrome on this machine: the favicon,
// the home-screen icons and the sharing image. Run it after changing the logo or the sharing
// image, and commit what it writes to public/:  npm run images
import { makeImages, sharingImage } from '@eurth/style/images';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { site } from '../eurth.config.mjs';

// Seats' mark: an armchair with the Eurth yurt on its back. It is the favicon, the home-screen
// icon and the mark on the sharing image; the pages put it in the header.
const mark = readFileSync(new URL('../src/assets/mark.svg', import.meta.url), 'utf8');

// The picture on the sharing image comes from the same code as the site (Vite reads TypeScript).
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { defaultElection } = await vite.ssrLoadModule('/src/seats/model.ts');
  const { count } = await vite.ssrLoadModule('/src/seats/results.ts');
  const { chamberPicture } = await vite.ssrLoadModule('/src/seats/picture.ts');
  // The chamber alone, without its own title or background: the sharing image has both.
  const election = { ...defaultElection(), chamber: '', election: '' };
  const art = chamberPicture(election, count(election), { transparent: true });
  const made = await makeImages({ logo: mark, sharing: [{ file: 'og.png', html: sharingImage({ site, art, mark }) }] });
  console.log(`Made ${made.map((file) => `public/${file}`).join(', ')}`);
} finally {
  await vite.close();
}
