<script lang="ts">
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import GameResult from "../../components/GameResult.svelte";
  import HeartsGuidedRecap from "./HeartsGuidedRecap.svelte";
  import { heartsGuidance, heartsGuidedReview } from "./heartsGuidance";
  import { heartsSessionSettlement, heartsMoonShooter, heartsScoredSeatPenalties, heartsMatchTarget, type HeartsSession } from "../../domain/heartsSession";
  import { seatPenaltiesForTricks } from "../../domain/trickTakingScore";
  import { heartsDef } from "../../games/hearts";
  import { scoreSeats, scoreSeatLabel, scoreSeatRunLabel, formatOrdinal, seatTricksWonForTricks } from "../../presentation/scorePresentation";
  import { heartsScorecardStandings, heartsResultCopy, heartsPlayerHandResult, heartsHandResultLabel, heartsTrickFeedback, heartsMoonResultText } from "./heartsPresentation";
  let { session, selectedCardId, error, dealing, guided = false, onBack, onSelect, onPlay, onNextTrick, onNextHand, onReplay }: {
    guided?: boolean;
    session: HeartsSession; selectedCardId: string; error: string; dealing: boolean;
    onBack: () => void; onSelect: (id: string) => void; onPlay: () => void;
    onNextTrick: () => void; onNextHand: () => void; onReplay: () => void;
  } = $props();
  const heartsScorecardMeta = heartsDef.table.scorecard;
  let hand = $derived(session.fullHand);
  let complete = $derived(hand.status === "complete");
  let review = $derived(!complete && session.fullHandReviewTrickCount > 0
    ? hand.completedTricks[session.fullHandReviewTrickCount - 1] : undefined);
  let tableCards = $derived(review?.cards ?? hand.currentTrick);
  let guidance = $derived(guided ? heartsGuidance(hand) : null);
  let guidedReview = $derived(guided && review ? heartsGuidedReview(review) : null);
  let legal = $derived(new Set(hand.legalCardIds));
  let settlement = $derived(heartsSessionSettlement(session));
  let heartsVisibleScores = $derived(settlement.scores);
  let heartsStandings = $derived(heartsScorecardStandings(heartsVisibleScores));
  let heartsPlayerPlaceLabel = $derived(formatOrdinal(heartsStandings.find(item => item.seat === "You")?.rank ?? 1));
  let raw = $derived(seatPenaltiesForTricks(hand.completedTricks));
  let moonShooter = $derived(heartsMoonShooter(raw));
  let guidedSummary = $derived(`All 13 tricks are played. ${moonShooter ? heartsMoonResultText(moonShooter) : "Lowest score wins. Each heart counts 1; Q♠ counts 13."} Your saved match is unchanged.`);
  let heartsCurrentScoredSeatPenalties = $derived(heartsScoredSeatPenalties(raw));
  let fullHandSeatTrickCounts = $derived(seatTricksWonForTricks(hand.completedTricks));
  let results = $derived(settlement.result ? [...session.results, settlement.result] : session.results);
  let heartsVisibleHandCount = $derived(results.length);
  let heartsMatchIsComplete = $derived(settlement.complete);
  let trigger = $derived(scoreSeats.map(seat => ({ seat, score: heartsVisibleScores[seat] })).sort((a, b) => b.score - a.score)[0]);
  let heartsResult = $derived(heartsResultCopy(settlement.complete, heartsStandings, trigger, heartsMoonShooter(raw), results.length, heartsCurrentScoredSeatPenalties.You));
  let best = $derived(heartsPlayerHandResult("best", results));
  let worst = $derived(heartsPlayerHandResult("worst", results));
  let heartsBestHandLabel = $derived(best ? heartsHandResultLabel(best) : "No hands yet");
  let heartsWorstHandLabel = $derived(worst ? heartsHandResultLabel(worst) : "No hands yet");
</script>

{#snippet heartsScorecard(label = heartsScorecardMeta.label)}
  <div class="run-scorecard hearts-scorecard" aria-label={label}>
    <div class="run-scorecard-row hearts-scorecard-row header">
      <span>Player</span>
      <span>Match total</span>
      <span>Place</span>
    </div>
    {#each scoreSeats as seat}
      <div class:active={seat === "You"} class="run-scorecard-row hearts-scorecard-row">
        <span>
          {scoreSeatLabel(seat)}
        </span>
        <strong>{heartsVisibleScores[seat]}</strong>
        <strong>{formatOrdinal(heartsStandings.find((standing) => standing.seat === seat)?.rank ?? 1)}</strong>
      </div>
    {/each}
    <div class="run-scorecard-row hearts-scorecard-row total">
      <span>
        Lowest score wins
        <small>After hand {heartsVisibleHandCount}</small>
      </span>
      <strong>Ends at {heartsMatchTarget}</strong>
      <strong>{heartsPlayerPlaceLabel}</strong>
    </div>
  </div>
{/snippet}

<TablePlaySurface flowLayout stableFeedback={guided} mode={complete ? "result" : "play"} ariaLabel="Hearts full hand"
  title={guided ? "Guided Hearts hand" : "Hearts hand"} eyebrow="Hearts" statusLabel={complete ? (settlement.complete ? "Match over" : "Hand scored") : `Trick ${review ? session.fullHandReviewTrickCount : hand.trickNumber}`}
  statusValue={`Hand ${session.results.length + 1}`} tableAriaLabel="Hearts hand table" {tableCards}
  showTable={!complete} pendingBySeat={!review && !complete && hand.currentPlayer === "You" ? { You: "You" } : {}}
  panelAriaLabel="Hearts hand decision" {onBack} onSurfaceClick={review ? onNextTrick : undefined}>
  {#snippet summary()}
    <div class="full-hand-summary grouped-play-summary" aria-label="Hearts hand score">
      <div class="full-hand-summary-row current-hand" aria-label="Current hand">
        <span class="summary-row-label">Current hand</span>
        <div><span>Your hand</span><strong>{complete ? heartsCurrentScoredSeatPenalties.You : hand.playerPenalty}</strong></div>
        <div><span>Points taken</span><strong>{hand.totalPenalty} / 26</strong></div>
        <div><span>Tricks</span><strong>{hand.completedTricks.length} / 13</strong></div>
      </div>
      {#if !guided}<div class="full-hand-summary-row table-score" aria-label="Hearts table score">
        <span class="summary-row-label">Match including this hand</span>
        {#each scoreSeats as seat}
          <div>
            <span>{scoreSeatRunLabel(seat)} total</span>
            <strong>{heartsVisibleScores[seat]}</strong>
          </div>
        {/each}
      </div>{/if}

    </div>
  {/snippet}
  {#snippet panel()}
    {#if complete}
      <GameResult game="Hearts" completion={settlement.complete ? "match" : null} title={guided ? "Guided hand complete" : heartsResult.heading} summary={guided ? guidedSummary : heartsResult.summary} />
      {#if guided}<HeartsGuidedRecap tricks={hand.completedTricks} />{/if}
      <div class="hearts-result-stack" aria-label="Hearts hand score">
        {#if !guided}{@render heartsScorecard("Hearts final scorecard")}{/if}
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
      {#if guided}
        <ExerciseFeedback coach="queen" reserveSpace eyebrow="Trick complete" title="Why this trick ended this way"
          result={guidedReview?.winning ?? heartsTrickFeedback(review, hand)} resultAriaLabel={guidedReview ? "Trick winner explained" : undefined}
          explanation={guidedReview ? `${guidedReview.scoring} ${guidedReview.choice}` : ""} outcome={guidedReview?.next} />
      {:else}
        <div class="lesson-heading"><p class="eyebrow">Trick complete</p><h2>Read the table</h2></div>
        <p class:warning={review.outcome === "captured_penalty"} class="outcome">{heartsTrickFeedback(review, hand)}</p>
      {/if}
    {:else}
      <ExerciseFeedback coach={guided ? "queen" : undefined} reserveSpace={guided} eyebrow="Your turn" title="Choose your card"
        result={guidance ? `Rule: ${guidance.rule}` : hand.prompt}
        explanation={guidance ? `Tactic: ${guidance.tip}` : ""} {error} />
      <CardChoiceHand cards={hand.playerHand} ariaLabel="Your Hearts hand" className="hand full-hand-cards"
        cardClassName="card hand-card full-hand-card"
        getCardClasses={card => ({ heart: card.suit === "H", legal: legal.has(card.id), illegal: !legal.has(card.id), selected: selectedCardId === card.id })}
        isPressed={card => selectedCardId === card.id} onSelect={card => onSelect(card.id)} />
    {/if}
    {#if error && (review || complete)}<p class="outcome warning">{error}</p>{/if}
    <div class="action-row">
      {#if !guided || !complete}<button class="secondary-action" onclick={onBack} type="button">Table</button>{/if}
      {#if complete}
        {#if !settlement.complete}<button class="secondary-action" onclick={onReplay} type="button">Replay</button>{/if}
        <button class="primary-action" disabled={dealing} onclick={onNextHand} type="button">{guided ? "Play without guidance" : settlement.complete ? "New match" : "Next hand"}</button>
      {:else if review}
        <button class="primary-action" onclick={onNextTrick} type="button">Next trick</button>
      {:else}
        <button class="primary-action" disabled={dealing || !legal.has(selectedCardId)} onclick={onPlay} type="button">Play card</button>
      {/if}
    </div>
    {#if guided && complete}<button class="secondary-action" onclick={onBack} type="button">Back to Learn</button>{/if}
  {/snippet}
</TablePlaySurface>
