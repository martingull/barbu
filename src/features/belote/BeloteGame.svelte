<script lang="ts">
  import GameLearning from "../GameLearning.svelte";
  import PlayTabPanel from "../../components/PlayTabPanel.svelte";
  import BeloteHandView from "./BeloteHandView.svelte";
  import BeloteExercise from "./BeloteExercise.svelte";
  import BeloteGuidedHand from "./BeloteGuidedHand.svelte";
  import { beloteDef } from "../../games/belote";
  import type { FeatureServices } from "../featureServices";
  import type { BeloteFeature } from "./beloteFeature";
  let { feature, ...services }: FeatureServices & { feature: BeloteFeature } = $props();
  let learningFixed = $state(false);
  let guidedSeed = $state<number | null>(null);
  $effect(() => { services.onSurfaceChange(guidedSeed !== null || $feature.view === "hand" || learningFixed); });
  function endGuided(tab: "learn" | "play") { guidedSeed = null; learningFixed = false; feature.openTable(tab); }
</script>
{#if guidedSeed !== null}
  <BeloteGuidedHand seed={guidedSeed} onBack={() => endGuided("learn")} onIndependentPlay={() => endGuided("play")} />
{:else if $feature.view === "hand" && $feature.session}
  <BeloteHandView session={$feature.session} selectedCardId={$feature.selectedCardId} error={$feature.error} onSelect={feature.select} onAction={feature.act}
    onBack={() => feature.openTable()} onNext={() => void feature.start(true)} onReplay={feature.replay} onNew={() => void feature.start()} />
{:else}
  <GameLearning {...services} definition={beloteDef} gameName="Belote" tab={$feature.tab} onGuidedPlay={() => { guidedSeed = services.nextSeed(); }}
    onTab={tab => feature.openTable(tab === "play" ? "play" : "learn")} onSurfaceChange={fixed => { learningFixed = fixed; }} loadExercise={() => ({ seed: 0 })}
    exerciseTitle={() => "Belote"} drillTitle={step => step.trick.title}
    resultMessage={clean => clean ? "Bring this skill to a guided deal or continue learning." : "Review the decisions, then try another example."}>
    {#snippet customExercise(context)}<BeloteExercise {context} />{/snippet}
    {#snippet play()}<PlayTabPanel table={beloteDef.table} {...beloteDef.playTabConfig} primaryWarning={$feature.error} primaryDisabled={$feature.dealing}
      onPrimary={() => void feature.start()} resumeLabel={$feature.saved ? "Continue Belote" : undefined} onResume={$feature.saved ? feature.resume : undefined} />{/snippet}
  </GameLearning>
{/if}
