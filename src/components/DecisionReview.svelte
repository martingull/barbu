<script lang="ts">
  import CardFace from "./CardFace.svelte";
  import type { DecisionReview } from "../lessons/decisionReview";
  import type { DrillResult } from "../lessons/drillDecision";
  import { drillOutcomeLabels } from "../lessons/drillDecision";
  import { formatCardText } from "../presentation/cardDisplay";
  import { sortCardsForDisplay } from "../presentation/cardOrdering";

  let { review, result, index }: { review: DecisionReview; result: DrillResult; index: number } = $props();
</script>

<details class="decision-review">
  <summary>Decision {index + 1}: {formatCardText(result.cardLabel)} <strong>{drillOutcomeLabels[result.outcome]}</strong></summary>
  <div class="review-position" role="region" aria-label={`Decision ${index + 1} review`}>
    <h3>{formatCardText(review.title)}</h3>
    <p>{formatCardText(review.prompt)}</p>
    {#if review.context}<p>{formatCardText(review.context)}</p>{/if}
    {#each review.groups as group}
      {@const columns = Math.max(1, Math.min(group.captions ? 4 : 7, group.cards.length))}
      <div class="review-group" role="group" aria-label={group.label}>
        <h4>{group.label}</h4>
        <div class="review-cards" style={`--review-columns: ${columns}; --review-width: ${columns * 60}px`}>
          {#each group.captions ? group.cards : sortCardsForDisplay(group.cards) as card}
            <figure class:chosen={review.selectedCardIds?.includes(card.id)}>
              <div class="review-card"><CardFace {card} /></div>
              {#if group.captions?.[card.id]}<figcaption>{group.captions[card.id]}</figcaption>{/if}
              {#if review.selectedCardIds?.includes(card.id)}<span class="chosen-label">Chosen</span>{/if}
            </figure>
          {/each}
        </div>
      </div>
    {/each}
    <p class="review-explanation"><strong>Your choice: {formatCardText(result.cardLabel)}.</strong> {formatCardText(review.explanation)}</p>
  </div>
</details>

<style>
  .decision-review { border-bottom: 1px solid #ffffff26; }
  summary { padding: 10px 0; min-height: 44px; cursor: pointer; font-size: 0.875rem; line-height: 1.4; overflow-wrap: anywhere; }
  summary strong { margin-left: 8px; color: #e7c766; }
  .review-position { display: grid; gap: 12px; padding: 8px 0 16px; min-width: 0; }
  h3, h4, p { margin: 0; font-size: 0.875rem; line-height: 1.4; overflow-wrap: anywhere; }
  h4 { margin-bottom: 6px; color: #c1d1bf; font-size: 0.75rem; }
  .review-cards { display: grid; grid-template-columns: repeat(var(--review-columns), minmax(0, 1fr)); gap: 6px; max-width: var(--review-width); }
  figure { margin: 0; min-width: 0; }
  .review-card { aspect-ratio: 5 / 7; border-radius: 4px; }
  .chosen .review-card { outline: 2px solid #e7c766; outline-offset: 1px; }
  figcaption, .chosen-label { display: block; margin-top: 4px; font-size: 0.625rem; line-height: 1.3; overflow-wrap: anywhere; }
  .chosen-label { color: #e7c766; font-size: 0.5625rem; font-weight: 700; white-space: nowrap; }
  .review-explanation { border-top: 1px solid #ffffff26; padding-top: 10px; }
</style>
