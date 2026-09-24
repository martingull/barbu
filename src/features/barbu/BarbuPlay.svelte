<script lang="ts">
  import BarbuContractIntro from "./BarbuContractIntro.svelte";
  import BarbuHandView from "./BarbuHandView.svelte";
  import DominoHandView from "./DominoHandView.svelte";
  import { runWeakestContract } from "./barbuPresentation";
  import type { FullHandContract } from "../../lessonTypes";
  import type { BarbuFeature } from "./barbuFeature";
  let { feature, onBack, onStandaloneHand }: {
    feature: BarbuFeature; onBack: () => void; onStandaloneHand: (contract: FullHandContract) => void;
  } = $props();
  function replayWeakest() {
    const weakest = runWeakestContract($feature.session?.results ?? []);
    if (weakest) onStandaloneHand(weakest.contract);
  }
</script>

{#if $feature.session}
  {@const session = $feature.session}
  {#if session.view === "runContractIntro"}
    <BarbuContractIntro {session} error={$feature.error} dealing={$feature.dealing} {onBack} onStart={feature.startHand} />
  {:else if session.view === "fullHand" && session.fullHand}
    <BarbuHandView {session} hand={session.fullHand} reviewCount={session.fullHandReviewTrickCount}
      selectedCardId={$feature.selectedCardId} error={$feature.error} dealing={$feature.dealing}
      {onBack} onSelect={feature.select} onPlay={() => feature.play()} onNextTrick={feature.nextTrick}
      onNextHand={feature.nextContract} onReplay={feature.replay} onReplayWeakest={replayWeakest} onNewGame={() => void feature.start()} />
  {:else if session.dominoHand}
    <DominoHandView {session} dominoHand={session.dominoHand} dominoSelectedCardId={$feature.selectedCardId}
      dominoError={$feature.error} dominoLastMoveReason={$feature.lastMoveReason}
      {onBack} onSelect={feature.select} onFocus={feature.focus} onPlace={feature.place} onPass={feature.pass}
      onNextHand={feature.nextContract} onReplay={feature.replay} onReplayWeakest={replayWeakest} onNewGame={() => void feature.start()} />
  {/if}
{/if}
