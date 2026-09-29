<script lang="ts">
  import GameLearning from "../GameLearning.svelte";
  import PlayTabPanel from "../../components/PlayTabPanel.svelte";
  import CanastaHandView from "./CanastaHandView.svelte";
  import CanastaExercise from "./CanastaExercise.svelte";
  import { canastaDef } from "../../games/canasta";
  import type { FeatureServices } from "../featureServices";
  import type { CanastaFeature } from "./canastaFeature";
  let { feature, ...services }: FeatureServices & { feature: CanastaFeature } = $props();
  let learningFixed = $state(false);
  $effect(() => { services.onSurfaceChange($feature.view === "hand" && $feature.session?.hand.phase !== "complete" || learningFixed); });
</script>
{#if $feature.view === "hand" && $feature.session}
  <CanastaHandView session={$feature.session} error={$feature.error} onAction={feature.act} onBack={() => feature.openTable()}
    onNext={() => void feature.start(true)} onReplay={feature.replay} onNew={() => void feature.start()} />
{:else}
  <GameLearning {...services} definition={canastaDef} gameName="Canasta" tab={$feature.tab}
    onTab={tab => feature.openTable(tab === "play" ? "play" : "learn")} onSurfaceChange={fixed => { learningFixed = fixed; }}
    loadExercise={() => ({ seed: 0 })} exerciseTitle={() => "Canasta"} drillTitle={step => step.trick.title} resultMessage={() => "Bring these decisions to the table."}>
    {#snippet customExercise(context)}<CanastaExercise {context} />{/snippet}
    {#snippet play()}
      <PlayTabPanel table={canastaDef.table} {...canastaDef.playTabConfig} primaryWarning={$feature.error} primaryDisabled={$feature.dealing}
        onPrimary={() => void feature.start()} resumeLabel={$feature.saved ? "Continue Canasta" : undefined} onResume={$feature.saved ? feature.resume : undefined} />
    {/snippet}
  </GameLearning>
{/if}
