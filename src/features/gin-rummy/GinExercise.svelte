<script lang="ts">
  import { untrack } from "svelte";
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import CardFace from "../../components/CardFace.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import type { CustomExerciseContext } from "../featureServices";
  import { ginLearningSteps, ginExerciseAnswer, ginSelectsCard, ginExerciseChoices, ginExercisePrompt, ginExerciseGroups, ginFeedbackBreakdown, advanceGinLearningSession, type GinExerciseStep } from "../../lessons/gin-rummy/exercises";
  import { createLearningSession, checkLearningAnswer } from "../../domain/learningSession";
  import type { DrillResult } from "../../lessons/drillDecision";
  import type { DecisionReview } from "../../lessons/decisionReview";
  let { context }: { context: CustomExerciseContext } = $props();
  let selected = $state("");
  let session = $state(untrack(() => createLearningSession<GinExerciseStep, DrillResult, DecisionReview>(ginLearningSteps(context.action))));
  let index = $derived(session.index), steps = $derived(session.steps), checked = $derived(session.phase !== "answer");
  let step = $derived(steps[index]);
  let feedback = $derived(checked ? ginExerciseAnswer(context.action, step, selected) : null);
  let discardChoice = $derived(ginSelectsCard(context.action, step));
  let groups = $derived(ginExerciseGroups(step));
  let breakdown = $derived(checked ? ginFeedbackBreakdown(context.action, step, selected) : undefined);
  let choices = $derived(ginExerciseChoices(context.action, step));
  let validSelection = $derived(choices.some(choice => choice.id === selected));
  let summaryCard = $derived(step.upcard ?? (step.turn?.question === "discard" ? step.turn.drawn : step.turn?.discarded));
  let summaryLabel = $derived(step.turn?.question === "discard" ? step.turn.source === "stock" ? "Drawn from stock" : "Taken upcard"
    : step.turn?.question === "count" ? "Your discard" : "Upcard");
  function check() {
    if (!validSelection || checked) return;
    const answer = ginExerciseAnswer(context.action, step, selected);
    session = checkLearningAnswer(session, { contract: "Gin Rummy", cardLabel: ginExerciseChoices(context.action, step).find(choice => choice.id === selected)!.label,
      outcome: answer.good ? "good" : answer.illegal ? "illegal" : "risky", clean: answer.good, reason: "meld_count" },
      { title: step.title, prompt: ginExercisePrompt(context.action, step), explanation: answer.text,
      context: step.teaching?.guidance, breakdown: ginFeedbackBreakdown(context.action, step, selected), selectedCardIds: discardChoice ? [selected] : [],
      groups });
  }
  function next() {
    if (session.phase !== "feedback") return;
    session = advanceGinLearningSession(session, selected);
    if (session.phase === "complete") { context.onComplete(session.results, session.reviews); return; }
    selected = "";
  }
</script>

<TablePlaySurface flowLayout showTable={Boolean(step.settlement)} useCustomTable={Boolean(step.settlement)} stableFeedback
  surfaceClassName={`learning-play-surface${step.settlement ? " exposed-hand-learning" : ""}`} title={step.title} ariaLabel="Gin Rummy exercise"
  statusLabel="Decision" statusValue={`${index + 1} of ${steps.length}`} onBack={context.onBack} tableAriaLabel="Gin Rummy example" tableCards={[]} panelAriaLabel="Gin Rummy exercise choices">
  {#snippet summary()}
    {#if summaryCard}<div class="exercise-upcard"><span>{summaryLabel}</span><div><CardFace card={summaryCard} /></div></div>{/if}
  {/snippet}
  {#snippet table()}
    {#if step.settlement}
      <div class="exposed-hand">
        <strong>{groups[0].label}</strong>
        <CardChoiceHand cards={step.settlement.opponentHand} readonly ariaLabel="Barbu's exposed Gin exercise hand"
          className="hand exposed-cards" cardClassName="card hand-card" onSelect={() => {}} />
      </div>
    {/if}
  {/snippet}
  {#snippet panel()}
    <ExerciseFeedback coach={context.coach} eyebrow="Gin Rummy" title={step.title} result={checked ? "" : ginExercisePrompt(context.action, step)}
      teaching={!checked ? step.teaching : undefined} reserveSpace {breakdown}
      explanation={feedback?.text} outcome={feedback ? feedback.good ? "Good" : feedback.illegal ? "Illegal" : "Risky" : ""} warning={feedback ? !feedback.good : false} />
    {#if step.settlement}
      <strong class="hand-caption">{groups[1].label}</strong>
    {/if}
    <CardChoiceHand cards={step.hand} readonly={checked || !discardChoice} ariaLabel="Your Gin Rummy exercise hand" className="hand full-hand-cards"
      cardClassName="card hand-card full-hand-card" onSelect={card => { if (!checked && discardChoice) selected = card.id; }}
      isPressed={card => selected === card.id} getCardClasses={card => ({ legal: card.id !== step.turn?.session.hand.blockedDiscard,
        illegal: card.id === step.turn?.session.hand.blockedDiscard, selected: selected === card.id })} />
    {#if !discardChoice || step.turn}
      <div class="choices" aria-label="Gin choices">
        {#if discardChoice}<span>{step.hand.length} cards{checked ? " before your discard." : ": discard one."}</span>{/if}
        {#each discardChoice ? [] : choices as choice}
          <button class="secondary-action" aria-pressed={selected === choice.id} disabled={checked} onclick={() => { selected = choice.id; }} type="button">{choice.label}</button>
        {/each}
      </div>
    {/if}
    <div class="action-row">
      <button class="secondary-action" onclick={context.onBack} type="button">Table</button>
      {#if checked}<button class="primary-action" onclick={next} type="button">{step.followUp && !feedback?.good ? "Try another example" : index === steps.length - 1 ? "Finish topic" : "Next decision"}</button>
      {:else}<button class="primary-action" disabled={!validSelection} onclick={check} type="button">Check answer</button>{/if}
    </div>
  {/snippet}
</TablePlaySurface>

<style>
  .exercise-upcard { display: grid; justify-items: center; gap: 6px; font-size: 0.8rem; color: #f7faf3; }.exercise-upcard > div { width: 48px; height: 67px; }
  .choices { display: flex; align-items: stretch; min-height: 44px; gap: 8px; }.choices button { flex: 1; min-width: 0; padding: 8px; min-height: 44px; font-size: 0.8rem; }
  .choices > span { align-self: center; font-size: 0.8rem; color: #d8e1d5; }
  .choices button[aria-pressed="true"] { color: #173728; background: #f5f1cf; }
  .exposed-hand { display: grid; align-content: center; gap: 6px; min-width: 0; height: 100%; }
  .exposed-hand :global(.exposed-cards) { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px 4px; padding: 0; margin: 0; }
  .exposed-hand :global(.hand-card) { width: var(--flow-card-width, 40px); max-width: 100%; justify-self: center; aspect-ratio: 5 / 7; padding: 0; }
  .exposed-hand > strong, .hand-caption { font-size: 0.8rem; color: #f5f1cf; }
</style>
