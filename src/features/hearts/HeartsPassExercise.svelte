<script lang="ts">
  import { untrack } from "svelte";
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import { formatCardList } from "../../presentation/cardDisplay";
  import { evaluateHeartsPass } from "../../domain/heartsPractice";
  import { heartsPassingSteps } from "../../lessons/hearts/exercises";
  import { insertLearningFollowUp } from "../../domain/learningSequence";
  import type { Card } from "../../domain/types";
  import type { CustomExerciseContext } from "../featureServices";
  import type { DrillResult } from "../../lessons/drillDecision";
  import type { DecisionReview } from "../../lessons/decisionReview";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  let { context }: { context: CustomExerciseContext } = $props();
  let heartsPassPracticeStepIndex = $state(0);
  let results = $state<DrillResult[]>([]);
  let reviews = $state<DecisionReview[]>([]);
  let steps = $state(untrack(() => heartsPassingSteps(context.seed)));
  let heartsPassPractice = $derived(steps[heartsPassPracticeStepIndex]);
  let heartsPassPracticeSelectedCardIds = $state<string[]>([]);
  let heartsPassPracticeChecked = $state(false);
  let heartsPassPracticeError = $state("");
  let heartsPassPracticeSelectedCards = $derived(heartsPassPractice.playerHand.filter(card => heartsPassPracticeSelectedCardIds.includes(card.id)));
  let heartsPassPracticeOutcome = $derived(evaluateHeartsPass(heartsPassPractice, heartsPassPracticeSelectedCardIds));
  let heartsPassPracticeGood = $derived(heartsPassPracticeOutcome.outcomeKind === "good");
  let heartsPassPracticeCanCheck = $derived(heartsPassPracticeOutcome.isComplete);
  let heartsPassPracticeIsLastStep = $derived(heartsPassPracticeStepIndex >= steps.length - 1);
  let heartsPassPracticeRecommendedIds = $derived(new Set(heartsPassPracticeGood
    ? heartsPassPracticeSelectedCardIds : heartsPassPractice.recommendedPass.map(card => card.id)));
  function toggleHeartsPassPracticeCard(card: Card) {
    if (heartsPassPracticeChecked) return;
    heartsPassPracticeError = "";
    if (heartsPassPracticeSelectedCardIds.includes(card.id)) {
      heartsPassPracticeSelectedCardIds = heartsPassPracticeSelectedCardIds.filter(id => id !== card.id);
    } else if (heartsPassPracticeSelectedCardIds.length >= 3) {
      heartsPassPracticeError = "Remove one card before choosing another.";
      return;
    } else heartsPassPracticeSelectedCardIds = [...heartsPassPracticeSelectedCardIds, card.id];
  }
  function checkHeartsPassPractice() {
    if (heartsPassPracticeChecked) return;
    if (!heartsPassPracticeCanCheck) { heartsPassPracticeError = "Choose exactly three cards to pass."; return; }
    heartsPassPracticeError = "";
    heartsPassPracticeChecked = true;
  }
  function nextHeartsPassPracticeStep() {
    if (!heartsPassPracticeChecked || results.length !== heartsPassPracticeStepIndex) return;
    results = [...results, { contract: "Hearts", cardLabel: formatCardList(heartsPassPracticeSelectedCards),
      outcome: heartsPassPracticeGood ? "good" : "risky", clean: heartsPassPracticeGood, reason: "pass_selection" }];
    reviews = [...reviews, { title: heartsPassPractice.title, prompt: heartsPassPractice.prompt,
      explanation: heartsPassPracticeOutcome.explanation + (heartsPassPracticeGood ? "" : ` Suggested: ${formatCardList(heartsPassPractice.recommendedPass)}.`),
      selectedCardIds: [...heartsPassPracticeSelectedCardIds],
      groups: [{ label: "Your hand before passing", cards: heartsPassPractice.playerHand }] }];
    steps = insertLearningFollowUp(steps, heartsPassPracticeStepIndex, heartsPassPracticeGood, heartsPassPractice.followUp);
    if (heartsPassPracticeStepIndex === steps.length - 1) { context.onComplete(results, reviews); return; }
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
  statusValue={`${heartsPassPracticeStepIndex + 1} of ${steps.length}`}
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
    <ExerciseFeedback coach={context.coach} eyebrow="Before the hand" title={heartsPassPractice.title}
      result={heartsPassPracticeChecked ? "" : heartsPassPractice.prompt}
      error={heartsPassPracticeError} warning={!heartsPassPracticeGood}
      outcome={!heartsPassPracticeError && heartsPassPracticeChecked
        ? `${heartsPassPracticeGood ? "Good pass." : "Risky pass."} ${heartsPassPracticeOutcome.explanation}` : ""}
      explanation={heartsPassPracticeError ? "" : heartsPassPracticeChecked
        ? heartsPassPracticeGood ? "" : `Suggested: ${formatCardList(heartsPassPractice.recommendedPass)}.`
        : heartsPassPracticeSelectedCards.length ? `Passing: ${formatCardList(heartsPassPracticeSelectedCards)}` : ""} />

    <CardChoiceHand
      cards={heartsPassPractice.playerHand}
      readonly={heartsPassPracticeChecked}
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
        <button class="primary-action" onclick={nextHeartsPassPracticeStep} type="button">
          {heartsPassPractice.followUp && !heartsPassPracticeGood ? "Try another example" : heartsPassPracticeIsLastStep ? "Finish topic" : "Next pass"}
        </button>
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
