<script lang="ts">
  import GameLearning from "../GameLearning.svelte";
  import PlayTabPanel from "../../components/PlayTabPanel.svelte";
  import GinHandView from "./GinHandView.svelte";
  import GinExercise from "./GinExercise.svelte";
  import { ginRummyDef } from "../../games/ginRummy";
  import type { FeatureServices } from "../featureServices";
  import type { GinRummyFeature } from "./ginRummyFeature";
  let { feature, ...services }: FeatureServices & { feature: GinRummyFeature } = $props();
  let learningFixed = $state(false);
  $effect(() => { services.onSurfaceChange($feature.view === "hand" && $feature.session?.hand.phase !== "complete" || learningFixed); });
</script>

{#if $feature.view === "hand" && $feature.session}
  <GinHandView session={$feature.session} selectedCardId={$feature.selectedCardId} error={$feature.error}
    onSelect={feature.select} onAction={feature.act} onBack={() => feature.openTable()} onNext={() => void feature.start(true)}
    onReplay={feature.replay} onNew={() => void feature.start()} />
{:else}
  <GameLearning {...services} definition={ginRummyDef} gameName="Gin Rummy" tab={$feature.tab}
    onTab={tab => feature.openTable(tab === "play" ? "play" : "learn")} onSurfaceChange={fixed => { learningFixed = fixed; }}
    loadExercise={() => ({ seed: 0 })} exerciseTitle={() => "Gin Rummy"} drillTitle={step => step.trick.title} resultMessage={() => "Try your skills in a full hand."}>
    {#snippet customExercise(context)}<GinExercise {context} />{/snippet}
    {#snippet play()}
      <PlayTabPanel table={ginRummyDef.table} {...ginRummyDef.playTabConfig} primaryWarning={$feature.error} primaryDisabled={$feature.dealing}
        onPrimary={() => void feature.start()} resumeLabel={$feature.saved ? "Continue Gin Rummy" : undefined}
        onResume={$feature.saved ? feature.resume : undefined} />
    {/snippet}
  </GameLearning>
{/if}
