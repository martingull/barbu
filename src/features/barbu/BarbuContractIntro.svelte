<script lang="ts">
  import BarbuScorecard from "./BarbuScorecard.svelte";
  import { barbuRunPresentation } from "./barbuRunPresentation";
  import { contractIntro } from "./contractIntros";
  import { fullHandContracts } from "../../domain/contractRegistry";
  import type { BarbuSession } from "../../domain/barbuSession";
  export let session: BarbuSession;
  export let error = "";
  export let dealing = false;
  export let onBack: () => void;
  export let onStart: () => void;
  $: ({ fullHand, dominoHand } = session);
  $: ({ pendingRunContract, pendingRunContractIntro, pendingRunStatusLabel, pendingRunSurfaceLabel,
    pendingRunSequenceLabel, fullHandRunLeaderLabel, fullHandRunPlayerPlaceLabel, fullHandRunRemainingLabel } = barbuRunPresentation(session));
</script>

    <header class="topbar run-intro-topbar" aria-label={`${pendingRunContract} game intro`}>
      <button class="back-button" onclick={onBack} type="button">Table</button>
      <div>
        <p class="eyebrow">Play Barbu</p>
        <h1>{pendingRunContract}</h1>
      </div>
      <div class="contract-status">
        <span>Next contract</span>
        <strong>{pendingRunStatusLabel}</strong>
      </div>
    </header>

    <section class="run-intro-screen" aria-label="Play Barbu contract intro">
      <div class="run-intro-card">
        <p class="eyebrow">Barbu sets the contract</p>
        <h2>{pendingRunContractIntro.title}</h2>
        <p>{pendingRunContractIntro.reason}</p>
        <div class="run-contract-role" aria-label={`${pendingRunContract} role`}>
          <div>
            <span>Role</span>
            <strong>{pendingRunContractIntro.role}</strong>
          </div>
          <div>
            <span>Surface</span>
            <strong>{pendingRunSurfaceLabel}</strong>
          </div>
          <div>
            <span>Sequence</span>
            <strong>{pendingRunSequenceLabel}</strong>
          </div>
        </div>
      </div>

      <div class="run-intro-panel">
        {#if error}<p class="error" role="alert">{error}</p>{/if}
        <div class="run-session-summary" aria-label="Play Barbu session summary">
          <div>
            <span>Leader</span>
            <strong>{fullHandRunLeaderLabel}</strong>
          </div>
          <div>
            <span>Your place</span>
            <strong>{fullHandRunPlayerPlaceLabel}</strong>
          </div>
          <div>
            <span>Remaining</span>
            <strong>{fullHandRunRemainingLabel}</strong>
          </div>
        </div>

          <div class="run-sequence-strip" aria-label="Play Barbu contract sequence">
    {#each fullHandContracts as contract, index}
      <div
        class:active={contract === pendingRunContract || fullHand?.contract === contract || dominoHand?.contract === contract}
        class:complete={session.results.some(result => result.contract === contract)}
        class:layout={contract === "Domino"}
      >
        <span>{index + 1}</span>
        <strong>{contract}</strong>
        <small>{contractIntro(contract).role}</small>
      </div>
    {/each}
  </div>


        <div class="run-contract-target" aria-label={`${pendingRunContract} target`}>
          <div>
            <span>Target</span>
            <strong>{pendingRunContractIntro.target}</strong>
          </div>
          <div>
            <span>Table habit</span>
            <strong>{pendingRunContractIntro.habit}</strong>
          </div>
        </div>

        <BarbuScorecard {session} label="Play Barbu scorecard" />

        <div class="course-actions">
          <button class="secondary-action" onclick={onBack} type="button">Table</button>
          <button class="primary-action" disabled={dealing} onclick={onStart} type="button">Start hand</button>
        </div>
      </div>
    </section>
