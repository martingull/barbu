<script lang="ts">
  import GameLearning from "../GameLearning.svelte";
  import PlayTabPanel from "../../PlayTabPanel.svelte";
  import SpadesHandView from "./SpadesHandView.svelte";
  import { spadesDef, type SpadesPracticeAction } from "../../games/spades";
  import { spadesMatchTarget } from "../../spadesScoring";
  import { orderPracticePool, type DrillStep } from "../../lessons/drillDecision";
  import { spadesFollowSuitDrillPool, spadesTrumpOrDiscardDrillPool, spadesBidBooksDrillPool, spadesAvoidBagsDrillPool } from "../../spadesLessons";
  import { savedSpadesRunSummary } from "./spadesPresentation";
  import type { FeatureServices } from "../featureServices";
  import type { SpadesFeature } from "./spadesFeature";
  let { feature, ...services }: FeatureServices & { feature: SpadesFeature } = $props();
  let learningFixed = $state(false);
  $effect(() => { services.onSurfaceChange($feature.view === "hand" || learningFixed); });
  const pools: Record<SpadesPracticeAction, DrillStep[]> = {
    follow: spadesFollowSuitDrillPool, trump: spadesTrumpOrDiscardDrillPool, bid: spadesBidBooksDrillPool, bags: spadesAvoidBagsDrillPool
  };
  const names: Record<SpadesPracticeAction, string> = { follow: "follow suit", trump: "trump or discard", bid: "bid books", bags: "avoid bags" };
</script>

{#if $feature.view === "hand" && $feature.session}
  <SpadesHandView session={$feature.session} selectedCardId={$feature.selectedCardId} error={$feature.error}
    dealing={$feature.dealing} onBack={() => feature.openTable()} onSelect={feature.select} onPlay={() => feature.play()}
    onNextTrick={feature.nextTrick} onNextHand={() => void feature.start(true)} onReplay={feature.replay}
    onBid={feature.setBid} onToggleBids={feature.toggleBids} onStartPlay={feature.startPlay} />
{:else}
  <GameLearning {...services} definition={spadesDef} gameName="Spades" tab={$feature.tab}
    onTab={tab => feature.openTable(tab === "play" ? "play" : "learn")} onSurfaceChange={fixed => { learningFixed = fixed; }}
    loadExercise={(action, seed) => orderPracticePool(pools[action as SpadesPracticeAction], seed())}
    exerciseTitle={action => `Spades practice: ${names[action as SpadesPracticeAction]}`} drillTitle={() => "Spades lesson"} drillEyebrow="Spades"
    resultMessage={clean => clean ? "Clean Spades practice. Keep reading the bid, trump, nil, and bags before full hands arrive." : "Repeat the Spades pattern until bid-aware trick decisions feel automatic."}>
    {#snippet play()}
      <PlayTabPanel table={spadesDef.table} {...spadesDef.playTabConfig}
        footerNote={`Individual bids, nil, bags, and ten-bag penalties score locally. Play to ${spadesMatchTarget}.`}
        primaryDisabled={$feature.dealing} primaryWarning={$feature.error} onPrimary={() => void feature.start()}
        resumeLabel={$feature.saved ? "Continue Spades" : undefined} resumeNote={$feature.saved ? savedSpadesRunSummary($feature.saved) : undefined}
        onResume={$feature.saved ? feature.resume : undefined} />
    {/snippet}
  </GameLearning>
{/if}
