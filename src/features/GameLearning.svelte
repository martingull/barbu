<script lang="ts">
  import { untrack, type Snippet } from "svelte";
  import type { Seat, TableCard } from "../domain/types";
  import GameTableShell from "../components/GameTableShell.svelte";
  import LearnPanel from "../components/LearnPanel.svelte";
  import CourseLesson from "../components/CourseLesson.svelte";
  import DrillScreen from "../components/DrillScreen.svelte";
  import DrillResultScreen from "../components/DrillResultScreen.svelte";
  import TablePlaySurface from "../components/TablePlaySurface.svelte";
  import { courseCatalog } from "../lessons/courses";
  import type { CourseContent, CourseStage } from "../lessons/courseTypes";
  import { drillDecision, type DrillStep, type DrillResult } from "../lessons/drillDecision";
  import type { GameDefinition } from "../games/gameRegistry";
  import type { LearnPathStep, TableTabId } from "../games/tableFactory";
  import type { CustomExerciseContext, FeatureServices, LearningEntry } from "./featureServices";

  let { definition, gameName, tab, onTab, play, customExercise, loadExercise, exerciseTitle, drillTitle, drillEyebrow, seatLabels = {}, resultMessage,
    entry, onEntryConsumed, onIntroductionComplete, onPlay, playLabel, introductionRecommendation, resources, lessonEntries = [], customExample: renderExample, drillTableFor, drillTopic,
    completedSteps, nextSeed, onBack, onReference, onCompleteStep, onResetSteps, onExerciseComplete, onSurfaceChange }: FeatureServices & {
    definition: GameDefinition; gameName: string; tab: TableTabId; onTab: (tab: TableTabId) => void;
    play: Snippet; customExercise?: Snippet<[CustomExerciseContext]>;
    loadExercise: (action: string, nextSeed: () => number, fromCourse: boolean) => DrillStep[] | { seed: number };
    exerciseTitle: (action: string) => string; drillTitle: (step: DrillStep) => string; drillEyebrow?: string;
    seatLabels?: Partial<Record<Seat, string>>;
    resultMessage: (clean: boolean) => string;
    entry?: LearningEntry;
    onEntryConsumed?: () => void;
    onIntroductionComplete?: () => void;
    onPlay?: () => void;
    playLabel?: string;
    introductionRecommendation?: { title: string; summary: string; label: string; onOpen: () => void };
    resources?: Array<{ id: string; title: string; summary: string; onClick: () => void }>;
    lessonEntries?: Array<{ id: string; contract: string; title: string }>;
    customExample?: Snippet<[CourseContent]>;
    drillTableFor?: (step: DrillStep) => Snippet<[TableCard[]]> | undefined;
    drillTopic?: (action: string) => string;
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
  let introduction = $state("");
  let activeStep = $state<LearnPathStep | null>(null);
  let exerciseComplete = $state(false);
  let exerciseFromCourse = $state(false);
  let completedCount = $derived(definition.learnSteps.filter(step => completedSteps[step.id]).length);
  let nextStep = $derived(definition.learnSteps.find(step => !completedSteps[step.id]));
  let actions = $derived(Object.fromEntries(definition.practiceGroups.flatMap(group => group.entries ?? []).map(entry => [entry.action, () => startExercise(entry.action)])));
  $effect(() => { onSurfaceChange(view === "course" || view === "drill" || view === "custom" || (view === "result" && !!introduction)); });
  let openedEntry: LearningEntry | undefined;
  $effect(() => {
    if (!entry || openedEntry === entry) return;
    openedEntry = entry;
    untrack(() => {
      const target = entry;
      if (target?.kind === "introduction") startExercise(target.action, false, target.title);
      else if (target?.kind === "exercise") startExercise(target.action);
      else {
        const step = target?.kind === "step" ? definition.learnSteps.find(step => step.id === target.id) : nextStep;
        if (step) startStep(step);
      }
      onEntryConsumed?.();
    });
  });

  function table() { view = "table"; course = null; activeStep = null; introduction = ""; error = ""; }
  function startStep(step: LearnPathStep) {
    introduction = "";
    activeStep = step;
    course = courseCatalog.find(item => item.game === definition.table.id && item.pathStepId === step.id) ?? null;
    if (course) { stage = "concept"; view = "course"; }
    else startExercise(step.exerciseAction ?? step.action);
  }
  function practiceStep(step: LearnPathStep) {
    startStep(step);
    if (course) startExercise(course.practiceTarget.kind === "practice"
      ? course.practiceTarget.action : course.practiceTarget.lessonId, true);
  }
  function shortcutStep(step: LearnPathStep) {
    // Guided-only topics should not open a standalone full hand instead.
    if (step.lessonId && !lessonEntries.some(lesson => lesson.id === step.lessonId)) { practiceStep(step); return; }
    const exerciseAction = step.exerciseAction ?? step.action;
    const hasExercise = definition.practiceGroups.some(group => group.entries?.some(entry => entry.action === exerciseAction));
    if (!hasExercise && !step.lessonId) { practiceStep(step); return; }
    startExercise(hasExercise ? exerciseAction : step.lessonId!);
    activeStep = step;
    course = courseCatalog.find(item => item.game === definition.table.id && item.pathStepId === step.id) ?? null;
  }
  function continueCourse() {
    if (!course) return;
    if (stage === "concept") stage = "example";
    else if (stage === "example") startExercise(course.practiceTarget.kind === "practice"
      ? course.practiceTarget.action : course.practiceTarget.lessonId, true);
  }
  function startExercise(nextAction: string, fromCourse = false, introductionTitle = "") {
    try {
      const exercise = loadExercise(nextAction, nextSeed, fromCourse);
      const nextSteps = Array.isArray(exercise) ? exercise : null;
      if (nextSteps && !nextSteps.length) throw Error("This exercise could not be loaded.");
      if (!nextSteps && !customExercise) throw Error("This exercise has no decision screen.");
      if (!fromCourse) {
        course = null;
        // Only an unambiguous topic can receive credit from a standalone exercise.
        const matches = definition.learnSteps.filter(step => (step.exerciseAction ?? step.action) === nextAction || step.lessonId === nextAction);
        activeStep = !introductionTitle && matches.length === 1 ? matches[0] : null;
        course = activeStep ? courseCatalog.find(item => item.game === definition.table.id && item.pathStepId === activeStep?.id) ?? null : null;
      }
      introduction = introductionTitle;
      action = nextAction;
      seed = Array.isArray(exercise) ? 0 : exercise.seed;
      steps = nextSteps ?? [];
      index = 0;
      selected = checked = "";
      results = [];
      exerciseComplete = false;
      exerciseFromCourse = fromCourse;
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
  function retry() {
    const step = activeStep, lesson = course;
    startExercise(action, exerciseFromCourse);
    activeStep = step;
    course = lesson;
  }
  function finish() {
    if (view !== "drill") return;
    exerciseComplete = steps.length > 0 && results.length === steps.length;
    try { if (results.length) onExerciseComplete(results); } catch { /* Review remains available without storage. */ }
    if (introduction && exerciseComplete) {
      try { onIntroductionComplete?.(); } catch { /* Completion remains visible without storage. */ }
    }
    completeTopic();
    view = "result";
  }
  function completeTopic() {
    if (!exerciseComplete || !activeStep) return;
    try { onCompleteStep(activeStep.id); }
    catch { /* The result remains usable when progress cannot be saved. */ }
  }
  function finishCustom() {
    if (view !== "custom") return;
    exerciseComplete = true;
    completeTopic();
    view = "result";
  }
  function next() {
    if (view !== "drill" || !checked || results.length !== index + 1) return;
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
    title={drillTitle(steps[index])} eyebrow={introduction || (drillEyebrow ?? exerciseTitle(action))} topic={drillTopic?.(action) ?? gameName}
    customTable={drillTableFor?.(steps[index])} {seatLabels} onBack={table}
    allowEarlyFinish={!introduction} finishLabel={introduction ? "Finish introduction" : "Finish topic"}
    onSelect={card => { if (!checked) selected = card.id; }} onCheck={check} onNext={next} onFinish={finish} />
{:else if view === "custom" && customExercise}
  {@render customExercise({ action, seed, fromCourse: exerciseFromCourse, onBack: table, onComplete: finishCustom })}
{:else if view === "result" && introduction}
  <TablePlaySurface flowLayout surfaceClassName="learning-copy-surface" showTable={false} title={introduction} ariaLabel="Introduction result"
    statusLabel="Decisions" statusValue={`${results.length} / ${steps.length}`} onBack={table}
    tableAriaLabel="Introduction table" tableCards={[]} panelAriaLabel="Introduction summary">
    {#snippet panel()}
      <p class="result" role="status">{results.length === steps.length ? "Introduction complete." : "Introduction paused."}</p>
      <p class="result">{results.filter(result => result.clean).length} of {results.length} decisions matched the lesson's goal.</p>
      <div class="action-row">
        <button class="secondary-action" onclick={table} type="button">Learn {gameName}</button>
        {#if onPlay}<button class="primary-action" onclick={onPlay} type="button">{playLabel ?? `Play ${gameName}`}</button>{/if}
      </div>
      {#if results.length === steps.length && introductionRecommendation}
        <section class="next-game" aria-label="Explore another game">
          <div><h2>{introductionRecommendation.title}</h2><p>{introductionRecommendation.summary}</p></div>
          <button class="secondary-action" onclick={introductionRecommendation.onOpen} type="button">{introductionRecommendation.label}</button>
        </section>
      {/if}
    {/snippet}
  </TablePlaySurface>
{:else if view === "result"}
  <DrillResultScreen title={activeStep?.title ?? exerciseTitle(action)} {results} complete={exerciseComplete}
    kind={activeStep ? "Topic" : "Exercise"}
    total={steps.length} onBack={table} review={course?.review}
    message={results.length ? resultMessage(results.every(result => result.clean)) : "Try this skill in a full hand, or continue learning."}>
    {#snippet actions()}
      {#if exerciseComplete && nextStep}
        <button class="primary-action" onclick={() => practiceStep(nextStep!)} type="button">Next topic</button>
      {/if}
      {#if onPlay}<button class="primary-action" onclick={onPlay} type="button">{playLabel ?? `Play ${gameName}`}</button>{/if}
      <button class="secondary-action" onclick={retry} type="button">Try again</button>
    {/snippet}
  </DrillResultScreen>
{:else}
  <GameTableShell table={definition.table} activeTab={tab} {onBack} onTabSelect={onTab}>
    {#if tab === "learn"}
      <LearnPanel table={definition.table} steps={definition.learnSteps} {completedSteps} {completedCount} {nextStep}
        actions={resources ?? [{ id: "reference", title: "Reference", summary: definition.table.learn.referenceSummary, onClick: onReference }]}
        {lessonEntries}
        onStepSelect={startStep} onStepPractice={shortcutStep} onReset={() => onResetSteps(definition.learnSteps.map(step => step.id))}
        groups={definition.practiceGroups} exerciseActions={actions} />
    {:else}{@render play()}{/if}
  </GameTableShell>
{/if}
{#if error}<p class="outcome warning" role="alert">{error}</p>{/if}

<style>
  .next-game { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #ffffff26; }
  .next-game > div { flex: 1 1 190px; min-width: 0; }
  .next-game h2 { margin: 0; font-size: 1rem; line-height: 1.3; }
  .next-game p { margin: 6px 0 0; color: #c8d8ca; font-size: 0.875rem; line-height: 1.4; }
  .next-game button { min-height: 44px; }
</style>
