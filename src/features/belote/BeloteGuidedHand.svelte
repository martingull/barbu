<script lang="ts">
  import { untrack } from "svelte";
  import { createGuidedHandFeature } from "../guidedHandFeature";
  import { createBeloteGuidedSession, transitionBeloteGuidedSession, replayBeloteGuidedSession } from "../../domain/beloteLearning";
  import BeloteHandView from "./BeloteHandView.svelte";
  let { seed, onBack, onIndependentPlay }: { seed: number; onBack: () => void; onIndependentPlay: () => void } = $props();
  const feature = untrack(() => createGuidedHandFeature(seed, { create: createBeloteGuidedSession, transition: transitionBeloteGuidedSession, replay: replayBeloteGuidedSession }));
</script>
<BeloteHandView session={$feature.session} selectedCardId={$feature.selectedCardId} error={$feature.error} guided
  onSelect={feature.select} onAction={feature.dispatch} {onBack} onNext={onIndependentPlay} onReplay={feature.replay} onNew={onIndependentPlay} />
