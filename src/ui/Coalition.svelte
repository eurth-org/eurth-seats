<script lang="ts">
  /*
   * The coalition builder: pick parties and read, in words, whether they have a majority
   * together and by how much. The smallest majorities are offered as shortcuts.
   */
  import { faCheck, faHandshake } from '@fortawesome/free-solid-svg-icons';
  import Icon from '@eurth/style/components/Icon.svelte';
  import { coalition, minimalWinning } from '../seats/coalition';
  import type { Outcome } from '../seats/results';

  let { outcome, picks = $bindable() }: { outcome: Outcome; picks: number[] } = $props();

  const seated = $derived(outcome.parties.filter((p) => p.seats > 0));
  const picked = $derived(coalition(outcome, picks));
  const smallest = $derived(minimalWinning(outcome, 6));
  const same = (a: number[], b: number[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);

  function toggle(index: number) {
    picks = picks.includes(index) ? picks.filter((i) => i !== index) : [...picks, index].sort((a, b) => a - b);
  }
</script>

<section class="eu-card" aria-labelledby="coalition-title">
  <h3 class="eu-card-title" id="coalition-title"><Icon icon={faHandshake} /> Coalition builder</h3>
  <p class="eu-help">Pick parties to see whether they have a majority together, and by how many seats.</p>
  {#if seated.length === 0}
    <p class="eu-muted">Once seats are filled, pick parties here to see whether they have a majority together.</p>
  {:else}
    <div class="eu-row" role="group" aria-labelledby="coalition-title">
      {#each seated as party (party.index)}
        <label class="eu-pill">
          <input type="checkbox" checked={picks.includes(party.index)} onchange={() => toggle(party.index)} />
          <span class="eu-check"><Icon icon={faCheck} /></span>
          <span class="eu-swatch" style:--swatch={party.colour}></span>
          {party.name}
          <span class="eu-data">{party.seats}</span>
        </label>
      {/each}
    </div>
    <p class="verdict" aria-live="polite">{picked.text}</p>
    {#if smallest.length > 0 && !(smallest.length === 1 && smallest[0]!.length === 1)}
      <div class="eu-stack shortcuts">
        <p class="eu-label" id="smallest-title">Smallest majorities</p>
        <ul aria-labelledby="smallest-title">
          {#each smallest as members (members.join('-'))}
            <li>
              <button type="button" class="eu-btn eu-btn--quiet" aria-pressed={same(members, picked.members)} onclick={() => (picks = members)}>
                {members.map((i) => outcome.parties[i]!.name).join(' + ')}
                <span class="eu-data">{members.reduce((sum, i) => sum + outcome.parties[i]!.seats, 0)}</span>
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  {/if}
</section>

<style>
  p {
    margin: 0;
  }

  .verdict {
    font: var(--type-lead);
  }

  .shortcuts {
    gap: var(--space-1);
  }

  ul {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  ul .eu-btn {
    height: auto;
    min-height: var(--size-target);
    text-align: start;
    white-space: normal;
  }
</style>
