<script lang="ts">
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

  const tutorCard = $derived(cardAt("Tutor"));
  const leftCard = $derived(cardAt("Left"));
  const rightCard = $derived(cardAt("Right"));
  const youCard = $derived(cardAt("You"));
</script>

<section class="card-table" aria-label={ariaLabel}>
  <div class="seat north">Barbu</div>
  <div class="seat west">Left</div>
  <div class="seat east">Right</div>
  <div class="seat south">You</div>

  <div class="played-slot tutor-slot">
    {#if tutorCard}
      <div class:heart={tutorCard.suit === "H"} class="table-card">
        <b>{tutorCard.rank}</b>
        <small>{tutorCard.suit}</small>
      </div>
    {:else if pendingBySeat.Tutor}
      <div class="pending-card">{pendingBySeat.Tutor}</div>
    {/if}
  </div>

  <div class="played-slot left-slot">
    {#if leftCard}
      <div class:heart={leftCard.suit === "H"} class="table-card">
        <b>{leftCard.rank}</b>
        <small>{leftCard.suit}</small>
      </div>
    {:else if pendingBySeat.Left}
      <div class="pending-card">{pendingBySeat.Left}</div>
    {/if}
  </div>

  <div class="played-slot right-slot">
    {#if rightCard}
      <div class:heart={rightCard.suit === "H"} class="table-card">
        <b>{rightCard.rank}</b>
        <small>{rightCard.suit}</small>
      </div>
    {:else if pendingBySeat.Right}
      <div class="pending-card">{pendingBySeat.Right}</div>
    {/if}
  </div>

  <div class="played-slot you-slot">
    {#if youCard}
      <div class:heart={youCard.suit === "H"} class="table-card">
        <b>{youCard.rank}</b>
        <small>{youCard.suit}</small>
      </div>
    {:else if pendingBySeat.You}
      <div class="pending-card">{pendingBySeat.You}</div>
    {/if}
  </div>
</section>

<style>
  .card-table {
    display: grid;
    grid-template-columns: 68px minmax(240px, 1fr) 68px;
    grid-template-rows: 42px minmax(330px, 1fr) 42px;
    align-items: center;
    min-height: 460px;
    border: 1px solid #bec8b6;
    border-radius: 8px;
    background:
      radial-gradient(circle at center, rgba(255, 255, 255, 0.18), transparent 56%),
      #386b54;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
  }

  .seat {
    color: #f3f7ef;
    font-size: 0.84rem;
    font-weight: 900;
    text-align: center;
  }

  .north {
    grid-column: 2;
    grid-row: 1;
  }

  .west {
    grid-column: 1;
    grid-row: 2;
  }

  .east {
    grid-column: 3;
    grid-row: 2;
  }

  .south {
    grid-column: 2;
    grid-row: 3;
  }

  .played-slot {
    display: grid;
    place-items: center;
    min-width: 72px;
    min-height: 98px;
  }

  .tutor-slot {
    grid-column: 2;
    grid-row: 2;
    align-self: start;
    padding-top: 44px;
  }

  .left-slot {
    grid-column: 2;
    grid-row: 2;
    justify-self: start;
    padding-left: 30px;
  }

  .right-slot {
    grid-column: 2;
    grid-row: 2;
    justify-self: end;
    padding-right: 30px;
  }

  .you-slot {
    grid-column: 2;
    grid-row: 2;
    align-self: end;
    padding-bottom: 44px;
  }

  .table-card {
    display: grid;
    grid-template-rows: 1fr auto;
    align-items: start;
    width: 76px;
    aspect-ratio: 5 / 7;
    border: 1px solid #d7dccf;
    border-radius: 8px;
    background: #fbfcf8;
    color: #18211b;
    box-shadow: 0 8px 22px rgba(21, 40, 30, 0.22);
  }

  .table-card b {
    padding: 9px 8px 0;
    font-size: 1.4rem;
    line-height: 1;
  }

  .table-card small {
    justify-self: end;
    padding: 0 8px 8px;
    font-size: 1rem;
    font-weight: 900;
  }

  .table-card.heart {
    color: #a83232;
  }

  .pending-card {
    display: grid;
    width: 76px;
    aspect-ratio: 5 / 7;
    place-items: center;
    border: 1px dashed rgba(255, 255, 255, 0.54);
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.82);
    font-size: 0.9rem;
    font-weight: 900;
    text-align: center;
  }

  @media (max-width: 820px) {
    .card-table {
      grid-template-columns: 52px minmax(210px, 1fr) 52px;
      grid-template-rows: 38px 270px 38px;
      min-height: auto;
    }
  }

  @media (max-width: 520px) {
    .card-table {
      grid-template-columns: 44px minmax(188px, 1fr) 44px;
      grid-template-rows: 34px 236px 34px;
    }

    .table-card,
    .pending-card {
      width: 64px;
    }

    .tutor-slot {
      padding-top: 26px;
    }

    .left-slot {
      padding-left: 10px;
    }

    .right-slot {
      padding-right: 10px;
    }

    .you-slot {
      padding-bottom: 26px;
    }
  }
</style>
