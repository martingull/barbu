<script lang="ts">
  import GameLearning from "../GameLearning.svelte";
  import PlayTabPanel from "../../PlayTabPanel.svelte";
  import WhistHandView from "./WhistHandView.svelte";
  import WhistOpeningLead from "./WhistOpeningLead.svelte";
  import { whistDef, type WhistPracticeAction } from "../../games/whist";
  import { orderPracticePool, type DrillStep } from "../../lessons/drillDecision";
  import { whistFollowSuitDrillPool, whistTrumpOrDiscardDrillPool, whistThirdHandHighDrillPool,
    whistReturnPartnerSuitDrillPool, whistOpeningLeadLessonPool, whistOddTrickDrillPool } from "../../whistLessons";
  import { savedWhistRunSummary } from "../../persistence/whistSave";
  import type { FeatureServices } from "../featureServices";
  import type { WhistFeature } from "./whistFeature";

  let { feature, ...services }: FeatureServices & { feature: WhistFeature } = $props();
  let learningFixed = $state(false);
  $effect(() => { services.onSurfaceChange($feature.view === "hand" || learningFixed); });
  const pools: Record<WhistPracticeAction, DrillStep[]> = {
    lead: whistOpeningLeadLessonPool, follow: whistFollowSuitDrillPool, trump: whistTrumpOrDiscardDrillPool,
    third: whistThirdHandHighDrillPool, return: whistReturnPartnerSuitDrillPool, odd: whistOddTrickDrillPool
  };
  const names: Record<WhistPracticeAction, string> = {
    lead: "opening leads", follow: "follow suit", trump: "trump or discard", third: "third hand high",
    return: "return partner's suit", odd: "count odd tricks"
  };
</script>

{#if $feature.view === "hand" && $feature.session}
  <WhistHandView session={$feature.session} selectedCardId={$feature.selectedCardId} error={$feature.error}
    dealing={$feature.dealing} onBack={() => feature.openTable()} onSelect={feature.select} onPlay={() => feature.play()}
    onNextTrick={feature.nextTrick} onNextHand={() => void feature.start(true)} onReplay={feature.replay} />
{:else}
  <GameLearning {...services} definition={whistDef} gameName="Whist" tab={$feature.tab}
    onTab={tab => feature.openTable(tab === "play" ? "play" : "learn")} onSurfaceChange={fixed => { learningFixed = fixed; }}
    loadExercise={(action, seed, fromCourse) => action === "lead" && !fromCourse ? { seed: 0 } : orderPracticePool(pools[action as WhistPracticeAction], seed())}
    exerciseTitle={action => `Whist practice: ${names[action as WhistPracticeAction]}`} drillTitle={() => "Whist lesson"}
    resultMessage={clean => clean ? "Clean Whist practice. Keep reading partner, led suit, and trump before full hands arrive." : "Repeat the Whist pattern until follow-suit and trump decisions feel automatic."}>
    {#snippet customExercise(context)}<WhistOpeningLead onBack={context.onBack} onComplete={context.onComplete} />{/snippet}
    {#snippet play()}
      <PlayTabPanel table={whistDef.table} {...whistDef.playTabConfig} footerNote="You and Barbu play to 5 points against Left and Right."
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
