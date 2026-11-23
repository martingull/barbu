<script lang="ts">
  import { untrack } from "svelte";
  import GameLearning from "../GameLearning.svelte";
  import PlayTabPanel from "../../components/PlayTabPanel.svelte";
  import GinHandView from "./GinHandView.svelte";
  import GinExercise from "./GinExercise.svelte";
  import GinGuidedHand from "./GinGuidedHand.svelte";
  import GinSettings from "./GinSettings.svelte";
  import { ginDefinitionFor } from "../../games/ginRummy";
  import { ginCoursesFor } from "../../lessons/gin-rummy/courses";
  import { defaultGinSettings } from "../../domain/ginRummyRules";
  import { ginSettingsSummary } from "../../presentation/ginRummyDisplay";
  import type { FeatureServices } from "../featureServices";
  import type { GinRummyFeature } from "./ginRummyFeature";
  let { feature, ...services }: FeatureServices & { feature: GinRummyFeature } = $props();
  const settingsChoice = untrack(() => feature.settings);
  let definition = $derived(ginDefinitionFor($settingsChoice));
  let courses = $derived(ginCoursesFor($settingsChoice));
  let learningFixed = $state(false);
  let guidedSeed = $state<number | null>(null);
  $effect(() => { services.onSurfaceChange(guidedSeed !== null || $feature.view === "hand" && $feature.session?.hand.phase !== "complete" || learningFixed); });
  function endGuidedHand(tab: "learn" | "play") { guidedSeed = null; learningFixed = false; feature.openTable(tab); }
</script>

{#if guidedSeed !== null}
  <GinGuidedHand seed={guidedSeed} settings={$settingsChoice} onBack={() => endGuidedHand("learn")} onIndependentPlay={() => endGuidedHand("play")} />
{:else if $feature.view === "hand" && $feature.session}
  <GinHandView session={$feature.session} selectedCardId={$feature.selectedCardId} error={$feature.error}
    onSelect={feature.select} onAction={feature.act} onBack={() => feature.openTable()} onNext={() => void feature.start(true)}
    onReplay={feature.replay} onNew={() => void feature.start()} />
{:else}
  {#key $settingsChoice.profile}
  <GameLearning {...services} {definition} {courses} gameName="Gin Rummy" tab={$feature.tab}
    onGuidedPlay={() => { guidedSeed = services.nextSeed(); }}
    onTab={tab => feature.openTable(tab === "play" ? "play" : "learn")} onSurfaceChange={fixed => { learningFixed = fixed; }}
    loadExercise={() => ({ seed: 0 })} exerciseTitle={() => "Gin Rummy"} drillTitle={step => step.trick.title}
    resultMessage={clean => clean ? "Take this skill into a full hand, or continue learning." : "Check the decisions you missed, then try this topic again."}>
    {#snippet settings()}
      <GinSettings settings={$settingsChoice} savedSettings={$feature.saved?.settings} hasSaved={Boolean($feature.saved)} onSelect={feature.selectSettings} />
    {/snippet}
    {#snippet customExercise(context)}<GinExercise {context} settings={$settingsChoice} />{/snippet}
    {#snippet play()}
      <PlayTabPanel table={definition.table} {...definition.playTabConfig} primaryWarning={$feature.error} primaryDisabled={$feature.dealing}
        onPrimary={() => void feature.start()} resumeLabel={$feature.saved ? "Continue Gin Rummy" : undefined}
        resumeNote={$feature.saved ? ginSettingsSummary($feature.saved.settings ?? defaultGinSettings) : undefined}
        onResume={$feature.saved ? feature.resume : undefined} />
    {/snippet}
  </GameLearning>
  {/key}
{/if}
