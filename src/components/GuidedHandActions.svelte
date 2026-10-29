<script lang="ts">
  let { onReplay, onIndependentPlay, onBack }: {
    onReplay: () => void; onIndependentPlay: () => void; onBack: () => void;
  } = $props();
</script>

<div class="action-row">
  <button class="secondary-action" onclick={onReplay} type="button">Replay</button>
  <button class="primary-action" onclick={onIndependentPlay} type="button">Play without guidance</button>
</div>
<button class="secondary-action" onclick={onBack} type="button">Back to Learn</button>
