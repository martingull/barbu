<script lang="ts">
  import { onMount } from "svelte";

  export let game: string;
  export let title: string;
  export let summary: string;
  export let completion: "game" | "match" | "rubber" | "board" | "session" | null = null;
  export let summaryLabel = `${game} result summary`;

  // Local UI event, emitted once when a completed result is presented, not on rerenders.
  onMount(() => {
    if (completion) {
      window.dispatchEvent(new CustomEvent("barbu:game-completed", {
        detail: { game, scope: completion, title, summary }
      }));
    }
  });
</script>

<div role={completion ? "status" : undefined} aria-atomic="true" aria-label={completion ? `${game} ${completion} complete` : undefined}>
  <div class="lesson-heading">
    <p class="eyebrow">{completion ? `${completion[0].toUpperCase()}${completion.slice(1)} complete` : "Result"}</p>
    <h2>{title}</h2>
  </div>
  <p class="result" aria-label={summaryLabel}>{summary}</p>
</div>
