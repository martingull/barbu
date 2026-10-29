<script lang="ts">
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import GameResult from "../../components/GameResult.svelte";
  import SpadesBids from "./SpadesBids.svelte";
  import GuidedHandActions from "../../components/GuidedHandActions.svelte";
  import SpadesGuidedRecap from "./SpadesGuidedRecap.svelte";
  import { spadesLearningPosition } from "../../domain/spadesLearning";
  import { spadesGuidance, spadesGuidedReview } from "./spadesGuidance";
  import { spadesSessionSettlement, spadesSessionComplete, type SpadesSession } from "../../domain/spadesSession";
  import { spadesSideBid, spadesPlayerSideSeats, spadesOpponentSideSeats, spadesMatchTarget } from "../../domain/spadesScoring";
  import { spadesTrickFeedback } from "./spadesFeedback";
  import { partnershipTrickCounts } from "../../domain/trickTakingScore";
  import { spadesBidLabel, spadesResultCopy } from "./spadesPresentation";
  let { session, selectedCardId, error, dealing, guided = false, onBack, onSelect, onPlay, onNextTrick, onNextHand, onReplay, onBid, onToggleBids, onStartPlay }: {
    guided?: boolean;
    session: SpadesSession; selectedCardId: string; error: string; dealing: boolean;
    onBack: () => void; onSelect: (id: string) => void; onPlay: () => void;
    onNextTrick: () => void; onNextHand: () => void; onReplay: () => void;
    onBid: (bid: number) => void; onToggleBids: () => void; onStartPlay: () => void;
  } = $props();
  let hand = $derived(session.fullHand);
  let complete = $derived(hand.status === "complete");
  let opening = $derived(!session.playStarted);
  let review = $derived(!complete && session.fullHandReviewTrickCount > 0
    ? hand.completedTricks[session.fullHandReviewTrickCount - 1] : undefined);
  let tableCards = $derived(review?.cards ?? hand.currentTrick);
  let legal = $derived(new Set(hand.legalCardIds));
  let tricks = $derived(partnershipTrickCounts(hand.completedTricks));
  let bids = $derived({ playerSide: spadesSideBid(session.bids, spadesPlayerSideSeats),
    opponentSide: spadesSideBid(session.bids, spadesOpponentSideSeats) });
  let settlement = $derived(spadesSessionSettlement(session));
  let matchComplete = $derived(spadesSessionComplete(session));
  let result = $derived(spadesResultCopy(settlement.result, settlement.scores, matchComplete));
  let guidance = $derived(guided ? spadesGuidance(spadesLearningPosition(session)) : null);
  let guidedReview = $derived(guided && review ? spadesGuidedReview(hand.completedTricks.slice(0, session.fullHandReviewTrickCount), session.bids) : null);
</script>

<TablePlaySurface flowLayout stableFeedback={guided} mode={complete ? "result" : "play"} ariaLabel="Spades full hand"
  title={guided ? "Guided Spades" : "Spades hand"} eyebrow="Play Spades" statusLabel="Trump" statusValue="Spades"
  tableAriaLabel="Spades hand table" {tableCards} showTable={!complete}
  pendingBySeat={!review && !complete && hand.currentPlayer === "You" ? { You: "You" } : {}}
  panelAriaLabel="Spades hand decision" {onBack} onSurfaceClick={review ? onNextTrick : undefined}>
  {#snippet summary()}
    {#if !complete}
      <div class="full-hand-summary grouped-play-summary" aria-label="Spades hand score">
        <div class="full-hand-summary-row current-hand whist-hand-summary" aria-label="Current hand">
          <span class="summary-row-label">Current hand</span>
          <div><span>Your side</span><strong>{guided ? `${tricks.playerSide} / ${bids.playerSide}` : tricks.playerSide}</strong></div>
          <div><span>Opponents</span><strong>{guided ? `${tricks.opponentSide} / ${bids.opponentSide}` : tricks.opponentSide}</strong></div>
          <div><span>Tricks</span><strong>{hand.completedTricks.length} / 13</strong></div>
          <div><span>{guided ? "Your bid" : "Bid"}</span><strong>{guided ? session.bids.You === 0 ? "Nil" : session.bids.You : spadesBidLabel(session.bids)}</strong></div>
        </div>
        {#if !guided}<div class="full-hand-summary-row table-score" aria-label="Spades match score">
          <span class="summary-row-label">Score to {spadesMatchTarget}</span>
          <div><span>You + Barbu</span><strong>{settlement.scores.playerSide}</strong></div>
          <div><span>Left + Right</span><strong>{settlement.scores.opponentSide}</strong></div>
          <div><span>Bags</span><strong>{settlement.bags.playerSide}-{settlement.bags.opponentSide}</strong></div>
        </div>{/if}
      </div>
    {/if}
  {/snippet}
  {#snippet panel()}
    {#if complete}
      <GameResult game="Spades" completion={!guided && matchComplete ? "match" : null} title={guided ? "Guided hand complete" : result.heading}
        summary={guided ? "All 13 tricks are played. Each side scores its bid, extra books and nil separately. Your saved match is unchanged." : result.summary} />
      {#if guided}<SpadesGuidedRecap {session} />{:else}
      <div class="hearts-result-stack" aria-label="Spades hand score">
        <div class="hearts-hand-breakdown" aria-label="Spades partnership breakdown">
          <div class="hearts-hand-breakdown-row whist-score-row header"><span>Partnership</span><span>Match</span><span>Tricks</span><span>Bid</span></div>
          <div class="hearts-hand-breakdown-row whist-score-row active"><span>You + Barbu</span><strong>{settlement.scores.playerSide}</strong><strong>{tricks.playerSide}</strong><strong>{bids.playerSide}</strong></div>
          <div class="hearts-hand-breakdown-row whist-score-row"><span>Left + Right</span><strong>{settlement.scores.opponentSide}</strong><strong>{tricks.opponentSide}</strong><strong>{bids.opponentSide}</strong></div>
        </div>
      </div>
      {/if}
    {:else if review}
      {#if guided}
        <ExerciseFeedback coach="barbu" reserveSpace eyebrow="Trick complete" title="Why this trick ended this way"
          result={guidedReview?.winning} resultAriaLabel="Trick winner explained"
          explanation={guidedReview ? `${guidedReview.scoring} ${guidedReview.choice}` : ""} outcome={guidedReview?.next} />
      {:else}
      <div class="lesson-heading"><p class="eyebrow">Trick complete</p><h2>Read the table</h2></div>
      <p class="outcome">{spadesTrickFeedback(hand.completedTricks.slice(0, session.fullHandReviewTrickCount), session.bids)}</p>
      {/if}
    {:else if opening && session.openingPanel === "bid" && !guided}
      <div class="lesson-heading"><p class="eyebrow">Before the first trick</p><h2>Adjust the bids</h2></div>
      <SpadesBids bids={session.bids} {onBid} />
    {:else}
      <ExerciseFeedback coach={guided ? "barbu" : undefined} reserveSpace={guided} eyebrow={opening ? "Before the first trick" : "Your turn"}
        title={opening ? "Read your hand" : "Choose your card"}
        result={guidance ? `Rule: ${guidance.rule}` : opening ? "Check your spades, likely winners, and weak suits before setting the table bid." : hand.prompt}
        explanation={guidance ? `Tactic: ${guidance.tip}` : ""} {error} />
      {#if guided && opening && session.openingPanel === "bid"}
        <div class="guided-bid-slot"><SpadesBids compact bids={session.bids} {onBid} /></div>
      {:else}
      <CardChoiceHand cards={hand.playerHand} ariaLabel="Your Spades hand" className="hand full-hand-cards"
        cardClassName="card hand-card full-hand-card"
        getCardClasses={card => opening ? { heart: card.suit === "H" } : {
          heart: card.suit === "H", legal: legal.has(card.id), illegal: !legal.has(card.id), selected: selectedCardId === card.id }}
        isPressed={card => !opening && selectedCardId === card.id} onSelect={card => { if (!opening) onSelect(card.id); }} />
      {/if}
    {/if}
    {#if error && (complete || review || (opening && session.openingPanel === "bid"))}<p class="outcome warning">{error}</p>{/if}
    {#if guided && complete}
      <GuidedHandActions {onReplay} {onBack} onIndependentPlay={onNextHand} />
    {:else}<div class="action-row">
      <button class="secondary-action" onclick={onBack} type="button">Table</button>
      {#if complete}
        {#if !matchComplete}<button class="secondary-action" onclick={onReplay} type="button">Replay</button>{/if}
        <button class="primary-action" disabled={dealing} onclick={onNextHand} type="button">{matchComplete ? "New match" : "Next hand"}</button>
      {:else if review}
        <button class="primary-action" onclick={onNextTrick} type="button">Next trick</button>
      {:else if opening}
        <button class="secondary-action" onclick={onToggleBids} type="button">{session.openingPanel === "bid" ? "Show cards" : "Adjust bid"}</button>
        <button class="primary-action" disabled={dealing} onclick={onStartPlay} type="button">Start hand</button>
      {:else}
        <button class="primary-action" disabled={dealing || !legal.has(selectedCardId)} onclick={onPlay} type="button">Play card</button>
      {/if}
    </div>{/if}
  {/snippet}
</TablePlaySurface>

<style>
  .guided-bid-slot { height: var(--flow-hand-height); min-height: 0; overflow-y: auto; margin-top: auto; }
</style>
