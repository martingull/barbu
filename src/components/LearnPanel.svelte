<script lang="ts">
  import type { GameTableDefinition, LearnPathStep, PracticeGroup } from "../games/tableFactory";
  import LearningCoach from "./LearningCoach.svelte";
  import GuidedHandEntry from "./GuidedHandEntry.svelte";
  import { learningGuide } from "../presentation/learningCharacters";
  import type { LearningEvidence } from "../domain/learningEvidence";
  import { formatCardText } from "../presentation/cardDisplay";

  type LearnAction = { id: string; title: string; summary: string; onClick: () => void };
  type Props = {
    table: GameTableDefinition;
    steps: LearnPathStep[];
    completedSteps: Record<string, boolean>;
    learningEvidence?: LearningEvidence;
    completedCount: number;
    nextStep?: LearnPathStep;
    actions?: LearnAction[];
    onStepSelect: (step: LearnPathStep) => void;
    onStepPractice: (step: LearnPathStep) => void;
    onStepRead?: (step: LearnPathStep) => void;
    onReset: () => void;
    guidedHand?: { gameName: string; onStart: () => void };
    groups: PracticeGroup[];
    exerciseActions: Record<string, () => void>;
    lessonEntries?: Array<{ id: string; contract: string; title: string }>;
  };

  let { table, steps, completedSteps, learningEvidence = {}, completedCount, nextStep, actions = [], onStepSelect, onStepPractice, onStepRead, onReset, guidedHand,
    groups, exerciseActions, lessonEntries = [] }: Props = $props();
  let firstStep = $derived(steps.find(step => step.action !== "planned"));
  let firstExercise = $derived(groups.flatMap(group => group.entries ?? [])[0]);
  let exercises = $derived(groups.flatMap(group => group.entries ?? []));
  let extraExercises = $derived(exercises.filter(entry => !steps.some(step => (step.exerciseAction ?? step.action) === entry.action)));
  let currentStep = $derived(nextStep ?? firstStep);
  let progress = $derived(steps.length ? Math.min(100, completedCount / steps.length * 100) : 0);
  let revisit = $derived(steps.find(step => completedSteps[step.id] && learningEvidence[step.id]?.correct < learningEvidence[step.id]?.total));
  let finished = $derived(steps.length > 0 && completedCount === steps.length);
  let welcome = $derived(finished ? revisit ? `You have finished the path. Let's revisit ${revisit.title} before your next game.`
    : "You have finished the path. Take a seat for a full game, or revisit a lesson."
    : currentStep?.summary ?? firstExercise?.summary ?? "Let's try a card decision together.");
</script>

<div aria-label="Learn" class="barbu-tab-panel learn-panel" id={table.tabs.learn.panelId} role="tabpanel">
  <section class="learn-start" aria-label="Continue learning">
    <p class="next-topic">{finished ? "Learning path complete" : "Next lesson"}</p>
    {#if !finished}<h2>{currentStep?.title ?? firstExercise?.title}</h2>{/if}
    <LearningCoach character={learningGuide(table.id)} message={welcome} compact />
    {#if steps.length && completedCount === steps.length}
      {#if revisit}<button class="drill-action" onclick={() => onStepPractice(revisit!)} type="button">Revisit lesson</button>{/if}
      <button class="reset-lessons" onclick={onReset} type="button">Reset lessons</button>
    {:else if currentStep || firstExercise}
      <button class="drill-action" onclick={() => currentStep ? onStepSelect(currentStep) : firstExercise && exerciseActions[firstExercise.action]?.()} type="button">
        {completedCount ? "Continue lesson" : "Start lesson"}
      </button>
    {/if}
  </section>

  {#if guidedHand}<GuidedHandEntry {...guidedHand} />{/if}

  <section class="learn-section" aria-label="Choose a topic">
    <h2>Learning path</h2>
    {#if steps.length}
      <div class="course-progress" aria-label={table.learn.progressAriaLabel}>
        <span>{completedCount} / {steps.length} complete</span>
        <div class="progress-track" role="progressbar" aria-label="Lessons completed" aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={steps.length}><div class="progress-fill" style={`width: ${progress}%`}></div></div>
      </div>
    {/if}
      <div class="learn-topic-list" aria-label={table.learn.pathAriaLabel}>
        {#each steps as step, index}
          {@const exercise = exercises.find(entry => entry.action === (step.exerciseAction ?? step.action))}
          {@const lesson = lessonEntries.find(entry => entry.id === step.lessonId)}
          {@const evidence = learningEvidence[step.id]}
          <div class="learn-skill" data-skill={step.id} class:path-end={index === steps.length - 1} class:current={step.id === nextStep?.id} class:finished={completedSteps[step.id]}>
          <button class="learn-topic lesson-topic" class:complete={completedSteps[step.id]}
            aria-current={step.id === nextStep?.id ? "step" : undefined}
            disabled={step.action === "planned"} onclick={() => onStepSelect(step)} type="button">
            <span class="lesson-number">{index + 1}</span>
            <span><strong>{step.title}</strong><small>{formatCardText(step.summary)}</small></span>
            <span class="lesson-status">{completedSteps[step.id] ? "Complete" : step.action === "planned" ? "Planned" : step.id === nextStep?.id ? "Next" : "Explore"}
              {#if completedSteps[step.id] && evidence}<span class="skill-evidence"> · {evidence.correct}/{evidence.total} on last attempt · {evidence.correct === evidence.total ? "Goal met" : "Revisit"}</span>{/if}
            </span>
          </button>
          {#if step.action !== "planned"}
            <button class="exercise-shortcut" aria-label={`${step.decisionFirst ? "Read lesson" : "Try cards"}: ${exercise?.title ?? lesson?.contract ?? step.title}`}
              onclick={() => step.decisionFirst && onStepRead ? onStepRead(step) : onStepPractice(step)} type="button">{step.decisionFirst ? "Read lesson" : "Try cards"}</button>
          {/if}
          </div>
        {/each}
        {#each extraExercises as entry}
          <div class="learn-skill" data-skill={entry.id}>
            <button class="learn-topic" onclick={() => exerciseActions[entry.action]?.()} type="button">
              <strong>{entry.title}</strong><small>{formatCardText(entry.summary)}</small>
            </button>
          </div>
        {/each}
      </div>
  </section>

  {#if actions.length}
    <section class="learn-section learn-resources" aria-label="Learning resources">
      {#each actions as action}
        <button class="learn-topic" onclick={action.onClick} type="button">
          <strong>{action.title}</strong><small>{formatCardText(action.summary)}</small>
        </button>
      {/each}
    </section>
  {/if}
</div>

<style>
  .learn-start, .learn-section { display: grid; gap: 8px; min-width: 0; }
  .learn-start { padding: 12px 0 16px; }
  .learn-section { padding: 12px 0; }
  h2 { margin: 0; color: #f7faf3; font-size: 1rem; line-height: 1.3; }
  .next-topic { margin: 0; color: #dbe7d1; font-size: 0.75rem; font-weight: 700; }
  .learn-topic-list { display: grid; min-width: 0; }
  .learn-skill { position: relative; display: grid; grid-template-columns: minmax(0, 1fr); align-items: center; min-width: 0; }
  .learn-skill:has(.lesson-number)::before { content: ""; position: absolute; left: 18px; width: 2px; top: 0; bottom: 0; background: #6e9382; pointer-events: none; }
  .learn-skill:first-child::before { top: 50%; }
  .learn-skill.path-end::before { bottom: 50%; }
  .learn-skill:has(.exercise-shortcut) { grid-template-columns: minmax(0, 1fr) 64px; gap: 8px; }
  .learn-skill .learn-topic { position: relative; border-bottom: 0; padding-block: 16px; }
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
  .lesson-topic { grid-template-columns: 36px minmax(0, 1fr); gap: 5px 12px; align-items: center; }
  .lesson-number { display: grid; place-items: center; grid-row: 1 / 3; width: 32px; height: 32px; border-radius: 50%; border: 2px solid #819c8e; background: #173c2e; color: #e5eee7; font-size: 0.85rem; font-weight: 700; }
  .current .lesson-number { background: #e7c766; color: #15291e; border-color: #e7c766; box-shadow: 0 0 0 4px #e7c76622; }
  .finished .lesson-number { border-color: #8ccfca; background: #244b45; color: #c6f2ed; }
  .lesson-status { grid-column: 2; font-size: 0.72rem; color: #f5f1cf; line-height: 1.5; }
  .skill-evidence { color: #cedbd3; }
  .complete .lesson-status { color: #9edab8; }
  .learn-resources { border-top: 1px solid #ffffff26; }
  .reset-lessons { justify-self: start; padding: 8px 0; min-height: 44px; border: 0; background: transparent; color: #c1d1bf; text-decoration: underline; }
</style>
