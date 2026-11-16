<script lang="ts">
  import { untrack } from "svelte";
  import { createGuidedHandFeature } from "../guidedHandFeature";
  import { createCanastaGuidedSession, transitionCanastaGuidedSession, replayCanastaGuidedSession } from "../../domain/canastaLearning";
  import CanastaHandView from "./CanastaHandView.svelte";
  let { seed, onBack, onIndependentPlay }: { seed: number; onBack: () => void; onIndependentPlay: () => void } = $props();
  const feature = untrack(() => createGuidedHandFeature(seed, {
    create: createCanastaGuidedSession, transition: transitionCanastaGuidedSession, replay: replayCanastaGuidedSession
  }));
</script>

<CanastaHandView session={$feature.session.session} error={$feature.error} guided={$feature.session}
  onAction={action => {
    if (action.type === "next") return false;
    feature.dispatch(action);
    return !$feature.error;
  }} onContinue={() => feature.dispatch({ type: "continue" })} {onBack}
  onReplay={feature.replay} onNext={onIndependentPlay} onNew={onIndependentPlay} />
