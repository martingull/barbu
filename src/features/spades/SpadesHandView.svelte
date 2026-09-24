<script lang="ts">
  import TablePlaySurface from "../../TablePlaySurface.svelte";
  import CardChoiceHand from "../../CardChoiceHand.svelte";
  import ExerciseFeedback from "../../ExerciseFeedback.svelte";
  import GameResult from "../../GameResult.svelte";
  import SpadesBids from "./SpadesBids.svelte";
  import { spadesSessionSettlement, spadesSessionComplete, type SpadesSession } from "../../domain/spadesSession";
  import { spadesSideBid, spadesPlayerSideSeats, spadesOpponentSideSeats, spadesMatchTarget } from "../../spadesScoring";
  import { spadesTrickFeedback } from "../../spadesFeedback";
  import { whistPartnershipTrickCounts } from "../../whistPresentation";
  import { spadesBidLabel, spadesResultCopy } from "./spadesPresentation";
  let { session, selectedCardId, error, dealing, onBack, onSelect, onPlay, onNextTrick, onNextHand, onReplay, onBid, onToggleBids, onStartPlay }: {
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
  let tricks = $derived(whistPartnershipTrickCounts(hand.completedTricks));
  let bids = $derived({ playerSide: spadesSideBid(session.bids, spadesPlayerSideSeats),
    opponentSide: spadesSideBid(session.bids, spadesOpponentSideSeats) });
  let settlement = $derived(spadesSessionSettlement(session));
  let matchComplete = $derived(spadesSessionComplete(session));
  let result = $derived(spadesResultCopy(settlement.result, settlement.scores, matchComplete));
</script>

<TablePlaySurface flowLayout mode={complete ? "result" : "play"} ariaLabel="Spades full hand"
  title="Spades hand" eyebrow="Play Spades" statusLabel="Trump" statusValue="Spades"
  tableAriaLabel="Spades hand table" {tableCards} showTable={!complete}
  pendingBySeat={!review && !complete && hand.currentPlayer === "You" ? { You: "You" } : {}}
  panelAriaLabel="Spades hand decision" {onBack} onSurfaceClick={review ? onNextTrick : undefined}>
  {#snippet summary()}
    {#if !complete}
      <div class="full-hand-summary grouped-play-summary" aria-label="Spades hand score">
        <div class="full-hand-summary-row current-hand whist-hand-summary" aria-label="Current hand">
          <span class="summary-row-label">Current hand</span>
          <div><span>Your side</span><strong>{tricks.playerSide}</strong></div>
          <div><span>Opponents</span><strong>{tricks.opponentSide}</strong></div>
          <div><span>Tricks</span><strong>{hand.completedTricks.length} / 13</strong></div>
          <div><span>Bid</span><strong>{spadesBidLabel(session.bids)}</strong></div>
        </div>
        <div class="full-hand-summary-row table-score" aria-label="Spades match score">
          <span class="summary-row-label">Score to {spadesMatchTarget}</span>
          <div><span>You + Barbu</span><strong>{settlement.scores.playerSide}</strong></div>
          <div><span>Left + Right</span><strong>{settlement.scores.opponentSide}</strong></div>
          <div><span>Bags</span><strong>{settlement.bags.playerSide}-{settlement.bags.opponentSide}</strong></div>
        </div>
      </div>
    {/if}
  {/snippet}
  {#snippet panel()}
    {#if complete}
      <GameResult game="Spades" completion={matchComplete ? "match" : null} title={result.heading} summary={result.summary} />
      <div class="hearts-result-stack" aria-label="Spades hand score">
        <div class="hearts-hand-breakdown" aria-label="Spades partnership breakdown">
          <div class="hearts-hand-breakdown-row whist-score-row header"><span>Partnership</span><span>Match</span><span>Tricks</span><span>Bid</span></div>
          <div class="hearts-hand-breakdown-row whist-score-row active"><span>You + Barbu</span><strong>{settlement.scores.playerSide}</strong><strong>{tricks.playerSide}</strong><strong>{bids.playerSide}</strong></div>
          <div class="hearts-hand-breakdown-row whist-score-row"><span>Left + Right</span><strong>{settlement.scores.opponentSide}</strong><strong>{tricks.opponentSide}</strong><strong>{bids.opponentSide}</strong></div>
        </div>
      </div>
    {:else if review}
      <div class="lesson-heading"><p class="eyebrow">Trick complete</p><h2>Read the table</h2></div>
      <p class="outcome">{spadesTrickFeedback(hand.completedTricks.slice(0, session.fullHandReviewTrickCount), session.bids)}</p>
    {:else if opening && session.openingPanel === "bid"}
      <div class="lesson-heading"><p class="eyebrow">Before the first trick</p><h2>Adjust the bids</h2></div>
      <SpadesBids bids={session.bids} {onBid} />
    {:else}
      <ExerciseFeedback eyebrow={opening ? "Before the first trick" : "Your turn"}
        title={opening ? "Read your hand" : "Choose your card"}
        result={opening ? "Check your spades, likely winners, and weak suits before setting the table bid." : hand.prompt} {error} />
      <CardChoiceHand cards={hand.playerHand} ariaLabel="Your Spades hand" className="hand full-hand-cards"
        cardClassName="card hand-card full-hand-card"
        getCardClasses={card => opening ? { heart: card.suit === "H" } : {
          heart: card.suit === "H", legal: legal.has(card.id), illegal: !legal.has(card.id), selected: selectedCardId === card.id }}
        isPressed={card => !opening && selectedCardId === card.id} onSelect={card => { if (!opening) onSelect(card.id); }} />
    {/if}
    {#if error && (complete || review || (opening && session.openingPanel === "bid"))}<p class="outcome warning">{error}</p>{/if}
    <div class="action-row">
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
    </div>
  {/snippet}
</TablePlaySurface>
