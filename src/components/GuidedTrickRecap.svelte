<script lang="ts">
  import CardFace from "./CardFace.svelte";
  import type { TableCard } from "../domain/types";
  import { scoreSeatLabel } from "../presentation/scorePresentation";
  let { moments }: { moments: { number: number; title: string; summary: string; explanation: string; cards: TableCard[] }[] } = $props();
</script>

<section class="guided-recap" aria-label="Your hand in review">
  <h3>Your hand in review</h3>
  {#each moments as moment}
    <div class="recap-moment">
      <h4>Trick {moment.number}: {moment.title}</h4>
      <p>{moment.summary}</p>
      <details>
        <summary>See trick {moment.number}</summary>
        <p>{moment.explanation}</p>
        <div class="recap-cards" aria-label={`Trick ${moment.number} cards in play order`}>
          {#each moment.cards as play}
            <div><div class="recap-card"><CardFace card={play.card} /></div><span>{scoreSeatLabel(play.seat)}</span></div>
          {/each}
        </div>
      </details>
    </div>
  {/each}
</section>

<style>
  .guided-recap { min-width: 0; }
  h3 { font-size: 1rem; margin: 8px 0; }
  .recap-moment { border-top: 1px solid #ffffff26; padding-top: 8px; }
  h4 { font-size: 0.875rem; margin: 0; }
  summary { min-height: 44px; align-content: center; cursor: pointer; font-weight: 700; }
  p { font-size: 0.875rem; line-height: 1.5; margin: 8px 0; }
  .recap-cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; max-width: 320px; margin: 12px 0; }
  .recap-cards > div { display: grid; gap: 4px; text-align: center; font-size: 0.75rem; min-width: 0; }
  .recap-card { aspect-ratio: 5 / 7; }
</style>
