<script lang="ts">
  import GameLearning from "../GameLearning.svelte";
  import PlayTabPanel from "../../components/PlayTabPanel.svelte";
  import WhistHandView from "./WhistHandView.svelte";
  import WhistGuidedHand from "./WhistGuidedHand.svelte";
  import { whistDef, type WhistPracticeAction } from "../../games/whist";
  import { whistLearningSteps, whistTakeaway } from "../../lessons/whist/learning";
  import { savedWhistRunSummary } from "../../persistence/whistSave";
  import type { FeatureServices } from "../featureServices";
  import type { WhistFeature } from "./whistFeature";

  let { feature, ...services }: FeatureServices & { feature: WhistFeature } = $props();
  let learningFixed = $state(false);
  let guidedSeed = $state<number | null>(null);
  $effect(() => { services.onSurfaceChange(guidedSeed !== null || $feature.view === "hand" || learningFixed); });
  function endGuidedHand(tab: "learn" | "play") { guidedSeed = null; learningFixed = false; feature.openTable(tab); }
  const names: Record<WhistPracticeAction, string> = {
    lead: "opening leads", follow: "follow suit", trump: "trump or discard", third: "third hand high",
    return: "return partner's suit", odd: "count odd tricks"
  };
</script>

{#if guidedSeed !== null}
  <WhistGuidedHand seed={guidedSeed} onBack={() => endGuidedHand("learn")} onIndependentPlay={() => endGuidedHand("play")} />
{:else if $feature.view === "hand" && $feature.session}
  <WhistHandView session={$feature.session} selectedCardId={$feature.selectedCardId} error={$feature.error}
    dealing={$feature.dealing} onBack={() => feature.openTable()} onSelect={feature.select} onPlay={() => feature.play()}
    onNextTrick={feature.nextTrick} onNextHand={() => void feature.start(true)} onReplay={feature.replay} />
{:else}
  <GameLearning {...services} definition={whistDef} gameName="Whist" tab={$feature.tab}
    onTab={tab => feature.openTable(tab === "play" ? "play" : "learn")} onSurfaceChange={fixed => { learningFixed = fixed; }}
    onGuidedPlay={() => { guidedSeed = services.nextSeed(); }}
    loadExercise={action => whistLearningSteps(action as WhistPracticeAction)}
    exerciseTitle={action => `Whist practice: ${names[action as WhistPracticeAction]}`} drillTitle={() => "Whist lesson"} drillEyebrow="Whist"
    resultMessage={(_clean, action) => whistTakeaway(action)}>
    {#snippet play()}
      <PlayTabPanel table={whistDef.table} {...whistDef.playTabConfig}
        primaryDisabled={$feature.dealing} primaryWarning={$feature.error} onPrimary={() => void feature.start()}
        resumeLabel={$feature.saved ? "Continue Whist" : undefined} resumeNote={$feature.saved ? savedWhistRunSummary($feature.saved) : undefined}
        onResume={$feature.saved ? feature.resume : undefined}>
        <fieldset class="whist-session-options" role="radiogroup" aria-label="Whist session">
          <legend>Session</legend>
          <label><input type="radio" name="whist-session" value="game" checked={$feature.mode === "game"} onchange={() => feature.setMode("game")} /><span>Single game<small>First to 5 points</small></span></label>
          <label><input type="radio" name="whist-session" value="rubber" checked={$feature.mode === "rubber"} onchange={() => feature.setMode("rubber")} /><span>Rubber<small>Best of three games</small></span></label>
        </fieldset>
      </PlayTabPanel>
    {/snippet}
  </GameLearning>
{/if}
