<script lang="ts">
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import { formatCardList } from "../../presentation/cardDisplay";
  import { generateHeartsPassPractice, evaluateHeartsPass, heartsPassPracticeCount as heartsPassPracticeTotalSteps } from "../../domain/heartsPractice";
  import type { Card } from "../../domain/types";
  import type { CustomExerciseContext } from "../featureServices";
  let { context }: { context: CustomExerciseContext } = $props();
  let heartsPassPracticeStepIndex = $state(0);
  let heartsPassPractice = $derived(generateHeartsPassPractice(context.seed + heartsPassPracticeStepIndex));
  let heartsPassPracticeSelectedCardIds = $state<string[]>([]);
  let heartsPassPracticeChecked = $state(false);
  let heartsPassPracticeError = $state("");
  let heartsPassPracticeSelectedCards = $derived(heartsPassPractice.playerHand.filter(card => heartsPassPracticeSelectedCardIds.includes(card.id)));
  let heartsPassPracticeOutcome = $derived(evaluateHeartsPass(heartsPassPractice, heartsPassPracticeSelectedCardIds));
  let heartsPassPracticeGood = $derived(heartsPassPracticeOutcome.outcomeKind === "good");
  let heartsPassPracticeCanCheck = $derived(heartsPassPracticeOutcome.isComplete);
  let heartsPassPracticeIsLastStep = $derived(heartsPassPracticeStepIndex >= heartsPassPracticeTotalSteps - 1);
  let heartsPassPracticeRecommendedIds = $derived(new Set(heartsPassPracticeGood
    ? heartsPassPracticeSelectedCardIds : heartsPassPractice.recommendedPass.map(card => card.id)));
  function toggleHeartsPassPracticeCard(card: Card) {
    heartsPassPracticeError = "";
    if (heartsPassPracticeSelectedCardIds.includes(card.id)) {
      heartsPassPracticeSelectedCardIds = heartsPassPracticeSelectedCardIds.filter(id => id !== card.id);
    } else if (heartsPassPracticeSelectedCardIds.length >= 3) {
      heartsPassPracticeError = "Remove one card before choosing another.";
      return;
    } else heartsPassPracticeSelectedCardIds = [...heartsPassPracticeSelectedCardIds, card.id];
    heartsPassPracticeChecked = false;
  }
  function checkHeartsPassPractice() {
    if (!heartsPassPracticeCanCheck) { heartsPassPracticeError = "Choose exactly three cards to pass."; return; }
    heartsPassPracticeError = "";
    heartsPassPracticeChecked = true;
  }
  function nextHeartsPassPracticeStep() {
    if (heartsPassPracticeIsLastStep) { context.onComplete(); return; }
    heartsPassPracticeStepIndex += 1;
    heartsPassPracticeSelectedCardIds = [];
    heartsPassPracticeChecked = false;
    heartsPassPracticeError = "";
  }
</script>

<TablePlaySurface
  mode="play"
  ariaLabel="Hearts pass practice"
  flowLayout
  title="Pass three"
  eyebrow="Hearts practice"
  statusLabel="Exercise"
  statusValue={`${heartsPassPracticeStepIndex + 1} of ${heartsPassPracticeTotalSteps}`}
  tableAriaLabel="Hearts pass practice table"
  tableCards={[]}
  showTable={false}
  panelAriaLabel="Hearts pass practice cards"
  onBack={context.onBack}
>
  {#snippet summary()}
    <div class="full-hand-summary grouped-play-summary" aria-label="Hearts pass practice summary">
      <div class="full-hand-summary-row current-hand" aria-label="Passing drill status">
        <span class="summary-row-label">Passing drill</span>
        <div>
          <span>Goal</span>
          <strong>{heartsPassPractice.title}</strong>
        </div>
        <div>
          <span>Selected</span>
          <strong>{heartsPassPracticeSelectedCardIds.length} / 3</strong>
        </div>
        <div>
          <span>Result</span>
          <strong>{heartsPassPracticeChecked ? heartsPassPracticeGood ? "Good" : "Risky" : "-"}</strong>
        </div>
      </div>
    </div>
  {/snippet}

  {#snippet panel()}
    <div class="lesson-heading">
      <p class="eyebrow">Before the hand</p>
      <h2>{heartsPassPractice.title}</h2>
    </div>

    {#if !heartsPassPracticeChecked}
      <p class="result">{heartsPassPractice.prompt}</p>
    {/if}
    {#if heartsPassPracticeError}
      <p class="outcome warning">{heartsPassPracticeError}</p>
    {:else if heartsPassPracticeChecked}
      <p class:warning={!heartsPassPracticeGood} class="outcome">
        {heartsPassPracticeGood ? "Good pass." : "Risky pass."}
        {heartsPassPracticeOutcome?.explanation}
      </p>
      {#if !heartsPassPracticeGood}
        <p class="explanation pass-recommendation">
          Suggested: {formatCardList(heartsPassPractice.recommendedPass)}.
        </p>
      {/if}
    {:else if heartsPassPracticeSelectedCards.length}
      <p class="explanation">
        Passing: {formatCardList(heartsPassPracticeSelectedCards)}
      </p>
    {/if}

    <CardChoiceHand
      cards={heartsPassPractice.playerHand}
      ariaLabel="Your Hearts pass practice hand"
      className="hand full-hand-cards hearts-pass-cards"
      cardClassName="card hand-card full-hand-card"
      getCardClasses={(card) => ({
        heart: card.suit === "H",
        legal: !heartsPassPracticeSelectedCardIds.includes(card.id),
        recommended: heartsPassPracticeChecked && heartsPassPracticeRecommendedIds.has(card.id),
        selected: heartsPassPracticeSelectedCardIds.includes(card.id)
      })}
      isPressed={(card) => heartsPassPracticeSelectedCardIds.includes(card.id)}
      onSelect={toggleHeartsPassPracticeCard}
    />

    <div class="action-row">
      <button class="secondary-action" onclick={context.onBack} type="button">Table</button>
      {#if heartsPassPracticeChecked}
        {#if context.fromCourse}
          <button class="primary-action" onclick={() => void nextHeartsPassPracticeStep()} type="button">
            {heartsPassPracticeIsLastStep
              ? context.courseComplete
                ? "Back to Hearts table"
                : "Continue Hearts path"
              : "Next pass"}
          </button>
        {:else}
          <button class="primary-action" onclick={() => void nextHeartsPassPracticeStep()} type="button">
            {heartsPassPracticeIsLastStep ? "Complete exercise" : "Next pass"}
          </button>
        {/if}
      {:else}
        <button
          class="primary-action"
          disabled={!heartsPassPracticeCanCheck}
          onclick={checkHeartsPassPractice}
          type="button"
        >
          Check pass
        </button>
      {/if}
    </div>
  {/snippet}
</TablePlaySurface>
