<script lang="ts">
  import { untrack } from "svelte";
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import CardFace from "../../components/CardFace.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import type { CustomExerciseContext } from "../featureServices";
  import { ginLearningSteps, ginExerciseAnswer, ginSelectsDiscard, ginExerciseChoices, ginExercisePrompts, ginFeedbackBreakdown, type GinExerciseStep } from "../../lessons/gin-rummy/exercises";
  import { createLearningSession, checkLearningAnswer, advanceLearningSession } from "../../domain/learningSession";
  import type { DrillResult } from "../../lessons/drillDecision";
  import type { DecisionReview } from "../../lessons/decisionReview";
  let { context }: { context: CustomExerciseContext } = $props();
  let selected = $state("");
  let session = $state(untrack(() => createLearningSession<GinExerciseStep, DrillResult, DecisionReview>(ginLearningSteps(context.action))));
  let index = $derived(session.index), steps = $derived(session.steps), checked = $derived(session.phase !== "answer");
  let step = $derived(steps[index]);
  let feedback = $derived(checked ? ginExerciseAnswer(context.action, step, selected) : null);
  let discardChoice = $derived(ginSelectsDiscard(context.action));
  let breakdown = $derived(checked ? ginFeedbackBreakdown(context.action, step, selected) : undefined);
  function check() {
    if (!selected || checked) return;
    const answer = ginExerciseAnswer(context.action, step, selected);
    session = checkLearningAnswer(session, { contract: "Gin Rummy", cardLabel: ginExerciseChoices(context.action, step).find(choice => choice.id === selected)!.label,
      outcome: answer.good ? "good" : answer.illegal ? "illegal" : "risky", clean: answer.good, reason: "meld_count" },
      { title: step.title, prompt: ginExercisePrompts[context.action], explanation: answer.text,
      context: step.teaching?.guidance, breakdown: ginFeedbackBreakdown(context.action, step, selected), selectedCardIds: discardChoice ? [selected] : [],
      groups: [...(step.upcard ? [{ label: "Upcard", cards: [step.upcard] }] : []),
        { label: "Your hand before your choice", cards: step.hand }] });
  }
  function next() {
    if (session.phase !== "feedback") return;
    session = advanceLearningSession(session);
    if (session.phase === "complete") { context.onComplete(session.results, session.reviews); return; }
    selected = "";
  }
</script>

<TablePlaySurface flowLayout showTable={false} surfaceClassName="learning-play-surface" title={step.title} ariaLabel="Gin Rummy exercise"
  statusLabel="Decision" statusValue={`${index + 1} of ${steps.length}`} onBack={context.onBack} tableAriaLabel="Gin Rummy example" tableCards={[]} panelAriaLabel="Gin Rummy exercise choices">
  {#snippet summary()}
    {#if step.upcard}<div class="exercise-upcard"><span>Upcard</span><div><CardFace card={step.upcard} /></div></div>{/if}
  {/snippet}
  {#snippet panel()}
    <ExerciseFeedback coach={context.coach} eyebrow="Gin Rummy" title={step.title} result={checked ? "" : ginExercisePrompts[context.action]}
      teaching={!checked ? step.teaching : undefined} {breakdown}
      explanation={feedback?.text} outcome={feedback ? feedback.good ? "Good" : feedback.illegal ? "Illegal" : "Risky" : ""} warning={feedback ? !feedback.good : false} />
    <CardChoiceHand cards={step.hand} readonly={!discardChoice} ariaLabel="Your Gin Rummy exercise hand" className="hand full-hand-cards"
      cardClassName="card hand-card full-hand-card" onSelect={card => { if (!checked && discardChoice) selected = card.id; }}
      isPressed={card => selected === card.id} getCardClasses={card => ({ legal: true, selected: selected === card.id })} />
    {#if !discardChoice && !checked}
      <div class="choices" aria-label="Gin choices">
        {#each ginExerciseChoices(context.action, step) as choice}
          <button class="secondary-action" aria-pressed={selected === choice.id} disabled={checked} onclick={() => { selected = choice.id; }} type="button">{choice.label}</button>
        {/each}
      </div>
    {/if}
    <div class="action-row">
      <button class="secondary-action" onclick={context.onBack} type="button">Table</button>
      {#if checked}<button class="primary-action" onclick={next} type="button">{step.followUp && !feedback?.good ? "Try another example" : index === steps.length - 1 ? "Finish topic" : "Next decision"}</button>
      {:else}<button class="primary-action" disabled={!selected} onclick={check} type="button">Check answer</button>{/if}
    </div>
  {/snippet}
</TablePlaySurface>

<style>
  .exercise-upcard { display: grid; justify-items: center; gap: 6px; font-size: 0.8rem; color: #f7faf3; }.exercise-upcard > div { width: 48px; height: 67px; }
  .choices { display: flex; gap: 8px; }.choices button { flex: 1; min-width: 0; padding: 8px; min-height: 44px; font-size: 0.8rem; }
  .choices button[aria-pressed="true"] { color: #173728; background: #f5f1cf; }
</style>
