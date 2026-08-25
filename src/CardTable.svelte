<script lang="ts">
  import CardFace from "./CardFace.svelte";
  import type { Seat, TableCard } from "./lessonTypes";

  type Props = {
    ariaLabel?: string;
    tableCards: TableCard[];
    pendingBySeat?: Partial<Record<Seat, string>>;
    variant?: "default" | "bridge";
  };

  let { ariaLabel = "Card table", tableCards, pendingBySeat = {}, variant = "default" }: Props = $props();

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

<section class:bridge-table={variant === "bridge"} class:compass-table={variant !== "bridge"} class="card-table" aria-label={ariaLabel}>
  {#if variant === "bridge"}
    <div class="bridge-opponent-stack bridge-west-stack" aria-hidden="true">
      {#each Array(5) as _, index}
        <span style={`--stack-index: ${index}`}></span>
      {/each}
    </div>
    <div class="bridge-opponent-stack bridge-east-stack" aria-hidden="true">
      {#each Array(5) as _, index}
        <span style={`--stack-index: ${index}`}></span>
      {/each}
    </div>
  {/if}

  <div class="played-slot tutor-slot">
    <div class:active={Boolean(pendingBySeat.Tutor) || Boolean(tutorCard)} class:occupied={Boolean(tutorCard)} class="cardholder">
      {#if tutorCard}
        <div class:heart={tutorCard.suit === "H"} class="table-card">
          <CardFace card={tutorCard} />
        </div>
      {/if}
      <span class="cardholder-label">{seatLabel("Tutor")}</span>
    </div>
  </div>

  <div class="played-slot left-slot">
    <div class:active={Boolean(pendingBySeat.Left) || Boolean(leftCard)} class:occupied={Boolean(leftCard)} class="cardholder">
      {#if leftCard}
        <div class:heart={leftCard.suit === "H"} class="table-card">
          <CardFace card={leftCard} />
        </div>
      {/if}
      <span class="cardholder-label">{seatLabel("Left")}</span>
    </div>
  </div>

  <div class="played-slot right-slot">
    <div class:active={Boolean(pendingBySeat.Right) || Boolean(rightCard)} class:occupied={Boolean(rightCard)} class="cardholder">
      {#if rightCard}
        <div class:heart={rightCard.suit === "H"} class="table-card">
          <CardFace card={rightCard} />
        </div>
      {/if}
      <span class="cardholder-label">{seatLabel("Right")}</span>
    </div>
  </div>

  <div class="played-slot you-slot">
    <div class:active={Boolean(pendingBySeat.You) || Boolean(youCard)} class:occupied={Boolean(youCard)} class="cardholder">
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

  .bridge-table {
    min-height: 360px;
    overflow: hidden;
    border-color: rgba(245, 241, 207, 0.32);
    border-radius: 999px / 62%;
    background:
      radial-gradient(ellipse at center, rgba(255, 255, 255, 0.16), transparent 54%),
      radial-gradient(ellipse at 50% 48%, rgba(75, 35, 73, 0.68), rgba(35, 63, 50, 0.42) 68%, transparent 70%),
      #295544;
    box-shadow:
      inset 0 0 0 6px rgba(245, 241, 207, 0.08),
      inset 0 0 34px rgba(6, 20, 13, 0.36);
  }

  .bridge-table::before {
    content: "";
    position: absolute;
    inset: 5%;
    border: 1px solid rgba(245, 241, 207, 0.14);
    border-radius: inherit;
    pointer-events: none;
  }

  .bridge-opponent-stack {
    position: absolute;
    top: 50%;
    z-index: 0;
    width: 50px;
    height: 86px;
    transform: translateY(-50%);
  }

  .bridge-west-stack {
    left: 20px;
  }

  .bridge-east-stack {
    right: 20px;
  }

  .bridge-opponent-stack span {
    position: absolute;
    inset: 0;
    border: 2px solid #fff7ec;
    border-radius: 7px;
    background:
      repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.18) 0 3px, transparent 3px 6px),
      #c83f45;
    box-shadow: 0 6px 12px rgba(5, 16, 10, 0.22);
    transform: translateX(calc(var(--stack-index) * 5px));
  }

  .bridge-east-stack span {
    transform: translateX(calc(var(--stack-index) * -5px));
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
    grid-template-rows: minmax(0, 1fr) auto;
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
    grid-row: 2;
    z-index: 1;
    min-width: 0;
    font-size: 0.74rem;
    line-height: 1;
    text-shadow: 0 1px 3px rgba(8, 19, 13, 0.72);
    text-transform: uppercase;
  }

  .bridge-table .cardholder {
    width: 84px;
    border-color: rgba(245, 241, 207, 0.42);
    background: rgba(8, 30, 21, 0.22);
  }

  .bridge-table .cardholder-label {
    padding: 4px 7px;
    border-radius: 6px;
    background: rgba(7, 21, 14, 0.6);
    color: #f7faf3;
    font-size: 0.66rem;
  }

  .bridge-table .cardholder .table-card {
    width: 54px;
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

    .compass-table {
      grid-template-columns: minmax(72px, 1fr) minmax(96px, auto) minmax(72px, 1fr);
      grid-template-rows: minmax(104px, 1fr) minmax(12px, 0.18fr) minmax(104px, 1fr);
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

    .bridge-table {
      grid-template-rows: 246px;
      min-height: auto;
      border-radius: 52% / 38%;
    }

    .bridge-table .cardholder {
      width: 72px;
      padding: 4px 4px 15px;
    }

    .bridge-table .cardholder .table-card {
      width: 46px;
    }

    .bridge-table .tutor-slot {
      padding-top: 10px;
    }

    .bridge-table .left-slot {
      padding-left: 48px;
    }

    .bridge-table .right-slot {
      padding-right: 48px;
    }

    .bridge-table .you-slot {
      padding-bottom: 10px;
    }

    .bridge-opponent-stack {
      width: 36px;
      height: 62px;
    }

    .bridge-west-stack {
      left: 8px;
    }

    .bridge-east-stack {
      right: 8px;
    }

    .bridge-opponent-stack span {
      transform: translateX(calc(var(--stack-index) * 3px));
    }

    .bridge-east-stack span {
      transform: translateX(calc(var(--stack-index) * -3px));
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
