<script lang="ts">
  import type { Snippet } from "svelte";
  import { tableTabsFor, type GameTableDefinition, type TableTabId } from "./tableFactory";

  type Props = {
    table: GameTableDefinition;
    activeTab: TableTabId;
    onBack: () => void;
    onTabSelect: (tab: TableTabId) => void;
    children: Snippet;
  };

  let { table, activeTab, onBack, onTabSelect, children }: Props = $props();

  let activeTabLabel = $derived(table.tabs[activeTab].label);
</script>

<header class="topbar table-topbar" aria-label={table.title}>
  <button class="back-button" onclick={onBack} type="button">Games</button>
  <div class="table-title">
    <p class="eyebrow">{table.family} family</p>
    <h1>{table.title}</h1>
  </div>
  <div class="contract-status">
    <span>Current mode</span>
    <strong>{activeTabLabel}</strong>
  </div>
</header>

<section class="table-room" aria-label={`${table.title} modes`}>
  <div class="barbu-table-rail">
    <div class="barbu-mode-box">
      <p class="eyebrow">Table mode</p>
      <div class="barbu-table-tabs" aria-label={`${table.title} sections`} role="tablist">
        {#each tableTabsFor(table) as tab}
          <button
            aria-controls={tab.panelId}
            aria-selected={activeTab === tab.id}
            class:active={activeTab === tab.id}
            onclick={() => {
              onTabSelect(tab.id);
            }}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        {/each}
      </div>
    </div>
  </div>

  {@render children()}
</section>
