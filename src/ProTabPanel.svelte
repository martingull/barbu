<script lang="ts">
  import type { Snippet } from "svelte";
  import type { GameTableDefinition } from "./tableFactory";

  type Props = {
    table: GameTableDefinition;
    featuresAriaLabel: string;
    headingTitle: string;
    headingSummary: string;
    children: Snippet;
  };

  let { table, featuresAriaLabel, headingTitle, headingSummary, children }: Props = $props();
</script>

<div aria-label={table.tabs.perfect.label} class="barbu-tab-panel perfect-panel" id={table.tabs.perfect.panelId} role="tabpanel">
  <div class="barbu-mode-copy">
    <p class="eyebrow">{table.tabs.perfect.intro.eyebrow}</p>
    <h2>{table.tabs.perfect.intro.title}</h2>
    <p>{table.tabs.perfect.intro.summary}</p>
  </div>

  <section class="fixed-contract-practice" aria-label={featuresAriaLabel}>
    <div class="section-heading">
      <p class="eyebrow">Subscriber layer</p>
      <h2>{headingTitle}</h2>
      <p>{headingSummary}</p>
    </div>

    {@render children()}
  </section>
</div>
