<script lang="ts">
  /*
   * Paste results from a spreadsheet: one party per line, its name and its votes. What is
   * pasted is read by seats/paste.ts, which cleans and clamps it.
   */
  import { faPaste, faXmark } from '@fortawesome/free-solid-svg-icons';
  import Icon from '@eurth/style/components/Icon.svelte';
  import { parsePaste, type Pasted } from '../seats/paste';

  let { open = $bindable(false), onpaste }: { open: boolean; onpaste: (pasted: Pasted) => void } = $props();

  let dialog: HTMLDialogElement | undefined = $state();
  let text = $state('');
  let error = $state('');
  const read = $derived(text.trim() ? parsePaste(text) : null);

  $effect(() => {
    if (open && dialog && !dialog.open) {
      error = '';
      dialog.showModal();
    }
    if (!open && dialog?.open) dialog.close();
  });

  function use(event: SubmitEvent) {
    event.preventDefault();
    if (!read || read.parties.length === 0) {
      error = 'There are no results to read there. Put one party on each line: its name, then its votes.';
      return;
    }
    onpaste(read);
    text = '';
    open = false;
  }
</script>

<dialog bind:this={dialog} class="eu-dialog" onclose={() => (open = false)} aria-labelledby="paste-title">
  <div class="eu-dialog-top">
    <h2 id="paste-title"><Icon icon={faPaste} /> Paste results</h2>
    <button type="button" class="eu-btn eu-btn--quiet eu-btn--icon" aria-label="Close" onclick={() => (open = false)}><Icon icon={faXmark} /></button>
  </div>
  <form class="eu-stack" onsubmit={use}>
    <label class="eu-field">
      <span class="eu-label">One party on each line: its name, then its votes</span>
      <textarea
        class="eu-textarea eu-input--data"
        rows="8"
        bind:value={text}
        aria-describedby="paste-help"
        aria-invalid={error ? 'true' : undefined}
        placeholder={'Liberal Union\t331,000\nNational Labour\t264,000\nCivic Alliance\t179,000'}
      ></textarea>
      <span class="eu-help" id="paste-help">
        Copy two columns straight from a spreadsheet, or type them with a tab, a comma or a semicolon between. Percentages work too, and a third column is read
        as seats won.
      </span>
    </label>
    <p class="eu-muted" aria-live="polite">
      {#if read && read.parties.length > 0}
        {read.parties.length} {read.parties.length === 1 ? 'party' : 'parties'} read, votes as {read.votesAs === 'percent' ? 'percentages' : 'counts'}{read.hasSeats ? ', with seats' : ''}.
        {#if read.skipped > 0}{read.skipped} {read.skipped === 1 ? 'line' : 'lines'} could not be read and will be left out.{/if}
        {#if read.dropped > 0}Only the first 30 parties fit; {read.dropped} will be left out.{/if}
      {/if}
    </p>
    {#if error}<p class="eu-error" role="alert">{error}</p>{/if}
    <div class="eu-row">
      <button type="submit" class="eu-btn eu-btn--primary">Use these results</button>
      <button type="button" class="eu-btn" onclick={() => (open = false)}>Cancel</button>
    </div>
    <p class="eu-help">This replaces the parties in the calculator. Nothing you paste leaves your device.</p>
  </form>
</dialog>

<style>
  p {
    margin: 0;
  }

  textarea {
    min-height: calc(var(--size-target) * 4);
    white-space: pre;
  }
</style>
