<script lang="ts">
  type Suit = "C" | "D" | "H" | "S";

  type Card = {
    id: string;
    rank: string;
    suit: Suit;
    label: string;
  };

  type TableCard = {
    seat: "Tutor" | "Left" | "You" | "Right";
    card: Card;
  };

  const hand: Card[] = [
    { id: "2C", rank: "2", suit: "C", label: "2C" },
    { id: "KC", rank: "K", suit: "C", label: "KC" },
    { id: "8H", rank: "8", suit: "H", label: "8H" },
    { id: "QS", rank: "Q", suit: "S", label: "QS" }
  ];

  const openingTable: TableCard[] = [
    { seat: "Tutor", card: { id: "9C", rank: "9", suit: "C", label: "9C" } },
    { seat: "Left", card: { id: "4H", rank: "4", suit: "H", label: "4H" } }
  ];

  const rightCard: TableCard = {
    seat: "Right",
    card: { id: "AC", rank: "A", suit: "C", label: "AC" }
  };

  const legalCardIds = new Set(["2C", "KC"]);
  const suitNames: Record<Suit, string> = {
    C: "clubs",
    D: "diamonds",
    H: "hearts",
    S: "spades"
  };

  let selectedCardId = "";
  let playedCardId = "";

  $: selectedCard = hand.find((card) => card.id === selectedCardId);
  $: playedCard = hand.find((card) => card.id === playedCardId);
  $: isSelectedLegal = selectedCard ? legalCardIds.has(selectedCard.id) : false;
  $: completedTable = playedCard ? [...openingTable, { seat: "You" as const, card: playedCard }, rightCard] : openingTable;
  $: tutorCard = cardAt("Tutor");
  $: leftCard = cardAt("Left");
  $: rightTableCard = cardAt("Right");
  $: youTableCard = cardAt("You");
  $: explanation = buildExplanation(selectedCard, playedCard);
  $: resultText = playedCard
    ? "Right wins with AC and takes 1 heart penalty from Left's 4H."
    : "Tutor led 9C. Left could not follow clubs and discarded 4H.";

  function selectCard(card: Card) {
    if (playedCardId) {
      return;
    }

    selectedCardId = card.id;
  }

  function playSelectedCard() {
    if (!selectedCard || !isSelectedLegal) {
      return;
    }

    playedCardId = selectedCard.id;
  }

  function resetTrick() {
    selectedCardId = "";
    playedCardId = "";
  }

  function cardAt(seat: TableCard["seat"]) {
    return completedTable.find((play) => play.seat === seat)?.card;
  }

  function cardClasses(card: Card) {
    return {
      heart: card.suit === "H",
      legal: legalCardIds.has(card.id) && !playedCardId,
      illegal: !legalCardIds.has(card.id) && !playedCardId,
      selected: selectedCardId === card.id,
      played: playedCardId === card.id
    };
  }

  function buildExplanation(selected: Card | undefined, played: Card | undefined) {
    if (played) {
      if (played.id === "KC") {
        return "KC follows clubs and cannot beat AC, so it safely leaves your hand while Right absorbs the heart penalty.";
      }

      return "2C follows clubs and keeps you clear of the trick. Right's AC still wins the heart penalty.";
    }

    if (!selected) {
      return "The led suit is clubs. You hold clubs, so only 2C and KC are legal. The heart belongs to Left, not Tutor.";
    }

    if (!legalCardIds.has(selected.id)) {
      return `${selected.label} is not legal here because you still have clubs. Follow suit before discarding ${suitNames[selected.suit]}.`;
    }

    if (selected.id === "KC") {
      return "KC is legal and strong, but AC is still out on the right. That makes KC a useful safe discard in this exact trick.";
    }

    return "2C is legal and low. It follows suit without any chance of winning while AC remains to your right.";
  }
</script>

<main class="app-shell">
  <header class="topbar" aria-label="Current game">
    <div>
      <p class="eyebrow">Hearts family</p>
      <h1>Barbu</h1>
    </div>
    <div class="contract-status">
      <span>No Hearts</span>
      <strong>1 penalty in trick</strong>
    </div>
  </header>

  <section class="mode-row" aria-label="Learning mode">
    <button class="mode-tab active" type="button">Practice</button>
    <button class="mode-tab" type="button">Learn</button>
    <button class="mode-tab" type="button">Rules</button>
  </section>

  <section class="learning-surface" aria-label="Guided No Hearts trick">
    <section class="practice-table" aria-label="Card table">
      <div class="seat north">Tutor</div>
      <div class="seat west">Left</div>
      <div class="seat east">Right</div>
      <div class="seat south">You</div>

      <div class="played-slot tutor-slot">
        {#if tutorCard}
          <div class:heart={tutorCard.suit === "H"} class="card table-card">
            <b>{tutorCard.rank}</b>
            <small>{tutorCard.suit}</small>
          </div>
        {/if}
      </div>

      <div class="played-slot left-slot">
        {#if leftCard}
          <div class:heart={leftCard.suit === "H"} class="card table-card">
            <b>{leftCard.rank}</b>
            <small>{leftCard.suit}</small>
          </div>
        {/if}
      </div>

      <div class="played-slot right-slot">
        {#if rightTableCard}
          <div class:heart={rightTableCard.suit === "H"} class="card table-card">
            <b>{rightTableCard.rank}</b>
            <small>{rightTableCard.suit}</small>
          </div>
        {:else}
          <div class="pending-card">AC</div>
        {/if}
      </div>

      <div class="played-slot you-slot">
        {#if youTableCard}
          <div class:heart={youTableCard.suit === "H"} class="card table-card">
            <b>{youTableCard.rank}</b>
            <small>{youTableCard.suit}</small>
          </div>
        {:else}
          <div class="pending-card">You</div>
        {/if}
      </div>
    </section>

    <section class="lesson-panel" aria-label="Current lesson">
      <div class="lesson-heading">
        <p class="eyebrow">No Hearts</p>
        <h2>Follow clubs without taking the heart</h2>
      </div>

      <p class="result">{resultText}</p>
      <p class="explanation">{explanation}</p>

      <div class="hand" aria-label="Your hand">
        {#each hand as card}
          <button
            aria-pressed={selectedCardId === card.id}
            class:heart={card.suit === "H"}
            class:illegal={cardClasses(card).illegal}
            class:legal={cardClasses(card).legal}
            class:played={cardClasses(card).played}
            class:selected={cardClasses(card).selected}
            class="card hand-card"
            onclick={() => selectCard(card)}
            type="button"
          >
            <b>{card.rank}</b>
            <small>{card.suit}</small>
          </button>
        {/each}
      </div>

      <div class="action-row">
        {#if playedCard}
          <button class="secondary-action" onclick={resetTrick} type="button">Reset</button>
          <button class="primary-action" onclick={resetTrick} type="button">Try other card</button>
        {:else}
          <button class="secondary-action" onclick={resetTrick} type="button">Reset</button>
          <button class="primary-action" disabled={!isSelectedLegal} onclick={playSelectedCard} type="button">
            Play selected
          </button>
        {/if}
      </div>
    </section>
  </section>
</main>
