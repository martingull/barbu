<script lang="ts">
  import type { FeedbackBreakdown } from "../lessons/learningPresentation";
  import { formatCardText } from "../presentation/cardDisplay";
  let { breakdown }: { breakdown: FeedbackBreakdown } = $props();
</script>

<div class="feedback-breakdown" role="region" aria-label={breakdown.label}>
  {#each breakdown.rows as row}
    <p><strong>{row.label}:</strong> {formatCardText(row.value)}</p>
  {/each}
</div>

<style>
  .feedback-breakdown { border-top: 1px solid #ffffff26; padding-top: 6px; margin-top: 6px; font-size: 0.8rem; line-height: 1.35; overflow-wrap: anywhere; }
  p { margin: 2px 0; }
</style>
