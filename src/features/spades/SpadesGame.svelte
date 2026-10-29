<script lang="ts">
  import GameLearning from "../GameLearning.svelte";
  import PlayTabPanel from "../../components/PlayTabPanel.svelte";
  import SpadesHandView from "./SpadesHandView.svelte";
  import SpadesGuidedHand from "./SpadesGuidedHand.svelte";
  import { spadesDef, type SpadesPracticeAction } from "../../games/spades";
  import { spadesMatchTarget } from "../../domain/spadesScoring";
  import { spadesLearningSteps, spadesTakeaway } from "../../lessons/spades/learning";
  import { savedSpadesRunSummary } from "./spadesPresentation";
  import type { FeatureServices } from "../featureServices";
  import type { SpadesFeature } from "./spadesFeature";
  let { feature, ...services }: FeatureServices & { feature: SpadesFeature } = $props();
  let learningFixed = $state(false);
  let guidedSeed = $state<number | null>(null);
  $effect(() => { services.onSurfaceChange(guidedSeed !== null || $feature.view === "hand" || learningFixed); });
  function endGuidedHand(tab: "learn" | "play") { guidedSeed = null; learningFixed = false; feature.openTable(tab); }
  const names: Record<SpadesPracticeAction, string> = { follow: "follow suit", trump: "trump or discard", bid: "bid books", bags: "avoid bags" };
</script>

{#if guidedSeed !== null}
  <SpadesGuidedHand seed={guidedSeed} onBack={() => endGuidedHand("learn")} onIndependentPlay={() => endGuidedHand("play")} />
{:else if $feature.view === "hand" && $feature.session}
  <SpadesHandView session={$feature.session} selectedCardId={$feature.selectedCardId} error={$feature.error}
    dealing={$feature.dealing} onBack={() => feature.openTable()} onSelect={feature.select} onPlay={() => feature.play()}
    onNextTrick={feature.nextTrick} onNextHand={() => void feature.start(true)} onReplay={feature.replay}
    onBid={feature.setBid} onToggleBids={feature.toggleBids} onStartPlay={feature.startPlay} />
{:else}
  <GameLearning {...services} definition={spadesDef} gameName="Spades" tab={$feature.tab}
    onGuidedPlay={() => { guidedSeed = services.nextSeed(); }}
    onTab={tab => feature.openTable(tab === "play" ? "play" : "learn")} onSurfaceChange={fixed => { learningFixed = fixed; }}
    loadExercise={action => spadesLearningSteps(action as SpadesPracticeAction)}
    exerciseTitle={action => `Spades practice: ${names[action as SpadesPracticeAction]}`} drillTitle={() => "Spades lesson"} drillEyebrow="Spades"
    resultMessage={(_clean, action) => spadesTakeaway(action)}>
    {#snippet play()}
      <PlayTabPanel table={spadesDef.table} {...spadesDef.playTabConfig}
        footerNote={`Individual bids, nil, bags, and ten-bag penalties score locally. Play to ${spadesMatchTarget}.`}
        primaryDisabled={$feature.dealing} primaryWarning={$feature.error} onPrimary={() => void feature.start()}
        resumeLabel={$feature.saved ? "Continue Spades" : undefined} resumeNote={$feature.saved ? savedSpadesRunSummary($feature.saved) : undefined}
        onResume={$feature.saved ? feature.resume : undefined} />
    {/snippet}
  </GameLearning>
{/if}
