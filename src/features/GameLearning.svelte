<script lang="ts">
  import { untrack, type Snippet } from "svelte";
  import type { Seat, TableCard } from "../domain/types";
  import type { PlayBarbuAttempt } from "../lessons/drillReview";
  import GameTableShell from "../components/GameTableShell.svelte";
  import LearnPanel from "../components/LearnPanel.svelte";
  import CourseLesson from "../components/CourseLesson.svelte";
  import DrillScreen from "../components/DrillScreen.svelte";
  import DrillResultScreen from "../components/DrillResultScreen.svelte";
  import { courseCatalog } from "../lessons/courses";
  import type { CourseContent, CourseStage } from "../lessons/courseTypes";
  import { drillDecision, type DrillStep, type DrillResult } from "../lessons/drillDecision";
  import type { GameDefinition } from "../games/gameRegistry";
  import type { LearnPathStep, TableTabId } from "../games/tableFactory";
  import type { CustomExerciseContext, FeatureServices, LearningEntry, LearningResultActions } from "./featureServices";

  let { definition, gameName, tab, onTab, play, customExercise, loadExercise, exerciseTitle, drillTitle, drillEyebrow, seatLabels = {}, resultMessage,
    entry, resources, lessonEntries = [], customExample: renderExample, drillTableFor, drillTopic, resultActions, historyFilter,
    completedSteps, history, nextSeed, onBack, onReference, onCompleteStep, onExerciseComplete, onSurfaceChange }: FeatureServices & {
    definition: GameDefinition; gameName: string; tab: TableTabId; onTab: (tab: TableTabId) => void;
    play: Snippet; customExercise?: Snippet<[CustomExerciseContext]>;
    loadExercise: (action: string, nextSeed: () => number, fromCourse: boolean) => DrillStep[] | { seed: number };
    exerciseTitle: (action: string) => string; drillTitle: (step: DrillStep) => string; drillEyebrow?: string;
    seatLabels?: Partial<Record<Seat, string>>;
    resultMessage: (clean: boolean) => string;
    entry?: LearningEntry;
    resources?: Array<{ id: string; title: string; summary: string; onClick: () => void }>;
    lessonEntries?: Array<{ id: string; contract: string; title: string }>;
    customExample?: Snippet<[CourseContent]>;
    drillTableFor?: (step: DrillStep) => Snippet<[TableCard[]]> | undefined;
    drillTopic?: (action: string) => string;
    resultActions?: Snippet<[LearningResultActions]>;
    historyFilter?: (attempt: PlayBarbuAttempt) => boolean;
  } = $props();
  let view = $state<"table" | "course" | "drill" | "custom" | "result">("table");
  let course = $state<CourseContent | null>(null);
  let stage = $state<CourseStage>("concept");
  let action = $state("");
  let seed = $state(0);
  let steps = $state<DrillStep[]>([]);
  let index = $state(0);
  let selected = $state("");
  let checked = $state("");
  let results = $state<DrillResult[]>([]);
  let error = $state("");
  let completedCount = $derived(definition.learnSteps.filter(step => completedSteps[step.id]).length);
  let nextStep = $derived(definition.learnSteps.find(step => !completedSteps[step.id]));
  let attempts = $derived(history.filter(historyFilter ?? (attempt => attempt.results.length > 0 && attempt.results.every(result => result.contract === gameName))).slice(0, 3));
  let actions = $derived(Object.fromEntries(definition.practiceGroups.flatMap(group => group.entries ?? []).map(entry => [entry.action, () => startExercise(entry.action)])));
  $effect(() => { onSurfaceChange(view === "course" || view === "drill" || view === "custom"); });
  let openedEntry: LearningEntry | undefined;
  $effect(() => {
    if (!entry || openedEntry === entry) return;
    openedEntry = entry;
    untrack(() => {
      const target = entry;
      if (target?.kind === "exercise") startExercise(target.action);
      else {
        const step = target?.kind === "step" ? definition.learnSteps.find(step => step.id === target.id) : nextStep;
        if (step) startStep(step);
      }
    });
  });

  function table() { view = "table"; course = null; error = ""; }
  function startStep(step: LearnPathStep) {
    course = courseCatalog.find(item => item.game === definition.table.id && item.pathStepId === step.id) ?? null;
    if (course) { stage = "concept"; view = "course"; }
    else startExercise(step.exerciseAction ?? step.action);
  }
  function continueCourse() {
    if (!course) return;
    if (stage === "concept") stage = "example";
    else if (stage === "example") startExercise(course.practiceTarget.kind === "practice"
      ? course.practiceTarget.action : course.practiceTarget.lessonId, true);
    else {
      try { onCompleteStep(course.pathStepId); }
      catch { /* In-memory progress and navigation remain usable without storage. */ }
      table();
    }
  }
  function startExercise(nextAction: string, fromCourse = false) {
    try {
      const exercise = loadExercise(nextAction, nextSeed, fromCourse);
      const nextSteps = Array.isArray(exercise) ? exercise : null;
      if (nextSteps && !nextSteps.length) throw Error("This exercise could not be loaded.");
      if (!nextSteps && !customExercise) throw Error("This exercise has no decision screen.");
      if (!fromCourse) course = null;
      action = nextAction;
      seed = Array.isArray(exercise) ? 0 : exercise.seed;
      steps = nextSteps ?? [];
      index = 0;
      selected = checked = "";
      results = [];
      error = "";
      view = nextSteps ? "drill" : "custom";
    } catch (cause) { error = cause instanceof Error ? cause.message : "This exercise could not be loaded."; }
  }
  function check() {
    const card = steps[index].trick.hand.find(card => card.id === selected);
    if (!card || checked) return;
    results = [...results, drillDecision(steps[index], card).result];
    checked = card.id;
  }
  function finish() {
    try { if (results.length) onExerciseComplete(results); } catch { /* Review remains available without storage. */ }
    if (course) { stage = "review"; view = "course"; }
    else view = "result";
  }
  function finishCustom() {
    if (course) { stage = "review"; view = "course"; }
    else table();
  }
  function next() {
    if (index >= steps.length - 1) { finish(); return; }
    index += 1;
    selected = checked = "";
  }
</script>

{#if view === "course" && course}
  <CourseLesson {course} {stage} onBack={table} onContinue={continueCourse}>
    {#snippet customExample()}{#if renderExample}{@render renderExample(course!)}{/if}{/snippet}
  </CourseLesson>
{:else if view === "drill"}
  <DrillScreen step={steps[index]} selectedCardId={selected} checkedCardId={checked} {results} total={steps.length} {index}
    title={drillTitle(steps[index])} eyebrow={drillEyebrow ?? exerciseTitle(action)} topic={drillTopic?.(action) ?? gameName}
    customTable={drillTableFor?.(steps[index])} {seatLabels} onBack={table}
    onSelect={card => { if (!checked) selected = card.id; }} onCheck={check} onNext={next} onFinish={finish} />
{:else if view === "custom" && customExercise}
  {@render customExercise({ action, seed, fromCourse: Boolean(course), courseComplete: completedCount === definition.learnSteps.length, onBack: table, onComplete: finishCustom })}
{:else if view === "result"}
  <DrillResultScreen title={exerciseTitle(action)} {results} {attempts} onBack={table}
    message={resultMessage(results.length > 0 && results.every(result => result.clean))}>
    {#snippet actions()}
      {#if resultActions}
        {@render resultActions({ results, attempts, onExercise: startExercise, onBack: table })}
      {:else}
        <button class="primary-action" onclick={() => startExercise(action)} type="button">Practice {gameName} again</button>
        <button class="secondary-action" onclick={table} type="button">Table</button>
      {/if}
    {/snippet}
    {#snippet footer()}<button class="primary-action" onclick={table} type="button">Back to Learn</button>{/snippet}
  </DrillResultScreen>
{:else}
  <GameTableShell table={definition.table} activeTab={tab} {onBack} onTabSelect={onTab}>
    {#if tab === "learn"}
      <LearnPanel table={definition.table} steps={definition.learnSteps} {completedSteps} {completedCount} {nextStep}
        actions={resources ?? [{ id: "reference", title: "Reference", summary: definition.table.learn.referenceSummary, onClick: onReference }]}
        {lessonEntries} onLessonSelect={id => startExercise(id)}
        onStepSelect={startStep} groups={definition.practiceGroups} exerciseActions={actions} />
    {:else}{@render play()}{/if}
  </GameTableShell>
{/if}
{#if error}<p class="outcome warning" role="alert">{error}</p>{/if}
