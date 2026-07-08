<script lang="ts">
  import type { GameTableDefinition } from "./tableFactory";
  import type { Snippet } from "svelte";

  type Props = {
    table: GameTableDefinition;
    className?: string;
    actionAriaLabel: string;
    groupAriaLabel: string;
    groupEyebrow: string;
    primaryLabel: string;
    onPrimary: () => void;
    resumeLabel?: string;
    resumeNote?: string;
    onResume?: () => void;
    supportingCopy?: string;
    footerNote?: string;
    children?: Snippet;
  };

  let {
    table,
    className = "play-panel",
    actionAriaLabel,
    groupAriaLabel,
    groupEyebrow,
    primaryLabel,
    onPrimary,
    resumeLabel,
    resumeNote,
    onResume,
    supportingCopy,
    footerNote,
    children
  }: Props = $props();

  let hasResume = $derived(Boolean(resumeLabel && onResume));
</script>

<div aria-label={table.tabs.play.label} class={`barbu-tab-panel ${className}`} id={table.tabs.play.panelId} role="tabpanel">
  <div class="barbu-mode-copy">
    <p class="eyebrow">{table.tabs.play.intro.eyebrow}</p>
    <h2>{table.tabs.play.intro.title}</h2>
    <p>{table.tabs.play.intro.summary}</p>
  </div>

  <div class="table-action-groups" aria-label={actionAriaLabel}>
    <section class="table-action-group" aria-label={groupAriaLabel}>
      <p class="eyebrow">{groupEyebrow}</p>
      {#if children}
        {@render children()}
      {/if}
      {#if hasResume}
        <button class="drill-action" onclick={() => onResume?.()} type="button">{resumeLabel}</button>
        {#if resumeNote}
          <small class="saved-run-note">{resumeNote}</small>
        {/if}
      {/if}
      <button class:resume-secondary={hasResume} class="drill-action" onclick={onPrimary} type="button">
        {primaryLabel}
      </button>
      {#if footerNote}
        <small class="saved-run-note">{footerNote}</small>
      {/if}
    </section>

    {#if supportingCopy}
      <p class="supporting-copy">{supportingCopy}</p>
    {/if}
  </div>
</div>
