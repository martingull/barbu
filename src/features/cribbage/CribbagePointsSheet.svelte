<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import { cribbagePointsSheet } from "../../lessons/cribbage/scoring";
  let { onClose }: { onClose: () => void } = $props();
  let dialog: HTMLDialogElement;
  $effect(() => { dialog.showModal(); });
  function close() { dialog.close(); onClose(); }
</script>

<dialog bind:this={dialog} oncancel={onClose} aria-label="Cribbage points sheet">
  <div class="sheet">
    <header><h2>Cribbage points</h2><button type="button" onclick={close} aria-label="Close points sheet" title="Close points sheet"><X size={20} /></button></header>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable scoring reference needs keyboard access.) -->
    <div class="sheet-body" role="region" aria-label="Cribbage scoring rules" tabindex="0">
      <p class="values">{cribbagePointsSheet.values}</p>
      {#each cribbagePointsSheet.sections as section}
        <section aria-label={section.title}>
          <h3>{section.title}</h3>
          <table aria-label={section.title}>
            <thead><tr><th scope="col">Combination</th><th scope="col">Points</th></tr></thead>
            <tbody>{#each section.rows as row}<tr><th scope="row">{row.label}</th><td>{row.points}</td></tr>{/each}</tbody>
          </table>
          <p>{section.note}</p>
        </section>
      {/each}
    </div>
  </div>
</dialog>

<style>
  dialog { width: min(480px, calc(100% - 24px)); padding: 0; border: 1px solid #789c86; border-radius: 8px; background: #183e2e; color: #f7faf3; }
  dialog::backdrop { background: #0009; }
  .sheet { display: flex; flex-direction: column; max-height: calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 40px); }
  header { display: flex; flex: none; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; border-bottom: 1px solid #ffffff30; }
  h2 { font-size: 1.05rem; margin: 0; } h3 { margin: 14px 0 6px; font-size: 0.85rem; color: #f1d475; }
  button { display: grid; place-items: center; flex: none; min-width: 44px; height: 44px; border: 0; background: transparent; color: #f7faf3; cursor: pointer; }
  button:focus-visible { outline: 2px solid #f1d475; outline-offset: -2px; }
  .sheet-body { padding: 0 12px 12px; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
  p { margin: 8px 0; font-size: 0.75rem; line-height: 1.45; color: #d2dfd1; }
  .values { color: #f7faf3; }
  table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 0.75rem; line-height: 1.35; }
  th, td { border-bottom: 1px solid #ffffff30; padding: 6px 2px; text-align: right; overflow-wrap: anywhere; }
  th:first-child { width: 72%; text-align: left; font-weight: 500; } td { font-weight: 700; font-variant-numeric: tabular-nums; }
  thead th { color: #c3d4c6; font-size: 0.65rem; }
</style>
