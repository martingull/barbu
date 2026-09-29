<script lang="ts">
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import CardFace from "../../components/CardFace.svelte";
  import CanastaCards from "./CanastaCards.svelte";
  import type { CustomExerciseContext } from "../featureServices";
  import { canastaExercises, answerCanastaExercise } from "../../lessons/canasta/exercises";
  let { context }: { context: CustomExerciseContext } = $props();
  let index = $state(0), selected = $state(""), checked = $state(false);
  const steps = $derived(canastaExercises[context.action]), step = $derived(steps[index]);
  const feedback = $derived(checked ? answerCanastaExercise(context.action, step, selected) : null);
  const labels = $derived(context.action === "melds" ? ["Meld", "Keep cards"] : context.action === "pile" ? ["Take pile", "Draw stock"] : ["Go out", "Keep playing"]);
  function next() { if (index === steps.length - 1) context.onComplete(); else { index++; selected = ""; checked = false; } }
</script>
<TablePlaySurface flowLayout showTable={false} surfaceClassName="learning-play-surface" title={step.title} ariaLabel="Canasta exercise"
  statusLabel="Decision" statusValue={`${index + 1} of ${steps.length}`} onBack={context.onBack} tableAriaLabel="Canasta example" tableCards={[]} panelAriaLabel="Canasta exercise choices">
  {#snippet summary()}
    <div class="context"><span>{step.session.hand.sides[0].opened ? "Partnership opened" : "Opening needed: 125"}</span>
      {#if context.action === "pile"}<div class="upcard"><CardFace card={step.session.hand.discards.at(-1)!} /></div>{/if}</div>
  {/snippet}
  {#snippet panel()}
    <ExerciseFeedback eyebrow="Canasta" title={step.title} result={checked ? "" : step.prompt} explanation={feedback?.text}
      outcome={feedback ? feedback.good ? "Good" : feedback.illegal ? "Illegal" : "Risky" : ""} warning={feedback ? !feedback.good : false} />
    <CanastaCards cards={step.session.hand.hands[0]} selected={context.action === "discard" && selected ? [selected] : []}
      onSelect={card => { if (!checked && context.action === "discard") selected = card.id; }} label="Canasta exercise hand" />
    {#if context.action !== "discard"}<div class="choices" aria-label="Canasta choices">
      {#each labels as label, i}<button class="secondary-action" disabled={checked} aria-pressed={selected === (i ? "no" : "yes")}
        onclick={() => { selected = i ? "no" : "yes"; }} type="button">{label}</button>{/each}
    </div>{/if}
    <div class="action-row"><button class="secondary-action" onclick={context.onBack} type="button">Table</button>
      {#if checked}<button class="primary-action" onclick={next} type="button">{index === steps.length - 1 ? "Finish practice" : "Next decision"}</button>
      {:else}<button class="primary-action" disabled={!selected} onclick={() => { checked = true; }} type="button">Check answer</button>{/if}</div>
  {/snippet}
</TablePlaySurface>
<style>
  .context { display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; color: #d1dfd5; }.upcard { width: 42px; height: 61px; }
  .choices { display: flex; gap: 8px; }.choices button { flex: 1; min-height: 44px; padding: 8px; font-size: 0.85rem; }
  .choices button[aria-pressed="true"] { background: #f5f1cf; color: #193e2e; }
</style>
