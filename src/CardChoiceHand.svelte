<script lang="ts">
  import CardFace from "./CardFace.svelte";
  import { sortCardsForDisplay } from "./cardOrdering";
  import type { Card } from "./lessonTypes";

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
  };

  let {
    cards,
    ariaLabel,
    className = "hand",
    cardClassName = "card hand-card",
    getCardClasses = () => ({}),
    isPressed = () => false,
    onSelect,
    onFocus
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
      aria-label={`${card.rank} ${card.suit}`}
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
