<script lang="ts">
  import { untrack } from "svelte";
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import FeedbackBreakdown from "../../components/FeedbackBreakdown.svelte";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import { cribbageQuestionCount } from "../../domain/cribbageLearning";
  import { cribbageCountBreakdown } from "./cribbageScorePresentation";
  import { createLearningSession, checkLearningAnswer, advanceLearningSession } from "../../domain/learningSession";
  import { cribbageCards } from "../../domain/cribbage";
  import { compareCribbageCardsForDisplay } from "../../presentation/cardOrdering";
  import { cribbageLearningSteps, cribbagePrompt, cribbageExplanation, cribbagePegArithmetic, cribbageQuestionAnswer, cribbageQuestionChoices, cribbageAnswerLabel, type CribbageExerciseStep } from "../../lessons/cribbage/exercises";
  import type { CustomExerciseContext } from "../featureServices";
  import type { DrillResult } from "../../lessons/drillDecision";
  import type { DecisionReview } from "../../lessons/decisionReview";
  let { context, onPoints }: { context: CustomExerciseContext; onPoints: () => void } = $props();
  let selected = $state("");
  let session = $state(untrack(() => createLearningSession<CribbageExerciseStep, DrillResult, DecisionReview>(cribbageLearningSteps(context.action))));
  let step = $derived(session.steps[session.index]);
  let question = $derived(step.question);
  let checked = $derived(session.phase !== "answer");
  let good = $derived(checked && selected === cribbageQuestionAnswer(question));
  let arithmetic = $derived(cribbagePegArithmetic(question));
  let count = $derived(cribbageQuestionCount(question));
  let breakdown = $derived(count ? cribbageCountBreakdown(count) : arithmetic);
  let groups = $derived(question.kind === "peg" ? [
    { label: "Already played", cards: cribbageCards(question.run) }, { label: "You play", cards: cribbageCards([question.card]) }
  ] : [ { label: question.kind === "count" ? question.crib ? "Crib" : "Kept hand" : question.kind === "value" ? "Card" : "Your six cards", cards: cribbageCards(question.hand) },
    ...(question.kind === "count" ? [{ label: "Starter", cards: cribbageCards([question.starter]) }] : []) ]);
  function check() {
    if (!selected || checked) return;
    const clean = selected === cribbageQuestionAnswer(question);
    session = checkLearningAnswer(session, { contract: "Cribbage", cardLabel: cribbageAnswerLabel(selected, question), outcome: clean ? "good" : "risky", reason: "meld_count", clean },
      { title: step.title, prompt: cribbagePrompt(question), explanation: cribbageExplanation(question), groups, breakdown,
        selectedCardIds: selected.includes(",") ? selected.split(",") : [] });
  }
  function next() { session = advanceLearningSession(session); selected = ""; if (session.phase === "complete") context.onComplete(session.results, session.reviews); }
</script>

<TablePlaySurface flowLayout stableFeedback showTable={false} title={step.title} ariaLabel="Cribbage exercise"
  surfaceClassName="cribbage-exercise" statusLabel="Decision" statusValue={`${session.index + 1} of ${session.steps.length}`}
  onBack={context.onBack} tableCards={[]} tableAriaLabel="Cribbage exercise position" panelAriaLabel="Cribbage answer choices">
  {#snippet summary()}
    <div class="points-toolbar"><button class="points-button" type="button" onclick={onPoints} aria-label="Open Cribbage points sheet" title="Points sheet"><BookOpen size={18} /><span>Points sheet</span></button></div>
    <div class="position" aria-label="Cribbage exercise position">
      {#each groups as group}<div><p>{group.label}</p><CardChoiceHand cards={group.cards} readonly onSelect={() => {}} compareCards={question.kind === "peg" ? () => 0 : compareCribbageCardsForDisplay} ariaLabel={group.label} className="exercise-cards" cardClassName="exercise-card" /></div>{/each}
    </div>
    {#if arithmetic}<div class="arithmetic"><FeedbackBreakdown breakdown={arithmetic} /></div>{/if}
  {/snippet}
  {#snippet panel()}
    <ExerciseFeedback coach={context.coach} reserveSpace eyebrow="Cribbage" title={step.title}
      result={checked ? "" : cribbagePrompt(question)} teaching={!checked ? step.teaching : undefined}
      explanation={checked ? cribbageExplanation(question) : ""} breakdown={checked && count ? breakdown : undefined}
      outcome={checked ? good ? "Good" : "Risky" : ""} warning={checked && !good} />
    <div class="choices" aria-label="Cribbage answer choices">
      {#each cribbageQuestionChoices(question) as id}<button type="button" class="secondary-action" disabled={checked} aria-pressed={selected === id} onclick={() => { selected = id; }}>{cribbageAnswerLabel(id, question)}</button>{/each}
    </div>
    <div class="action-row"><button type="button" class="secondary-action" onclick={context.onBack}>Table</button>
      {#if checked}<button type="button" class="primary-action" onclick={next}>{session.index === session.steps.length - 1 ? "Finish topic" : "Next decision"}</button>
      {:else}<button type="button" class="primary-action" disabled={!selected} onclick={check}>Check answer</button>{/if}
    </div>
  {/snippet}
</TablePlaySurface>

<style>
  .position { display: flex; gap: 12px; align-items: start; padding: 4px 0 8px; color: #f5f8ee; }
  .position > div { min-width: 0; } .position > div:first-child { flex: 1; }
  .points-toolbar { display: flex; justify-content: flex-end; flex: none; }
  .points-button { display: flex; align-items: center; gap: 6px; min-height: 44px; padding: 6px 8px; border: 0; background: transparent; color: #f1d475; cursor: pointer; font-size: 0.75rem; }
  .position p { font-size: 0.7rem; margin: 0 0 6px; }
  .arithmetic { color: #f5f8ee; }
  .position :global(.exercise-cards) { display: flex; flex-wrap: nowrap; gap: 3px; }
  .position :global(.exercise-card) { width: min(52px, calc((100vw - 80px) / 6)); aspect-ratio: 1 / 1.452; padding: 0; flex: none; }
  .choices { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .choices button { min-width: 0; min-height: 48px; padding: 8px 4px; font-size: 0.85rem; }
  .choices button[aria-pressed="true"] { background: #f5f1cf; color: #18382b; }
  :global(.app-shell.fixed-play-screen .table-play-surface.cribbage-exercise.flow-play.compact-play.stable-feedback) {
    --flow-feedback-height: clamp(80px, 18dvh, 128px);
  }
  :global(.app-shell.fixed-play-screen .table-play-surface.cribbage-exercise.table-hidden .table-play-panel > .coach-feedback.reserved) {
    flex: 1 1 var(--flow-feedback-height);
    min-height: var(--flow-feedback-height);
    height: auto;
  }
</style>
