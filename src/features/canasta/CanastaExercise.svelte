<script lang="ts">
  import { untrack } from "svelte";
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import CanastaCards from "./CanastaCards.svelte";
  import type { CustomExerciseContext } from "../featureServices";
  import { canastaLearningSteps, answerCanastaExercise, canastaExerciseChoices, canastaFeedbackBreakdown, type CanastaExercise } from "../../lessons/canasta/exercises";
  import { createLearningSession, checkLearningAnswer, advanceLearningSession } from "../../domain/learningSession";
  import type { DrillResult } from "../../lessons/drillDecision";
  import type { DecisionReview } from "../../lessons/decisionReview";
  let { context }: { context: CustomExerciseContext } = $props();
  let selected = $state("");
  let session = $state.raw(untrack(() => createLearningSession<CanastaExercise, DrillResult, DecisionReview>(canastaLearningSteps(context.action))));
  const step = $derived(session.steps[session.index]), checked = $derived(session.phase !== "answer");
  const feedback = $derived(checked ? answerCanastaExercise(context.action, step, selected) : null);
  const groups = $derived([
    ...(context.action === "pile" ? [{ label: "Top discard", cards: step.session.hand.discards.slice(-1) }] : []),
    ...step.session.hand.sides[0].melds.map(meld => ({ label: `${meld.rank} meld (${meld.cards.length}/7)`, cards: meld.cards })),
    ...(step.session.hand.sides[0].threes.length ? [{ label: "Exposed threes", cards: step.session.hand.sides[0].threes }] : []),
    ...(step.action?.type === "meld" ? step.action.groups.map(group => ({ label: `Proposed ${group.rank} group`, cards: step.session.hand.hands[0].filter(card => group.cardIds.includes(card.id)) })) : []),
    ...(step.strategy?.choices.map(choice => ({ label: choice.label, cards: step.session.hand.hands[0].filter(card => choice.action.groups.some(group => group.cardIds.includes(card.id))) })) ?? [])
  ]);
  function check() {
    if (!selected || checked) return;
    const answer = answerCanastaExercise(context.action, step, selected);
    session = checkLearningAnswer(session, { contract: "Canasta", cardLabel: canastaExerciseChoices(context.action, step).find(choice => choice.id === selected)!.label,
      outcome: answer.good ? "good" : answer.illegal ? "illegal" : "risky", clean: answer.good, reason: step.strategy ? "meld_risk" : "meld_count" },
      { title: step.title, prompt: step.prompt, explanation: answer.text, context: step.teaching?.guidance,
        breakdown: canastaFeedbackBreakdown(context.action, step), selectedCardIds: context.action === "discard" ? [selected]
          : step.strategy?.choices.find(choice => choice.id === selected)?.action.groups.flatMap(group => group.cardIds) ?? [],
        groups: [...groups, { label: "Your hand", cards: step.session.hand.hands[0] }] });
  }
  function next() {
    if (session.phase !== "feedback") return;
    session = advanceLearningSession(session);
    if (session.phase === "complete") { context.onComplete(session.results, session.reviews); return; }
    selected = "";
  }
</script>
<TablePlaySurface flowLayout stableFeedback showTable={false} surfaceClassName="learning-play-surface canasta-exercise" title={step.title} ariaLabel="Canasta exercise"
  statusLabel="Decision" statusValue={`${session.index + 1} of ${session.steps.length}`} onBack={context.onBack} tableAriaLabel="Canasta example" tableCards={[]} panelAriaLabel="Canasta exercise choices">
  {#snippet summary()}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable public cards need keyboard access.) -->
    {#if groups.length}<div class="position" role="region" aria-label="Canasta public position" tabindex="0">
      {#each groups as group}<div><span>{group.label}</span><CanastaCards cards={group.cards} readonly label={group.label} /></div>{/each}
    </div>{/if}
  {/snippet}
  {#snippet panel()}
    <ExerciseFeedback coach={context.coach} reserveSpace eyebrow="Canasta" title={step.title} result={checked ? "" : step.prompt}
      teaching={!checked ? step.teaching : undefined} breakdown={checked ? canastaFeedbackBreakdown(context.action, step) : undefined}
      explanation={feedback?.text} outcome={feedback ? feedback.good ? "Good" : feedback.illegal ? "Illegal" : "Risky" : ""} warning={feedback ? !feedback.good : false} />
    <CanastaCards cards={step.session.hand.hands[0]} readonly={checked || context.action !== "discard"}
      selected={context.action === "discard" && selected ? [selected] : []}
      onSelect={card => { if (!checked && context.action === "discard") selected = card.id; }} label="Canasta exercise hand" />
    <div class="choices" aria-label="Canasta choices">
      {#if context.action !== "discard"}{#each canastaExerciseChoices(context.action, step) as choice}
        <button class="secondary-action" disabled={checked} aria-pressed={selected === choice.id} onclick={() => { selected = choice.id; }} type="button">{choice.label}</button>
      {/each}{/if}
    </div>
    <div class="action-row"><button class="secondary-action" onclick={context.onBack} type="button">Table</button>
      {#if checked}<button class="primary-action" onclick={next} type="button">{step.followUp && !feedback?.good ? "Try another example" : session.index === session.steps.length - 1 ? "Finish topic" : "Next decision"}</button>
      {:else}<button class="primary-action" disabled={!selected} onclick={check} type="button">Check answer</button>{/if}</div>
  {/snippet}
</TablePlaySurface>
<style>
  :global(.canasta-exercise) { --canasta-hand-height: 140px; }
  .position { height: 150px; overflow-y: auto; flex: none; display: grid; gap: 6px; color: #e2eee7; }
  .position > div { --canasta-hand-height: 58px; font-size: 0.75rem; }
  .position :global(.canasta-cards .canasta-card) { max-width: 32px; }
  .choices { display: flex; gap: 8px; min-height: 44px; }.choices button { flex: 1; min-width: 0; min-height: 44px; padding: 8px; font-size: 0.85rem; }
  .choices button[aria-pressed="true"] { background: #f5f1cf; color: #193e2e; }
  @media (max-height: 650px) {
    :global(.canasta-exercise) { --canasta-hand-height: 76px; }
    .position { height: 86px; }
  }
</style>
