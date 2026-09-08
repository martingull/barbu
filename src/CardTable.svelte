<script lang="ts">
  import CardFace from "./CardFace.svelte";
  import type { Seat, TableCard } from "./lessonTypes";

  type Props = {
    ariaLabel?: string;
    tableCards: TableCard[];
    pendingBySeat?: Partial<Record<Seat, string>>;
    seatLabels?: Partial<Record<Seat, string>>;
    seatRoleLabels?: Partial<Record<Seat, string>>;
  };

  let {
    ariaLabel = "Card table",
    tableCards,
    pendingBySeat = {},
    seatLabels = {},
    seatRoleLabels = {}
  }: Props = $props();

  function cardAt(seat: Seat) {
    return tableCards.find((play) => play.seat === seat)?.card;
  }

  function seatLabel(seat: Seat) {
    return seatLabels[seat] ?? (seat === "Tutor" ? "Barbu" : seat);
  }

  function seatRoleLabel(seat: Seat) {
    return seatRoleLabels[seat] ?? "";
  }

  const seats: { seat: Seat; slot: string }[] = [
    { seat: "Tutor", slot: "tutor" },
    { seat: "Left", slot: "left" },
    { seat: "Right", slot: "right" },
    { seat: "You", slot: "you" }
  ];
</script>

<section class="card-table compass-table" aria-label={ariaLabel}>
  {#each seats as { seat, slot } (seat)}
    {@const card = cardAt(seat)}
    <div class={`played-slot ${slot}-slot`}>
      <div class:active={Boolean(pendingBySeat[seat]) || Boolean(card)} class:occupied={Boolean(card)} class="cardholder">
        {#if card}
          <div class:heart={card.suit === "H"} class="table-card">
            <CardFace {card} />
          </div>
        {/if}
        <span class="cardholder-label">
          <span>{seatLabel(seat)}</span>
          {#if seatRoleLabel(seat)}
            <small>{seatRoleLabel(seat)}</small>
          {/if}
        </span>
      </div>
    </div>
  {/each}
</section>

<style>
  .card-table {
    --table-card-face-width: 58px;
    --table-holder-label-size: 0.74rem;
    --table-holder-padding: 7px 7px 19px;
    --table-holder-width: 96px;
    position: relative;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: minmax(330px, 1fr);
    align-items: center;
    min-height: 460px;
    border: 1px solid #bec8b6;
    border-radius: 8px;
    background:
      radial-gradient(circle at center, rgba(255, 255, 255, 0.18), transparent 56%),
      #386b54;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
  }

  .compass-table {
    grid-template-columns: minmax(72px, 1fr) minmax(96px, auto) minmax(72px, 1fr);
    grid-template-rows: minmax(104px, 1fr) minmax(12px, 0.18fr) minmax(104px, 1fr);
    gap: 2px 10px;
    align-items: stretch;
    padding: 14px;
  }

  .played-slot {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    min-width: 88px;
    min-height: 124px;
  }

  .compass-table .played-slot {
    min-width: 0;
    min-height: 0;
    padding: 0;
  }

  .compass-table .tutor-slot {
    grid-column: 2;
    grid-row: 1;
    align-self: start;
    justify-self: center;
  }

  .compass-table .left-slot {
    grid-column: 1;
    grid-row: 1 / 4;
    align-self: center;
    justify-self: start;
  }

  .compass-table .right-slot {
    grid-column: 3;
    grid-row: 1 / 4;
    align-self: center;
    justify-self: end;
  }

  .compass-table .you-slot {
    grid-column: 2;
    grid-row: 3;
    align-self: end;
    justify-self: center;
  }

  .table-card {
    display: grid;
    place-items: center;
    width: var(--table-card-face-width);
    aspect-ratio: 5 / 7;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: #18211b;
    box-shadow: 0 8px 22px rgba(21, 40, 30, 0.22);
  }

  .table-card.heart {
    color: #a83232;
  }

  .cardholder {
    position: relative;
    display: grid;
    grid-template-rows: auto auto;
    align-content: space-between;
    width: var(--table-holder-width);
    aspect-ratio: 5 / 7;
    overflow: hidden;
    justify-items: center;
    padding: var(--table-holder-padding);
    border: 2px dashed rgba(255, 255, 255, 0.54);
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.82);
    font-size: var(--table-holder-label-size);
    font-weight: 900;
    text-align: center;
  }

  .cardholder.occupied {
    border-color: rgba(255, 255, 255, 0.36);
    background: rgba(13, 44, 31, 0.12);
  }

  .cardholder.active {
    border-color: rgba(245, 241, 207, 0.78);
    color: #f5f1cf;
    box-shadow: inset 0 0 0 1px rgba(245, 241, 207, 0.16);
  }

  .cardholder-label {
    position: absolute;
    right: 4px;
    bottom: 4px;
    left: 4px;
    align-self: end;
    grid-column: 1;
    grid-row: 2;
    z-index: 1;
    display: grid;
    gap: 1px;
    min-width: 0;
    font-size: var(--table-holder-label-size);
    line-height: 1;
    text-shadow: 0 1px 3px rgba(8, 19, 13, 0.72);
    text-transform: uppercase;
  }

  .cardholder-label > span,
  .cardholder-label > small {
    min-width: 0;
    overflow-wrap: anywhere;
    line-height: 1;
  }

  .cardholder-label > small {
    color: rgba(245, 241, 207, 0.78);
    font-size: 0.78em;
  }

  .table-card {
    align-self: start;
    grid-column: 1;
    grid-row: 1;
  }

  .cardholder .table-card {
    width: var(--table-card-face-width);
  }

  @media (max-width: 820px) {
    .card-table {
      grid-template-columns: 1fr;
      grid-template-rows: 270px;
      min-height: auto;
    }

    .compass-table {
      --table-card-face-width: clamp(40px, min(8.6vw, 7.5dvh), 58px);
      --table-holder-label-size: clamp(0.62rem, 1.4dvh, 0.74rem);
      --table-holder-padding: 6px 6px clamp(14px, 2.25dvh, 19px);
      --table-holder-width: clamp(68px, min(14.6vw, 13dvh), 96px);
      grid-template-columns: minmax(72px, 1fr) minmax(96px, auto) minmax(72px, 1fr);
      grid-template-rows: minmax(104px, 1fr) minmax(12px, 0.18fr) minmax(104px, 1fr);
    }
  }

  @media (max-width: 520px) {
    .card-table {
      --table-card-face-width: 52px;
      --table-holder-label-size: 0.68rem;
      --table-holder-padding: 5px 5px 16px;
      --table-holder-width: 82px;
      grid-template-columns: 1fr;
      grid-template-rows: 270px;
    }

    .compass-table {
      --table-card-face-width: clamp(38px, min(10.6vw, 7.5dvh), 52px);
      --table-holder-label-size: clamp(0.58rem, 1.4dvh, 0.68rem);
      --table-holder-padding: 5px 5px clamp(12px, 2.2dvh, 16px);
      --table-holder-width: clamp(64px, min(18vw, 13dvh), 82px);
      grid-template-columns: minmax(64px, 1fr) minmax(82px, auto) minmax(64px, 1fr);
      grid-template-rows: minmax(86px, 1fr) minmax(8px, 0.12fr) minmax(86px, 1fr);
    }

    .table-card {
      width: var(--table-card-face-width);
    }

    .cardholder .table-card {
      width: var(--table-card-face-width);
    }

    .cardholder {
      width: var(--table-holder-width);
      padding: var(--table-holder-padding);
    }

    .cardholder-label {
      font-size: var(--table-holder-label-size);
    }
  }

  @media (max-width: 520px) {
    .compass-table {
      grid-template-columns: minmax(64px, 1fr) minmax(82px, auto) minmax(64px, 1fr);
      grid-template-rows: minmax(86px, 1fr) minmax(8px, 0.12fr) minmax(86px, 1fr);
      gap: 2px 6px;
      padding: 10px;
    }
  }
</style>
