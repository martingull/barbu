<script lang="ts">
  import type { PracticeGroup, TableTabIntroDefinition } from "./tableFactory";

  type PracticeLessonEntry = {
    id: string;
    contract: string;
    title: string;
  };

  type Props = {
    id: string;
    intro: TableTabIntroDefinition;
    groups: PracticeGroup[];
    actions: Record<string, () => void>;
    lessonEntries?: PracticeLessonEntry[];
    onLessonSelect?: (lessonId: string) => void;
  };

  let { id, intro, groups, actions, lessonEntries = [], onLessonSelect }: Props = $props();
</script>

<div aria-label="Practice" class="barbu-tab-panel practice-panel" {id} role="tabpanel">
  <div class="barbu-mode-copy">
    <p class="eyebrow">{intro.eyebrow}</p>
    <h2>{intro.title}</h2>
    <p>{intro.summary}</p>
  </div>

  {#each groups as group}
    {#if group.layout === "action-list"}
      <div class="table-action-groups" aria-label={group.ariaLabel}>
        {#each group.entries ?? [] as entry}
          <section class="table-action-group" aria-label="Practice actions">
            <p class="eyebrow">{entry.label}</p>
            <button class="drill-action" onclick={actions[entry.action]} type="button">
              {entry.title}
            </button>
          </section>
        {/each}
      </div>
    {:else if group.layout === "lesson-grid" && group.lessonSource === "barbu-fixed-lessons"}
      <section class="fixed-contract-practice" aria-label={group.ariaLabel}>
        <div class="section-heading">
          <p class="eyebrow">{group.eyebrow}</p>
          <h2>{group.title}</h2>
        </div>
        <div class="fixed-contract-grid">
          {#each lessonEntries as lesson}
            <button class="contract-card compact" onclick={() => onLessonSelect?.(lesson.id)} type="button">
              <span>{lesson.contract}</span>
              <strong>{lesson.title}</strong>
              <small>One authored decision with immediate feedback.</small>
            </button>
          {/each}
        </div>
      </section>
    {:else}
      <section class="fixed-contract-practice" aria-label={group.ariaLabel}>
        <div class="section-heading">
          <p class="eyebrow">{group.eyebrow}</p>
          <h2>{group.title}</h2>
        </div>
        <div class="fixed-contract-grid">
          {#each group.entries ?? [] as entry}
            <button class="contract-card compact" onclick={actions[entry.action]} type="button">
              <span>{entry.label}</span>
              <strong>{entry.title}</strong>
              <small>{entry.summary}</small>
            </button>
          {/each}
        </div>
      </section>
    {/if}
  {/each}
</div>
