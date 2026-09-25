<script lang="ts">
  import GameLearning from "../GameLearning.svelte";
  import PlayTabPanel from "../../components/PlayTabPanel.svelte";
  import HeartsPassing from "./HeartsPassing.svelte";
  import HeartsHandView from "./HeartsHandView.svelte";
  import HeartsPassExercise from "./HeartsPassExercise.svelte";
  import { heartsDef, type HeartsPracticeAction } from "../../games/hearts";
  import { generateHeartsPracticeSet, type HeartsPracticeFocus } from "../../domain/heartsPractice";
  import { orderPracticePool } from "../../lessons/drillDecision";
  import { drillStepFromGeneratedScenario } from "../../lessons/generatedDrill";
  import { savedHeartsRunSummary } from "../../persistence/heartsSave";
  import type { FeatureServices } from "../featureServices";
  import type { HeartsFeature } from "./heartsFeature";

  let { feature, ...services }: FeatureServices & { feature: HeartsFeature } = $props();
  let learningFixed = $state(false);
  $effect(() => { services.onSurfaceChange($feature.view === "hand" || learningFixed); });
  const focuses: Record<Exclude<HeartsPracticeAction, "pass">, HeartsPracticeFocus> = {
    first: "first-trick", avoid: "avoid-hearts", queen: "queen-danger", break: "break-hearts", moon: "stop-moon", score: "score-hand"
  };
  const names: Record<HeartsPracticeAction, string> = {
    pass: "pass three", first: "first trick", avoid: "avoid hearts", queen: "Queen of Spades danger",
    break: "break hearts", moon: "stop the moon", score: "score a hand"
  };
  function loadExercise(action: string, nextSeed: () => number) {
    const seed = nextSeed();
    if (action === "pass") return { seed };
    const focus = focuses[action as Exclude<HeartsPracticeAction, "pass">];
    const steps = generateHeartsPracticeSet(seed, focus).scenarios.map(drillStepFromGeneratedScenario);
    return focus === "break-hearts" ? steps : orderPracticePool(steps, seed);
  }
</script>

{#if $feature.view === "hand" && $feature.session}
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
    onTab={tab => feature.openTable(tab === "play" ? "play" : "learn")} onSurfaceChange={fixed => { learningFixed = fixed; }}
    {loadExercise} exerciseTitle={action => `Hearts practice: ${names[action as HeartsPracticeAction]}`}
    drillTitle={step => step.trick.title}
    resultMessage={clean => clean ? "Each decision matched this lesson's goal. Try the same skill in a full Hearts hand." : "Review the feedback for the decisions you missed, then try this Hearts skill again."}>
    {#snippet customExercise(context)}<HeartsPassExercise {context} />{/snippet}
    {#snippet play()}
      <PlayTabPanel table={heartsDef.table} {...heartsDef.playTabConfig}
        primaryDisabled={$feature.dealing} primaryWarning={$feature.error} onPrimary={() => void feature.start()}
        resumeLabel={$feature.saved ? "Continue Hearts" : undefined} resumeNote={$feature.saved ? savedHeartsRunSummary($feature.saved) : undefined}
        onResume={$feature.saved ? feature.resume : undefined} />
    {/snippet}
  </GameLearning>
{/if}
