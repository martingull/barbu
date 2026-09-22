<script lang="ts">
  import type { Snippet } from "svelte";
  import type { CourseContent, CourseStage } from "./courseContent";
  import CardFace from "./CardFace.svelte";
  import { compassSeatLabels } from "./cardDisplay";
  import TablePlaySurface from "./TablePlaySurface.svelte";

  let { course, stage, onBack, onContinue, customExample }: {
    course: CourseContent; stage: CourseStage; onBack: () => void; onContinue: () => void; customExample?: Snippet;
  } = $props();
  let copy = $derived(stage === "concept" ? course.concept : stage === "example" ? course.example : course.review);
  let points = $derived(stage === "example" ? course.example.sequence.map(step => ({ marker: step.label, text: step.text }))
    : stage === "concept" ? course.concept.points : course.review.points);
  let singleHand = $derived(course.example.tableCards.length > 1 && new Set(course.example.tableCards.map(play => play.seat)).size === 1);
</script>

<TablePlaySurface flowLayout surfaceClassName="learning-play-surface learning-copy-surface"
  ariaLabel={`${course.contract} course content`} title={stage === "review" ? "Review" : course.title}
  eyebrow={course.contract} statusLabel="Lesson" statusValue={stage === "concept" ? "Concept" : stage === "example" ? "Example" : "Review"}
  showTable={stage === "example"} tableAriaLabel={course.example.ariaLabel} tableCards={course.example.tableCards}
  pendingBySeat={course.example.pendingBySeat} useCustomTable={singleHand || course.contract === "Domino"}
  seatLabels={course.game === "bridge" ? compassSeatLabels : {}}
  panelAriaLabel="Lesson explanation" {onBack}>
  {#snippet summary()}
    <div class="learning-copy">
      <h2>{copy.heading}</h2>
      <p>{copy.body}</p>
    </div>
  {/snippet}
  {#snippet table()}
    {#if course.contract === "Domino" && customExample}
      {@render customExample()}
    {:else}
      <div class="learning-example-hand" aria-label={course.example.ariaLabel}>
        {#each course.example.tableCards as play}
          <div><CardFace card={play.card} /></div>
        {/each}
      </div>
    {/if}
  {/snippet}
  {#snippet panel()}
    <ul class="learning-points" aria-label={`${course.contract} ${stage === "example" ? "trick sequence" : `${stage} points`}`}>
      {#each points as point}<li><span>{point.marker}</span><strong>{point.text}</strong></li>{/each}
    </ul>
    <div class="action-row">
      <button class="secondary-action" onclick={onBack} type="button">Table</button>
      <button class="primary-action" onclick={onContinue} type="button">
        {stage === "concept" ? "See example" : stage === "example" ? "Try cards" : `Finish ${course.contract}`}
      </button>
    </div>
  {/snippet}
</TablePlaySurface>

<style>
  .learning-copy { padding: 8px 0; color: #f7faf3; }
  h2 { margin: 0 0 8px; font-size: 1.1rem; line-height: 1.3; }
  p { margin: 0; font-size: 0.88rem; line-height: 1.45; }
  .learning-points { display: grid; gap: 8px; padding: 0; margin: 0; list-style: none; }
  li { display: grid; grid-template-columns: 60px minmax(0, 1fr); gap: 8px; padding: 8px 0; border-bottom: 1px solid #ffffff26; }
  li span { color: #efb4a9; font-size: 0.75rem; overflow-wrap: anywhere; }
  li strong { color: #e7eee1; font-size: 0.82rem; line-height: 1.35; }
  .learning-example-hand { display: flex; align-items: center; justify-content: center; gap: 12px; height: 100%; }
  .learning-example-hand > div { width: 52px; max-width: 18%; }
</style>
