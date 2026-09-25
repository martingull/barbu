<script lang="ts">
  let { decorative = false }: { decorative?: boolean } = $props();
</script>

<img
  src="/cards/barbu-back.webp"
  alt={decorative ? "" : "Barbu card back"}
  aria-hidden={decorative}
  class="card-back"
  draggable="false"
/>

<style>
  .card-back {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
    user-select: none;
  }
</style>
