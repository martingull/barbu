<script lang="ts">
  type Suit = "C" | "D" | "H" | "S";

  type Card = {
    id: string;
    rank: string;
    suit: Suit;
    label: string;
  };

  type Seat = "Tutor" | "Left" | "You" | "Right";

  type TableCard = {
    seat: Seat;
    card: Card;
  };

  type GuidedTrick = {
    title: string;
    beforeResult: string;
    afterResult: string;
    emptyExplanation: string;
    legalCardIds: string[];
    hand: Card[];
    tableBeforeChoice: TableCard[];
    tableAfterChoice: TableCard[];
    pendingBySeat: Partial<Record<Seat, string>>;
    playedExplanations: Partial<Record<string, string>>;
  };

  const guidedTricks: GuidedTrick[] = [
    {
      title: "Follow clubs without taking the heart",
      beforeResult: "Tutor led 9C. Left could not follow clubs and discarded 4H.",
      afterResult: "Right wins with AC and takes 1 heart penalty from Left's 4H.",
      emptyExplanation:
        "The led suit is clubs. You hold clubs, so only 2C and KC are legal. The heart belongs to Left, not Tutor.",
      legalCardIds: ["2C", "KC"],
      hand: [
        { id: "2C", rank: "2", suit: "C", label: "2C" },
        { id: "KC", rank: "K", suit: "C", label: "KC" },
        { id: "8H", rank: "8", suit: "H", label: "8H" },
        { id: "QS", rank: "Q", suit: "S", label: "QS" }
      ],
      tableBeforeChoice: [
        { seat: "Tutor", card: { id: "9C", rank: "9", suit: "C", label: "9C" } },
        { seat: "Left", card: { id: "4H", rank: "4", suit: "H", label: "4H" } }
      ],
      tableAfterChoice: [{ seat: "Right", card: { id: "AC", rank: "A", suit: "C", label: "AC" } }],
      pendingBySeat: { Right: "AC", You: "You" },
      playedExplanations: {
        "2C": "2C follows clubs and keeps you clear of the trick. Right's AC still wins the heart penalty.",
        KC: "KC follows clubs and cannot beat AC, so it safely leaves your hand while Right absorbs the heart penalty."
      }
    },
    {
      title: "When the winner leads the next trick",
      beforeResult: "Right won the first trick, so Right leads 7S. Tutor and Left both follow spades.",
      afterResult: "You win this trick with QS. No hearts were played, so there is no penalty.",
      emptyExplanation:
        "Spades were led. You still have QS, so you must follow spades even though it wins this harmless trick.",
      legalCardIds: ["QS"],
      hand: [
        { id: "2C", rank: "2", suit: "C", label: "2C" },
        { id: "8H", rank: "8", suit: "H", label: "8H" },
        { id: "QS", rank: "Q", suit: "S", label: "QS" }
      ],
      tableBeforeChoice: [
        { seat: "Right", card: { id: "7S", rank: "7", suit: "S", label: "7S" } },
        { seat: "Tutor", card: { id: "JS", rank: "J", suit: "S", label: "JS" } },
        { seat: "Left", card: { id: "3S", rank: "3", suit: "S", label: "3S" } }
      ],
      tableAfterChoice: [],
      pendingBySeat: { You: "You" },
      playedExplanations: {
        QS: "QS is the only legal card because spades were led. Winning is acceptable here because the trick contains no hearts."
      }
    }
  ];

  const suitNames: Record<Suit, string> = {
    C: "clubs",
    D: "diamonds",
    H: "hearts",
    S: "spades"
  };

  let trickIndex = 0;
  let selectedCardId = "";
  let playedCardId = "";

  $: currentTrick = guidedTricks[trickIndex];
  $: legalCardIds = new Set(currentTrick.legalCardIds);
  $: hand = currentTrick.hand;
  $: selectedCard = hand.find((card) => card.id === selectedCardId);
  $: playedCard = hand.find((card) => card.id === playedCardId);
  $: isSelectedLegal = selectedCard ? legalCardIds.has(selectedCard.id) : false;
  $: completedTable = playedCard
    ? [...currentTrick.tableBeforeChoice, { seat: "You" as const, card: playedCard }, ...currentTrick.tableAfterChoice]
    : currentTrick.tableBeforeChoice;
  $: tutorCard = cardAt("Tutor");
  $: leftCard = cardAt("Left");
  $: rightTableCard = cardAt("Right");
  $: youTableCard = cardAt("You");
  $: explanation = buildExplanation(selectedCard, playedCard);
  $: resultText = playedCard ? currentTrick.afterResult : currentTrick.beforeResult;
  $: isLastTrick = trickIndex === guidedTricks.length - 1;

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

  function nextTrick() {
    trickIndex = isLastTrick ? 0 : trickIndex + 1;
    resetTrick();
  }

  function cardAt(seat: Seat) {
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
      return currentTrick.playedExplanations[played.id] ?? "That legal play completes the trick.";
    }

    if (!selected) {
      return currentTrick.emptyExplanation;
    }

    if (!legalCardIds.has(selected.id)) {
      return `${selected.label} is not legal here because you still have ${suitNames[currentTrick.hand.find((card) => legalCardIds.has(card.id))?.suit ?? selected.suit]}.`;
    }

    return currentTrick.playedExplanations[selected.id] ?? `${selected.label} is legal here.`;
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
      <strong>Trick {trickIndex + 1} of {guidedTricks.length}</strong>
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
        {:else if currentTrick.pendingBySeat.Right}
          <div class="pending-card">{currentTrick.pendingBySeat.Right}</div>
        {/if}
      </div>

      <div class="played-slot you-slot">
        {#if youTableCard}
          <div class:heart={youTableCard.suit === "H"} class="card table-card">
            <b>{youTableCard.rank}</b>
            <small>{youTableCard.suit}</small>
          </div>
        {:else if currentTrick.pendingBySeat.You}
          <div class="pending-card">{currentTrick.pendingBySeat.You}</div>
        {/if}
      </div>
    </section>

    <section class="lesson-panel" aria-label="Current lesson">
      <div class="lesson-heading">
        <p class="eyebrow">No Hearts</p>
        <h2>{currentTrick.title}</h2>
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
          <button class="primary-action" onclick={nextTrick} type="button">
            {isLastTrick ? "Restart lesson" : "Next trick"}
          </button>
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
