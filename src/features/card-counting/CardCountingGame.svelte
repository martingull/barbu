<script lang="ts">
  import GameLearning from "../GameLearning.svelte";
  import PlayTabPanel from "../../PlayTabPanel.svelte";
  import { cardCountingDef, cardCountingExercises } from "../../games/cardCounting";
  import type { CountingExercise } from "../../domain/cardCountingQuestions";
  import type { FeatureServices, LearningEntry } from "../featureServices";
  import CountTrumps from "./CountTrumps.svelte";
  import MemoryHand from "./MemoryHand.svelte";
  let { ...services }: FeatureServices = $props();
  let tab = $state<"learn" | "play">("play");
  let entry = $state<LearningEntry>();
  function exercise(action: CountingExercise) { entry = { kind: "exercise", action }; }
</script>

<GameLearning {...services} definition={cardCountingDef} gameName="Card Counting" {tab} {entry} resources={[]}
  onTab={next => { tab = next === "play" ? "play" : "learn"; }}
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
  {#snippet play()}
    <PlayTabPanel table={cardCountingDef.table} {...cardCountingDef.playTabConfig} onPrimary={() => exercise("heart-memory")}>
      <div class="memory-exercises">
        {#each cardCountingExercises.filter(item => item.action !== "heart-memory") as item}
          <button type="button" onclick={() => exercise(item.action)}><strong>{item.title}</strong><small>{item.summary}</small></button>
        {/each}
      </div>
    </PlayTabPanel>
  {/snippet}
</GameLearning>

<style>
  .memory-exercises { display: grid; min-width: 0; }
  button { display: grid; gap: 4px; min-height: 48px; width: 100%; text-align: left; border: 0; border-bottom: 1px solid #ffffff26; border-radius: 0; padding: 12px 2px; background: transparent; color: #f7faf3; }
  button:hover { background: #ffffff0a; }
  button:focus-visible { outline: 2px solid #f5f1cf; outline-offset: 2px; }
  strong { font-size: 0.94rem; }
  small { font-size: 0.8rem; color: #c1d1bf; line-height: 1.4; }
</style>
