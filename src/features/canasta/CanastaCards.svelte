<script lang="ts">
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import type { Card } from "../../domain/types";
  import { formatCardLabel } from "../../presentation/cardDisplay";
  let { cards, selected = [], legal, onSelect = () => {}, label = "Your Canasta hand" }: {
    cards: Card[]; selected?: string[]; legal?: string[]; onSelect?: (card: Card) => void; label?: string;
  } = $props();
</script>
<div class="canasta-hand-scroll">
  <CardChoiceHand {cards} ariaLabel={label} className="canasta-cards" cardClassName="card hand-card canasta-card"
    cardLabel={card => `${formatCardLabel(card)}, pack ${Number(card.id[0]) + 1}`}
    {onSelect} isPressed={card => selected.includes(card.id)}
    getCardClasses={card => ({ selected: selected.includes(card.id), legal: !legal || legal.includes(card.id), illegal: !!legal && !legal.includes(card.id) })} />
</div>
<style>
  .canasta-hand-scroll { height: var(--canasta-hand-height, 164px); overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; padding: 3px; border-block: 1px solid #ffffff26; }
  :global(.canasta-cards) { display: grid; grid-template-columns: repeat(auto-fit, minmax(42px, 1fr)); gap: 6px 4px; align-content: start; }
  :global(.canasta-cards .canasta-card) { width: 100%; max-width: 58px; height: auto; aspect-ratio: 500 / 726; min-width: 0; min-height: 0; padding: 0; border: 0; border-radius: 3px; background: transparent; box-shadow: none; transform: none; justify-self: center; }
  :global(.canasta-cards.has-selection .canasta-card:not(.selected)), :global(.canasta-cards .canasta-card.illegal) { opacity: 0.42; }
  :global(.canasta-cards .canasta-card.selected) { opacity: 1; outline: 2px solid #f5f1cf; outline-offset: 1px; transform: none; }
  :global(.canasta-cards .canasta-card:focus-visible) { outline: 2px solid #f5f1cf; outline-offset: 1px; }
</style>
