<script lang="ts">
  import GameLearning from "../GameLearning.svelte";
  import PlayTabPanel from "../../PlayTabPanel.svelte";
  import BridgeAuction from "./BridgeAuction.svelte";
  import BridgeHandView from "./BridgeHandView.svelte";
  import BridgeBiddingPractice from "./BridgeBiddingPractice.svelte";
  import { bridgeDef } from "../../games/bridge";
  import { bridgeDeclarerDrillPool, bridgeDefenseDrillPool } from "../../bridgePractice";
  import { orderPracticePool } from "../../lessons/drillDecision";
  import { compassSeatLabels } from "../../cardDisplay";
  import { savedBridgeRunSummary } from "./bridgePresentation";
  import type { FeatureServices } from "../featureServices";
  import type { BridgeFeature } from "./bridgeFeature";
  let { feature, ...services }: FeatureServices & { feature: BridgeFeature } = $props();
  let learningFixed = $state(false);
  $effect(() => { services.onSurfaceChange($feature.view === "hand" ? $feature.session?.view === "fullHand" : learningFixed); });
  const names: Record<string, string> = { bidding: "bidding", declarer: "declarer play", defense: "defense" };
</script>

{#if $feature.view === "hand" && $feature.session}
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
    loadExercise={(action, seed) => action === "bidding" ? { seed: 0 } : orderPracticePool(action === "defense" ? bridgeDefenseDrillPool : bridgeDeclarerDrillPool, seed())}
    exerciseTitle={action => `Bridge practice: ${names[action]}`} drillTitle={() => "Bridge lesson"} drillEyebrow="Bridge" seatLabels={compassSeatLabels}
    resultMessage={clean => clean ? "Clean Bridge practice. Keep planning declarer play, using dummy, and defending 1NT." : "Repeat the Bridge pattern until dummy, declarer, and defensive plans feel automatic."}>
    {#snippet customExercise(context)}<BridgeBiddingPractice onBack={context.onBack} onComplete={context.onComplete} />{/snippet}
    {#snippet play()}
      <PlayTabPanel table={bridgeDef.table} {...bridgeDef.playTabConfig}
        footerNote="Bridge uses a basic natural auction: five-card majors, better minor, 15-17 1NT, strong 2C, declarer, dummy, opening lead, vulnerability, and duplicate scoring."
        primaryDisabled={$feature.dealing} primaryWarning={$feature.error} onPrimary={() => void feature.start()}
        resumeLabel={$feature.saved ? "Continue Bridge" : undefined} resumeNote={$feature.saved ? savedBridgeRunSummary($feature.saved) : undefined}
        onResume={$feature.saved ? feature.resume : undefined} />
    {/snippet}
  </GameLearning>
{/if}
