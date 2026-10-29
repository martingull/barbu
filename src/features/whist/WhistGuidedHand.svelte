<script lang="ts">
  import { untrack } from "svelte";
  import { createGuidedHandFeature } from "../guidedHandFeature";
  import { createWhistSession, transitionWhistSession } from "../../domain/whistSession";
  import WhistHandView from "./WhistHandView.svelte";
  let { seed, onBack, onIndependentPlay }: { seed: number; onBack: () => void; onIndependentPlay: () => void } = $props();
  const feature = untrack(() => {
    const openingSeed = seed;
    return createGuidedHandFeature(openingSeed, { create: createWhistSession,
      transition: transitionWhistSession, replay: () => createWhistSession(openingSeed) });
  });
</script>

<WhistHandView session={$feature.session} selectedCardId={$feature.selectedCardId} error={$feature.error}
  guided {onBack} onSelect={feature.select}
  onPlay={() => feature.dispatch({ type: "play-card", cardId: $feature.selectedCardId })}
  onNextTrick={() => feature.dispatch({ type: "next-trick" })} onNextHand={onIndependentPlay} onReplay={feature.replay} />
