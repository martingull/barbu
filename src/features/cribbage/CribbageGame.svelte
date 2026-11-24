<script lang="ts">
  import { untrack } from "svelte";
  import GameLearning from "../GameLearning.svelte";
  import PlayTabPanel from "../../components/PlayTabPanel.svelte";
  import CribbageHandView from "./CribbageHandView.svelte";
  import CribbageExercise from "./CribbageExercise.svelte";
  import CribbagePointsSheet from "./CribbagePointsSheet.svelte";
  import { cribbageDef } from "../../games/cribbage";
  import { createCribbageFeature, type CribbageFeature } from "./cribbageFeature";
  import type { FeatureServices } from "../featureServices";
  let { feature, ...services }: FeatureServices & { feature: CribbageFeature } = $props();
  let learningFixed = $state(false);
  let guided = $state(false);
  let pointsOpen = $state(false);
  const guidedFeature = untrack(() => createCribbageFeature({ storage: () => undefined, nextSeed: services.nextSeed }));
  let savedDiscards = $derived(feature.discards);
  const guidedDiscards = guidedFeature.discards;
  $effect(() => { services.onSurfaceChange(guided || $feature.view === "hand" || learningFixed); });
  function endGuided(tab: "learn" | "play") { guided = false; learningFixed = false; feature.openTable(tab); }
</script>

{#if guided && $guidedFeature.session}
  <CribbageHandView session={$guidedFeature.session} selectedCardId={$guidedFeature.selectedCardId} discards={$guidedDiscards} error={$guidedFeature.error} guided
    onSelect={guidedFeature.select} onAction={guidedFeature.act} onBack={() => endGuided("learn")} onNew={() => void guidedFeature.start()} onIndependentPlay={() => endGuided("play")} />
{:else if $feature.view === "hand" && $feature.session}
  <CribbageHandView session={$feature.session} selectedCardId={$feature.selectedCardId} discards={$savedDiscards} error={$feature.error}
    onSelect={feature.select} onAction={feature.act} onBack={() => feature.openTable()} onNew={() => void feature.start()} />
{:else}
  <GameLearning {...services} definition={cribbageDef} gameName="Cribbage" tab={$feature.tab}
    onGuidedPlay={() => { guided = true; void guidedFeature.start(); }} onTab={tab => feature.openTable(tab === "play" ? "play" : "learn")}
    onSurfaceChange={fixed => { learningFixed = fixed; }} loadExercise={() => ({ seed: 0 })} exerciseTitle={() => "Cribbage"} drillTitle={step => step.trick.title}
    resources={[
      { id: "reference", title: cribbageDef.table.learn.referenceTitle, summary: cribbageDef.table.learn.referenceSummary, onClick: services.onReference },
      { id: "points", title: "Points sheet", summary: "A short guide to combinations and their points.", onClick: () => { pointsOpen = true; } }
    ]}
    resultMessage={clean => clean ? "Try the next skill or a guided deal." : "Review the combinations, then try another example."}>
    {#snippet customExercise(context)}<CribbageExercise {context} onPoints={() => { pointsOpen = true; }} />{/snippet}
    {#snippet play()}<PlayTabPanel table={cribbageDef.table} {...cribbageDef.playTabConfig} primaryWarning={$feature.error} primaryDisabled={$feature.dealing}
      onPrimary={() => void feature.start()} resumeLabel={$feature.saved ? "Continue Cribbage" : undefined} onResume={$feature.saved ? feature.resume : undefined} />{/snippet}
  </GameLearning>
{/if}

{#if pointsOpen}<CribbagePointsSheet onClose={() => { pointsOpen = false; }} />{/if}
