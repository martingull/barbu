<script lang="ts">
  import { untrack } from "svelte";
  import { createGuidedHandFeature } from "../guidedHandFeature";
  import { createSpadesSession, transitionSpadesSession } from "../../domain/spadesSession";
  import SpadesHandView from "./SpadesHandView.svelte";
  let { seed, onBack, onIndependentPlay }: { seed: number; onBack: () => void; onIndependentPlay: () => void } = $props();
  const feature = untrack(() => {
    const openingSeed = seed;
    return createGuidedHandFeature(openingSeed, { create: createSpadesSession,
      transition: transitionSpadesSession, replay: () => createSpadesSession(openingSeed) });
  });
</script>

<SpadesHandView session={$feature.session} selectedCardId={$feature.selectedCardId} error={$feature.error}
  dealing={false} guided {onBack} onSelect={feature.select}
  onPlay={() => feature.dispatch({ type: "play-card", cardId: $feature.selectedCardId })}
  onNextTrick={() => feature.dispatch({ type: "next-trick" })} onNextHand={onIndependentPlay} onReplay={feature.replay}
  onBid={bid => feature.dispatch({ type: "set-bid", bid })} onToggleBids={() => feature.dispatch({ type: "toggle-bids" })}
  onStartPlay={() => feature.dispatch({ type: "start-play" })} />
