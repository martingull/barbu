<script lang="ts">
  import type { TableCard } from "../../domain/types";
  import { cardRank } from "../../domain/trickTakingRules";
  import { dominoSuitLabel, dominoLaneText } from "./barbuPresentation";
  let { cards, label }: { cards: TableCard[]; label: string } = $props();
  let lanes = $derived(["C", "D", "H", "S"].map(suit =>
    cards.filter(play => play.card.suit === suit).map(play => play.card).sort((a, b) => cardRank(a) - cardRank(b))));
</script>

<div class="domino-layout" aria-label={label}>
  {#each lanes as lane, index}
    <div><span>{dominoSuitLabel(index)}</span><strong>{dominoLaneText(lane)}</strong></div>
  {/each}
</div>
