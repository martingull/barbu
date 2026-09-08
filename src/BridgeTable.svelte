<script lang="ts">
  import CardChoiceHand from "./CardChoiceHand.svelte";
  import CardTable from "./CardTable.svelte";
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

  const compassSeatLabels: Record<Seat, string> = {
    Tutor: "North",
    Right: "East",
    You: "South",
    Left: "West"
  };
  const dummyLegalSet = $derived(new Set(dummyLegalCardIds));
  const showNorthHand = $derived(dummySeat !== "You");
  const northHandLabel = $derived(showNorthHand ? dummySeatLabel : seatRoleLabel("Tutor"));
  const bridgeTableSeatLabels: Record<Seat, string> = $derived({
    Tutor: compassLabel("Tutor"),
    Left: compassLabel("Left"),
    Right: compassLabel("Right"),
    You: compassLabel("You")
  });
  const bridgeTableRoleLabels: Record<Seat, string> = $derived({
    Tutor: tableRoleLabel("Tutor"),
    Left: tableRoleLabel("Left"),
    Right: tableRoleLabel("Right"),
    You: tableRoleLabel("You")
  });

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
    <CardTable
      ariaLabel="Current trick"
      {pendingBySeat}
      seatLabels={bridgeTableSeatLabels}
      seatRoleLabels={bridgeTableRoleLabels}
      {tableCards}
    />
  </div>
</section>

<style>
  .bridge-table {
    --bridge-card-width: 54px;
    --bridge-felt-min-height: 148px;
    --bridge-hand-height: 156px;
    --bridge-mini-card-width: var(--bridge-card-width);
    --bridge-seat-label-size: 0.54rem;
    display: grid;
    grid-template-rows: var(--bridge-hand-height) minmax(0, 1fr);
    gap: 6px;
    align-self: start;
    width: 100%;
    min-height: 502px;
    padding: 0;
    overflow: visible;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .bridge-felt {
    display: grid;
    min-height: var(--bridge-felt-min-height);
    min-width: 0;
    overflow: hidden;
  }

  .bridge-felt :global(.card-table) {
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .bridge-felt :global(.compass-table) {
    --table-card-face-width: var(--bridge-card-width);
    --table-holder-label-size: clamp(0.46rem, 1.3dvh, 0.64rem);
    --table-holder-padding: 5px 5px clamp(14px, 2.2dvh, 18px);
    --table-holder-width: clamp(78px, min(20vw, 15dvh), 92px);
    grid-template-columns: minmax(78px, 1fr) minmax(92px, auto) minmax(78px, 1fr);
    grid-template-rows: minmax(92px, 1fr) minmax(8px, 0.1fr) minmax(92px, 1fr);
    gap: 2px 6px;
    padding: 8px;
    border-radius: 8px;
  }

  .bridge-felt :global(.cardholder-label) {
    gap: 0;
    padding: 1px 2px;
    border-radius: 6px;
    background: rgba(7, 21, 14, 0.42);
    color: #f7faf3;
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

  .bridge-seat-label {
    color: #f5f1cf;
    font-size: var(--bridge-seat-label-size);
    font-weight: 900;
    line-height: 1;
    opacity: 0.9;
    text-transform: uppercase;
    text-shadow: 0 1px 3px rgba(8, 19, 13, 0.72);
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

  @media (max-width: 700px) {
    .bridge-table {
      --bridge-seat-label-size: clamp(0.42rem, 1dvh, 0.54rem);
    }
  }

  @media (max-width: 520px) and (max-height: 700px) {
    .bridge-table :global(.bridge-table-hand.full-hand-cards) {
      gap: 2px 3px;
    }
  }

  @media (max-width: 520px) and (max-height: 600px) {
    .bridge-dummy-hidden {
      padding: 5px 8px;
      font-size: 0.58rem;
      line-height: 1.05;
    }
  }
</style>
