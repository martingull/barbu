<script lang="ts">
  import { untrack } from "svelte";
  import { createGuidedHandFeature } from "../guidedHandFeature";
  import { createGinGuidedSession, transitionGinGuidedSession, replayGinGuidedSession } from "../../domain/ginRummyLearning";
  import GinHandView from "./GinHandView.svelte";

  let { seed, onBack, onIndependentPlay }: { seed: number; onBack: () => void; onIndependentPlay: () => void } = $props();
  const feature = untrack(() => createGuidedHandFeature(seed, {
    create: createGinGuidedSession, transition: transitionGinGuidedSession, replay: replayGinGuidedSession
  }));
</script>

<GinHandView session={$feature.session.session} selectedCardId={$feature.selectedCardId} error={$feature.error}
  guided={$feature.session} onSelect={feature.select}
  onAction={action => { if (action.type !== "next") feature.dispatch(action); }}
  onContinue={() => feature.dispatch({ type: "continue" })} {onBack}
  onReplay={feature.replay} onNext={onIndependentPlay} onNew={onIndependentPlay} />
