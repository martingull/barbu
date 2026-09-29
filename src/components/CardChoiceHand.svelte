<script lang="ts">
  import CardFace from "./CardFace.svelte";
  import { sortCardsForDisplay } from "../presentation/cardOrdering";
  import type { Card } from "../domain/types";

  type CardClassFlags = Record<string, boolean | undefined>;

  type Props = {
    cards: Card[];
    ariaLabel: string;
    className?: string;
    cardClassName?: string;
    getCardClasses?: (card: Card) => CardClassFlags;
    isPressed?: (card: Card) => boolean;
    onSelect: (card: Card) => void;
    onFocus?: (card: Card) => void;
    cardLabel?: (card: Card) => string;
  };

  let {
    cards,
    ariaLabel,
    className = "hand",
    cardClassName = "card hand-card",
    getCardClasses = () => ({}),
    isPressed = () => false,
    onSelect,
    onFocus,
    cardLabel = card => `${card.rank} ${card.suit}`
  }: Props = $props();

  function buttonClass(card: Card) {
    const flags = getCardClasses(card);
    const dynamicClasses = Object.entries(flags)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);

    return [cardClassName, ...dynamicClasses].join(" ");
  }
</script>

<div class={className} class:has-selection={cards.some(isPressed)} aria-label={ariaLabel}>
  {#each sortCardsForDisplay(cards) as card}
    <button
      aria-label={cardLabel(card)}
      aria-pressed={isPressed(card)}
      class={buttonClass(card)}
      onclick={() => onSelect(card)}
      onfocus={() => onFocus?.(card)}
      type="button"
    >
      <CardFace {card} decorative />
    </button>
  {/each}
</div>
