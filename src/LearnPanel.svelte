<script lang="ts">
  import type { GameTableDefinition, LearnPathStep } from "./tableFactory";

  type LearnPanelAction = {
    id: string;
    eyebrow: string;
    title: string;
    summary: string;
    primary?: boolean;
    disabled?: boolean;
    onClick: () => void;
  };

  type Props = {
    table: GameTableDefinition;
    steps: LearnPathStep[];
    completedSteps: Record<string, boolean>;
    completedCount: number;
    nextStep?: LearnPathStep;
    actions: LearnPanelAction[];
    extraActions?: LearnPanelAction[];
    onStepSelect: (step: LearnPathStep) => void;
  };

  let {
    table,
    steps,
    completedSteps,
    completedCount,
    nextStep,
    actions,
    extraActions = [],
    onStepSelect
  }: Props = $props();

  let tableActionLabel = $derived(table.id === "barbu" ? "Barbu table actions" : `${table.title} actions`);
  let learnActionLabel = $derived(
    table.id === "hearts"
      ? "Hearts learn actions"
      : table.id === "whist"
        ? "Whist learn actions"
        : table.id === "spades"
          ? "Spades learn actions"
          : table.id === "bridge"
            ? "Bridge learn actions"
          : "Learn actions"
  );

  let courseAction = $derived({
    id: "course",
    eyebrow: nextStep ? "Lesson" : "Path",
    title: nextStep ? nextStep.title : "Review path",
    summary: nextStep ? nextStep.summary : table.learn.completeSummary,
    primary: true,
    disabled: !nextStep,
    onClick: () => {
      if (nextStep) {
        onStepSelect(nextStep);
      }
    }
  });

  let allActions = $derived([courseAction, ...actions]);
</script>

<div aria-label="Learn" class="barbu-tab-panel learn-panel" id={table.tabs.learn.panelId} role="tabpanel">
  <div class="table-action-groups" aria-label={tableActionLabel}>
    <section class="learn-action-grid" aria-label={learnActionLabel}>
      {#each allActions as action}
        <button
          class:primary={action.primary}
          class="learn-action-card"
          disabled={action.disabled}
          onclick={action.onClick}
          type="button"
        >
          <span class="eyebrow">{action.eyebrow}</span>
          <strong>{action.title}</strong>
          <small>{action.summary}</small>
        </button>
      {/each}
    </section>
  </div>

  {#each extraActions as action}
    <button
      class:primary={action.primary}
      class="learn-action-card"
      disabled={action.disabled}
      onclick={action.onClick}
      type="button"
    >
      <span class="eyebrow">{action.eyebrow}</span>
      <strong>{action.title}</strong>
      <small>{action.summary}</small>
    </button>
  {/each}

  <section class="path-section" aria-label={table.learn.pathAriaLabel}>
    <div class="section-heading">
      <p class="eyebrow">{table.learn.pathEyebrow}</p>
      <h2>{table.learn.pathTitle}</h2>
    </div>

    <div class="course-progress path-progress" aria-label={table.learn.progressAriaLabel}>
      <span>{completedCount} / {steps.length} complete</span>
      <div class="progress-track">
        <div class="progress-fill" style={`width: ${(completedCount / steps.length) * 100}%`}></div>
      </div>
    </div>

    <div class="path-grid">
      {#each steps as step, index}
        <button
          class:active={step.id === nextStep?.id && !completedSteps[step.id]}
          class:complete={completedSteps[step.id]}
          class:planned={step.action === "planned"}
          class="path-card"
          disabled={step.action === "planned"}
          onclick={() => onStepSelect(step)}
          type="button"
        >
          <span class="path-index">{index + 1}</span>
          <span class="path-step">{step.step}</span>
          <strong>{step.title}</strong>
          <small>{step.summary}</small>
          <span class="path-status">
            {#if completedSteps[step.id]}
              Complete
            {:else if step.action === "planned"}
              Planned
            {:else if step.id === nextStep?.id}
              Next
            {:else}
              Open
            {/if}
          </span>
        </button>
      {/each}
    </div>
  </section>
</div>
