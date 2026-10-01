<script lang="ts">
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import CardFace from "../../components/CardFace.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import type { CustomExerciseContext } from "../featureServices";
  import { ginExercises, ginExerciseAnswer, ginSelectsDiscard, ginExerciseChoices, ginExercisePrompts } from "../../lessons/gin-rummy/exercises";
  import { bestMeldLayout, deadwoodValue } from "../../domain/rummyMelds";
  import { formatCardList, formatCardLabel, formatCardText } from "../../presentation/cardDisplay";
  import type { DrillResult } from "../../lessons/drillDecision";
  let { context }: { context: CustomExerciseContext } = $props();
  let index = $state(0), selected = $state(""), checked = $state(false);
  let decisions = $state<DrillResult[]>([]);
  let steps = $derived(ginExercises[context.action]);
  let step = $derived(steps[index]);
  let feedback = $derived(checked ? ginExerciseAnswer(context.action, step, selected) : null);
  let discardChoice = $derived(ginSelectsDiscard(context.action));
  let layout = $derived(bestMeldLayout(step.hand.filter(card => !checked || !discardChoice || card.id !== selected)));
  function check() {
    if (!selected || checked) return;
    const answer = ginExerciseAnswer(context.action, step, selected);
    decisions = [...decisions, { contract: "Gin Rummy", cardLabel: ginExerciseChoices(context.action, step).find(choice => choice.id === selected)!.label,
      outcome: answer.good ? "good" : answer.illegal ? "illegal" : "risky", clean: answer.good, reason: "meld_count" }];
    checked = true;
  }
  function next() { if (!checked) return; if (index === steps.length - 1) { context.onComplete(decisions); return; } index++; selected = ""; checked = false; }
</script>

<TablePlaySurface flowLayout showTable={false} surfaceClassName="learning-play-surface" title={step.title} ariaLabel="Gin Rummy exercise"
  statusLabel="Decision" statusValue={`${index + 1} of ${steps.length}`} onBack={context.onBack} tableAriaLabel="Gin Rummy example" tableCards={[]} panelAriaLabel="Gin Rummy exercise choices">
  {#snippet summary()}
    {#if step.upcard}<div class="exercise-upcard"><span>Upcard</span><div><CardFace card={step.upcard} /></div></div>{/if}
  {/snippet}
  {#snippet panel()}
    <ExerciseFeedback eyebrow="Gin Rummy" title={step.title} result={checked ? "" : ginExercisePrompts[context.action]}
      explanation={feedback?.text} outcome={feedback ? feedback.good ? "Good" : feedback.illegal ? "Illegal" : "Risky" : ""} warning={feedback ? !feedback.good : false} />
    {#if !checked && step.hint}<p class="count-hint">{formatCardText(step.hint)}</p>{/if}
    <CardChoiceHand cards={step.hand} readonly={!discardChoice} ariaLabel="Your Gin Rummy exercise hand" className="hand full-hand-cards"
      cardClassName="card hand-card full-hand-card" onSelect={card => { if (!checked && discardChoice) selected = card.id; }}
      isPressed={card => selected === card.id} getCardClasses={card => ({ legal: true, selected: selected === card.id })} />
    {#if checked && context.action !== "draw"}
      <div class="meld-count" role="region" aria-label="Deadwood breakdown">
        {#each layout.melds as meld}<p><strong>{meld.kind === "set" ? "Set" : "Run"}:</strong> {formatCardList(meld.cards)} = 0</p>{/each}
        <p><strong>Unmatched:</strong> {layout.deadwood.length ? layout.deadwood.map(card => `${formatCardLabel(card)} (${deadwoodValue(card)})`).join(" + ") : "None"}</p>
        <p><strong>Deadwood: {layout.points} points</strong></p>
      </div>
    {/if}
    {#if !discardChoice && !checked}
      <div class="choices" aria-label="Gin choices">
        {#each ginExerciseChoices(context.action, step) as choice}
          <button class="secondary-action" aria-pressed={selected === choice.id} disabled={checked} onclick={() => { selected = choice.id; }} type="button">{choice.label}</button>
        {/each}
      </div>
    {/if}
    <div class="action-row">
      <button class="secondary-action" onclick={context.onBack} type="button">Table</button>
      {#if checked}<button class="primary-action" onclick={next} type="button">{index === steps.length - 1 ? "Finish topic" : "Next decision"}</button>
      {:else}<button class="primary-action" disabled={!selected} onclick={check} type="button">Check answer</button>{/if}
    </div>
  {/snippet}
</TablePlaySurface>

<style>
  .count-hint, .meld-count { font-size: 0.8rem; line-height: 1.35; margin: 0; }
  .meld-count { border-top: 1px solid #ffffff26; padding-top: 8px; }
  .meld-count p { margin: 2px 0; }
  .exercise-upcard { display: grid; justify-items: center; gap: 6px; font-size: 0.8rem; color: #f7faf3; }.exercise-upcard > div { width: 48px; height: 67px; }
  .choices { display: flex; gap: 8px; }.choices button { flex: 1; min-width: 0; padding: 8px; min-height: 44px; font-size: 0.8rem; }
  .choices button[aria-pressed="true"] { color: #173728; background: #f5f1cf; }
</style>
