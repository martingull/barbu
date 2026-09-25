<script lang="ts">
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import GameResult from "../../components/GameResult.svelte";
  import { heartsSessionSettlement, heartsMoonShooter, heartsScoredSeatPenalties, heartsMatchTarget, type HeartsSession } from "../../domain/heartsSession";
  import { seatPenaltiesForTricks } from "../../domain/trickTakingScore";
  import { contractScoreMeta } from "../../domain/contractScoring";
  import { heartsDef } from "../../games/hearts";
  import { scoreSeats, scoreSeatLabel, scoreSeatRunLabel, formatOrdinal, seatTricksWonForTricks } from "../../presentation/scorePresentation";
  import { heartsScorecardStandings, heartsResultCopy, heartsPlayerHandResult, heartsHandResultLabel, heartsTrickFeedback } from "./heartsPresentation";
  let { session, selectedCardId, error, dealing, onBack, onSelect, onPlay, onNextTrick, onNextHand, onReplay }: {
    session: HeartsSession; selectedCardId: string; error: string; dealing: boolean;
    onBack: () => void; onSelect: (id: string) => void; onPlay: () => void;
    onNextTrick: () => void; onNextHand: () => void; onReplay: () => void;
  } = $props();
  const meta = contractScoreMeta("Hearts");
  const heartsScorecardMeta = heartsDef.table.scorecard;
  let hand = $derived(session.fullHand);
  let complete = $derived(hand.status === "complete");
  let review = $derived(!complete && session.fullHandReviewTrickCount > 0
    ? hand.completedTricks[session.fullHandReviewTrickCount - 1] : undefined);
  let tableCards = $derived(review?.cards ?? hand.currentTrick);
  let legal = $derived(new Set(hand.legalCardIds));
  let settlement = $derived(heartsSessionSettlement(session));
  let heartsVisibleScores = $derived(settlement.scores);
  let heartsStandings = $derived(heartsScorecardStandings(heartsVisibleScores));
  let heartsPlayerPlaceLabel = $derived(formatOrdinal(heartsStandings.find(item => item.seat === "You")?.rank ?? 1));
  let raw = $derived(seatPenaltiesForTricks(hand.completedTricks));
  let heartsCurrentScoredSeatPenalties = $derived(heartsScoredSeatPenalties(raw));
  let fullHandSeatTrickCounts = $derived(seatTricksWonForTricks(hand.completedTricks));
  let results = $derived(settlement.result ? [...session.results, settlement.result] : session.results);
  let heartsVisibleHandCount = $derived(results.length);
  let heartsMatchIsComplete = $derived(settlement.complete);
  let trigger = $derived(scoreSeats.map(seat => ({ seat, score: heartsVisibleScores[seat] })).sort((a, b) => b.score - a.score)[0]);
  let heartsResult = $derived(heartsResultCopy(settlement.complete, heartsStandings, trigger, heartsMoonShooter(raw), results.length, hand.playerPenalty, heartsScorecardMeta.objective));
  let best = $derived(heartsPlayerHandResult("best", results));
  let worst = $derived(heartsPlayerHandResult("worst", results));
  let heartsBestHandLabel = $derived(best ? heartsHandResultLabel(best) : "No hands yet");
  let heartsWorstHandLabel = $derived(worst ? heartsHandResultLabel(worst) : "No hands yet");
</script>

{#snippet heartsScorecard(label = heartsScorecardMeta.label)}
  <div class="run-scorecard hearts-scorecard" aria-label={label}>
    <div class="run-scorecard-row hearts-scorecard-row header">
      <span>Player</span>
      <span>{heartsScorecardMeta.unitLabel}</span>
      <span>Place</span>
    </div>
    {#each scoreSeats as seat}
      <div class:active={seat === "You"} class="run-scorecard-row hearts-scorecard-row">
        <span>
          {scoreSeatLabel(seat)}
          <small>{seat === "You" ? "You" : "Table"}</small>
        </span>
        <strong>{heartsVisibleScores[seat]}</strong>
        <strong>{formatOrdinal(heartsStandings.find((standing) => standing.seat === seat)?.rank ?? 1)}</strong>
      </div>
    {/each}
    <div class="run-scorecard-row hearts-scorecard-row total">
      <span>
        {heartsScorecardMeta.objective}
        <small>Hand {heartsVisibleHandCount}</small>
      </span>
      <strong>Target {heartsMatchTarget}</strong>
      <strong>{heartsPlayerPlaceLabel}</strong>
    </div>
  </div>
{/snippet}

<TablePlaySurface flowLayout mode={complete ? "result" : "play"} ariaLabel="Hearts full hand"
  title="Hearts hand" eyebrow="Contract hand" statusLabel={complete ? "Complete" : `Trick ${hand.trickNumber}`}
  statusValue={`${hand.playerPenalty} ${hand.playerPenalty === 1 ? meta.unitName : meta.unitPlural}`} tableAriaLabel="Hearts hand table" {tableCards}
  showTable={!complete} pendingBySeat={!review && !complete && hand.currentPlayer === "You" ? { You: "You" } : {}}
  panelAriaLabel="Hearts hand decision" {onBack} onSurfaceClick={review ? onNextTrick : undefined}>
  {#snippet summary()}
    <div class="full-hand-summary grouped-play-summary" aria-label="Hearts hand score">
      <div class="full-hand-summary-row current-hand" aria-label="Current hand">
        <span class="summary-row-label">Current hand</span>
        <div><span>{meta.playerValueLabel}</span><strong>{hand.playerPenalty}</strong></div>
        <div><span>{meta.inPlayLabel}</span><strong>{hand.totalPenalty} / 26</strong></div>
        <div><span>Tricks</span><strong>{hand.completedTricks.length} / 13</strong></div>
      </div>
      <div class="full-hand-summary-row table-score" aria-label="Hearts table score">
        <span class="summary-row-label">{heartsScorecardMeta.label}</span>
        {#each scoreSeats as seat}
          <div>
            <span>{scoreSeatRunLabel(seat)} penalty</span>
            <strong>{heartsVisibleScores[seat]}</strong>
          </div>
        {/each}
      </div>

    </div>
  {/snippet}
  {#snippet panel()}
    {#if complete}
      <GameResult game="Hearts" completion={settlement.complete ? "match" : null} title={heartsResult.heading} summary={heartsResult.summary} />
      <div class="hearts-result-stack" aria-label="Hearts hand score">
        {@render heartsScorecard("Hearts final scorecard")}
        <div class="hearts-hand-breakdown" aria-label="This hand breakdown">
          <div class="hearts-hand-breakdown-row header">
            <span>This hand</span>
            <span>Tricks</span>
            <span>Points</span>
          </div>
          {#each scoreSeats as seat}
            <div class:active={seat === "You"} class="hearts-hand-breakdown-row">
              <span>{scoreSeatLabel(seat)}</span>
              <strong>{fullHandSeatTrickCounts[seat]}</strong>
              <strong>{heartsCurrentScoredSeatPenalties[seat]}</strong>
            </div>
          {/each}
        </div>
      </div>
      {#if heartsMatchIsComplete}
        <div class="full-hand-result-tricks" aria-label="Hearts match summary">
          <div>
            <span>Winner</span>
            <strong>{heartsResult.winnerLabel}</strong>
          </div>
          <div>
            <span>Your place</span>
            <strong>{heartsPlayerPlaceLabel}</strong>
          </div>
          <div>
            <span>Best hand</span>
            <strong>{heartsBestHandLabel}</strong>
          </div>
          <div>
            <span>Hardest hand</span>
            <strong>{heartsWorstHandLabel}</strong>
          </div>
        </div>
      {/if}

    {:else if review}
      <div class="lesson-heading"><p class="eyebrow">Trick complete</p><h2>Read the table</h2></div>
      <p class:warning={review.outcome === "captured_penalty"} class="outcome">{heartsTrickFeedback(review, hand)}</p>
      <p class="explanation">Left's card is on the table. Tap the table or press Next trick when you are ready.</p>
    {:else}
      <ExerciseFeedback eyebrow="Your turn" title="Choose your card" result={hand.prompt} {error} />
      <CardChoiceHand cards={hand.playerHand} ariaLabel="Your Hearts hand" className="hand full-hand-cards"
        cardClassName="card hand-card full-hand-card"
        getCardClasses={card => ({ heart: card.suit === "H", legal: legal.has(card.id), illegal: !legal.has(card.id), selected: selectedCardId === card.id })}
        isPressed={card => selectedCardId === card.id} onSelect={card => onSelect(card.id)} />
    {/if}
    {#if error && (review || complete)}<p class="outcome warning">{error}</p>{/if}
    <div class="action-row">
      <button class="secondary-action" onclick={onBack} type="button">Table</button>
      {#if complete}
        {#if !settlement.complete}<button class="secondary-action" onclick={onReplay} type="button">Replay</button>{/if}
        <button class="primary-action" disabled={dealing} onclick={onNextHand} type="button">{settlement.complete ? "New match" : "Next hand"}</button>
      {:else if review}
        <button class="primary-action" onclick={onNextTrick} type="button">Next trick</button>
      {:else}
        <button class="primary-action" disabled={dealing || !legal.has(selectedCardId)} onclick={onPlay} type="button">Play card</button>
      {/if}
    </div>
  {/snippet}
</TablePlaySurface>
