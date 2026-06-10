<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { noHeartsGuidedTricks } from "./lessons/noHearts";
  import type { Card, GeneratedPracticeScenario, GuidedTrick, Seat, Suit, TableCard } from "./lessonTypes";

  const suitNames: Record<Suit, string> = {
    C: "clubs",
    D: "diamonds",
    H: "hearts",
    S: "spades"
  };

  let trickIndex = 0;
  let selectedCardId = "";
  let playedCardId = "";
  let practiceSeed = 1;
  let activeTricks: GuidedTrick[] = noHeartsGuidedTricks;
  let usingGeneratedPractice = false;
  let generatedPracticeError = "";

  $: currentTrick = activeTricks[trickIndex];
  $: legalCardIds = new Set(currentTrick.legalCardIds);
  $: hand = currentTrick.hand;
  $: selectedCard = hand.find((card) => card.id === selectedCardId);
  $: playedCard = hand.find((card) => card.id === playedCardId);
  $: isSelectedLegal = selectedCard ? legalCardIds.has(selectedCard.id) : false;
  $: completedTable = playedCard
    ? [...currentTrick.tableBeforeChoice, { seat: "You" as const, card: playedCard }, ...currentTrick.tableAfterChoice]
    : currentTrick.tableBeforeChoice;
  $: tutorCard = cardAt(completedTable, "Tutor");
  $: leftCard = cardAt(completedTable, "Left");
  $: rightTableCard = cardAt(completedTable, "Right");
  $: youTableCard = cardAt(completedTable, "You");
  $: explanation = generatedPracticeError || buildExplanation(selectedCard, playedCard);
  $: resultText = playedCard ? currentTrick.afterResult : currentTrick.beforeResult;
  $: isLastTrick = trickIndex === activeTricks.length - 1;

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

  function showFixedLesson() {
    activeTricks = noHeartsGuidedTricks;
    usingGeneratedPractice = false;
    generatedPracticeError = "";
    trickIndex = 0;
    resetTrick();
  }

  async function loadGeneratedDrill() {
    generatedPracticeError = "";

    try {
      const scenario = await invoke<GeneratedPracticeScenario>("generate_no_hearts_follow_suit", {
        seed: practiceSeed
      });

      practiceSeed += 1;
      activeTricks = [guidedTrickFromGeneratedScenario(scenario)];
      usingGeneratedPractice = true;
      trickIndex = 0;
      resetTrick();
    } catch {
      generatedPracticeError = "Generated drills need the Tauri runtime. Use the fixed lesson here, or run the app with Tauri.";
    }
  }

  function nextTrick() {
    trickIndex = isLastTrick ? 0 : trickIndex + 1;
    resetTrick();
  }

  function cardAt(table: TableCard[], seat: Seat) {
    return table.find((play) => play.seat === seat)?.card;
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

  function guidedTrickFromGeneratedScenario(scenario: GeneratedPracticeScenario): GuidedTrick {
    return {
      title: scenario.title,
      beforeResult: scenario.prompt,
      afterResult: "Generated drill complete. Check the explanation for the winner and penalty.",
      emptyExplanation: scenario.prompt,
      legalCardIds: scenario.legalCardIds,
      hand: scenario.playerHand,
      tableBeforeChoice: scenario.tableBeforeChoice,
      tableAfterChoice: scenario.tableAfterChoice,
      pendingBySeat: pendingSeatsForGeneratedScenario(scenario),
      playedExplanations: Object.fromEntries(
        scenario.outcomes.map((outcome) => [outcome.cardId, outcome.explanation])
      )
    };
  }

  function pendingSeatsForGeneratedScenario(scenario: GeneratedPracticeScenario) {
    const pendingBySeat: Partial<Record<Seat, string>> = { You: "You" };

    for (const play of scenario.tableAfterChoice) {
      pendingBySeat[play.seat] = play.card.label;
    }

    return pendingBySeat;
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
      <strong>Trick {trickIndex + 1} of {activeTricks.length}</strong>
    </div>
  </header>

  <section class="mode-row" aria-label="Learning mode">
    <button class:active={!usingGeneratedPractice} class="mode-tab" onclick={showFixedLesson} type="button">Practice</button>
    <button class:active={usingGeneratedPractice} class="mode-tab" onclick={loadGeneratedDrill} type="button">Generated</button>
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
