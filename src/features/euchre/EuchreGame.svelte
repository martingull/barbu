<script lang="ts">
  import GameLearning from "../GameLearning.svelte";
  import PlayTabPanel from "../../components/PlayTabPanel.svelte";
  import EuchreHandView from "./EuchreHandView.svelte";
  import EuchreExercise from "./EuchreExercise.svelte";
  import EuchreGuidedHand from "./EuchreGuidedHand.svelte";
  import { euchreDef } from "../../games/euchre";
  import type { FeatureServices } from "../featureServices";
  import type { EuchreFeature } from "./euchreFeature";
  let { feature, ...services }: FeatureServices & { feature: EuchreFeature } = $props();
  let learningFixed = $state(false);
  let guidedSeed = $state<number | null>(null);
  $effect(() => { services.onSurfaceChange(guidedSeed !== null || $feature.view === "hand" || learningFixed); });
  function endGuided(tab: "learn" | "play") { guidedSeed = null; learningFixed = false; feature.openTable(tab); }
</script>

{#if guidedSeed !== null}
  <EuchreGuidedHand seed={guidedSeed} onBack={() => endGuided("learn")} onIndependentPlay={() => endGuided("play")} />
{:else if $feature.view === "hand" && $feature.session}
  <EuchreHandView session={$feature.session} selectedCardId={$feature.selectedCardId} error={$feature.error}
    onSelect={feature.select} onAction={feature.act} onBack={() => feature.openTable()}
    onNext={() => void feature.start(true)} onReplay={feature.replay} onNew={() => void feature.start()} />
{:else}
  <GameLearning {...services} definition={euchreDef} gameName="Euchre" tab={$feature.tab}
    onGuidedPlay={() => { guidedSeed = services.nextSeed(); }} onTab={tab => feature.openTable(tab === "play" ? "play" : "learn")}
    onSurfaceChange={fixed => { learningFixed = fixed; }} loadExercise={() => ({ seed: 0 })}
    exerciseTitle={() => "Euchre"} drillTitle={step => step.trick.title}
    resultMessage={clean => clean ? "Take this skill into a guided hand, or continue learning." : "Review the choices, then try a different example."}>
    {#snippet customExercise(context)}<EuchreExercise {context} />{/snippet}
    {#snippet play()}
      <PlayTabPanel table={euchreDef.table} {...euchreDef.playTabConfig} primaryWarning={$feature.error} primaryDisabled={$feature.dealing}
        onPrimary={() => void feature.start()} resumeLabel={$feature.saved ? "Continue Euchre" : undefined} onResume={$feature.saved ? feature.resume : undefined} />
    {/snippet}
  </GameLearning>
{/if}
