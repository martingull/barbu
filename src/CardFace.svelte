<script lang="ts">
  import type { Card, Suit } from "./lessonTypes";

  type Props = {
    card: Card;
    decorative?: boolean;
  };

  let { card, decorative = false }: Props = $props();

  const suitFileNames: Record<Suit, string> = {
    C: "clubs",
    D: "diamonds",
    H: "hearts",
    S: "spades"
  };

  function rankFileName(rank: string) {
    if (rank === "A") {
      return "ace";
    }

    if (rank === "J") {
      return "jack";
    }

    if (rank === "Q") {
      return "queen";
    }

    if (rank === "K") {
      return "king";
    }

    return rank;
  }

  function cardImagePath(card: Card) {
    return `/cards/cards/${rankFileName(card.rank)}_of_${suitFileNames[card.suit]}.png`;
  }

  const imagePath = $derived(cardImagePath(card));
</script>

<img
  alt={decorative ? "" : card.label}
  aria-hidden={decorative}
  class="card-face"
  draggable="false"
  src={imagePath}
/>

<style>
  .card-face {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
    user-select: none;
  }
</style>
