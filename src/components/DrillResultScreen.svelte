<script lang="ts">
  import type { Snippet } from "svelte";
  import TablePlaySurface from "./TablePlaySurface.svelte";
  import { drillOutcomeLabels, type DrillResult } from "../lessons/drillDecision";
  import type { CourseContent } from "../lessons/courseTypes";
  import LearningCoach from "./LearningCoach.svelte";
  import GuidedHandEntry from "./GuidedHandEntry.svelte";
  import type { LearningCharacterId } from "../presentation/learningCharacters";
  import { formatCardText } from "../presentation/cardDisplay";
  import DecisionReview from "./DecisionReview.svelte";
  import type { DecisionReview as DecisionReviewData } from "../lessons/decisionReview";

  let { title, results, message, complete, total, kind, review, decisionReviews = [], onBack, actions, playAction, coach, guidedHand, completedPath }: {
    title: string; results: DrillResult[]; message: string; complete: boolean; total: number;
    kind: "Topic" | "Exercise";
    review?: CourseContent["review"]; onBack: () => void; actions: Snippet;
    playAction?: Snippet;
    coach?: LearningCharacterId;
    guidedHand?: { gameName: string; onStart: () => void };
    completedPath?: string;
    decisionReviews?: DecisionReviewData[];
  } = $props();
</script>

<TablePlaySurface mode="result" showTable={false} {title} ariaLabel="Learning result"
  statusLabel={completedPath ? "Learning path" : kind} statusValue={complete ? "Complete" : "Paused"} {onBack}
  tableAriaLabel="Learning table" tableCards={[]} panelAriaLabel="Learning summary">
  {#snippet panel()}
    <p class="result" role="status">{completedPath ? `${completedPath} learning path complete.`
      : complete ? `${kind} complete.` : `${kind} paused. Finish all ${total} decisions to complete it.`}</p>
    {#if results.length}
      <p class="result">{results.filter(result => result.clean).length} of {results.length} decisions matched the lesson's goal.</p>
    {/if}
    {#if coach}<LearningCoach character={coach} {message} compact />{:else}<p class="result">{formatCardText(message)}</p>{/if}
    <div class="learning-actions" role="group" aria-label="Lesson actions">{@render actions()}</div>
    {#if guidedHand}<GuidedHandEntry {...guidedHand} />{/if}
    {#if results.length || review}
      <details>
        <summary>Review decisions</summary>
        {#if results.length}
          <ol role="list" aria-label="Decision results" class:detailed-decisions={decisionReviews.length > 0}>
            {#each results as result, index}
              <li>
                {#if decisionReviews[index]}<DecisionReview review={decisionReviews[index]} {result} {index} />
                {:else}<strong>{formatCardText(result.cardLabel)}</strong><span>{drillOutcomeLabels[result.outcome]}</span>{/if}
              </li>
            {/each}
          </ol>
        {/if}
        {#if review}
          <h2>{formatCardText(review.heading)}</h2>
          <p>{formatCardText(review.body)}</p>
          <ul>{#each review.points as point}<li>{formatCardText(point.text)}</li>{/each}</ul>
        {/if}
      </details>
    {/if}
    <div class="learning-actions" role="group" aria-label="Game navigation">
      <button class="secondary-action" onclick={onBack} type="button">Back to Learn</button>
      {@render playAction?.()}
    </div>
  {/snippet}
</TablePlaySurface>

<style>
  .learning-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .learning-actions > :global(button) { min-width: 0; white-space: normal; }
  .learning-actions > :global(button:only-child) { grid-column: 1 / -1; }
  details { border-top: 1px solid #ffffff26; margin: 12px 0; padding-top: 8px; }
  summary { min-height: 44px; align-content: center; cursor: pointer; }
  h2 { font-size: 1rem; }
  p, li { font-size: 0.875rem; line-height: 1.5; }
  ol { padding-left: 24px; }
  .detailed-decisions { list-style: none; padding-left: 0; }
  ol li { padding: 4px 0; }
  ol span { margin-left: 12px; }
</style>
