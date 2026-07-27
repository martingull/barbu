<script lang="ts">
  import CardChoiceHand from "./CardChoiceHand.svelte";
  import CardFace from "./CardFace.svelte";
  import type { Card, Seat, TableCard } from "./lessonTypes";

  type CardClassFlags = Record<string, boolean | undefined>;

  type Props = {
    ariaLabel?: string;
    dummyHand?: Card[];
    dummyLegalCardIds?: string[];
    dummySelectedCardId?: string;
    isDummyTurn?: boolean;
    isReviewing?: boolean;
    onSelectDummy?: (card: Card) => void | Promise<void>;
    onSelectPlayer?: (card: Card) => void | Promise<void>;
    pendingBySeat?: Partial<Record<Seat, string>>;
    playerHand?: Card[];
    playerLegalCardIds?: string[];
    playerSelectedCardId?: string;
    tableCards: TableCard[];
  };

  let {
    ariaLabel = "Bridge table",
    dummyHand = [],
    dummyLegalCardIds = [],
    dummySelectedCardId = "",
    isDummyTurn = false,
    isReviewing = false,
    onSelectDummy,
    onSelectPlayer,
    pendingBySeat = {},
    playerHand = [],
    playerLegalCardIds = [],
    playerSelectedCardId = "",
    tableCards
  }: Props = $props();

  const defenderBacks = [0, 1, 2, 3, 4, 5];
  const tableSeats: Seat[] = ["Tutor", "Left", "Right", "You"];
  const dummyLegalSet = $derived(new Set(dummyLegalCardIds));
  const playerLegalSet = $derived(new Set(playerLegalCardIds));

  function cardAt(seat: Seat) {
    return tableCards.find((play) => play.seat === seat)?.card;
  }

  function seatLabel(seat: Seat) {
    if (seat === "You") {
      return "Decl.";
    }
    return seat === "Tutor" ? "Dummy" : seat;
  }

  function dummyCardClasses(card: Card): CardClassFlags {
    const canPlay = isDummyTurn && !isReviewing;
    const isLegal = canPlay && dummyLegalSet.has(card.id);

    return {
      heart: card.suit === "H",
      legal: isLegal,
      illegal: canPlay && !isLegal,
      selected: dummySelectedCardId === card.id
    };
  }

  function playerCardClasses(card: Card): CardClassFlags {
    const canPlay = !isDummyTurn && !isReviewing;
    const isLegal = canPlay && playerLegalSet.has(card.id);

    return {
      heart: card.suit === "H",
      legal: isLegal,
      illegal: canPlay && !isLegal,
      selected: playerSelectedCardId === card.id
    };
  }
</script>

<section class="bridge-table" aria-label={ariaLabel}>
  <div class="bridge-seat bridge-seat-north" aria-label="Visible dummy cards">
    <span class="bridge-seat-label">Dummy</span>
    <CardChoiceHand
      cards={dummyHand}
      ariaLabel="Dummy hand"
      className="hand full-hand-cards bridge-table-hand bridge-dummy-action-hand"
      cardClassName="card hand-card full-hand-card bridge-mini-card"
      getCardClasses={dummyCardClasses}
      isPressed={(card) => dummySelectedCardId === card.id}
      onSelect={(card) => {
        if (isDummyTurn && !isReviewing) void onSelectDummy?.(card);
      }}
    />
  </div>

  <div class:active={Boolean(pendingBySeat.Left)} class="bridge-defender bridge-defender-left" aria-label="Left defender">
    <span class="bridge-side-label">Left</span>
    <div class="bridge-back-stack" aria-hidden="true">
      {#each defenderBacks as back}
        <span class="bridge-card-back" style={`--back: ${back}`}></span>
      {/each}
    </div>
  </div>

  <div class="bridge-trick-cluster" aria-label="Current trick">
    {#each tableSeats as seat}
      {@const tableCard = cardAt(seat)}
      <div class={`bridge-trick-slot bridge-trick-${seat.toLowerCase()}`} class:occupied={Boolean(tableCard)}>
        {#if tableCard}
          <div class:heart={tableCard.suit === "H"} class="bridge-trick-card">
            <CardFace card={tableCard} />
          </div>
        {/if}
        <span>{seatLabel(seat)}</span>
      </div>
    {/each}
  </div>

  <div class:active={Boolean(pendingBySeat.Right)} class="bridge-defender bridge-defender-right" aria-label="Right defender">
    <span class="bridge-side-label">Right</span>
    <div class="bridge-back-stack" aria-hidden="true">
      {#each defenderBacks as back}
        <span class="bridge-card-back" style={`--back: ${back}`}></span>
      {/each}
    </div>
  </div>

  <div class:active={Boolean(pendingBySeat.You)} class="bridge-seat bridge-seat-south">
    <span class="bridge-seat-label">Declarer</span>
    <CardChoiceHand
      cards={playerHand}
      ariaLabel="Declarer Bridge hand"
      className="hand full-hand-cards bridge-table-hand bridge-player-table-hand"
      cardClassName="card hand-card full-hand-card bridge-mini-card"
      getCardClasses={playerCardClasses}
      isPressed={(card) => playerSelectedCardId === card.id}
      onSelect={(card) => {
        if (!isDummyTurn && !isReviewing) void onSelectPlayer?.(card);
      }}
    />
  </div>
</section>

<style>
  .bridge-table {
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr) 48px;
    grid-template-rows: auto minmax(126px, 1fr) auto;
    gap: 6px;
    align-self: start;
    width: 100%;
    min-height: 438px;
    padding: 7px;
    overflow: hidden;
    border: 1px solid rgba(245, 241, 207, 0.7);
    border-radius: 18px;
    background: #223328;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.18),
      0 10px 24px rgba(4, 18, 11, 0.18);
  }

  .bridge-seat {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .bridge-seat-north,
  .bridge-seat-south {
    grid-column: 1 / -1;
    justify-items: center;
  }

  .bridge-seat-south {
    align-self: end;
  }

  .bridge-seat-label,
  .bridge-side-label,
  .bridge-trick-slot > span {
    color: #f5f1cf;
    font-size: 0.6rem;
    font-weight: 900;
    line-height: 1;
    text-transform: uppercase;
    text-shadow: 0 1px 3px rgba(8, 19, 13, 0.72);
  }

  .bridge-defender {
    display: grid;
    gap: 6px;
    align-self: center;
    justify-items: center;
    min-width: 0;
  }

  .bridge-defender-left {
    grid-column: 1;
    grid-row: 2;
  }

  .bridge-defender-right {
    grid-column: 3;
    grid-row: 2;
  }

  .bridge-defender.active .bridge-side-label,
  .bridge-seat.active .bridge-seat-label {
    color: #f6d56d;
  }

  .bridge-back-stack {
    position: relative;
    width: 32px;
    height: 58px;
  }

  .bridge-card-back {
    position: absolute;
    top: calc(var(--back) * 4px);
    left: 50%;
    width: 30px;
    aspect-ratio: 5 / 7;
    border: 2px solid rgba(255, 255, 255, 0.92);
    border-radius: 5px;
    background:
      linear-gradient(45deg, rgba(255, 255, 255, 0.18) 25%, transparent 25% 50%, rgba(255, 255, 255, 0.18) 50% 75%, transparent 75%),
      #c72f35;
    background-size: 10px 10px;
    box-shadow: 0 5px 10px rgba(4, 18, 11, 0.28);
    transform: translateX(-50%);
  }

  .bridge-trick-cluster {
    position: relative;
    grid-column: 2;
    grid-row: 2;
    align-self: stretch;
    min-height: 98px;
    border: 1px solid rgba(245, 241, 207, 0.24);
    border-radius: 999px / 62%;
    background: rgba(18, 56, 27, 0.14);
  }

  .bridge-trick-slot {
    position: absolute;
    display: grid;
    width: 48px;
    min-height: 58px;
    justify-items: center;
    align-content: center;
    gap: 2px;
    border: 1px dashed rgba(245, 241, 207, 0.34);
    border-radius: 8px;
    background: rgba(16, 54, 26, 0.12);
  }

  .bridge-trick-slot.occupied {
    border-color: rgba(245, 241, 207, 0.54);
    background: rgba(16, 54, 26, 0.22);
  }

  .bridge-trick-tutor {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
  }

  .bridge-trick-left {
    top: 50%;
    left: 0;
    transform: translateY(-50%);
  }

  .bridge-trick-right {
    top: 50%;
    right: 0;
    transform: translateY(-50%);
  }

  .bridge-trick-you {
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
  }

  .bridge-trick-card {
    display: grid;
    width: 34px;
    aspect-ratio: 5 / 7;
    place-items: center;
    border-radius: 6px;
    filter: drop-shadow(0 9px 14px rgba(4, 18, 11, 0.26));
  }

  .bridge-table :global(.bridge-table-hand.full-hand-cards) {
    position: static;
    right: auto;
    bottom: auto;
    left: auto;
    z-index: auto;
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 44px));
    gap: 3px 4px;
    justify-content: center;
    align-content: start;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow: visible;
    padding: 1px 0;
  }

  .bridge-table :global(.bridge-table-hand .hand-card) {
    width: 100%;
    min-width: 0;
  }

  .bridge-table :global(.bridge-table-hand .hand-card.legal) {
    box-shadow:
      0 0 0 2px rgba(245, 241, 207, 0.95),
      0 8px 16px rgba(4, 18, 11, 0.22);
  }
</style>
