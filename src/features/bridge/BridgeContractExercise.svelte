<script lang="ts">
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import { bridgeContractSteps } from "../../lessons/bridge/exercises";
  import { suitSymbol } from "../../presentation/cardDisplay";
  import type { CustomExerciseContext } from "../featureServices";
  import type { DrillResult } from "../../lessons/drillDecision";
  let { context }: { context: CustomExerciseContext } = $props();
  let index = $state(0), selected = $state(""), checked = $state(false);
  let results = $state<DrillResult[]>([]);
  let step = $derived(bridgeContractSteps[index]);
  let good = $derived(selected === String(step.contract.target));
  function check() {
    if (!selected || checked) return;
    results = [...results, { contract: "Bridge", cardLabel: `${step.contract.label}: ${selected} tricks`,
      outcome: good ? "good" : "risky", clean: good, reason: "contract_target" }];
    checked = true;
  }
  function next() {
    if (!checked) return;
    if (index === bridgeContractSteps.length - 1) { context.onComplete(results); return; }
    index++; selected = ""; checked = false;
  }
</script>

<TablePlaySurface flowLayout showTable={false} surfaceClassName="learning-play-surface" title="Read the contract"
  ariaLabel="Bridge contract exercise" onBack={context.onBack} statusLabel="Decision" statusValue={`${index + 1} of 3`}
  tableAriaLabel="Bridge contract" tableCards={[]} panelAriaLabel="Bridge contract choices">
  {#snippet summary()}
    <section class="contract-summary" aria-label="Contract to read">
      <span>Contract</span>
      <strong>{step.contract.longLabel}</strong>
      <p>Level {step.contract.level} · {step.contract.strain === "NT" ? "No trump suit" : `${suitSymbol(step.contract.strain)} is trump`}</p>
    </section>
  {/snippet}
  {#snippet panel()}
    <ExerciseFeedback eyebrow={step.contract.longLabel} title={step.title}
      result={checked ? "" : `In ${step.contract.label}, how many tricks must declarer and dummy win together?`}
      explanation={checked ? `Six base tricks + level ${step.contract.level} = ${step.contract.target} tricks. ${step.contract.strain === "NT" ? "No suit is trump." : `${suitSymbol(step.contract.strain)} is trump.`}` : step.hint}
      outcome={checked ? good ? "Good" : "Risky" : ""} warning={checked && !good} />
    <div class="contract-choices" role="group" aria-label="Trick targets">
      {#each step.options as option}
        <button class="secondary-action" aria-pressed={selected === option} disabled={checked} onclick={() => { selected = option; }} type="button">{option} {option === "1" ? "trick" : "tricks"}</button>
      {/each}
    </div>
    <div class="action-row">
      <button class="secondary-action" onclick={context.onBack} type="button">Table</button>
      {#if checked}<button class="primary-action" onclick={next} type="button">{index === 2 ? "Finish topic" : "Next decision"}</button>
      {:else}<button class="primary-action" disabled={!selected} onclick={check} type="button">Check answer</button>{/if}
    </div>
  {/snippet}
</TablePlaySurface>

<style>
  .contract-summary { padding: 16px 0; border-bottom: 1px solid #5d7765; color: #f7faf3; }
  .contract-summary span { display: block; font-size: 0.75rem; }
  .contract-summary strong { display: block; margin: 4px 0; font-size: 1.5rem; }
  .contract-summary p { margin: 0; font-size: 0.875rem; }
  .contract-choices { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  button { min-width: 0; white-space: normal; }
  button[aria-pressed="true"] { background: #f5f1cf; color: #173728; }
</style>
