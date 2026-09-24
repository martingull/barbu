<script lang="ts">
  import GameResult from "../../GameResult.svelte";
  import BarbuScorecard from "./BarbuScorecard.svelte";
  import type { BarbuSession } from "../../domain/barbuSession";
  import { formatOrdinal, formatSignedScore, scoreSeatLabel } from "../../scorePresentation";
  import { barbuRunPresentation } from "./barbuRunPresentation";
  export let session: BarbuSession;
  $: ({ fullHandRunResultTitle, fullHandRunResultSummary, fullHandRunStandings, fullHandRunWinnerLabel,
    fullHandRunPlayerStanding, fullHandRunBestContractLabel, fullHandRunWeakestContractLabel } = barbuRunPresentation(session));
</script>

<GameResult game="Barbu" completion="session" title={fullHandRunResultTitle} summary={fullHandRunResultSummary} />
<div class="full-hand-run-score" aria-label="Play Barbu score">
  {#each fullHandRunStandings as standing}
    <div><span>{formatOrdinal(standing.rank)} {scoreSeatLabel(standing.seat)}</span><strong>{formatSignedScore(standing.score)}</strong></div>
  {/each}
</div>
  <div class="run-final-summary" aria-label="Play Barbu settlement">
    <div>
      <span>Winner</span>
      <strong>{fullHandRunWinnerLabel}</strong>
    </div>
    <div>
      <span>Your place</span>
      <strong>{fullHandRunPlayerStanding ? formatOrdinal(fullHandRunPlayerStanding.rank) : "Done"}</strong>
    </div>
    <div>
      <span>Strongest</span>
      <strong>{fullHandRunBestContractLabel}</strong>
    </div>
    <div>
      <span>Weakest</span>
      <strong>{fullHandRunWeakestContractLabel}</strong>
    </div>
  </div>

<BarbuScorecard {session} label="Play Barbu results" />
