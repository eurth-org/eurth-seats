<script lang="ts">
  /*
   * The results table: votes, seats, each party's share of both and the difference, with the
   * method explained in one sentence underneath, and a note for anything unusual.
   */
  import { issueNotes } from '../seats/describe';
  import { formatNumber, formatPercent, formatPoints, formatShare } from '../seats/format';
  import type { Election } from '../seats/model';
  import { methodSentence, type Outcome } from '../seats/results';

  let { election, outcome }: { election: Election; outcome: Outcome } = $props();

  const hasVotes = $derived(outcome.totalVotes > 0);
  const counts = $derived(election.votesAs === 'counts');
  const mixed = $derived(election.system === 'mixed');
  const notes = $derived(issueNotes(election, outcome));
  const sum = (pick: (p: Outcome['parties'][number]) => number): number => outcome.parties.reduce((total, p) => total + pick(p), 0);
</script>

<section class="results" aria-labelledby="results-title">
  <h2 id="results-title">Results</h2>
  <div class="eu-scroll">
    <table>
      <thead>
        <tr>
          <th scope="col">Party</th>
          {#if hasVotes && counts}<th scope="col" class="n">Votes</th>{/if}
          {#if hasVotes}<th scope="col" class="n">Vote share</th>{/if}
          {#if mixed}
            <th scope="col" class="n">Districts</th>
            <th scope="col" class="n">List</th>
          {/if}
          <th scope="col" class="n">Seats</th>
          <th scope="col" class="n">Seat share</th>
          {#if hasVotes}<th scope="col" class="n"><abbr title="Seat share minus vote share, in percentage points">Difference</abbr></th>{/if}
        </tr>
      </thead>
      <tbody>
        {#each outcome.parties as party (party.index)}
          <tr>
            <th scope="row">
              <span class="eu-chip" style:--chip={party.colour}>{party.name}</span>
              {#if !party.qualified && party.votes > 0}
                <span class="eu-help">below the {formatPercent(election.threshold)} threshold</span>
              {/if}
              {#if party.bonus > 0}<span class="eu-help">includes {party.bonus} bonus {party.bonus === 1 ? 'seat' : 'seats'}</span>{/if}
              {#if party.overhang > 0}<span class="eu-help">{party.overhang} overhang</span>{/if}
            </th>
            {#if hasVotes && counts}<td class="n">{formatNumber(party.votes)}</td>{/if}
            {#if hasVotes}<td class="n">{party.voteShare === null ? '' : formatShare(party.voteShare)}</td>{/if}
            {#if mixed}
              <td class="n">{party.district}</td>
              <td class="n">{party.list}</td>
            {/if}
            <td class="n seats" data-seats-of={party.index}><strong>{formatNumber(party.seats)}</strong></td>
            <td class="n">{party.seatShare === null ? '' : formatShare(party.seatShare)}</td>
            {#if hasVotes}<td class="n">{party.difference === null ? '' : formatPoints(party.difference)}</td>{/if}
          </tr>
        {/each}
        {#if outcome.vacant > 0}
          <tr>
            <th scope="row">Vacant</th>
            {#if hasVotes && counts}<td></td>{/if}
            {#if hasVotes}<td></td>{/if}
            {#if mixed}<td></td><td></td>{/if}
            <td class="n">{formatNumber(outcome.vacant)}</td>
            <td></td>
            {#if hasVotes}<td></td>{/if}
          </tr>
        {/if}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Total</th>
          {#if hasVotes && counts}<td class="n">{formatNumber(outcome.totalVotes)}</td>{/if}
          {#if hasVotes}<td class="n">100.0%</td>{/if}
          {#if mixed}
            <td class="n">{sum((p) => p.district)}</td>
            <td class="n">{sum((p) => p.list)}</td>
          {/if}
          <td class="n"><strong>{formatNumber(outcome.total)}</strong></td>
          <td class="n">{outcome.seated > 0 ? '100.0%' : ''}</td>
          {#if hasVotes}<td></td>{/if}
        </tr>
      </tfoot>
    </table>
  </div>

  <p class="method">{methodSentence(election)}</p>
  {#if outcome.gallagher !== null}
    <p class="eu-muted">
      Disproportionality (<a href="/glossary/#gallagher-index" data-same-tab>Gallagher index</a>): <span class="eu-data">{outcome.gallagher.toFixed(1)}</span>. 0 is a perfect match of
      seats to votes.
    </p>
  {/if}
  <!-- Said aloud when it changes: a tie or a vacancy is news. -->
  <div aria-live="polite">
    {#each notes as note}
      <p class="note">{note}</p>
    {/each}
  </div>
</section>

<style>
  .results {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  h2 {
    font: var(--type-heading);
  }

  p {
    margin: 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--line);
    text-align: start;
    vertical-align: top;
  }

  thead th {
    font: var(--type-label);
    color: var(--ink-muted);
    vertical-align: bottom;
  }

  tbody th {
    font: var(--type-body);
  }

  tbody th .eu-help {
    display: block;
  }

  tfoot th,
  tfoot td {
    border-bottom: 0;
    font: var(--type-label);
  }

  .n {
    text-align: end;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .note {
    color: var(--caution-text);
  }

  .note::before {
    content: 'Note: ';
    font-weight: 700;
  }
</style>
