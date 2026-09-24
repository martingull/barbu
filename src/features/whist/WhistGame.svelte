<script lang="ts">
  import GameTableShell from "../../GameTableShell.svelte";
  import LearnPanel from "../../LearnPanel.svelte";
  import PlayTabPanel from "../../PlayTabPanel.svelte";
  import CourseLesson from "../../CourseLesson.svelte";
  import DrillScreen from "../../DrillScreen.svelte";
  import DrillResultScreen from "../../DrillResultScreen.svelte";
  import type { PlayBarbuAttempt } from "../../lessons/drillReview";
  import WhistHandView from "./WhistHandView.svelte";
  import { whistDef } from "../../games/whist";
  import type { WhistPracticeAction } from "../../games/whist";
  import type { LearnPathStep } from "../../tableFactory";
  import { courseCatalog, type CourseContent, type CourseStage } from "../../courseContent";
  import { drillDecision, orderPracticePool, type DrillStep, type DrillResult } from "../../lessons/drillDecision";
  import { whistFollowSuitDrillPool, whistTrumpOrDiscardDrillPool, whistThirdHandHighDrillPool,
    whistReturnPartnerSuitDrillPool, whistOpeningLeadLessonPool, whistOddTrickDrillPool } from "../../whistLessons";
  import { savedWhistRunSummary } from "../../persistence/whistSave";
  import { emptyWhistScore, transitionWhistSession, type WhistSession } from "../../domain/whistSession";
  import { buildWhistOpeningLeadPracticeHand, whistOpeningLeadPracticeMaxRounds } from "./openingLeadPractice";
  import type { WhistFeature } from "./whistFeature";

  let { feature, completedSteps, history, nextSeed, onBack, onReference, onCompleteStep, onExerciseComplete, onSurfaceChange }: {
    feature: WhistFeature; completedSteps: Record<string, boolean>; nextSeed: () => number;
    history: PlayBarbuAttempt[];
    onBack: () => void; onReference: () => void; onCompleteStep: (id: string) => void;
    onExerciseComplete: (results: DrillResult[]) => void; onSurfaceChange: (fixed: boolean) => void;
  } = $props();
  let learningView = $state<"table" | "course" | "exercise" | "result" | "lead">("table");
  let course = $state<CourseContent | null>(null);
  let stage = $state<CourseStage>("concept");
  let steps = $state<DrillStep[]>([]);
  let index = $state(0);
  let selected = $state("");
  let checked = $state("");
  let results = $state<DrillResult[]>([]);
  let focus = $state<WhistPracticeAction>("follow");
  let practice = $state<WhistSession | null>(null);
  let leadRound = $state(0);
  let practiceError = $state("");
  let lastTap = { id: "", at: 0 };
  let completedCount = $derived(whistDef.learnSteps.filter(step => completedSteps[step.id]).length);
  let nextStep = $derived(whistDef.learnSteps.find(step => !completedSteps[step.id]));
  let recentAttempts = $derived(history.filter(attempt => attempt.results.length > 0 && attempt.results.every(result => result.contract === "Whist")).slice(0, 3));
  const pools: Record<WhistPracticeAction, DrillStep[]> = {
    lead: whistOpeningLeadLessonPool, follow: whistFollowSuitDrillPool, trump: whistTrumpOrDiscardDrillPool,
    third: whistThirdHandHighDrillPool, return: whistReturnPartnerSuitDrillPool, odd: whistOddTrickDrillPool
  };
  const names: Record<WhistPracticeAction, string> = {
    lead: "opening leads", follow: "follow suit", trump: "trump or discard", third: "third hand high",
    return: "return partner's suit", odd: "count odd tricks"
  };
  const actions = Object.fromEntries(Object.keys(pools).map(action => [action, () => startExercise(action as WhistPracticeAction)]));
  $effect(() => { onSurfaceChange($feature.view === "hand" || ["course", "exercise", "lead"].includes(learningView)); });

  function table() {
    learningView = "table";
    selected = "";
    lastTap = { id: "", at: 0 };
    feature.openTable();
  }

  function startStep(step: LearnPathStep) {
    course = courseCatalog.find(item => item.game === "whist" && item.pathStepId === step.id) ?? null;
    if (course) { stage = "concept"; learningView = "course"; }
    else startExercise(step.action as WhistPracticeAction);
  }

  function continueCourse() {
    if (!course) return;
    if (stage === "concept") stage = "example";
    else if (stage === "example" && course.practiceTarget.kind === "practice") startExercise(course.practiceTarget.action as WhistPracticeAction, true);
    else {
      onCompleteStep(course.pathStepId);
      table();
    }
  }

  function startLead(round: number) {
    leadRound = round;
    selected = "";
    lastTap = { id: "", at: 0 };
    practiceError = "";
    practice = { mode: "game", scores: emptyWhistScore(), games: emptyWhistScore(), results: [],
      fullHand: buildWhistOpeningLeadPracticeHand(round), fullHandReviewTrickCount: 0 };
    learningView = "lead";
  }

  function startExercise(action: WhistPracticeAction, fromCourse = false) {
    focus = action;
    if (!fromCourse) course = null;
    if (action === "lead" && !fromCourse) { startLead(0); return; }
    steps = orderPracticePool(pools[action], nextSeed());
    index = 0;
    selected = "";
    checked = "";
    results = [];
    learningView = "exercise";
  }

  function check() {
    const card = steps[index].trick.hand.find(card => card.id === selected);
    if (!card || checked) return;
    results = [...results, drillDecision(steps[index], card).result];
    checked = card.id;
  }

  function finish() {
    try { if (results.length) onExerciseComplete(results); } catch { /* Review remains available without storage. */ }
    if (course) { stage = "review"; learningView = "course"; }
    else learningView = "result";
  }

  function next() {
    if (index >= steps.length - 1) { finish(); return; }
    index += 1;
    selected = "";
    checked = "";
  }

  function playLead() {
    if (!practice || !practice.fullHand.legalCardIds.includes(selected)) return;
    try {
      practice = transitionWhistSession(practice, { type: "play-card", cardId: selected });
      selected = "";
      lastTap = { id: "", at: 0 };
    } catch (error) { practiceError = error instanceof Error ? error.message : "That card could not be played."; }
  }

  function selectLead(id: string) {
    if (!practice || practice.fullHandReviewTrickCount) return;
    const at = Date.now();
    const doubleTap = lastTap.id === id && at - lastTap.at < 450;
    selected = id;
    lastTap = { id, at };
    if (doubleTap) playLead();
  }
</script>

{#if $feature.view === "hand" && $feature.session}
  <WhistHandView session={$feature.session} selectedCardId={$feature.selectedCardId} error={$feature.error}
    dealing={$feature.dealing} onBack={table} onSelect={feature.select} onPlay={() => feature.play()}
    onNextTrick={feature.nextTrick} onNextHand={() => void feature.start(true)} onReplay={feature.replay} />
{:else if learningView === "course" && course}
  <CourseLesson {course} {stage} onBack={table} onContinue={continueCourse} />
{:else if learningView === "exercise"}
  <DrillScreen step={steps[index]} selectedCardId={selected} checkedCardId={checked} {results} total={steps.length} {index}
    title="Whist lesson" eyebrow="Whist" topic="Whist" onBack={table}
    onSelect={card => { if (!checked) selected = card.id; }} onCheck={check} onNext={next} onFinish={finish} />
{:else if learningView === "lead" && practice}
  <WhistHandView session={practice} selectedCardId={selected} error={practiceError} practiceRound={leadRound}
    onBack={table} onSelect={selectLead} onPlay={playLead} onReplay={() => startLead(leadRound)}
    onNextHand={() => startLead(leadRound)} onNextTrick={() => leadRound >= whistOpeningLeadPracticeMaxRounds - 1 ? table() : startLead(leadRound + 1)} />
{:else if learningView === "result"}
  <DrillResultScreen title={`Whist practice: ${names[focus]}`} {results} attempts={recentAttempts} onBack={table}
    message={results.length > 0 && results.every(result => result.clean) ? "Clean Whist practice. Keep reading partner, led suit, and trump before full hands arrive." : "Repeat the Whist pattern until follow-suit and trump decisions feel automatic."}>
    {#snippet actions()}
      <button class="primary-action" onclick={() => startExercise(focus)} type="button">Practice Whist again</button>
      <button class="secondary-action" onclick={table} type="button">Table</button>
    {/snippet}
    {#snippet footer()}<button class="primary-action" onclick={table} type="button">Back to Learn</button>{/snippet}
  </DrillResultScreen>
{:else}
  <GameTableShell table={whistDef.table} activeTab={$feature.tab} {onBack} onTabSelect={tab => feature.openTable(tab === "play" ? "play" : "learn")}>
    {#if $feature.tab === "learn"}
      <LearnPanel table={whistDef.table} steps={whistDef.learnSteps} {completedSteps} {completedCount} {nextStep}
        actions={[{ id: "reference", title: "Reference", summary: whistDef.table.learn.referenceSummary, onClick: onReference }]}
        onStepSelect={startStep} groups={whistDef.practiceGroups} exerciseActions={actions} />
    {:else}
      <PlayTabPanel table={whistDef.table} {...whistDef.playTabConfig} footerNote="You and Barbu play to 5 points against Left and Right."
        primaryDisabled={$feature.dealing} primaryWarning={$feature.error} onPrimary={() => void feature.start()}
        resumeLabel={$feature.saved ? "Continue Whist" : undefined} resumeNote={$feature.saved ? savedWhistRunSummary($feature.saved) : undefined}
        onResume={$feature.saved ? feature.resume : undefined}>
        <fieldset class="whist-session-options" role="radiogroup" aria-label="Whist session">
          <legend>Session</legend>
          <label><input type="radio" name="whist-session" value="game" checked={$feature.mode === "game"} onchange={() => feature.setMode("game")} /><span>Single game<small>First to 5 points</small></span></label>
          <label><input type="radio" name="whist-session" value="rubber" checked={$feature.mode === "rubber"} onchange={() => feature.setMode("rubber")} /><span>Rubber<small>Best of three games</small></span></label>
        </fieldset>
      </PlayTabPanel>
    {/if}
  </GameTableShell>
{/if}
