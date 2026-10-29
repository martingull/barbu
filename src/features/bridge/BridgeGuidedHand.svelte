<script lang="ts">
  import { untrack } from "svelte";
  import { createGuidedHandFeature } from "../guidedHandFeature";
  import { createBridgeSession, transitionBridgeSession } from "../../domain/bridgeSession";
  import { bridgeAuctionStatus } from "../../domain/bridgeAuction";
  import { bridgeDealerIndex } from "./bridgePresentation";
  import BridgeAuction from "./BridgeAuction.svelte";
  import BridgeHandView from "./BridgeHandView.svelte";
  let { seed, onBack, onIndependentPlay, onSurfaceChange }: {
    seed: number; onBack: () => void; onIndependentPlay: () => void; onSurfaceChange: (fixed: boolean) => void;
  } = $props();
  const feature = untrack(() => {
    const openingSeed = seed;
    return createGuidedHandFeature(openingSeed, { create: createBridgeSession,
      transition: transitionBridgeSession, replay: () => createBridgeSession(openingSeed) });
  });
  $effect(() => { onSurfaceChange($feature.session.view === "fullHand"); });
  function confirm() {
    const status = bridgeAuctionStatus($feature.session.auctionCalls, bridgeDealerIndex($feature.session.fullHand));
    feature.dispatch({ type: status.complete ? "start-play" : "make-call" });
  }
</script>

{#if $feature.session.view === "bridgeAuction"}
  <BridgeAuction session={$feature.session} error={$feature.error} dealing={false} guided {onBack}
    onSelectCall={call => feature.dispatch({ type: "select-call", call })} onConfirm={confirm}
    onReplay={feature.replay} {onIndependentPlay} />
{:else}
  <BridgeHandView session={$feature.session} selectedCardId={$feature.selectedCardId} error={$feature.error}
    dealing={false} guided {onBack} onSelect={feature.select}
    onPlay={() => feature.dispatch({ type: "play-card", cardId: $feature.selectedCardId })}
    onNextTrick={() => feature.dispatch({ type: "next-trick" })} onNextHand={onIndependentPlay} onReplay={feature.replay} />
{/if}
