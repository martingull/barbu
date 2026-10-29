<script lang="ts">
  import GameLearning from "../GameLearning.svelte";
  import PlayTabPanel from "../../components/PlayTabPanel.svelte";
  import BridgeAuction from "./BridgeAuction.svelte";
  import BridgeHandView from "./BridgeHandView.svelte";
  import BridgeChoiceExercise from "./BridgeChoiceExercise.svelte";
  import BridgeGuidedHand from "./BridgeGuidedHand.svelte";
  import { bridgeDef } from "../../games/bridge";
  import { bridgeLearningSteps, bridgeTakeaway } from "../../lessons/bridge/learning";
  import { compassSeatLabels } from "../../presentation/cardDisplay";
  import { savedBridgeRunSummary } from "./bridgePresentation";
  import type { FeatureServices } from "../featureServices";
  import type { BridgeFeature } from "./bridgeFeature";
  let { feature, ...services }: FeatureServices & { feature: BridgeFeature } = $props();
  let learningFixed = $state(false);
  let guidedSeed = $state<number | null>(null);
  let guidedFixed = $state(false);
  $effect(() => { services.onSurfaceChange(guidedSeed !== null ? guidedFixed : $feature.view === "hand" ? $feature.session?.view === "fullHand" : learningFixed); });
  function leaveGuided(tab: "learn" | "play") {
    guidedSeed = null; guidedFixed = false; learningFixed = false; feature.openTable(tab);
  }
  const names: Record<string, string> = { contracts: "contracts", dummy: "dummy", bidding: "bidding", declarer: "declarer play", defense: "defense" };
</script>

{#if guidedSeed !== null}
  <BridgeGuidedHand seed={guidedSeed} onBack={() => leaveGuided("learn")}
    onIndependentPlay={() => leaveGuided("play")} onSurfaceChange={fixed => { guidedFixed = fixed; }} />
{:else if $feature.view === "hand" && $feature.session}
  {#if $feature.session.view === "bridgeAuction"}
    <BridgeAuction session={$feature.session} error={$feature.error} dealing={$feature.dealing}
      onBack={() => feature.openTable()} onSelectCall={feature.selectCall} onConfirm={() => void feature.confirmAuction()} />
  {:else}
    <BridgeHandView session={$feature.session} selectedCardId={$feature.selectedCardId} error={$feature.error} dealing={$feature.dealing}
      onBack={() => feature.openTable()} onSelect={feature.select} onPlay={() => feature.play()}
      onNextTrick={feature.nextTrick} onNextHand={() => void feature.start(true)} onReplay={feature.replay} />
  {/if}
{:else}
  <GameLearning {...services} definition={bridgeDef} gameName="Bridge" tab={$feature.tab}
    onTab={tab => feature.openTable(tab === "play" ? "play" : "learn")} onSurfaceChange={fixed => { learningFixed = fixed; }}
    loadExercise={action => action === "bidding" || action === "contracts" ? { seed: 0 }
      : bridgeLearningSteps(action === "dummy" ? "dummy" : action === "defense" ? "defense" : "declarer")}
    exerciseTitle={action => `Bridge practice: ${names[action]}`} drillTitle={() => "Bridge lesson"} drillEyebrow="Bridge" seatLabels={compassSeatLabels}
    onGuidedPlay={() => { guidedSeed = services.nextSeed(); }} resultMessage={(_, action) => bridgeTakeaway(action)}>
    {#snippet customExercise(context)}
      <BridgeChoiceExercise {context} />
    {/snippet}
    {#snippet play()}
      <PlayTabPanel table={bridgeDef.table} {...bridgeDef.playTabConfig}
        footerNote="Natural bidding: five-card majors, better minor, 15-17 1NT, strong 2C."
        primaryDisabled={$feature.dealing} primaryWarning={$feature.error} onPrimary={() => void feature.start()}
        resumeLabel={$feature.saved ? "Continue Bridge" : undefined} resumeNote={$feature.saved ? savedBridgeRunSummary($feature.saved) : undefined}
        onResume={$feature.saved ? feature.resume : undefined} />
    {/snippet}
  </GameLearning>
{/if}
