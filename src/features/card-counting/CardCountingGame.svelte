<script lang="ts">
  import GameLearning from "../GameLearning.svelte";
  import { cardCountingDef, cardCountingExercises } from "../../games/cardCounting";
  import type { CountingExercise } from "../../domain/cardCountingQuestions";
  import type { FeatureServices } from "../featureServices";
  import type { TableTabId } from "../../games/tableFactory";
  import CountTrumps from "./CountTrumps.svelte";
  import MemoryHand from "./MemoryHand.svelte";
  let { ...services }: FeatureServices = $props();
  let tab = $state<TableTabId>(cardCountingDef.table.defaultTab);
</script>

<GameLearning {...services} definition={cardCountingDef} gameName="Card Counting" {tab} resources={[]}
  onTab={next => { tab = next; }}
  loadExercise={(action, seed) => {
    if (!cardCountingExercises.some(exercise => exercise.action === action)) throw Error("Unknown memory exercise.");
    return { seed: seed() };
  }} exerciseTitle={action => cardCountingExercises.find(exercise => exercise.action === action)?.title ?? "Memory"}
  drillTitle={() => "Memory"} resultMessage={() => "Memory exercise complete."}>
  {#snippet customExercise(context)}
    {#key context.action}
      {#if context.action === "trump-count"}
        <CountTrumps initialSeed={context.seed} nextSeed={services.nextSeed} onBack={context.onBack} />
      {:else}
        <MemoryHand exercise={context.action as Exclude<CountingExercise, "trump-count">} initialSeed={context.seed} nextSeed={services.nextSeed} onBack={context.onBack} />
      {/if}
    {/key}
  {/snippet}
</GameLearning>
