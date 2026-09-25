<script lang="ts">
  import { untrack } from "svelte";
  import GameLearning from "../GameLearning.svelte";
  import PlayTabPanel from "../../PlayTabPanel.svelte";
  import BarbuPlay from "./BarbuPlay.svelte";
  import BarbuPracticeHand from "./BarbuPracticeHand.svelte";
  import BarbuGuidedLesson from "./BarbuGuidedLesson.svelte";
  import BarbuContracts from "./BarbuContracts.svelte";
  import BarbuReview from "./BarbuReview.svelte";
  import DominoLessonTable from "./DominoLessonTable.svelte";
  import { barbuDef } from "../../games/barbu";
  import { guidedLessons } from "../../lessons/catalog";
  import { buildDrillLoopInsight, summarizeContractResults, weakestContractFromResults } from "../../lessons/drillReview";
  import { createBarbuPracticeLoader, barbuExerciseTitle, exerciseContract, isBarbuAttempt } from "./barbuLearning";
  import { savedPlayBarbuRunSummary } from "../../persistence/barbuSave";
  import type { FullHandContract } from "../../lessonTypes";
  import type { FeatureServices, LearningEntry } from "../featureServices";
  import type { BarbuFeature } from "./barbuFeature";

  let { feature, initialEntry, ...services }: FeatureServices & {
    feature: BarbuFeature; initialEntry?: LearningEntry;
  } = $props();
  let route = $state<"table" | "contracts" | "review" | "hand">("table");
  let entry = $state<LearningEntry | undefined>(untrack(() => initialEntry));
  let practice = $state<{ contract: FullHandContract; seed: number } | null>(null);
  let learningFixed = $state(false);
  const loader = createBarbuPracticeLoader(() => typeof localStorage === "undefined" ? undefined : localStorage, () => services.nextSeed());
  const lessonEntries = guidedLessons.filter(lesson => lesson.contract !== "Domino");
  let attempts = $derived(services.history.filter(isBarbuAttempt).slice(0, 3));
  $effect(() => services.onSurfaceChange(route === "hand" || (route === "table"
    && ($feature.view === "hand" || learningFixed))));

  function table() { route = "table"; entry = undefined; feature.openTable(); }
  function learn(nextEntry: LearningEntry) { feature.openTable("learn"); entry = nextEntry; route = "table"; }
  function standalone(contract: FullHandContract) {
    practice = { contract, seed: services.nextSeed() };
    route = "hand";
  }
</script>

{#snippet dominoTable(cards)}
  <DominoLessonTable {cards} label="Domino drill layout" />
{/snippet}
{#if route === "contracts"}
  <BarbuContracts completedPathSteps={services.completedSteps} onBack={table} onStep={id => learn({ kind: "step", id })} />
{:else if route === "review"}
  <BarbuReview recentPlayBarbuAttempts={attempts} onBack={table}
    onExercise={action => learn({ kind: "exercise", action })}
    onComplete={() => {
      try { services.onCompleteStep("review"); }
      catch { /* Navigation remains available when progress cannot be saved. */ }
      table();
    }} />
{:else if route === "hand" && practice}
  <BarbuPracticeHand initialContract={practice.contract} initialSeed={practice.seed} nextSeed={services.nextSeed} onBack={table} />
{:else if $feature.view === "hand"}
  <BarbuPlay {feature} onBack={table} onStandaloneHand={standalone} />
{:else}
  <GameLearning {...services} definition={barbuDef} gameName="Barbu" tab={$feature.tab} {entry} {lessonEntries}
    onTab={tab => feature.openTable(tab === "play" ? "play" : "learn")} onSurfaceChange={fixed => { learningFixed = fixed; }}
    resources={[
      { id: "review-results", title: "Review results", summary: "Return to your previous contract decisions.", onClick: () => { route = "review"; } },
      { id: "reference", title: "Reference", summary: barbuDef.table.learn.referenceSummary, onClick: services.onReference },
      { id: "contracts", title: "Barbu contracts", summary: "See the contract roster and what each table asks you to notice.", onClick: () => { route = "contracts"; } }
    ]}
    loadExercise={(action, _seed, fromCourse) => loader.load(action, fromCourse)}
    exerciseTitle={barbuExerciseTitle} drillTitle={step => step.trick.title}
    drillTopic={exerciseContract} drillTableFor={step => step.contract === "Domino" ? dominoTable : undefined}
    historyFilter={isBarbuAttempt} resultMessage={clean => clean
      ? "Clean session. Barbu is ready to raise the pressure." : "Use the next repetition to make the weak decision automatic."}>
    {#snippet customExample(course)}
      <DominoLessonTable cards={course.example.tableCards} label={course.example.ariaLabel} />
    {/snippet}
    {#snippet customExercise(context)}
      {#key context.action}
        {#if context.fromCourse}
          <BarbuGuidedLesson lessonId={context.action} onBack={context.onBack} onComplete={context.onComplete} />
        {:else}
          <BarbuPracticeHand initialContract="Domino" initialSeed={context.seed} nextSeed={services.nextSeed} onBack={context.onBack} />
        {/if}
      {/key}
    {/snippet}
    {#snippet resultActions(context)}
      {@const focus = buildDrillLoopInsight(context.results, context.attempts).contract
        || weakestContractFromResults(summarizeContractResults(context.results))}
      <button class="primary-action" onclick={() => context.onExercise(focus || "mixed")} type="button">Replay {focus || "Full table"}</button>
      <button class="secondary-action" onclick={() => context.onExercise("mixed")} type="button">Try again</button>
    {/snippet}
    {#snippet play()}
      <PlayTabPanel table={barbuDef.table} {...barbuDef.playTabConfig}
        primaryDisabled={$feature.dealing} primaryWarning={$feature.error} onPrimary={() => void feature.start()}
        resumeLabel={$feature.saved ? "Continue Play Barbu" : undefined}
        resumeNote={$feature.saved ? savedPlayBarbuRunSummary($feature.saved) : undefined}
        onResume={$feature.saved ? feature.resume : undefined} />
    {/snippet}
  </GameLearning>
{/if}
