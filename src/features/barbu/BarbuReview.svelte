<script lang="ts">
  import { summarizeContractResults, weakestContractFromResults, buildReviewInsight, type PlayBarbuAttempt } from "../../lessons/drillReview";
  import { drillOutcomeLabels as outcomeLabels } from "../../lessons/drillDecision";
  export let recentPlayBarbuAttempts: PlayBarbuAttempt[];
  export let onBack: () => void;
  export let onComplete: () => void;
  export let onExercise: (action: string) => void;
  $: latestPlayBarbuAttempt = recentPlayBarbuAttempts[0];
  $: reviewResults = latestPlayBarbuAttempt?.results ?? [];
  $: reviewContractResults = summarizeContractResults(reviewResults);
  $: reviewWeakContract = weakestContractFromResults(reviewContractResults);
  $: reviewCleanCount = reviewResults.filter((result) => result.clean).length;
  $: reviewInsight = buildReviewInsight(recentPlayBarbuAttempts);
  $: reviewAdvice = reviewInsight.message;
  $: reviewReplayContract = reviewInsight.contract || reviewWeakContract;
  $: reviewFocusSummary = reviewContractResults.find((result) => result.contract === reviewReplayContract);

</script>

<header class="topbar" aria-label="Barbu review">
  <button class="back-button" onclick={onBack} type="button">Table</button>
  <div>
    <p class="eyebrow">Review</p>
    <h1>Review the hand</h1>
  </div>
  <div class="contract-status">
    <span>Latest</span>
    <strong>{reviewCleanCount} of {reviewResults.length} clean</strong>
  </div>
</header>

<section class="drill-result-screen" aria-label="Review results">
  <div class="drill-score-card">
    <p class="eyebrow">Latest table</p>
    <h2>
      {#if reviewResults.length}
        {reviewCleanCount} / {reviewResults.length} clean decisions
      {:else}
        No table yet
      {/if}
    </h2>
    <p>{reviewAdvice}</p>
  </div>

  {#if reviewReplayContract}
    <div class="drill-loop-panel review-focus-panel" aria-label="Review focus">
      <div class="drill-loop-copy">
        <p class="eyebrow">Targeted repetition</p>
        <h2>{reviewReplayContract}</h2>
        <strong>Replay the pattern that cost the most attention.</strong>
        <p>{reviewAdvice}</p>
      </div>
      {#if reviewFocusSummary}
        <div class="drill-loop-detail">
          <span>Last result</span>
          <strong>{reviewFocusSummary.clean} / {reviewFocusSummary.total} clean</strong>
          <small>{outcomeLabels[reviewFocusSummary.outcome]}</small>
        </div>
      {/if}
      <div class="drill-loop-actions">
        <button class="primary-action" onclick={() => void onExercise(reviewReplayContract || "mixed")} type="button">
          Replay {reviewReplayContract}
        </button>
      </div>
    </div>
  {/if}

  {#if reviewContractResults.length}
    <div class="contract-result-list" aria-label="Review contract results">
      {#each reviewContractResults as result}
        <div>
          <span>{result.clean === result.total ? "Clean" : outcomeLabels[result.outcome]}</span>
          <strong>{result.contract}</strong>
          <small>{result.clean} / {result.total} clean</small>
        </div>
      {/each}
    </div>
  {:else}
    <div class="contract-result-list" aria-label="Review contract results">
      <div>
        <span>Ready</span>
        <strong>No decisions yet</strong>
        <small>Finish a practice table to unlock review feedback.</small>
      </div>
    </div>
  {/if}

  {#if recentPlayBarbuAttempts.length}
    <div class="recent-attempt-list" aria-label="Review recent attempts">
      <p class="eyebrow">Recent tables</p>
      {#each recentPlayBarbuAttempts as attempt}
        <div>
          <strong>{attempt.results.filter((result) => result.clean).length} / {attempt.results.length} clean</strong>
          <small>{attempt.results.map((result) => result.contract).join(" · ")}</small>
        </div>
      {/each}
    </div>
  {/if}

  <div class="course-actions">
    <button class="secondary-action" onclick={onBack} type="button">Table</button>
    <button class="secondary-action" onclick={() => void onExercise(reviewReplayContract || "mixed")} type="button">
      Replay {reviewReplayContract || "table"}
    </button>
    <button class="secondary-action" onclick={() => void onExercise("mixed")} type="button">Mixed contract review</button>
    <button class="primary-action" onclick={onComplete} type="button">Finish review</button>
  </div>
</section>
