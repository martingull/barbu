<script lang="ts">
  import type { GameTableDefinition, LearnPathStep, PracticeGroup } from "../games/tableFactory";

  type LearnAction = { id: string; title: string; summary: string; onClick: () => void };
  type Props = {
    table: GameTableDefinition;
    steps: LearnPathStep[];
    completedSteps: Record<string, boolean>;
    completedCount: number;
    nextStep?: LearnPathStep;
    actions?: LearnAction[];
    onStepSelect: (step: LearnPathStep) => void;
    groups: PracticeGroup[];
    exerciseActions: Record<string, () => void>;
    lessonEntries?: Array<{ id: string; contract: string; title: string }>;
    onLessonSelect?: (id: string) => void;
  };

  let { table, steps, completedSteps, completedCount, nextStep, actions = [], onStepSelect,
    groups, exerciseActions, lessonEntries = [], onLessonSelect }: Props = $props();
  let firstStep = $derived(steps.find(step => step.action !== "planned"));
  let firstExercise = $derived(groups.flatMap(group => group.entries ?? [])[0]);
  let exercises = $derived(groups.flatMap(group => group.entries ?? []));
  let extraExercises = $derived(exercises.filter(entry => !steps.some(step => (step.exerciseAction ?? step.action) === entry.action)));
  let currentStep = $derived(nextStep ?? firstStep);
  let progress = $derived(steps.length ? Math.min(100, completedCount / steps.length * 100) : 0);
</script>

<div aria-label="Learn" class="barbu-tab-panel learn-panel" id={table.tabs.learn.panelId} role="tabpanel">
  <section class="learn-start" aria-label="Continue learning">
    {#if steps.length}
      <div class="course-progress" aria-label={table.learn.progressAriaLabel}>
        <span>{completedCount} / {steps.length} complete</span>
        <div class="progress-track"><div class="progress-fill" style={`width: ${progress}%`}></div></div>
      </div>
    {/if}
    {#if currentStep || firstExercise}
      <button class="drill-action" onclick={() => currentStep ? onStepSelect(currentStep) : firstExercise && exerciseActions[firstExercise.action]?.()} type="button">
        {steps.length && !nextStep ? "Review lessons" : completedCount ? "Continue learning" : "Start learning"}
      </button>
      <p class="next-topic">{currentStep?.title ?? firstExercise?.title}</p>
    {/if}
  </section>

  <section class="learn-section" aria-label="Choose a topic">
    <h2>Choose a topic</h2>
      <div class="learn-topic-list" aria-label={table.learn.pathAriaLabel}>
        {#each steps as step, index}
          {@const exercise = exercises.find(entry => entry.action === (step.exerciseAction ?? step.action))}
          {@const lesson = lessonEntries.find(entry => entry.id === step.lessonId)}
          <div class="learn-skill" data-skill={step.id}>
          <button class="learn-topic lesson-topic" class:complete={completedSteps[step.id]}
            disabled={step.action === "planned"} onclick={() => onStepSelect(step)} type="button">
            <span class="lesson-number">{index + 1}</span>
            <span><small>{step.step}</small><strong>{step.title}</strong><small>{step.summary}</small></span>
            <span class="lesson-status">{completedSteps[step.id] ? "Complete" : step.action === "planned" ? "Planned" : step.id === nextStep?.id ? "Next" : "Open"}</span>
          </button>
          {#if exercise || lesson}
            <button class="exercise-shortcut" aria-label={`Try cards: ${exercise?.title ?? lesson?.contract}`}
              onclick={() => exercise ? exerciseActions[exercise.action]?.() : lesson && onLessonSelect?.(lesson.id)} type="button">Try cards</button>
          {/if}
          </div>
        {/each}
        {#each extraExercises as entry}
          <div class="learn-skill" data-skill={entry.id}>
            <button class="learn-topic" onclick={() => exerciseActions[entry.action]?.()} type="button">
              <strong>{entry.title}</strong><small>{entry.summary}</small>
            </button>
          </div>
        {/each}
      </div>
  </section>

  {#if actions.length}
    <section class="learn-section learn-resources" aria-label="Learning resources">
      {#each actions as action}
        <button class="learn-topic" onclick={action.onClick} type="button">
          <strong>{action.title}</strong><small>{action.summary}</small>
        </button>
      {/each}
    </section>
  {/if}
</div>

<style>
  .learn-start, .learn-section { display: grid; gap: 8px; min-width: 0; }
  .learn-start { padding: 8px 0 16px; }
  .learn-section { padding: 12px 0; }
  h2 { margin: 0; color: #f7faf3; font-size: 1rem; line-height: 1.3; }
  .next-topic { margin: 0; color: #dbe7d1; font-size: 0.9rem; }
  .learn-topic-list { display: grid; min-width: 0; }
  .learn-skill { display: grid; grid-template-columns: minmax(0, 1fr); align-items: center; min-width: 0; border-bottom: 1px solid #ffffff26; }
  .learn-skill:has(.exercise-shortcut) { grid-template-columns: minmax(0, 1fr) 64px; gap: 8px; }
  .learn-skill .learn-topic { border-bottom: 0; }
  .exercise-shortcut { justify-self: end; min-height: 44px; padding: 8px 2px; border: 0; background: transparent; color: #f5f1cf; font-size: 0.8rem; text-decoration: underline; }
  .learn-topic {
    display: grid; gap: 4px; width: 100%; min-width: 0; min-height: 48px;
    padding: 12px 2px; border: 0; border-bottom: 1px solid #ffffff26;
    border-radius: 0; background: transparent; color: #f7faf3; text-align: left;
    overflow-wrap: anywhere;
  }
  .learn-topic:hover { background: #ffffff0a; }
  .learn-topic:focus-visible { outline: 2px solid #f5f1cf; outline-offset: 2px; }
  .learn-topic strong { display: block; font-size: 0.94rem; line-height: 1.3; }
  .learn-topic small { display: block; color: #c1d1bf; font-size: 0.8rem; line-height: 1.4; }
  .lesson-topic { grid-template-columns: 18px minmax(0, 1fr); gap: 4px 8px; align-items: center; }
  .lesson-number { color: #c1d1bf; font-size: 0.85rem; }
  .lesson-status { grid-column: 2; font-size: 0.7rem; color: #f5f1cf; }
  .complete .lesson-status { color: #9edab8; }
  .learn-resources { border-top: 1px solid #ffffff26; }
</style>
