<script lang="ts">
  import { untrack } from "svelte";
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import CardFace from "../../components/CardFace.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import { compassSeatLabels } from "../../presentation/cardDisplay";
  import { compareEuchreCards } from "../../presentation/euchreDisplay";
  import { trickTakingSeats } from "../../domain/trickTakingScore";
  import { evaluateEuchreAnswer } from "../../domain/euchreLearning";
  import { createLearningSession, checkLearningAnswer, advanceLearningSession } from "../../domain/learningSession";
  import { euchreLearningSteps, euchreExerciseChoices, euchreExercisePrompt, euchreExerciseFeedback,
    euchreExerciseGroups, euchreExerciseBreakdown, type EuchreExerciseStep } from "../../lessons/euchre/exercises";
  import type { CustomExerciseContext } from "../featureServices";
  import type { DrillResult } from "../../lessons/drillDecision";
  import type { DecisionReview } from "../../lessons/decisionReview";

  let { context }: { context: CustomExerciseContext } = $props();
  let selected = $state("");
  let session = $state(untrack(() => createLearningSession<EuchreExerciseStep, DrillResult, DecisionReview>(euchreLearningSteps(context.action))));
  let step = $derived(session.steps[session.index]);
  let checked = $derived(session.phase !== "answer");
  let selectsCard = $derived(!["call", "score"].includes(step.kind));
  let answer = $derived(checked ? evaluateEuchreAnswer(step, selected) : null);
  let tableCards = $derived((step.trick ?? []).map(play => ({ seat: trickTakingSeats[play.seat], card: play.card })));
  function check() {
    if (!selected || checked) return;
    const result = evaluateEuchreAnswer(step, selected);
    const label = euchreExerciseChoices(step).find(choice => choice.id === selected)?.label;
    if (!label) return;
    session = checkLearningAnswer(session, { contract: "Euchre", cardLabel: label, outcome: result.good ? "good" : result.illegal ? "illegal" : "risky",
      clean: result.good, reason: result.reason }, { title: step.title, prompt: euchreExercisePrompt(step),
      explanation: euchreExerciseFeedback(step, selected), context: step.teaching?.guidance, breakdown: euchreExerciseBreakdown(step),
      selectedCardIds: selectsCard ? [selected] : [], groups: euchreExerciseGroups(step) });
  }
  function next() {
    if (session.phase !== "feedback") return;
    session = advanceLearningSession(session);
    if (session.phase === "complete") context.onComplete(session.results, session.reviews);
    else selected = "";
  }
</script>

<TablePlaySurface flowLayout stableFeedback showTable={Boolean(step.trick?.length)} surfaceClassName="learning-play-surface euchre-exercise"
  title={step.title} ariaLabel="Euchre exercise" statusLabel="Decision" statusValue={`${session.index + 1} of ${session.steps.length}`}
  onBack={context.onBack} tableAriaLabel="Euchre exercise table" {tableCards} seatLabels={compassSeatLabels} panelAriaLabel="Euchre exercise choices">
  {#snippet summary()}
    <div class="position-facts" aria-label="Euchre exercise position">
      {#if step.upcard}<div class="upcard"><span>{step.round === 2 ? "Turned down" : "Upcard"}</span><div class="upcard-face"><CardFace card={step.upcard} /></div></div>{/if}
      <dl>{#each euchreExerciseBreakdown(step).rows as row}<div><dt>{row.label}</dt><dd>{row.value}</dd></div>{/each}</dl>
    </div>
  {/snippet}
  {#snippet panel()}
    <ExerciseFeedback coach={context.coach} reserveSpace eyebrow="Euchre" title={step.title}
      result={checked ? "" : euchreExercisePrompt(step)} teaching={!checked ? step.teaching : undefined}
      explanation={checked ? euchreExerciseFeedback(step, selected) : ""}
      outcome={answer ? answer.good ? "Good" : answer.illegal ? "Illegal" : "Risky" : ""} warning={Boolean(answer && !answer.good)} />
    {#if step.hand.length}
      <CardChoiceHand cards={step.hand} readonly={!selectsCard} ariaLabel="Your Euchre exercise hand" className="hand full-hand-cards"
        cardClassName="card hand-card full-hand-card" compareCards={compareEuchreCards(step.trump)}
        onSelect={card => { if (!checked && selectsCard) selected = card.id; }} isPressed={card => selected === card.id}
        getCardClasses={card => ({ legal: true, selected: selected === card.id })} />
    {/if}
    {#if !selectsCard}
      <div class="choices" aria-label="Euchre answer choices">
        {#each euchreExerciseChoices(step) as choice}
          <button type="button" class="secondary-action" aria-pressed={selected === choice.id} disabled={checked} onclick={() => { selected = choice.id; }}>{choice.label}</button>
        {/each}
      </div>
    {/if}
    <div class="action-row">
      <button class="secondary-action" type="button" onclick={context.onBack}>Table</button>
      {#if checked}<button class="primary-action" type="button" onclick={next}>{step.followUp && !answer?.good ? "Try another example" : session.index === session.steps.length - 1 ? "Finish topic" : "Next decision"}</button>
      {:else}<button class="primary-action" type="button" disabled={!selected} onclick={check}>Check answer</button>{/if}
    </div>
  {/snippet}
</TablePlaySurface>

<style>
  .position-facts { display: flex; align-items: center; gap: 16px; padding: 4px 0 8px; color: #f7faf3; }
  .upcard { width: 64px; flex: none; display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px; }
  .upcard span { font-size: 0.65rem; line-height: 1.2; overflow-wrap: anywhere; }
  .upcard-face { width: 52px; aspect-ratio: 1 / 1.452; }
  dl { margin: 0; min-width: 0; display: grid; gap: 4px 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); flex: 1; }
  dl > div { min-width: 0; }
  dt { font-size: 0.65rem; color: #c8d8ca; } dd { font-size: 0.8rem; font-weight: 700; margin: 2px 0 0; overflow-wrap: anywhere; }
  .choices { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .choices button { min-width: 0; min-height: 44px; padding: 8px 4px; font-size: 0.8rem; }
  .choices button[aria-pressed="true"] { background: #f5f1cf; color: #173728; }
  :global(.app-shell.fixed-play-screen .table-play-surface.euchre-exercise.flow-play.compact-play) {
    --flow-card-width: min(56px, calc((100vw - 66px) / 6));
    --flow-hand-height: calc(var(--flow-card-width) * 1.452);
  }
  :global(.app-shell.fixed-play-screen .table-play-surface.euchre-exercise.flow-play.compact-play .full-hand-cards) {
    grid-template-columns: repeat(6, var(--flow-card-width)); grid-template-rows: var(--flow-hand-height); justify-content: center;
  }
  :global(.app-shell.fixed-play-screen .euchre-exercise.table-hidden .table-play-panel > .coach-feedback.reserved) {
    flex: 1 1 var(--flow-feedback-height);
    min-height: var(--flow-feedback-height);
    height: auto;
  }
</style>
