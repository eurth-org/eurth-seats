<script lang="ts">
  /*
   * The calculator: parties and votes in, seats, a chamber and a coalition out.
   *
   *   - The election lives in the link (?d=1.…): read safely on arrival, kept in step after.
   *   - Nothing is stored: "save" is the link, a picture, wikitext or the nation's profile file.
   *   - What is typed is kept as typed; everything counted, drawn or shared goes through
   *     cleanElection first, and the fields are tidied when focus leaves them.
   *   - Only tokens and eu- classes: the only colours of its own are the parties', which are data.
   */
  import { faArrowLeft, faArrowRight, faCheck, faCopy, faDice, faDownload, faPaste, faPlus, faRotateLeft, faTrashCan } from '@fortawesome/free-solid-svg-icons';
  import { createProfile, getSection, setSection, type EurthProfile } from '@eurth/profile';
  import ProfileButtons from '@eurth/profile/ProfileButtons.svelte';
  import { PICTURE_SIZES, copyText, download, fileSlug, getPrefs, niceWatcher, stateFromLocation, stateToLocation, svgToPicture, toast } from '@eurth/style';
  import Icon from '@eurth/style/components/Icon.svelte';
  import ShareButtons from '@eurth/style/components/ShareButtons.svelte';
  import { onMount } from 'svelte';
  import { PRESETS } from '../content/presets';
  import { blocksOf, drawChamber } from '../seats/chamber';
  import { chamberDescription, description, summaryLine, title } from '../seats/describe';
  import { electionLink, fromCompact, LINK_VERSION, toCompact } from '../seats/link';
  import {
    cleanElection,
    defaultElection,
    FORMULAS,
    isFormula,
    LAYOUT_LABELS,
    LAYOUTS,
    MAX_PARTIES,
    MAX_SIZE,
    moveParty,
    newParty,
    removeParty,
    SYSTEM_LABELS,
    SYSTEMS,
    type Election,
  } from '../seats/model';
  import type { Pasted } from '../seats/paste';
  import { chamberPicture, type Theme } from '../seats/picture';
  import { fromGovernment, fromSeatsSection, startFromGovernment, toSeatsSection } from '../seats/profile';
  import { randomElection } from '../seats/random';
  import { count } from '../seats/results';
  import { wikitext } from '../seats/wikitext';
  import ChamberView from './ChamberView.svelte';
  import Coalition from './Coalition.svelte';
  import PasteDialog from './PasteDialog.svelte';
  import Results from './Results.svelte';

  // Passed in by the page: browser code never imports eurth.config.mjs (see the note there).
  let { siteName, siteUrl }: { siteName: string; siteUrl: string } = $props();

  let election = $state<Election>(defaultElection());
  let profile = $state<EurthProfile | null>(null);
  let nation = $state('');
  let ready = $state(false);
  let pasting = $state(false);
  let pictureSize = $state<(typeof PICTURE_SIZES)[number]['id']>('preview');
  let preset = $state('');

  // What is typed may be half-finished: an empty box, a number too large. This is the election as counted.
  const clean = $derived(cleanElection(election));
  const outcome = $derived(count(clean));
  const chamber = $derived(drawChamber(clean.layout, blocksOf(outcome), clean.coalition));
  const words = $derived(description(clean, outcome));
  const heading = $derived(title(clean));
  // Before the page has loaded there is no address to read: the site's own, then.
  const link = $derived(electionLink(clean, ready ? location.href : `${siteUrl}/`));
  const formula = $derived(isFormula(clean.system));
  const typedSeats = $derived(clean.system === 'direct' || clean.system === 'mixed');
  const chosenPreset = $derived(PRESETS.find((p) => p.id === preset));

  onMount(() => {
    // A link is someone else's input: decodeState never throws, and fromCompact cleans every value.
    const arrived = stateFromLocation();
    const linked = arrived ? fromCompact(arrived.value, arrived.version) : null;
    if (linked) election = linked;
    ready = true;
  });

  // The address bar follows the election, so the link can be copied from there too. Browsers
  // limit how often the address may change, so wait until the typing pauses.
  $effect(() => {
    const state = toCompact(clean);
    if (!ready) return;
    const timer = setTimeout(() => stateToLocation(state, { version: LINK_VERSION }), 250);
    return () => clearTimeout(timer);
  });

  // The suite's wink: "Nice." when a party settles on exactly 69 seats.
  const watchers = Array.from({ length: MAX_PARTIES }, () => niceWatcher());
  $effect(() => {
    outcome.parties.forEach((party, i) => watchers[i]?.(party.seats, () => document.querySelector(`[data-seats-of="${i}"]`)));
  });

  // This tool's own: a parliament that becomes hung earns a one-word verdict. Only when an edit
  // tips it over: an election that arrives whole (Random, a paste, a profile) has its own toast.
  let wasHung: boolean | null = null;
  $effect(() => {
    const hung = outcome.hung;
    if (!ready) return;
    const before = wasHung;
    wasHung = hung;
    if (before === null || before || !hung) return;
    const timer = setTimeout(() => toast('Hung.'), 700);
    return () => clearTimeout(timer);
  });

  /** Tidies what was typed once focus leaves a field: names trimmed, numbers clamped. */
  function tidy() {
    election = cleanElection(election);
  }

  /** A new election arrives whole (Random, a paste, a profile): it starts afresh, without a "Hung." */
  function replace(next: Election) {
    wasHung = null;
    election = next;
  }

  function random() {
    replace(randomElection());
    toast('A fresh election. Nobody rigged it.');
  }

  function startAgain() {
    replace(defaultElection());
    preset = '';
    toast('Back to Teland.');
  }

  function addParty() {
    election.parties.push(newParty(clean));
  }

  function usePreset() {
    const chosen = chosenPreset;
    if (!chosen) return;
    election = cleanElection({
      ...clean,
      size: chosen.size,
      system: chosen.system,
      threshold: chosen.threshold,
      bonus: chosen.bonus ?? 0,
      mixedMode: chosen.mixedMode ?? clean.mixedMode,
      listFormula: chosen.listFormula ?? clean.listFormula,
    });
    toast(`${chosen.country}: ${chosen.size} seats. The parties are still yours.`);
  }

  function pasted(result: Pasted) {
    const system = result.hasSeats && isFormula(clean.system) ? 'direct' : clean.system;
    replace(
      cleanElection({
        ...clean,
        system,
        votesAs: result.votesAs,
        coalition: [],
        parties: result.parties.map((p, i) => ({ name: p.name, votes: p.votes, seats: p.seats ?? 0, colour: clean.parties[i]?.colour })),
      }),
    );
    toast(`${result.parties.length} ${result.parties.length === 1 ? 'party' : 'parties'} pasted${result.hasSeats && system === 'direct' ? ', seats and all' : ''}.`);
  }

  // The picture leaves the site in the colours the visitor is looking at.
  function theme(): Theme {
    const chosen = getPrefs().theme;
    return chosen === 'dark' || (chosen !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  const fileName = (ending: string): string => `${fileSlug(clean.chamber, 'chamber')}-seats${ending}`;

  function saveSvg() {
    download(chamberPicture(clean, outcome, { theme: theme() }), fileName('.svg'), 'image/svg+xml');
  }

  async function savePicture(type: 'image/png' | 'image/webp') {
    const size = PICTURE_SIZES.find((s) => s.id === pictureSize) ?? PICTURE_SIZES[0];
    const frame = { width: size.width, height: size.height };
    try {
      const picture = await svgToPicture(chamberPicture(clean, outcome, { theme: theme(), frame }), { ...frame, type, quality: 0.92 });
      download(picture, fileName(`-${size.id}.${type === 'image/png' ? 'png' : 'webp'}`));
    } catch {
      toast("The picture couldn't be made. Try the SVG instead.");
    }
  }

  async function copyWikitext() {
    toast((await copyText(wikitext(clean, outcome))) ? 'Wikitext copied: paste it into your article.' : "That didn't copy. Your browser may not allow it here.");
  }

  function loaded(next: EurthProfile) {
    profile = next;
    nation = next.meta.nation;
    const name = nation || 'Your nation';
    const own = fromSeatsSection(getSection(next, 'seats'));
    if (own) {
      replace(own);
      toast(`${name} is loaded, chamber and all.`);
      return;
    }
    // No seats yet: start from what Governmint wrote, and never change its section.
    const start = fromGovernment(getSection(next, 'government'));
    election = startFromGovernment(clean, start);
    toast(start ? `${name} is loaded. Its legislature starts from Governmint's settings.` : `${name} is loaded. It has no seats yet: this is where they start.`);
  }

  // What "Save profile" writes: this tool's own section, and every other section exactly as it was.
  // The link in the file is always the site's own address, wherever this copy is running.
  const saved = $derived.by(() => {
    const base = profile ?? (nation.trim() ? createProfile(nation.trim()) : null);
    if (!base) return null;
    const section = toSeatsSection(clean, outcome, { link: electionLink(clean, `${siteUrl}/`), previous: getSection(base, 'seats') });
    return setSection(base, 'seats', section as Parameters<typeof setSection<'seats'>>[2]);
  });

  const votesLabel = $derived(election.votesAs === 'percent' ? 'Votes, %' : 'Votes');
  const seatsLabel = $derived(clean.system === 'mixed' ? 'Districts' : 'Seats');
</script>

<div class="calculator">
  <form class="eu-card controls" onsubmit={(e) => e.preventDefault()}>
    <div class="eu-row">
      <button type="button" class="eu-btn" data-click="tumble" onclick={random}><Icon icon={faDice} /> Random</button>
      <button type="button" class="eu-btn" data-click="spin" onclick={startAgain}><Icon icon={faRotateLeft} /> Start again</button>
      <button type="button" class="eu-btn" onclick={() => (pasting = true)}><Icon icon={faPaste} /> Paste results</button>
    </div>

    <fieldset class="group">
      <legend class="eu-label">The chamber</legend>
      <label class="eu-field wide">
        <span class="eu-label">Name</span>
        <input class="eu-input" bind:value={election.chamber} onchange={tidy} maxlength="80" autocomplete="off" placeholder="National Assembly" />
      </label>
      <label class="eu-field wide">
        <span class="eu-label">Election</span>
        <input class="eu-input" bind:value={election.election} onchange={tidy} maxlength="80" autocomplete="off" placeholder="Election 2026" />
      </label>
      <label class="eu-field">
        <span class="eu-label">Seats</span>
        <input class="eu-input eu-input--data" type="number" inputmode="numeric" min="1" max={MAX_SIZE} step="1" bind:value={election.size} onchange={tidy} />
      </label>
      <label class="eu-field wide">
        <span class="eu-label">Start from a real chamber</span>
        <select class="eu-select" bind:value={preset} onchange={usePreset} aria-describedby="preset-help">
          <option value="">Choose one…</option>
          {#each PRESETS as p (p.id)}
            <option value={p.id}>{p.country}, {p.chamber} ({p.size})</option>
          {/each}
        </select>
        <span class="eu-help" id="preset-help">{chosenPreset ? chosenPreset.note : 'Sets the seats, the system and the threshold. Your parties stay.'}</span>
      </label>
    </fieldset>

    <fieldset class="group">
      <legend class="eu-label">The system</legend>
      <label class="eu-field wide">
        <span class="eu-label">How votes become seats</span>
        <select class="eu-select" bind:value={election.system} aria-describedby="system-help">
          {#each SYSTEMS as system (system)}
            <option value={system}>{SYSTEM_LABELS[system]}</option>
          {/each}
        </select>
        <span class="eu-help" id="system-help">
          {#if clean.system === 'direct'}
            For first past the post, or any system counted elsewhere: type the seats each party won.
          {:else if clean.system === 'mixed'}
            Type the district seats each party won; the list seats are worked out from the votes.
          {:else}
            The <a href="/guide/" data-same-tab>guide</a> works through each formula.
          {/if}
        </span>
      </label>
      {#if clean.system === 'mixed'}
        <fieldset class="options wide">
          <legend class="eu-label">List seats</legend>
          <div class="eu-row">
            <label class="eu-pill">
              <input type="radio" name="mixed-mode" value="compensatory" bind:group={election.mixedMode} />
              <span class="eu-check"><Icon icon={faCheck} /></span>
              Top up to a fair share
            </label>
            <label class="eu-pill">
              <input type="radio" name="mixed-mode" value="parallel" bind:group={election.mixedMode} />
              <span class="eu-check"><Icon icon={faCheck} /></span>
              Side by side
            </label>
          </div>
        </fieldset>
        <label class="eu-field wide">
          <span class="eu-label">Formula for the list seats</span>
          <select class="eu-select" bind:value={election.listFormula}>
            {#each FORMULAS as f (f)}
              <option value={f}>{SYSTEM_LABELS[f]}</option>
            {/each}
          </select>
        </label>
      {/if}
      {#if clean.system !== 'direct'}
        <label class="eu-field">
          <span class="eu-label">Threshold, %</span>
          <input class="eu-input eu-input--data" type="number" inputmode="decimal" min="0" max="50" step="0.25" bind:value={election.threshold} onchange={tidy} />
        </label>
      {/if}
      {#if formula}
        <label class="eu-field">
          <span class="eu-label">Bonus seats</span>
          <input class="eu-input eu-input--data" type="number" inputmode="numeric" min="0" max={clean.size} step="1" bind:value={election.bonus} onchange={tidy} aria-describedby="bonus-help" />
        </label>
        <p class="eu-help wide" id="bonus-help">Bonus seats go to the party with the most votes before the rest are shared out. 0 for none.</p>
      {/if}
    </fieldset>

    <fieldset class="group parties">
      <legend class="eu-label">Parties, as they sit from left to right</legend>
      <fieldset class="options wide">
        <legend class="eu-label">Votes are</legend>
        <div class="eu-row">
          <label class="eu-pill">
            <input type="radio" name="votes-as" value="percent" bind:group={election.votesAs} onchange={tidy} />
            <span class="eu-check"><Icon icon={faCheck} /></span>
            Percentages
          </label>
          <label class="eu-pill">
            <input type="radio" name="votes-as" value="counts" bind:group={election.votesAs} onchange={tidy} />
            <span class="eu-check"><Icon icon={faCheck} /></span>
            Counts
          </label>
        </div>
      </fieldset>

      <ol class="list wide">
        {#each election.parties as party, i (i)}
          {@const name = clean.parties[i]?.name ?? `Party ${i + 1}`}
          <li class="party" class:with-seats={typedSeats}>
            <label class="colour">
              <span class="eu-visually-hidden">Colour of {name}</span>
              <input type="color" bind:value={party.colour} />
            </label>
            <label class="eu-field name">
              <span class="eu-label" class:eu-visually-hidden={i > 0}>Party</span>
              <input class="eu-input" bind:value={party.name} onchange={tidy} maxlength="60" autocomplete="off" aria-label="Name of party {i + 1}" />
            </label>
            <label class="eu-field votes">
              <span class="eu-label" class:eu-visually-hidden={i > 0}>{votesLabel}</span>
              <input
                class="eu-input eu-input--data"
                type="number"
                inputmode="decimal"
                min="0"
                step={election.votesAs === 'percent' ? '0.1' : '1'}
                bind:value={party.votes}
                onchange={tidy}
                aria-label="{votesLabel} for {name}"
              />
            </label>
            {#if typedSeats}
              <label class="eu-field seats">
                <span class="eu-label" class:eu-visually-hidden={i > 0}>{seatsLabel}</span>
                <input class="eu-input eu-input--data" type="number" inputmode="numeric" min="0" max={MAX_SIZE} step="1" bind:value={party.seats} onchange={tidy} aria-label="{seatsLabel} won by {name}" />
              </label>
            {/if}
            <div class="tools">
              <button type="button" class="eu-btn eu-btn--quiet eu-btn--icon" aria-label="Move {name} left" disabled={i === 0} onclick={() => (election = moveParty(election, i, -1))}>
                <Icon icon={faArrowLeft} />
              </button>
              <button
                type="button"
                class="eu-btn eu-btn--quiet eu-btn--icon"
                aria-label="Move {name} right"
                disabled={i === election.parties.length - 1}
                onclick={() => (election = moveParty(election, i, 1))}
              >
                <Icon icon={faArrowRight} />
              </button>
              <button type="button" class="eu-btn eu-btn--quiet eu-btn--icon" aria-label="Remove {name}" onclick={() => (election = removeParty(election, i))}>
                <Icon icon={faTrashCan} />
              </button>
            </div>
          </li>
        {/each}
      </ol>
      <div class="eu-row wide">
        <button type="button" class="eu-btn" data-click="bounce" onclick={addParty} disabled={election.parties.length >= MAX_PARTIES}><Icon icon={faPlus} /> Add party</button>
      </div>
    </fieldset>
  </form>

  <section class="result" aria-labelledby="result-title">
    <h2 id="result-title" class="eu-visually-hidden">The chamber</h2>
    {#if heading}
      <p class="heading">
        <strong>{clean.chamber || clean.election}</strong>
        {#if clean.chamber && clean.election}<span class="eu-muted">{clean.election}</span>{/if}
      </p>
    {/if}

    <fieldset class="options">
      <legend class="eu-visually-hidden">Layout of the chamber</legend>
      <div class="eu-row">
        {#each LAYOUTS as layout (layout)}
          <label class="eu-pill">
            <input type="radio" name="layout" value={layout} bind:group={election.layout} />
            <span class="eu-check"><Icon icon={faCheck} /></span>
            {LAYOUT_LABELS[layout]}
          </label>
        {/each}
      </div>
    </fieldset>

    <ChamberView {chamber} parties={outcome.parties} total={outcome.total} majority={outcome.majority} description={chamberDescription(clean, outcome)} />
    {#if clean.layout === 'westminster'}
      <p class="eu-help">Government benches above, opposition below. The parties picked in the coalition builder govern; with none picked, the largest party does.</p>
    {/if}

    <Results election={clean} {outcome} />
    <Coalition {outcome} bind:picks={election.coalition} />

    <section class="take" aria-labelledby="take-title">
      <h2 id="take-title">Take it with you</h2>
      <ShareButtons
        url={link}
        title={heading || `${siteName}: ${summaryLine(outcome)}`}
        text={`${heading ? `${heading}: ` : ''}${summaryLine(outcome)} Made with ${siteName}.`}
        description={() => words}
        picture={() => svgToPicture(chamberPicture(clean, outcome, { theme: theme(), frame: { width: 1200, height: 630 } }), { width: 1200, height: 630 })}
        heading={clean.chamber ? `Share the ${clean.chamber.replace(/^the /i, '')}` : 'Share this chamber'}
        said={{ link: 'Link copied: the whole election is in it.', description: 'Description copied, seat by seat.' }}
      />

      <div class="eu-row downloads">
        <button type="button" class="eu-btn" data-click="bounce" onclick={saveSvg}><Icon icon={faDownload} /> SVG</button>
        <button type="button" class="eu-btn" data-click="bounce" onclick={() => savePicture('image/png')}><Icon icon={faDownload} /> PNG</button>
        <button type="button" class="eu-btn" data-click="bounce" onclick={() => savePicture('image/webp')}><Icon icon={faDownload} /> WebP</button>
        <label class="eu-field size">
          <span class="eu-visually-hidden">Size of the PNG or WebP</span>
          <select class="eu-select" bind:value={pictureSize}>
            {#each PICTURE_SIZES as size (size.id)}
              <option value={size.id}>{size.name}, {size.width} × {size.height}</option>
            {/each}
          </select>
        </label>
      </div>
      <div class="eu-row">
        <button type="button" class="eu-btn" data-click="bounce" onclick={copyWikitext}><Icon icon={faCopy} /> Copy wikitext table</button>
      </div>

      <div class="profile">
        {#if profile}
          <p class="eu-label">Nation: {profile.meta.nation}</p>
        {:else}
          <label class="eu-field">
            <span class="eu-label">Nation, for the profile file</span>
            <input class="eu-input" bind:value={nation} maxlength="80" autocomplete="off" placeholder="Your nation" />
          </label>
        {/if}
        <div class="eu-row">
          <ProfileButtons profile={saved} onload={loaded} onerror={(errors) => toast(errors[0]?.message ?? "That file isn't a nation profile. Pick one that ends in .eurth.json.")} />
        </div>
      </div>
      <p class="eu-help">
        The link holds the whole election. The profile file carries your nation from one Eurth tool to the next; Seats writes only its own section. Nothing is
        kept in this browser.
      </p>
    </section>
  </section>
</div>

<PasteDialog bind:open={pasting} onpaste={pasted} />

<style>
  .calculator {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
    gap: var(--space-6);
    align-items: start;
  }

  .controls {
    gap: var(--space-5);
  }

  p {
    margin: 0;
  }

  /* A group of fields: two to a row, with the wide ones taking the whole row. */
  .group {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .group > legend {
    margin-bottom: var(--space-2);
    padding: 0;
    font: var(--type-heading);
  }

  .wide {
    grid-column: 1 / -1;
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .options > legend {
    padding: 0;
    margin-bottom: var(--space-2);
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* One party: its colour and name on one row, then its numbers and its tools. */
  .party {
    display: grid;
    grid-template-columns: var(--size-target) minmax(0, 1fr) minmax(0, 1fr) auto;
    gap: var(--space-2);
    align-items: end;
  }

  .party .name {
    grid-column: 2 / -1;
  }

  .party .votes {
    grid-column: 2 / span 2;
  }

  .party.with-seats .votes {
    grid-column: 2;
  }

  .party .seats {
    grid-column: 3;
  }

  .party .tools {
    grid-column: 4;
  }

  .colour input {
    display: block;
    width: var(--size-target);
    height: var(--size-target);
    padding: var(--space-1);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-md);
    background: var(--surface);
    cursor: pointer;
  }

  .tools {
    display: flex;
  }

  .result {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    min-width: 0;
  }

  .heading {
    display: flex;
    flex-direction: column;
    font: var(--type-title);
  }

  .heading span {
    font: var(--type-body);
  }

  .take {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .take h2 {
    font: var(--type-heading);
  }

  .downloads .size {
    flex: 1 1 12rem;
  }

  .profile {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  @media (max-width: 900px) {
    .calculator {
      grid-template-columns: minmax(0, 1fr);
    }

    /* On a phone the result comes first: it is what the visitor came for. */
    .result {
      order: -1;
    }
  }
</style>
