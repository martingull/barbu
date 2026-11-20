<script lang="ts">
  import type { Snippet } from "svelte";
  import { tableTabsFor, type GameTableDefinition, type TableTabId } from "../games/tableFactory";

  type Props = {
    table: GameTableDefinition;
    activeTab: TableTabId;
    onBack: () => void;
    onTabSelect: (tab: TableTabId) => void;
    children: Snippet;
  };

  let { table, activeTab, onBack, onTabSelect, children }: Props = $props();

  let activeTabLabel = $derived(table.tabs[activeTab].label);
  let tabs = $derived(tableTabsFor(table));
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

<section class="table-room" class:single-mode={tabs.length === 1} aria-label={`${table.title} modes`}>
  {#if tabs.length > 1}
  <div class="barbu-table-rail">
    <div class="barbu-mode-box">
      <div class="barbu-table-tabs" aria-label={`${table.title} sections`} role="tablist">
        {#each tabs as tab}
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
  {/if}

  {@render children()}
</section>

<style>
  .table-room.single-mode { grid-template-columns: minmax(0, 1fr); }
</style>
