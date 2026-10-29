<script lang="ts">
  import { fullHandContracts } from "../../domain/contractRegistry";
  import type { FullHandContract } from "../../domain/types";
  import { barbuContractGoals } from "./barbuGuidance";
  let { onStart, onBack }: { onStart: (contract: FullHandContract) => void; onBack: () => void } = $props();
  let contract = $state<FullHandContract>("No Hearts");
</script>

<section class="guided-contracts" aria-label="Guided Barbu setup">
  <h1>Choose a contract</h1>
  <fieldset>
    <legend>Guided hand</legend>
    {#each fullHandContracts as option}
      <label><input type="radio" name="guided-contract" value={option} bind:group={contract} />{option}</label>
    {/each}
  </fieldset>
  <p>{barbuContractGoals[contract]}</p>
  <div class="action-row">
    <button class="secondary-action" onclick={onBack}>Back to Learn</button>
    <button class="primary-action" onclick={() => onStart(contract)}>Deal guided hand</button>
  </div>
</section>

<style>
  .guided-contracts { display: grid; gap: 16px; padding: 16px 0; color: #f7faf3; }
  h1 { font-size: 1.4rem; margin: 0; }
  fieldset { display: grid; gap: 4px; margin: 0; padding: 8px 0; border: 0; }
  legend { font-weight: 700; }
  label { display: flex; align-items: center; gap: 12px; min-height: 44px; }
  input { accent-color: #e7e4ad; width: 20px; height: 20px; }
  p { min-height: 4.5em; margin: 0; color: #dce5d4; }
</style>
