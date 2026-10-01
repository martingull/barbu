<script lang="ts">
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import DominoLessonTable from "./DominoLessonTable.svelte";
  import { guidedLessons } from "../../lessons/catalog";
  import { drillOutcomeLabels as outcomeLabels, type DrillResult } from "../../lessons/drillDecision";
  import { barbuGuidedDecision, barbuGuidedResult } from "../../lessons/barbu/guidedFeedback";
  import type { Card, Suit } from "../../domain/types";
  export let lessonId: string;
  export let onBack: () => void;
  export let onComplete: (results: DrillResult[]) => void;
  let trickIndex = 0;
  let selectedCardId = "";
  let playedCardId = "";
  let results: DrillResult[] = [];
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
  $: resultText = playedCard ? barbuGuidedResult(contractLabel, currentTrick, playedCard) : currentTrick.beforeResult;
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
    if (!playedCard) return;
    results = [...results, barbuGuidedDecision(contractLabel, currentTrick, playedCard).result];
    if (isLastTrick) { onComplete(results); return; }
    trickIndex++;
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
        return currentTrick.playedExplanations[selected.id] ?? `${selected.label} does not fit the layout right now. Open with a seven or extend an open suit by one rank.`;
      }

      return `${selected.label} is not legal here because you still have ${suitNames[currentTrick.hand.find((card) => legalCardIds.has(card.id))?.suit ?? selected.suit]}.`;
    }

    return currentTrick.emptyExplanation;
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
  title={contractLabel}
  eyebrow={gameLabel}
  statusLabel="Decision"
  statusValue={`${trickIndex + 1} of ${activeTricks.length}`}
  tableAriaLabel="Card table"
  panelAriaLabel="Current lesson"
  pendingBySeat={currentTrick.pendingBySeat}
  tableCards={completedTable}
  useCustomTable={currentLessonIsDomino}
  onBack={onBack}
>
  {#snippet summary()}
    <p class="lesson-stage">{["Worked example", "Guided decision", "Your turn"][trickIndex]} <span>Separate positions</span></p>
  {/snippet}
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
          <button class="primary-action" onclick={nextTrick} type="button">Finish lesson</button>
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

<style>
  .lesson-stage { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; margin: 0; color: #f7faf3; font-size: 0.75rem; }
  .lesson-stage span { color: #c1d1bf; }
</style>
