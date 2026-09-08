<script lang="ts">
  import type { Snippet } from "svelte";
  import CardTable from "./CardTable.svelte";
  import { fitBridgeCardSize } from "./tableLayout";
  import type { Seat, TableCard } from "./lessonTypes";

  type TablePlayMode = "play" | "result";

  type Props = {
    ariaLabel: string;
    backLabel?: string;
    eyebrow?: string;
    mode?: TablePlayMode;
    flowLayout?: boolean;
    onBack: () => void;
    onSurfaceClick?: () => void;
    panel: Snippet;
    panelAriaLabel: string;
    pendingBySeat?: Partial<Record<Seat, string>>;
    statusLabel: string;
    statusValue: string;
    showTable?: boolean;
    summary?: Snippet;
    surfaceClassName?: string;
    table?: Snippet;
    tableAriaLabel: string;
    tableCards: TableCard[];
    tableVariant?: "default" | "bridge";
    title: string;
    track?: Snippet;
    aboveTable?: Snippet;
    useCustomTable?: boolean;
  };

  let {
    ariaLabel,
    backLabel = "Table",
    eyebrow = "",
    mode = "play",
    flowLayout = false,
    onBack,
    onSurfaceClick,
    panel,
    panelAriaLabel,
    pendingBySeat = {},
    statusLabel,
    statusValue,
    showTable = true,
    summary,
    surfaceClassName = "",
    table,
    tableAriaLabel,
    tableCards,
    tableVariant = "default",
    title,
    track,
    aboveTable,
    useCustomTable = false
  }: Props = $props();

  function handleSurfaceKeydown(event: KeyboardEvent) {
    if (!onSurfaceClick || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    onSurfaceClick();
  }
</script>

<header
  class:compact-play={mode === "play"}
  class:compact-result={mode === "result"}
  class:table-hidden={!showTable}
  class="topbar table-play-topbar"
  aria-label={title}
>
  <button class="back-button" onclick={onBack} type="button">{backLabel}</button>
  <div>
    {#if eyebrow}
      <p class="eyebrow">{eyebrow}</p>
    {/if}
    <h1>{title}</h1>
  </div>
  <div class="contract-status">
    <span>{statusLabel}</span>
    <strong>{statusValue}</strong>
  </div>
</header>

<section
  class:compact-play={mode === "play"}
  class:compact-result={mode === "result"}
  class:table-hidden={!showTable}
  class:flow-play={flowLayout && mode === "play"}
  class={`table-play-surface ${surfaceClassName}`.trim()}
  use:fitBridgeCardSize={flowLayout && mode === "play" && tableVariant === "bridge"}
  aria-label={ariaLabel}
>
  {#if summary}
    {@render summary()}
  {/if}

  {#if track}
    {@render track()}
  {/if}

  {#if aboveTable}
    {@render aboveTable()}
  {/if}

  {#if showTable}
    {#snippet board()}
      {#if useCustomTable && table}
        {@render table()}
      {:else if onSurfaceClick}
        <div
          class="table-tap-target"
          onclick={onSurfaceClick}
          onkeydown={handleSurfaceKeydown}
          role="button"
          tabindex="0"
          aria-label="Continue to next trick"
        >
          <CardTable ariaLabel={tableAriaLabel} {pendingBySeat} {tableCards} />
        </div>
      {:else}
        <CardTable ariaLabel={tableAriaLabel} {pendingBySeat} {tableCards} />
      {/if}
    {/snippet}

    {#if flowLayout && mode === "play"}
      <div class="play-board-region">{@render board()}</div>
    {:else}
      {@render board()}
    {/if}
  {/if}

  <section class="lesson-panel table-play-panel" aria-label={panelAriaLabel}>
    {@render panel()}
  </section>
</section>
