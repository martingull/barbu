<script lang="ts">
  import GameLearning from "../GameLearning.svelte";
  import PlayTabPanel from "../../components/PlayTabPanel.svelte";
  import HeartsPassing from "./HeartsPassing.svelte";
  import HeartsHandView from "./HeartsHandView.svelte";
  import HeartsPassExercise from "./HeartsPassExercise.svelte";
  import HeartsGuidedHand from "./HeartsGuidedHand.svelte";
  import { heartsDef, heartsIntroduction, type HeartsPracticeAction } from "../../games/hearts";
  import { heartsIntroductionSteps } from "../../lessons/hearts/introduction";
  import { heartsLessonTakeaway } from "../../lessons/hearts/takeaways";
  import type { HeartsPracticeFocus } from "../../domain/heartsPractice";
  import { heartsPracticeSteps } from "../../lessons/hearts/exercises";
  import { savedHeartsRunSummary } from "../../persistence/heartsSave";
  import type { FeatureServices, LearningEntry } from "../featureServices";
  import type { HeartsFeature } from "./heartsFeature";

  let { feature, initialEntry, onEntryConsumed, onExploreBarbu, ...services }: FeatureServices & {
    feature: HeartsFeature; initialEntry?: LearningEntry; onEntryConsumed?: () => void; onExploreBarbu?: () => void;
  } = $props();
  let learningFixed = $state(false);
  let guidedSeed = $state<number | null>(null);
  $effect(() => { services.onSurfaceChange(guidedSeed !== null || $feature.view === "hand" || learningFixed); });
  function startGuidedHand() { guidedSeed = services.nextSeed(); }
  function endGuidedHand() { guidedSeed = null; learningFixed = false; feature.openTable("learn"); }
  function playWithoutGuidance() { guidedSeed = null; learningFixed = false; feature.openTable("play"); }
  const focuses: Record<Exclude<HeartsPracticeAction, "pass">, HeartsPracticeFocus> = {
    first: "first-trick", avoid: "avoid-hearts", queen: "queen-danger", break: "break-hearts", moon: "stop-moon", score: "score-hand"
  };
  const names: Record<HeartsPracticeAction, string> = {
    pass: "pass three", first: "opening trick rules", avoid: "avoid hearts", queen: "Queen of Spades danger",
    break: "break hearts", moon: "stop the moon", score: "score a hand"
  };
  function loadExercise(action: string, nextSeed: () => number) {
    const seed = nextSeed();
    if (action === "introduction" || action === "object") return heartsIntroductionSteps(seed);
    if (action === "pass") return { seed };
    const focus = focuses[action as Exclude<HeartsPracticeAction, "pass">];
    return heartsPracticeSteps(seed, focus);
  }
</script>

{#if guidedSeed !== null}
  <HeartsGuidedHand seed={guidedSeed} onBack={endGuidedHand} onIndependentPlay={playWithoutGuidance} />
{:else if $feature.view === "hand" && $feature.session}
  {#if $feature.session.phase === "passing"}
    <HeartsPassing session={$feature.session} error={$feature.error} onBack={() => feature.openTable()}
      onSelect={feature.selectPass} onPass={feature.pass} />
  {:else}
    <HeartsHandView session={$feature.session} selectedCardId={$feature.selectedCardId} error={$feature.error}
      dealing={$feature.dealing} onBack={() => feature.openTable()} onSelect={feature.select} onPlay={() => feature.play()}
      onNextTrick={feature.nextTrick} onNextHand={() => void feature.start(true)} onReplay={feature.replay} />
  {/if}
{:else}
  <GameLearning {...services} definition={heartsDef} gameName="Hearts" tab={$feature.tab}
    onGuidedPlay={startGuidedHand}
    entry={initialEntry} {onEntryConsumed}
    onIntroductionComplete={() => services.onCompleteStep(heartsIntroduction.id)}
    introductionRecommendation={onExploreBarbu ? { ...heartsIntroduction.recommendation, onOpen: onExploreBarbu } : undefined}
    onTab={tab => feature.openTable(tab === "play" ? "play" : "learn")} onSurfaceChange={fixed => { learningFixed = fixed; }}
    {loadExercise} exerciseTitle={action => action === "object" ? "Hearts basics" : `Hearts practice: ${names[action as HeartsPracticeAction]}`}
    drillTitle={step => step.title}
    resultMessage={(clean, action) => heartsLessonTakeaway(action, clean)}>
    {#snippet customExercise(context)}<HeartsPassExercise {context} />{/snippet}
    {#snippet play()}
      <PlayTabPanel table={heartsDef.table} {...heartsDef.playTabConfig}
        primaryDisabled={$feature.dealing} primaryWarning={$feature.error} onPrimary={() => void feature.start()}
        resumeLabel={$feature.saved ? "Continue Hearts" : undefined} resumeNote={$feature.saved ? savedHeartsRunSummary($feature.saved) : undefined}
        onResume={$feature.saved ? feature.resume : undefined} />
    {/snippet}
  </GameLearning>
{/if}
