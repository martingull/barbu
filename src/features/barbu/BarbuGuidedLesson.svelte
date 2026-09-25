<script lang="ts">
  import TablePlaySurface from "../../TablePlaySurface.svelte";
  import ExerciseFeedback from "../../ExerciseFeedback.svelte";
  import CardChoiceHand from "../../CardChoiceHand.svelte";
  import DominoLessonTable from "./DominoLessonTable.svelte";
  import { guidedLessons } from "../../lessons/catalog";
  import { drillOutcomeLabels as outcomeLabels } from "../../lessons/drillDecision";
  import type { Card, Suit } from "../../lessonTypes";
  export let lessonId: string;
  export let onBack: () => void;
  export let onComplete: () => void;
  let trickIndex = 0;
  let selectedCardId = "";
  let playedCardId = "";
  const suitNames: Record<Suit, string> = { C: "clubs", D: "diamonds", H: "hearts", S: "spades" };
  $: selectedLesson = guidedLessons.find(lesson => lesson.id === lessonId) ?? guidedLessons[0];
  $: activeTricks = selectedLesson.tricks;
  $: gameLabel = selectedLesson.game;
  $: contractLabel = selectedLesson.contract;
  $: currentTrick = activeTricks[trickIndex];
  $: legalCardIds = new Set(currentTrick.legalCardIds);
  $: hand = currentTrick.hand;
  $: selectedCard = hand.find((card) => card.id === selectedCardId);
  $: playedCard = hand.find((card) => card.id === playedCardId);
  $: isSelectedLegal = selectedCard ? legalCardIds.has(selectedCard.id) : false;
  $: completedTable = playedCard
    ? [...currentTrick.tableBeforeChoice, { seat: "You" as const, card: playedCard }, ...currentTrick.tableAfterChoice]
    : currentTrick.tableBeforeChoice;
  $: currentLessonIsDomino = contractLabel === "Domino";
  $: explanation = buildExplanation(selectedCard, playedCard);
  $: resultText = playedCard ? currentTrick.afterResult : currentTrick.beforeResult;
  $: isLastTrick = trickIndex === activeTricks.length - 1;

  $: lessonOutcome = selectedCard && (playedCard || !isSelectedLegal) ? buildLessonOutcome(selectedCard, playedCard) : "";
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
      if (contractLabel === "Domino") {
        return `${selected.label} does not fit the layout right now. Open with a seven or extend an open suit by one rank.`;
      }

      return `${selected.label} is not legal here because you still have ${suitNames[currentTrick.hand.find((card) => legalCardIds.has(card.id))?.suit ?? selected.suit]}.`;
    }

    return currentTrick.playedExplanations[selected.id] ?? `${selected.label} is legal here.`;
  }

  function buildLessonOutcome(selected: Card, played: Card | undefined) {
    if (!legalCardIds.has(selected.id)) {
      return outcomeLabels.illegal;
    }

    if (!played) {
      return "";
    }

    return outcomeLabels[currentTrick.cardOutcomes?.[played.id] ?? "good"];
  }

</script>

<TablePlaySurface
  flowLayout
  ariaLabel="Guided trick"
  surfaceClassName={currentLessonIsDomino ? "learning-play-surface domino-play-surface" : "learning-play-surface"}
  title={gameLabel}
  eyebrow={contractLabel}
  statusLabel="Decision"
  statusValue={`${trickIndex + 1} of ${activeTricks.length}`}
  tableAriaLabel="Card table"
  panelAriaLabel="Current lesson"
  pendingBySeat={currentTrick.pendingBySeat}
  tableCards={completedTable}
  useCustomTable={currentLessonIsDomino}
  onBack={onBack}
>
  {#snippet table()}
  {#if currentLessonIsDomino}
    <DominoLessonTable cards={completedTable} label="Domino lesson layout" />
  {/if}
  {/snippet}
  {#snippet panel()}
    <ExerciseFeedback
      eyebrow={contractLabel}
      title={currentTrick.title}
      result={resultText}
      explanation={explanation}
      outcome={lessonOutcome}
      warning={lessonOutcome === "Illegal" || lessonOutcome === "Risky" || lessonOutcome === "Penalty"}
    />

    <CardChoiceHand
      cards={hand}
      ariaLabel="Your hand"
      className="hand full-hand-cards"
      cardClassName="card hand-card full-hand-card"
      getCardClasses={cardClasses}
      isPressed={(card) => selectedCardId === card.id}
      onSelect={selectCard}
    />

    <div class="action-row">
      {#if playedCard}
        <button class="secondary-action" onclick={resetTrick} type="button">Reset</button>
        {#if isLastTrick}
          <button class="primary-action" onclick={onComplete} type="button">Finish lesson</button>
        {:else}
          <button class="primary-action" onclick={nextTrick} type="button">Next trick</button>
        {/if}
      {:else}
        <button class="secondary-action" onclick={resetTrick} type="button">Reset</button>
        <button class="primary-action" disabled={!isSelectedLegal} onclick={playSelectedCard} type="button">
          Play selected
        </button>
      {/if}
    </div>
  {/snippet}
</TablePlaySurface>
