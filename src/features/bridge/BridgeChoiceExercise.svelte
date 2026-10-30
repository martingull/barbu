<script lang="ts">
  import { untrack } from "svelte";
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import { createLearningSession, checkLearningAnswer, advanceLearningSession } from "../../domain/learningSession";
  import { bridgeChoiceSteps, type BridgeChoiceStep } from "../../lessons/bridge/learning";
  import type { DrillResult } from "../../lessons/drillDecision";
  import type { DecisionReview } from "../../lessons/decisionReview";
  import type { CustomExerciseContext } from "../featureServices";
  import { bridgeHandShapeLabel } from "./bridgePresentation";
  let { context }: { context: CustomExerciseContext } = $props();
  let session = $state(untrack(() => createLearningSession<BridgeChoiceStep, DrillResult, DecisionReview>(
    bridgeChoiceSteps(context.action === "contracts" ? "contracts" : "bidding"))));
  let selected = $state("");
  let step = $derived(session.steps[session.index]);
  let checked = $derived(session.phase === "feedback");
  let good = $derived(selected === step.correct);
  let followUp = $derived(checked && !good && !!step.followUp);
  let last = $derived(session.index === session.steps.length - 1);
  let bidding = $derived(context.action === "bidding");
  let breakdown = $derived({ label: "Bridge decision breakdown", rows: [
    { label: "Your choice", value: step.options.find(option => option.id === selected)?.label ?? "" },
    { label: "Suggested answer", value: step.options.find(option => option.id === step.correct)!.label },
    { label: "Position", value: step.context }
  ] });
  function check() {
    if (session.phase !== "answer" || !step.options.some(option => option.id === selected)) return;
    session = checkLearningAnswer(session, { contract: "Bridge", cardLabel: `${step.context}: ${step.options.find(option => option.id === selected)!.label}`,
      outcome: good ? "good" : "risky", clean: good, reason: bidding ? "bid_selection" : "contract_target" },
      { title: step.title, prompt: step.prompt, explanation: step.explanations[selected], context: step.context, breakdown,
        groups: step.hand.length ? [{ label: "Your bidding hand", cards: step.hand }] : [] });
  }
  function next() {
    if (!checked) return;
    session = advanceLearningSession(session);
    if (session.phase === "complete") context.onComplete(session.results, session.reviews);
    else selected = "";
  }
</script>

<TablePlaySurface flowLayout stableFeedback showTable={false} surfaceClassName="learning-play-surface"
  ariaLabel={bidding ? "Bridge bidding practice" : "Bridge contract exercise"} title={bidding ? "Bridge bidding" : "Read the contract"}
  onBack={context.onBack} statusLabel="Decision" statusValue={`${session.index + 1} of ${session.steps.length}`}
  tableAriaLabel="Bridge exercise" tableCards={[]} panelAriaLabel={bidding ? "Bridge bidding exercise" : "Bridge contract choices"}>
  {#snippet summary()}
    <section class="choice-context" aria-label={bidding ? "Bridge bidding estimate" : "Contract to read"}>
      <p>{step.context}</p>
      {#if bidding}<p>Shape (♠ ♥ ♦ ♣): {bridgeHandShapeLabel(step.hand)}</p>
      {:else if step.contextDetail}<p>{step.contextDetail}</p>{/if}
    </section>
  {/snippet}
  {#snippet panel()}
    <ExerciseFeedback coach={context.coach} reserveSpace eyebrow={bidding ? "Opening bid" : "Contract target"} title={step.title}
      result={checked ? "" : step.prompt} teaching={checked ? { stage: step.teaching.stage } : step.teaching}
      explanation={checked ? step.explanations[selected] : ""}
      outcome={checked ? good ? "Good" : "Risky" : ""} warning={checked && !good}
      breakdown={checked ? breakdown : undefined} />
    {#if step.hand.length}
      <CardChoiceHand cards={step.hand} readonly ariaLabel="Your Bridge bidding practice hand"
        className="hand full-hand-cards" cardClassName="card hand-card full-hand-card"
        getCardClasses={() => ({})} isPressed={() => false} onSelect={() => {}} />
    {/if}
    <div class="bridge-learning-choices" role="group" aria-label={bidding ? "Bridge bidding choices" : "Trick targets"}>
      {#each step.options as option}
        <button class="secondary-action" aria-pressed={selected === option.id} disabled={checked}
          onclick={() => { selected = option.id; }} type="button">{option.label}</button>
      {/each}
    </div>
    <div class="action-row">
      <button class="secondary-action" onclick={context.onBack} type="button">Table</button>
      {#if checked}<button class="primary-action" onclick={next} type="button">{followUp ? "Try another example" : last ? "Finish topic" : "Next decision"}</button>
      {:else}<button class="primary-action" disabled={!selected} onclick={check} type="button">Check answer</button>{/if}
    </div>
  {/snippet}
</TablePlaySurface>

<style>
  .choice-context { margin: 0; font-size: 0.875rem; color: #f7faf3; }
  .choice-context p { margin: 0; }
  .bridge-learning-choices { display: grid; grid-template-columns: repeat(auto-fit, minmax(60px, 1fr)); gap: 8px; }
  button { min-width: 0; min-height: 44px; white-space: normal; }
  button[aria-pressed="true"] { background: #f5f1cf; color: #173728; }
</style>
