<script lang="ts">
  import { untrack } from "svelte";
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import CardFace from "../../components/CardFace.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import { compassSeatLabels } from "../../presentation/cardDisplay";
  import { compareBeloteCards } from "../../presentation/beloteDisplay";
  import { trickTakingSeats } from "../../domain/trickTakingScore";
  import { evaluateBeloteAnswer } from "../../domain/beloteLearning";
  import { createLearningSession, checkLearningAnswer, advanceLearningSession } from "../../domain/learningSession";
  import { beloteLearningSteps, beloteAnswerChoices, belotePrompt, beloteExplanation, beloteBreakdown, type BeloteStep } from "../../lessons/belote/exercises";
  import type { CustomExerciseContext } from "../featureServices";
  import type { DrillResult } from "../../lessons/drillDecision";
  import type { DecisionReview } from "../../lessons/decisionReview";
  let { context }: { context: CustomExerciseContext } = $props();
  let selected = $state("");
  let session = $state(untrack(() => createLearningSession<BeloteStep, DrillResult, DecisionReview>(beloteLearningSteps(context.action))));
  let step = $derived(session.steps[session.index]);
  let q = $derived(step.question);
  let checked = $derived(session.phase !== "answer");
  let selectsCard = $derived(q.kind === "rank" || q.kind === "play");
  let result = $derived(checked ? evaluateBeloteAnswer(q, selected) : null);
  let tableCards = $derived(q.kind === "play" ? q.trick.map(play => ({ seat: trickTakingSeats[play.seat], card: play.card })) : []);
  function check() {
    if (!selected || checked) return;
    const label = beloteAnswerChoices(q).find(choice => choice.id === selected)?.label;
    if (!label) return;
    const answer = evaluateBeloteAnswer(q, selected);
    session = checkLearningAnswer(session, { contract: "Belote", cardLabel: label, outcome: answer.good ? "good" : answer.illegal ? "illegal" : "risky", clean: answer.good, reason: answer.reason },
      { title: step.title, prompt: belotePrompt(q), explanation: beloteExplanation(q), context: step.teaching.guidance, breakdown: beloteBreakdown(q),
        selectedCardIds: selectsCard ? [selected] : [], groups: [
          ...(q.kind === "take" ? [{ label: "Upcard", cards: [q.upcard] }] : []),
          ...(q.kind === "play" ? [{ label: "Table before your choice", cards: q.trick.map(play => play.card), captions: Object.fromEntries(q.trick.map(play => [play.card.id, compassSeatLabels[trickTakingSeats[play.seat]]!])) }] : []),
          { label: "Cards shown", cards: q.hand }] });
  }
  function next() { session = advanceLearningSession(session); selected = ""; if (session.phase === "complete") context.onComplete(session.results, session.reviews); }
</script>
<TablePlaySurface flowLayout stableFeedback showTable={tableCards.length > 0} title={step.title} ariaLabel="Belote exercise" statusLabel="Decision"
  statusValue={`${session.index + 1} of ${session.steps.length}`} onBack={context.onBack} {tableCards} seatLabels={compassSeatLabels}
  tableAriaLabel="Belote exercise table" panelAriaLabel="Belote exercise choices" surfaceClassName="learning-play-surface belote-exercise">
  {#snippet summary()}
    <div class="position-facts" aria-label="Belote exercise position">
      {#if q.kind === "take"}<div class="upcard"><span>{q.round === 1 ? "Upcard" : "Turned down"}</span><div><CardFace card={q.upcard} /></div></div>{/if}
      <dl>{#each beloteBreakdown(q).rows as row}<div><dt>{row.label}</dt><dd>{row.value}</dd></div>{/each}</dl>
    </div>
  {/snippet}
  {#snippet panel()}
    <ExerciseFeedback coach={context.coach} reserveSpace eyebrow="Belote" title={step.title} result={checked ? "" : belotePrompt(q)}
      teaching={!checked ? step.teaching : undefined} explanation={checked ? beloteExplanation(q) : ""}
      outcome={result ? result.good ? "Good" : result.illegal ? "Illegal" : "Risky" : ""} warning={Boolean(result && !result.good)} />
    {#if q.hand.length}<CardChoiceHand cards={q.hand} readonly={!selectsCard} ariaLabel="Your Belote exercise hand" className="hand full-hand-cards"
      cardClassName="card hand-card full-hand-card" compareCards={compareBeloteCards(q.trump)} onSelect={card => { if (!checked && selectsCard) selected = card.id; }}
      isPressed={card => selected === card.id} getCardClasses={card => ({ legal: true, selected: selected === card.id })} />{/if}
    {#if !selectsCard}<div class="belote-choices" aria-label="Belote answer choices">{#each beloteAnswerChoices(q) as choice}
      <button class="secondary-action" type="button" aria-pressed={selected === choice.id} disabled={checked} onclick={() => { selected = choice.id; }}>{choice.label}</button>
    {/each}</div>{/if}
    <div class="action-row"><button class="secondary-action" type="button" onclick={context.onBack}>Table</button>
      {#if checked}<button class="primary-action" type="button" onclick={next}>{step.followUp && !result?.good ? "Try another example" : session.index === session.steps.length - 1 ? "Finish topic" : "Next decision"}</button>
      {:else}<button class="primary-action" type="button" disabled={!selected} onclick={check}>Check answer</button>{/if}</div>
  {/snippet}
</TablePlaySurface>
<style>
  .position-facts { display: flex; align-items: center; gap: 12px; color: #f7faf3; padding: 4px 0 8px; }
  .upcard { width: 52px; flex: none; display: grid; gap: 4px; font-size: 0.65rem; } .upcard > div { width: 52px; aspect-ratio: 1 / 1.452; }
  dl { flex: 1; margin: 0; display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 6px 12px; min-width: 0; }
  dt { color: #c8d8ca; font-size: 0.65rem; } dd { margin: 2px 0 0; font-size: 0.8rem; font-weight: 700; overflow-wrap: anywhere; }
  .belote-choices { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 6px; }
  .belote-choices button { padding: 8px 4px; min-height: 44px; font-size: 0.8rem; }
  .belote-choices button[aria-pressed="true"] { background: #f5f1cf; color: #173728; }
  :global(.app-shell.fixed-play-screen .belote-exercise.flow-play.compact-play) {
    --flow-card-width: min(58px,calc((100vw - 56px) / 5)); --flow-hand-height: calc(var(--flow-card-width) * 1.452);
  }
  :global(.app-shell.fixed-play-screen .table-play-surface.belote-exercise.flow-play.compact-play.learning-play-surface .table-play-panel .hand.full-hand-cards) { grid-template-columns: repeat(5,var(--flow-card-width)); grid-template-rows: var(--flow-hand-height); justify-content: center; }
  :global(.app-shell.fixed-play-screen .belote-exercise.table-hidden .table-play-panel > .coach-feedback.reserved) { flex: 1 1 var(--flow-feedback-height); min-height: var(--flow-feedback-height); height: auto; }
</style>
