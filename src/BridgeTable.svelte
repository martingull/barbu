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
    onSelectPlayer?: (card: Card) => void | Promise<void>;
    pendingBySeat?: Partial<Record<Seat, string>>;
    playerHand?: Card[];
    playerLegalCardIds?: string[];
    playerSeatLabel?: string;
    playerSelectedCardId?: string;
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
    onSelectPlayer,
    pendingBySeat = {},
    playerHand = [],
    playerLegalCardIds = [],
    playerSeatLabel = "South",
    playerSelectedCardId = "",
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
  const playerLegalSet = $derived(new Set(playerLegalCardIds));
  const southIsDummy = $derived(dummySeat === "You");
  const showNorthHand = $derived(dummySeat !== "You");
  const southHand = $derived(southIsDummy ? dummyHand : playerHand);
  const southSelectedCardId = $derived(southIsDummy ? dummySelectedCardId : playerSelectedCardId);
  const northHandLabel = $derived(showNorthHand ? dummySeatLabel : seatRoleLabel("Tutor"));
  const southSeatLabel = $derived(seatRoleLabel("You"));
  const southAriaLabel = $derived(southIsDummy ? "South dummy hand" : `${playerSeatLabel} Bridge hand`);

  function cardAt(seat: Seat) {
    return tableCards.find((play) => play.seat === seat)?.card;
  }

  function seatLabel(seat: Seat) {
    const label = compassSeatLabels[seat];

    if (seat === dummySeat) {
      return `${label} Dummy`;
    }

    if (seat === declarerSeat) {
      return `${label} Decl.`;
    }

    return label;
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

  function playerCardClasses(card: Card): CardClassFlags {
    const canPlay = (southIsDummy ? isDummyTurn : !isDummyTurn) && !isReviewing;
    const isLegal = canPlay && (southIsDummy ? dummyLegalSet : playerLegalSet).has(card.id);

    return {
      heart: card.suit === "H",
      legal: isLegal,
      illegal: canPlay && !isLegal,
      selected: southSelectedCardId === card.id
    };
  }

  function selectSouthCard(card: Card) {
    if (southIsDummy) {
      if (isDummyTurn && !isReviewing) void onSelectDummy?.(card);
      return;
    }

    if (!isDummyTurn && !isReviewing) void onSelectPlayer?.(card);
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

  <div class:active={Boolean(pendingBySeat.You)} class="bridge-seat bridge-seat-south">
    <span class="bridge-seat-label">{southSeatLabel}</span>
    <CardChoiceHand
      cards={southHand}
      ariaLabel={southAriaLabel}
      className="hand full-hand-cards bridge-table-hand bridge-player-table-hand"
      cardClassName="card hand-card full-hand-card bridge-mini-card"
      getCardClasses={playerCardClasses}
      isPressed={(card) => southSelectedCardId === card.id}
      onSelect={selectSouthCard}
    />
  </div>
</section>

<style>
  .bridge-table {
    display: grid;
    grid-template-rows: auto minmax(148px, 1fr) auto;
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
    display: block;
    min-height: 148px;
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
    min-height: 123px;
    padding: 8px 10px;
    border: 1px dashed rgba(245, 241, 207, 0.42);
    border-radius: 8px;
    background: rgba(56, 107, 84, 0.42);
    color: rgba(245, 241, 207, 0.86);
    font-size: 0.74rem;
    font-weight: 800;
    text-align: center;
  }

  .bridge-seat-north,
  .bridge-seat-south {
    justify-items: center;
  }

  .bridge-seat-south {
    align-self: end;
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
    font-size: 0.54rem;
    opacity: 0.9;
  }

  .bridge-seat.active .bridge-seat-label,
  .bridge-trick-slot.active > span {
    color: #f6d56d;
  }

  .bridge-trick-cluster {
    position: relative;
    min-height: 148px;
    border: 0;
    border-radius: 8px;
    background: transparent;
  }

  .bridge-trick-slot {
    position: absolute;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto auto;
    width: 50px;
    min-height: 68px;
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
    width: 31px;
    aspect-ratio: 5 / 7;
    place-items: center;
    border-radius: 6px;
    filter: drop-shadow(0 9px 14px rgba(4, 18, 11, 0.26));
  }

  .bridge-trick-card-space {
    display: grid;
    width: 33px;
    min-height: 44px;
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
    display: flex;
    flex-wrap: wrap;
    gap: 3px 4px;
    justify-content: center;
    align-content: flex-start;
    width: 100%;
    max-width: 100%;
    min-height: 123px;
    min-width: 0;
    overflow: visible;
    padding: 1px 0;
  }

  .bridge-table :global(.bridge-table-hand .hand-card) {
    flex: 0 0 42px;
    width: 42px;
    min-width: 0;
  }

  .bridge-table :global(.bridge-table-hand .hand-card.legal) {
    box-shadow:
      0 0 0 2px rgba(245, 241, 207, 0.95),
      0 8px 16px rgba(4, 18, 11, 0.22);
  }
</style>
