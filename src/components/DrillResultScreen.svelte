<script lang="ts">
  import type { Snippet } from "svelte";
  import TablePlaySurface from "./TablePlaySurface.svelte";
  import { drillOutcomeLabels, type DrillResult } from "../lessons/drillDecision";
  import type { CourseContent } from "../lessons/courseTypes";

  let { title, results, message, complete, total, kind, review, onBack, actions }: {
    title: string; results: DrillResult[]; message: string; complete: boolean; total: number;
    kind: "Topic" | "Exercise";
    review?: CourseContent["review"]; onBack: () => void; actions: Snippet;
  } = $props();
</script>

<TablePlaySurface mode="result" showTable={false} {title} ariaLabel="Learning result"
  statusLabel={kind} statusValue={complete ? "Complete" : "Paused"} {onBack}
  tableAriaLabel="Learning table" tableCards={[]} panelAriaLabel="Learning summary">
  {#snippet panel()}
    <p class="result" role="status">{complete ? `${kind} complete.` : `${kind} paused. Finish all ${total} decisions to complete it.`}</p>
    {#if results.length}
      <p class="result">{results.filter(result => result.clean).length} of {results.length} decisions matched the lesson's goal.</p>
    {/if}
    <p class="result">{message}</p>
    <div class="action-row">{@render actions()}</div>
    {#if results.length || review}
      <details>
        <summary>Review decisions</summary>
        {#if results.length}
          <ol aria-label="Decision results">
            {#each results as result}
              <li><strong>{result.cardLabel}</strong><span>{drillOutcomeLabels[result.outcome]}</span></li>
            {/each}
          </ol>
        {/if}
        {#if review}
          <h2>{review.heading}</h2>
          <p>{review.body}</p>
          <ul>{#each review.points as point}<li>{point.text}</li>{/each}</ul>
        {/if}
      </details>
    {/if}
    <button class="secondary-action" onclick={onBack} type="button">Back to Learn</button>
  {/snippet}
</TablePlaySurface>

<style>
  details { border-top: 1px solid #ffffff26; margin: 12px 0; padding-top: 8px; }
  summary { min-height: 44px; align-content: center; cursor: pointer; }
  h2 { font-size: 1rem; }
  p, li { font-size: 0.875rem; line-height: 1.5; }
  ol { padding-left: 24px; }
  ol li { padding: 4px 0; }
  ol span { margin-left: 12px; }
</style>
