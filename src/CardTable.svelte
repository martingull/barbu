<script lang="ts">
  import CardFace from "./CardFace.svelte";
  import type { Seat, TableCard } from "./lessonTypes";

  type Props = {
    ariaLabel?: string;
    tableCards: TableCard[];
    pendingBySeat?: Partial<Record<Seat, string>>;
  };

  let { ariaLabel = "Card table", tableCards, pendingBySeat = {} }: Props = $props();

  function cardAt(seat: Seat) {
    return tableCards.find((play) => play.seat === seat)?.card;
  }

  function seatLabel(seat: Seat) {
    return seat === "Tutor" ? "Barbu" : seat;
  }

  const tutorCard = $derived(cardAt("Tutor"));
  const leftCard = $derived(cardAt("Left"));
  const rightCard = $derived(cardAt("Right"));
  const youCard = $derived(cardAt("You"));
</script>

<section class="card-table" aria-label={ariaLabel}>
  <div class="played-slot tutor-slot">
    <div class:active={Boolean(pendingBySeat.Tutor)} class:occupied={Boolean(tutorCard)} class="cardholder">
      {#if tutorCard}
        <div class:heart={tutorCard.suit === "H"} class="table-card">
          <CardFace card={tutorCard} />
        </div>
      {/if}
      <span class="cardholder-label">{seatLabel("Tutor")}</span>
    </div>
  </div>

  <div class="played-slot left-slot">
    <div class:active={Boolean(pendingBySeat.Left)} class:occupied={Boolean(leftCard)} class="cardholder">
      {#if leftCard}
        <div class:heart={leftCard.suit === "H"} class="table-card">
          <CardFace card={leftCard} />
        </div>
      {/if}
      <span class="cardholder-label">{seatLabel("Left")}</span>
    </div>
  </div>

  <div class="played-slot right-slot">
    <div class:active={Boolean(pendingBySeat.Right)} class:occupied={Boolean(rightCard)} class="cardholder">
      {#if rightCard}
        <div class:heart={rightCard.suit === "H"} class="table-card">
          <CardFace card={rightCard} />
        </div>
      {/if}
      <span class="cardholder-label">{seatLabel("Right")}</span>
    </div>
  </div>

  <div class="played-slot you-slot">
    <div class:active={Boolean(pendingBySeat.You)} class:occupied={Boolean(youCard)} class="cardholder">
      {#if youCard}
        <div class:heart={youCard.suit === "H"} class="table-card">
          <CardFace card={youCard} />
        </div>
      {/if}
      <span class="cardholder-label">{seatLabel("You")}</span>
    </div>
  </div>
</section>

<style>
  .card-table {
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

  .played-slot {
    display: grid;
    place-items: center;
    min-width: 88px;
    min-height: 124px;
  }

  .tutor-slot {
    grid-column: 1;
    grid-row: 1;
    align-self: start;
    padding-top: 54px;
  }

  .left-slot {
    grid-column: 1;
    grid-row: 1;
    justify-self: start;
    padding-left: 52px;
  }

  .right-slot {
    grid-column: 1;
    grid-row: 1;
    justify-self: end;
    padding-right: 52px;
  }

  .you-slot {
    grid-column: 1;
    grid-row: 1;
    align-self: end;
    padding-bottom: 54px;
  }

  .table-card {
    display: grid;
    place-items: center;
    width: 76px;
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
    display: grid;
    width: 96px;
    aspect-ratio: 5 / 7;
    align-items: center;
    justify-items: center;
    padding: 7px 7px 19px;
    border: 2px dashed rgba(255, 255, 255, 0.54);
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.82);
    font-size: 0.74rem;
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
    align-self: end;
    grid-column: 1;
    grid-row: 1;
    z-index: 1;
    min-width: 0;
    font-size: 0.74rem;
    line-height: 1;
    text-shadow: 0 1px 3px rgba(8, 19, 13, 0.72);
    text-transform: uppercase;
  }

  .table-card {
    align-self: start;
    grid-column: 1;
    grid-row: 1;
  }

  .cardholder .table-card {
    width: 58px;
  }

  @media (max-width: 820px) {
    .card-table {
      grid-template-columns: 1fr;
      grid-template-rows: 270px;
      min-height: auto;
    }
  }

  @media (max-width: 520px) {
    .card-table {
      grid-template-columns: 1fr;
      grid-template-rows: 270px;
    }

    .table-card {
      width: 72px;
    }

    .cardholder .table-card {
      width: 52px;
    }

    .cardholder {
      width: 82px;
      padding: 5px 5px 16px;
    }

    .cardholder-label {
      font-size: 0.68rem;
    }

    .tutor-slot {
      padding-top: 18px;
    }

    .left-slot {
      padding-left: 18px;
    }

    .right-slot {
      padding-right: 18px;
    }

    .you-slot {
      padding-bottom: 18px;
    }
  }
</style>
