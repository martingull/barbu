<script lang="ts">
  import { untrack } from "svelte";
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import { createLearningSession, checkLearningAnswer, advanceLearningSession } from "../../domain/learningSession";
  import { spadesChoiceSteps, spadesChoiceDecision, type SpadesChoiceStep, type SpadesChoiceTopic } from "../../lessons/spades/choices";
  import type { DrillResult } from "../../lessons/drillDecision";
  import type { DecisionReview } from "../../lessons/decisionReview";
  import type { CustomExerciseContext } from "../featureServices";
  let { context }: { context: CustomExerciseContext } = $props();
  const scoringSeats = ["You", "Tutor"] as const;
  let session = $state(untrack(() => createLearningSession<SpadesChoiceStep, DrillResult, DecisionReview>(spadesChoiceSteps(context.action as SpadesChoiceTopic))));
  let selected = $state("");
  let step = $derived(session.steps[session.index]);
  let checked = $derived(session.phase === "feedback");
  let decision = $derived(checked ? spadesChoiceDecision(step, selected) : null);
  function check() {
    if (checked || !step.options.some(option => option.id === selected)) return;
    const answer = spadesChoiceDecision(step, selected);
    session = checkLearningAnswer(session, answer.result, answer.review);
  }
  function next() {
    if (!checked) return;
    session = advanceLearningSession(session);
    if (session.phase === "complete") context.onComplete(session.results, session.reviews);
    else selected = "";
  }
</script>

<TablePlaySurface flowLayout stableFeedback showTable={step.table.length > 0} surfaceClassName="learning-play-surface"
  ariaLabel="Spades choice exercise" title={step.title} eyebrow="Spades" onBack={context.onBack}
  statusLabel="Decision" statusValue={`${session.index + 1} of ${session.steps.length}`}
  tableAriaLabel="Completed Spades trick" tableCards={step.table} panelAriaLabel="Spades exercise choices">
  {#snippet summary()}
    {#if step.score}
      <div class="score-position" aria-label="Spades scoring position">
        <div><strong>Player</strong><strong>Bid</strong><strong>Books</strong></div>
        {#each scoringSeats as seat}
          <div><span>{seat === "Tutor" ? "Barbu" : "You"}</span><span>{step.score.bids[seat] === 0 ? "Nil" : step.score.bids[seat]}</span><span>{step.score.tricks[seat]}</span></div>
        {/each}
        <p>Bags carried in: {step.score.carriedBags}</p>
      </div>
    {/if}
  {/snippet}
  {#snippet panel()}
    <ExerciseFeedback coach={context.coach} reserveSpace eyebrow="Spades" title={step.title}
      result={checked ? "" : step.prompt} teaching={checked ? { stage: step.teaching!.stage } : step.teaching}
      explanation={decision?.explanation} breakdown={checked ? step.breakdown : undefined}
      outcome={decision ? decision.result.clean ? "Good" : "Risky" : ""} warning={decision ? !decision.result.clean : false} />
    {#if step.hand.length}
      <CardChoiceHand cards={step.hand} readonly ariaLabel="Your Spades bidding exercise hand" className="hand full-hand-cards"
        cardClassName="card hand-card full-hand-card" onSelect={() => {}} />
    {/if}
    <div class="spades-choice-options" role="group" aria-label="Spades answer choices">
      {#each step.options as option}
        <button class="secondary-action" type="button" disabled={checked} aria-pressed={selected === option.id}
          onclick={() => { selected = option.id; }}>{option.label}</button>
      {/each}
    </div>
    <div class="action-row">
      <button class="secondary-action" onclick={context.onBack} type="button">Table</button>
      {#if checked}<button class="primary-action" onclick={next} type="button">{step.followUp && !decision?.result.clean ? "Try another example" : session.index === session.steps.length - 1 ? "Finish topic" : "Next decision"}</button>
      {:else}<button class="primary-action" disabled={!selected} onclick={check} type="button">Check answer</button>{/if}
    </div>
  {/snippet}
</TablePlaySurface>

<style>
  .score-position { font-size: 0.8rem; color: #f7faf3; }
  .score-position > div { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px; padding: 3px 0; }
  .score-position p { margin: 5px 0 0; }
  .spades-choice-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: auto; }
  button { min-width: 0; min-height: 44px; white-space: normal; }
  button[aria-pressed="true"] { background: #f5f1cf; color: #173728; }
</style>
