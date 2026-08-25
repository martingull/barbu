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
    dummySeat?: Seat;
    dummySeatLabel?: string;
    declarerSeat?: Seat;
    isDummyTurn?: boolean;
    isReviewing?: boolean;
    onSelectDummy?: (card: Card) => void | Promise<void>;
    pendingBySeat?: Partial<Record<Seat, string>>;
    playerRoleLabel?: string;
    tableCards: TableCard[];
  };

  let {
    ariaLabel = "Bridge table",
    dummyHand = [],
    dummyLegalCardIds = [],
    dummySelectedCardId = "",
    dummySeat = "Tutor",
    dummySeatLabel = "Dummy",
    declarerSeat = "You",
    isDummyTurn = false,
    isReviewing = false,
    onSelectDummy,
    pendingBySeat = {},
    playerRoleLabel = "Declarer",
    tableCards
  }: Props = $props();

  const tableSeats: Seat[] = ["Tutor", "Left", "Right", "You"];
  const compassSeatLabels: Record<Seat, string> = {
    Tutor: "North",
    Right: "East",
    You: "South",
    Left: "West"
  };
  const dummyLegalSet = $derived(new Set(dummyLegalCardIds));
  const showNorthHand = $derived(dummySeat !== "You");
  const northHandLabel = $derived(showNorthHand ? dummySeatLabel : seatRoleLabel("Tutor"));

  function cardAt(seat: Seat) {
    return tableCards.find((play) => play.seat === seat)?.card;
  }

  function handRoleLabel(seat: Seat) {
    if (seat === dummySeat) {
      return "Dummy";
    }

    if (seat === declarerSeat) {
      return "Declarer";
    }

    return seat === "You" ? (playerRoleLabel.includes("Declarer") ? "Declarer" : "Defender") : "Defender";
  }

  function seatRoleLabel(seat: Seat) {
    return `${compassLabel(seat)} ${handRoleLabel(seat)}`;
  }

  function compassLabel(seat: Seat) {
    return compassSeatLabels[seat];
  }

  function tableRoleLabel(seat: Seat) {
    if (seat === dummySeat) {
      return "Dummy";
    }

    if (seat === declarerSeat) {
      return "Decl.";
    }

    return "Def.";
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

</script>

<section class="bridge-table" aria-label={ariaLabel}>
  <div class="bridge-seat bridge-seat-north" aria-label="Visible dummy cards">
    <span class="bridge-seat-label">{northHandLabel}</span>
    {#if showNorthHand && dummyHand.length}
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
    {:else if showNorthHand}
      <div class="bridge-dummy-hidden" aria-label="Dummy hidden">Dummy appears after the opening lead.</div>
    {:else}
      <div class="bridge-dummy-hidden" aria-label="North hand hidden">Declarer's hand stays hidden.</div>
    {/if}
  </div>

  <div class="bridge-felt" aria-label="Current Bridge table">
    <div class="bridge-trick-cluster" aria-label="Current trick">
      {#each tableSeats as seat}
        {@const tableCard = cardAt(seat)}
        <div
          class={`bridge-trick-slot bridge-trick-${seat.toLowerCase()}`}
          class:active={Boolean(pendingBySeat[seat])}
          class:occupied={Boolean(tableCard)}
        >
          <div class="bridge-trick-card-space">
            {#if tableCard}
              <div class:heart={tableCard.suit === "H"} class="bridge-trick-card">
                <CardFace card={tableCard} />
              </div>
            {/if}
          </div>
          <span>{compassLabel(seat)}</span>
          <small>{tableRoleLabel(seat)}</small>
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  .bridge-table {
    --bridge-felt-min-height: 148px;
    --bridge-hand-height: 123px;
    --bridge-mini-card-width: 42px;
    --bridge-seat-label-size: 0.54rem;
    --bridge-trick-card-width: 29px;
    --bridge-trick-card-space-width: 31px;
    --bridge-trick-card-space-height: 38px;
    --bridge-trick-slot-width: 48px;
    --bridge-trick-slot-min-height: 58px;
    display: grid;
    grid-template-rows: var(--bridge-hand-height) minmax(0, 1fr);
    gap: 6px;
    align-self: start;
    width: 100%;
    min-height: 438px;
    padding: 0;
    overflow: visible;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .bridge-felt {
    display: grid;
    min-height: var(--bridge-felt-min-height);
    padding: 7px;
    border: 1px solid #bec8b6;
    border-radius: 8px;
    background:
      radial-gradient(circle at center, rgba(255, 255, 255, 0.14), transparent 58%),
      #386b54;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
    overflow: hidden;
  }

  .bridge-seat {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .bridge-dummy-hidden {
    display: grid;
    align-items: center;
    justify-items: center;
    width: 100%;
    height: var(--bridge-hand-height);
    padding: 8px 10px;
    border: 1px dashed rgba(245, 241, 207, 0.42);
    border-radius: 8px;
    background: rgba(56, 107, 84, 0.42);
    color: rgba(245, 241, 207, 0.86);
    font-size: 0.74rem;
    font-weight: 800;
    text-align: center;
  }

  .bridge-seat-north {
    justify-items: center;
  }

  .bridge-seat-label,
  .bridge-trick-slot > span,
  .bridge-trick-slot > small {
    color: #f5f1cf;
    font-weight: 900;
    line-height: 1;
    text-transform: uppercase;
    text-shadow: 0 1px 3px rgba(8, 19, 13, 0.72);
  }

  .bridge-seat-label {
    font-size: var(--bridge-seat-label-size);
    opacity: 0.9;
  }

  .bridge-trick-slot.active > span {
    color: #f6d56d;
  }

  .bridge-trick-cluster {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
  }

  .bridge-trick-slot {
    position: absolute;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto auto;
    width: var(--bridge-trick-slot-width);
    min-height: var(--bridge-trick-slot-min-height);
    justify-items: center;
    align-content: stretch;
    gap: 2px;
    padding: 0;
    border: 0;
    background: transparent;
  }

  .bridge-trick-slot.occupied {
    background: transparent;
  }

  .bridge-trick-tutor {
    top: 2px;
    left: 50%;
    transform: translateX(-50%);
  }

  .bridge-trick-left {
    top: 50%;
    left: 18%;
    transform: translateY(-50%);
  }

  .bridge-trick-right {
    top: 50%;
    right: 18%;
    transform: translateY(-50%);
  }

  .bridge-trick-you {
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
  }

  .bridge-trick-card {
    display: grid;
    width: var(--bridge-trick-card-width);
    aspect-ratio: 5 / 7;
    place-items: center;
    border-radius: 6px;
    filter: drop-shadow(0 9px 14px rgba(4, 18, 11, 0.26));
  }

  .bridge-trick-card-space {
    display: grid;
    width: var(--bridge-trick-card-space-width);
    min-height: var(--bridge-trick-card-space-height);
    place-items: center;
  }

  .bridge-trick-slot:not(.occupied) .bridge-trick-card-space {
    border: 1px dashed rgba(245, 241, 207, 0.36);
    border-radius: 7px;
    background: rgba(8, 30, 21, 0.12);
  }

  .bridge-trick-slot > span {
    font-size: 0.58rem;
  }

  .bridge-trick-slot > small {
    color: rgba(245, 241, 207, 0.78);
    font-size: 0.48rem;
  }

  .bridge-table :global(.bridge-table-hand.full-hand-cards) {
    position: static;
    right: auto;
    bottom: auto;
    left: auto;
    z-index: auto;
    display: grid;
    grid-template-columns: repeat(7, var(--bridge-mini-card-width));
    gap: 3px 4px;
    justify-content: center;
    align-content: flex-start;
    width: 100%;
    max-width: 100%;
    height: var(--bridge-hand-height);
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    padding: 1px 0;
  }

  .bridge-table :global(.bridge-table-hand .hand-card) {
    width: var(--bridge-mini-card-width);
    min-width: 0;
  }

  .bridge-table :global(.bridge-table-hand .hand-card.legal) {
    box-shadow:
      0 0 0 2px rgba(245, 241, 207, 0.95),
      0 8px 16px rgba(4, 18, 11, 0.22);
  }
</style>
