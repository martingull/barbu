<script lang="ts">
  import type { Snippet } from "svelte";
  import { drillOutcomeLabels as outcomeLabels, type DrillResult } from "./lessons/drillDecision";
  import { summarizeContractResults, weakestContractFromResults, buildDrillLoopInsight, type PlayBarbuAttempt } from "./lessons/drillReview";
  let { title, results, message, attempts, onBack, actions, footer }: {
    title: string; results: DrillResult[]; message: string; attempts: PlayBarbuAttempt[];
    onBack: () => void; actions: Snippet; footer: Snippet;
  } = $props();
  let cleanDrillCount = $derived(results.filter(result => result.clean).length);
  let currentContractResults = $derived(summarizeContractResults(results));
  let drillLoopInsight = $derived(buildDrillLoopInsight(results, attempts));
  let drillLoopFocus = $derived(drillLoopInsight.contract || weakestContractFromResults(currentContractResults) || "Full table");
  let drillLoopFocusSummary = $derived(currentContractResults.find(result => result.contract === drillLoopFocus));
</script>

<header class="topbar" aria-label="Drill result">
  <button class="back-button" onclick={onBack} type="button">Table</button>
  <div>
    <p class="eyebrow">{title}</p>
    <h1>Session complete</h1>
  </div>
  <div class="contract-status">
    <span>Score</span>
    <strong>{cleanDrillCount} of {results.length} clean</strong>
  </div>
</header>

<section class="drill-result-screen" aria-label="Drill results">
  <div class="drill-loop-panel" aria-label="Next drill step">
    <div class="drill-loop-copy">
      <p class="eyebrow">Practice loop</p>
      <h2>Next repetition</h2>
      <strong>{drillLoopInsight.heading}</strong>
      <p>{drillLoopInsight.message}</p>
    </div>
    <div class="drill-loop-detail">
      <span>Weakest contract</span>
      <strong>{drillLoopFocus}</strong>
      {#if drillLoopFocusSummary}
        <small>{drillLoopFocusSummary.clean} / {drillLoopFocusSummary.total} clean</small>
      {/if}
    </div>
    <div class="drill-loop-detail">
      <span>Recent rhythm</span>
      <strong>{drillLoopInsight.streakText}</strong>
    </div>
    <div class="drill-loop-actions">
      {@render actions()}

    </div>
  </div>

  <div class="drill-score-card">
    <p class="eyebrow">Result</p>
    <h2>{cleanDrillCount} / {results.length} clean decisions</h2>
    <p>{message}</p>
  </div>

  <div class="drill-result-list" aria-label="Decision results">
    {#each results as result, index}
      <div>
        <span>{index + 1}</span>
        <strong>{result.contract}</strong>
        <small>{outcomeLabels[result.outcome]}</small>
        <em>{result.cardLabel}</em>
      </div>
    {/each}
  </div>

  <div class="contract-result-list" aria-label="Contract results">
    {#each currentContractResults as result}
      <div>
        <span>{result.clean === result.total ? "Clean" : outcomeLabels[result.outcome]}</span>
        <strong>{result.contract}</strong>
        <small>{result.clean} / {result.total} clean</small>
      </div>
    {/each}
  </div>

  {#if attempts.length}
    <div class="recent-attempt-list" aria-label="Recent quick drill attempts">
      <p class="eyebrow">Recent tables</p>
      {#each attempts as attempt}
        <div>
          <strong>{attempt.results.filter((result) => result.clean).length} / {attempt.results.length} clean</strong>
          <small>{attempt.results.map((result) => result.contract).join(" · ")}</small>
        </div>
      {/each}
    </div>
  {/if}

  <div class="course-actions drill-result-actions">
    {@render footer()}

  </div>
</section>
