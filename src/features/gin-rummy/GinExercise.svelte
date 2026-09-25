<script lang="ts">
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import CardFace from "../../components/CardFace.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import type { CustomExerciseContext } from "../featureServices";
  import { ginExercises, ginExerciseAnswer } from "../../lessons/gin-rummy/exercises";
  let { context }: { context: CustomExerciseContext } = $props();
  let index = $state(0), selected = $state(""), checked = $state(false);
  let steps = $derived(ginExercises[context.action]);
  let step = $derived(steps[index]);
  let feedback = $derived(checked ? ginExerciseAnswer(context.action, step, selected) : null);
  const choices = { draw: [{ id: "stock", label: "Draw stock" }, { id: "upcard", label: "Take upcard" }],
    knock: [{ id: "continue", label: "Keep playing" }, { id: "knock", label: "Knock" }, { id: "gin", label: "Go gin" }] };
  function next() { if (!checked) return; if (index === steps.length - 1) { context.onComplete(); return; } index++; selected = ""; checked = false; }
</script>

<TablePlaySurface flowLayout showTable={false} surfaceClassName="learning-play-surface" title={step.title} ariaLabel="Gin Rummy exercise"
  statusLabel="Decision" statusValue={`${index + 1} of ${steps.length}`} onBack={context.onBack} tableAriaLabel="Gin Rummy example" tableCards={[]} panelAriaLabel="Gin Rummy exercise choices">
  {#snippet summary()}
    {#if step.upcard}<div class="exercise-upcard"><span>Upcard</span><div><CardFace card={step.upcard} /></div></div>{/if}
  {/snippet}
  {#snippet panel()}
    <ExerciseFeedback eyebrow="Gin Rummy" title={step.title} result={checked ? "" : context.action === "melds" ? "Choose a discard that leaves the fewest deadwood points."
      : context.action === "draw" ? "Would this upcard improve your hand? Choose where to draw." : "Your discard is chosen. Can you finish this hand by knocking or going gin?"}
      explanation={feedback?.text} outcome={feedback ? feedback.good ? "Good" : feedback.illegal ? "Illegal" : "Risky" : ""} warning={feedback ? !feedback.good : false} />
    <CardChoiceHand cards={step.hand} ariaLabel="Your Gin Rummy exercise hand" className="hand full-hand-cards"
      cardClassName="card hand-card full-hand-card" onSelect={card => { if (!checked && context.action === "melds") selected = card.id; }}
      isPressed={card => selected === card.id} getCardClasses={card => ({ legal: true, selected: selected === card.id })} />
    {#if context.action !== "melds"}
      <div class="choices" aria-label="Gin choices">
        {#each choices[context.action as "draw" | "knock"] as choice}
          <button class="secondary-action" aria-pressed={selected === choice.id} disabled={checked} onclick={() => { selected = choice.id; }} type="button">{choice.label}</button>
        {/each}
      </div>
    {/if}
    <div class="action-row">
      <button class="secondary-action" onclick={context.onBack} type="button">Table</button>
      {#if checked}<button class="primary-action" onclick={next} type="button">{index === steps.length - 1 ? "Finish practice" : "Next decision"}</button>
      {:else}<button class="primary-action" disabled={!selected} onclick={() => { checked = true; }} type="button">Check answer</button>{/if}
    </div>
  {/snippet}
</TablePlaySurface>

<style>
  .exercise-upcard { display: grid; justify-items: center; gap: 6px; font-size: 0.8rem; color: #f7faf3; }.exercise-upcard > div { width: 48px; height: 67px; }
  .choices { display: flex; gap: 8px; }.choices button { flex: 1; min-width: 0; padding: 8px; min-height: 44px; font-size: 0.8rem; }
  .choices button[aria-pressed="true"] { color: #173728; background: #f5f1cf; }
</style>
