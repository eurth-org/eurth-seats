<script lang="ts">
  /*
   * The chamber on the page: the same geometry as the exported picture (seats/chamber.ts),
   * drawn in the theme's tokens, with the signature touch: seats fill in party by party, from
   * left to right. Only seats that changed hands fill in again, so typing a number doesn't
   * redraw the whole house. The stylesheet stills the animation for reduced motion.
   *
   * Colour is never the only key: the key under the chamber names every block, and the whole
   * picture has a written description.
   */
  import type { Chamber } from '../seats/chamber';
  import { formatNumber } from '../seats/format';

  let {
    chamber,
    parties,
    total,
    majority,
    description,
  }: {
    chamber: Chamber;
    /** Name and colour by party index. */
    parties: { name: string; colour: string; seats: number }[];
    total: number;
    majority: number;
    /** What the picture shows, in words. */
    description: string;
  } = $props();

  const count = $derived(chamber.seats.length);
  // The whole fill takes under half a second, however large the chamber; very large ones just appear.
  const animated = $derived(count <= 1200);
  const outline = $derived(Math.min(2.5, Math.max(1, chamber.radius * 0.09)));
  const floor = $derived(chamber.floor && chamber.floor.width >= 150 ? chamber.floor : null);
  const drawn = $derived.by(() => {
    const seen = new Map<number, number>();
    for (const seat of chamber.seats) seen.set(seat.party, (seen.get(seat.party) ?? 0) + 1);
    return [...seen].map(([party, seats]) => ({ party, seats, name: parties[party]?.name ?? 'Vacant', colour: parties[party]?.colour ?? null }));
  });
</script>

<figure class="chamber">
  <div class="frame">
    <svg viewBox="0 0 {chamber.width} {chamber.height}" role="img" aria-label={description}>
      {#each chamber.marks as mark}
        <line class="majority" x1={mark.x1} y1={mark.y1} x2={mark.x2} y2={mark.y2} />
      {/each}
      {#each chamber.seats as seat (`${chamber.layout}:${count}:${seat.order}:${seat.party}`)}
        <circle
          class={['seat', animated && 'fills']}
          cx={seat.x}
          cy={seat.y}
          r={chamber.radius - outline / 2}
          fill={parties[seat.party]?.colour ?? 'none'}
          stroke-width={outline}
          style:--d="{Math.round((seat.order / Math.max(1, count)) * 280)}ms"
        />
      {/each}
    </svg>
    <!-- The size of the chamber, on its open floor. Real text, so it never shrinks with the picture. -->
    {#if floor}
      <p class="floor" aria-hidden="true" style:left="{(floor.x / chamber.width) * 100}%" style:top="{(floor.y / chamber.height) * 100}%">
        <strong>{formatNumber(total)}</strong>
        <span>{total === 1 ? 'seat' : 'seats'} · {formatNumber(majority)} for a majority</span>
      </p>
    {/if}
  </div>
  <figcaption>
    {#if !floor}
      <p class="eu-muted">{formatNumber(total)} {total === 1 ? 'seat' : 'seats'} · {formatNumber(majority)} for a majority</p>
    {/if}
    <ul class="key">
      {#each drawn as block (block.party)}
        <li><span class="eu-swatch" class:empty={block.colour === null} style:--swatch={block.colour ?? 'transparent'}></span> {block.name} <strong>{formatNumber(block.seats)}</strong></li>
      {/each}
    </ul>
  </figcaption>
</figure>

<style>
  .chamber {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin: 0;
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
    max-height: 70vh;
  }

  .frame {
    position: relative;
  }

  .seat {
    stroke: var(--line-strong);
  }

  .floor {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: max-content;
    max-width: 44%;
    margin: 0;
    transform: translate(-50%, -50%);
    text-align: center;
    color: var(--ink-muted);
    font: var(--type-note);
  }

  .floor strong {
    color: var(--ink);
    font: var(--type-title-lg);
  }

  .seat.fills {
    transform-box: fill-box;
    transform-origin: center;
    animation: seat-in 160ms ease-out both;
    animation-delay: var(--d);
  }

  @keyframes seat-in {
    from {
      opacity: 0;
      transform: scale(0.2);
    }
  }

  .majority {
    stroke: var(--ink-muted);
    stroke-width: 3;
    stroke-dasharray: 8 6;
  }

  figcaption {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    text-align: center;
  }

  figcaption p {
    margin: 0;
  }

  .key {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-2) var(--space-5);
    margin: 0;
    padding: 0;
    list-style: none;
    font: var(--type-label);
  }

  .key li {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
  }

  .eu-swatch.empty {
    border-style: dashed;
  }
</style>
