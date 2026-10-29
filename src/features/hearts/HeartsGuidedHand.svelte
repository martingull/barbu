<script lang="ts">
  import { untrack } from "svelte";
  import { createHeartsSession, transitionHeartsSession, type HeartsSessionEvent } from "../../domain/heartsSession";
  import HeartsPassing from "./HeartsPassing.svelte";
  import HeartsHandView from "./HeartsHandView.svelte";
  import { createGuidedHandFeature } from "../guidedHandFeature";

  let { seed, onBack, onIndependentPlay }: { seed: number; onBack: () => void; onIndependentPlay: () => void } = $props();
  const feature = untrack(() => createGuidedHandFeature(seed, {
    create: createHeartsSession,
    transition: (session, event: HeartsSessionEvent) => transitionHeartsSession(session, event),
    replay: session => transitionHeartsSession(session, { type: "replay" })
  }));
</script>

{#if $feature.session.phase === "passing"}
  <HeartsPassing session={$feature.session} error={$feature.error} guided {onBack}
    onSelect={cardId => feature.dispatch({ type: "select-pass", cardId })} onPass={() => feature.dispatch({ type: "pass" })} />
{:else}
  <HeartsHandView session={$feature.session} selectedCardId={$feature.selectedCardId} error={$feature.error} dealing={false} guided {onBack}
    onSelect={feature.select} onPlay={() => feature.dispatch({ type: "play-card", cardId: $feature.selectedCardId })}
    onNextTrick={() => feature.dispatch({ type: "next-trick" })} onNextHand={onIndependentPlay}
    onReplay={feature.replay} />
{/if}
