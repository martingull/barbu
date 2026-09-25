<script lang="ts">
  import GameResult from "../../components/GameResult.svelte";
  let { label, title, summary, clean, attempts, scoreLabel, score }: {
    label: string; title: string; summary: string; clean: number; attempts: number; scoreLabel: string; score: string;
  } = $props();
</script>

<section class="memory-result" aria-label={label}>
  <GameResult game="Card Counting" {title} {summary} />
  <dl>
    <div><dt>Card counting</dt><dd>{clean} of {attempts}</dd></div>
    <div><dt>{scoreLabel}</dt><dd>{score}</dd></div>
  </dl>
</section>

<style>
  :global(.table-play-surface.counting-surface.compact-result .table-play-panel) { padding-inline: 0; border: 0; background: transparent; box-shadow: none; }
  :global(.fixed-play-screen .table-play-surface.counting-surface.compact-result .action-row) { padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; }
  .memory-result { display: grid; gap: 16px; min-width: 0; }
  dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 0; padding: 12px 0; border-block: 1px solid #ffffff26; }
  dt { color: #c1d1bf; font-size: 0.8rem; }
  dd { margin: 4px 0 0; color: #f7faf3; font-size: 1.1rem; overflow-wrap: anywhere; }
</style>
