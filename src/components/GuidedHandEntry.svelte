<script lang="ts">
  let { gameName, onStart }: { gameName: string; onStart: () => void } = $props();
</script>

<section class="guided-hand-entry" aria-label="Play with guidance">
  <div><h2>Play with guidance</h2><p>Play one {gameName} hand with help at each turn.</p></div>
  <button class="secondary-action" onclick={onStart} type="button">Start guided hand</button>
</section>

<style>
  .guided-hand-entry { display: grid; gap: 10px; min-width: 0; padding: 14px 0; border-block: 1px solid #ffffff26; }
  h2 { margin: 0; color: #f7faf3; font-size: 1rem; line-height: 1.3; }
  p { margin: 4px 0 0; color: #c1d1bf; font-size: 0.85rem; line-height: 1.4; }
  button { min-height: 44px; min-width: 0; white-space: normal; }
</style>
