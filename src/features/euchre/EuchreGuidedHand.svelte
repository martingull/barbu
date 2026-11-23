<script lang="ts">
  import { untrack } from "svelte";
  import { createGuidedHandFeature } from "../guidedHandFeature";
  import { createEuchreGuidedSession, transitionEuchreGuidedSession, replayEuchreGuidedSession } from "../../domain/euchreLearning";
  import EuchreHandView from "./EuchreHandView.svelte";
  let { seed, onBack, onIndependentPlay }: { seed: number; onBack: () => void; onIndependentPlay: () => void } = $props();
  const feature = untrack(() => createGuidedHandFeature(seed, {
    create: createEuchreGuidedSession, transition: transitionEuchreGuidedSession, replay: replayEuchreGuidedSession
  }));
</script>

<EuchreHandView session={$feature.session.session} selectedCardId={$feature.selectedCardId} error={$feature.error} guided
  onSelect={feature.select} onAction={action => { if (action.type !== "next-hand") feature.dispatch(action); }}
  {onBack} onNext={onIndependentPlay} onReplay={feature.replay} onNew={onIndependentPlay} />
