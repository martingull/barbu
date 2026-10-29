<script lang="ts">
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import GameResult from "../../components/GameResult.svelte";
  import GuidedHandActions from "../../components/GuidedHandActions.svelte";
  import WhistGuidedRecap from "./WhistGuidedRecap.svelte";
  import { whistLearningPosition } from "../../domain/whistLearning";
  import { whistGuidance, whistGuidedReview } from "./whistGuidance";
  import { formatCardLabel } from "../../presentation/cardDisplay";
  import { whistSessionSettlement, type WhistSession } from "../../domain/whistSession";
  import { whistOddProgress, whistResultCopy, whistTrickFeedback, whistTrumpSuitFromHandId } from "./whistPresentation";
  import { partnershipTrickCounts } from "../../domain/trickTakingScore";

  let { session, selectedCardId, error = "", dealing = false, guided = false,
    onBack, onSelect, onPlay, onNextTrick, onNextHand, onReplay }: {
    session: WhistSession; selectedCardId: string; error?: string; dealing?: boolean; guided?: boolean;
    onBack: () => void; onSelect: (cardId: string) => void; onPlay: () => void;
    onNextTrick: () => void; onNextHand: () => void; onReplay: () => void;
  } = $props();
  let hand = $derived(session.fullHand);
  let complete = $derived(hand.status === "complete");
  let review = $derived(!complete && session.fullHandReviewTrickCount > 0
    ? hand.completedTricks[session.fullHandReviewTrickCount - 1] : undefined);
  let tableCards = $derived(review?.cards ?? hand.currentTrick);
  let legal = $derived(new Set(hand.legalCardIds));
  let tricks = $derived(partnershipTrickCounts(hand.completedTricks));
  let odd = $derived(whistOddProgress(tricks));
  let settlement = $derived(whistSessionSettlement(session));
  let rubber = $derived(session.mode === "rubber");
  let result = $derived(whistResultCopy(settlement, tricks, session.mode));
  let completion = $derived(complete && settlement.gameComplete ? rubber && settlement.complete ? "rubber" : "game" : null);
  let trump = $derived(whistTrumpSuitFromHandId(hand.id));
  let turnedVisible = $derived(hand.whistTurnedTrump && hand.completedTricks.length === 0
    && !hand.currentTrick.some(play => play.seat === ["Tutor", "Right", "You", "Left"][hand.whistDealer ?? -1]));
  let position = $derived(whistLearningPosition(hand));
  let guidance = $derived(guided ? whistGuidance(position) : null);
  let guidedReview = $derived(guided && review ? whistGuidedReview(hand.completedTricks.slice(0, session.fullHandReviewTrickCount), position.trump) : null);
</script>

<TablePlaySurface flowLayout stableFeedback={guided} mode={complete ? "result" : "play"} ariaLabel="Whist full hand"
  title={guided ? "Guided Whist" : "Whist hand"} eyebrow="Play Whist"
  statusLabel="Trump" statusValue={trump ? { C: "Clubs", D: "Diamonds", H: "Hearts", S: "Spades" }[trump] : "No trump"}
  tableAriaLabel="Whist hand table" {tableCards} showTable={!complete}
  pendingBySeat={!review && !complete && hand.currentPlayer === "You" ? { You: "You" } : {}}
  panelAriaLabel="Whist hand decision" {onBack} onSurfaceClick={review ? onNextTrick : undefined}>
  {#snippet summary()}
    {#if !complete}
      <div class="full-hand-summary grouped-play-summary" aria-label="Whist hand score">
        <div class="full-hand-summary-row current-hand whist-hand-summary" aria-label="Current hand">
          <span class="summary-row-label">Current hand</span>
          <div><span>Your side</span><strong>{tricks.playerSide}</strong></div>
          <div><span>Opponents</span><strong>{tricks.opponentSide}</strong></div>
          <div><span>Tricks</span><strong>{hand.completedTricks.length} / 13</strong></div>
          <div><span>{odd.label}</span><strong>{odd.value}</strong></div>
        </div>
        {#if !guided}<div class="full-hand-summary-row table-score" aria-label="Whist match score">
          <span class="summary-row-label">Game to 5</span>
          <div><span>You + Barbu</span><strong>{settlement.points.playerSide}</strong></div>
          <div><span>Left + Right</span><strong>{settlement.points.opponentSide}</strong></div>
          <div aria-label={rubber ? "Whist rubber games" : undefined}><span>{rubber ? "Games" : "Hands"}</span><strong>{rubber ? `${settlement.games.playerSide}-${settlement.games.opponentSide}` : session.results.length}</strong></div>
          {#if hand.whistDealer !== undefined}
            <div><span>Dealer</span><strong aria-label="Whist dealer">{["Barbu", "Right", "You", "Left"][hand.whistDealer]}{#if turnedVisible && hand.whistTurnedTrump} <b class="whist-turned-card" aria-label="Turned trump">{formatCardLabel(hand.whistTurnedTrump)}</b>{/if}</strong></div>
          {/if}
        </div>{/if}
      </div>
    {/if}
  {/snippet}
  {#snippet panel()}
    {#if complete}
      <GameResult game="Whist" completion={guided ? null : completion} title={guided ? "Guided hand complete" : result.heading}
        summary={guided ? "All 13 tricks are played. You and Barbu score together; only tricks above six earn points." : result.summary} />
      {#if guided}<WhistGuidedRecap {hand} />{:else}
      <div class="hearts-result-stack" aria-label="Whist hand score">
        <div class="hearts-hand-breakdown" aria-label="Whist partnership breakdown">
          <div class="hearts-hand-breakdown-row whist-score-row header"><span>Partnership</span><span>Game</span><span>Tricks</span><span>Odd</span></div>
          <div class="hearts-hand-breakdown-row whist-score-row active"><span>You + Barbu</span><strong>{settlement.points.playerSide}</strong><strong>{tricks.playerSide}</strong><strong>{odd.playerSideOddTricks}</strong></div>
          <div class="hearts-hand-breakdown-row whist-score-row"><span>Left + Right</span><strong>{settlement.points.opponentSide}</strong><strong>{tricks.opponentSide}</strong><strong>{odd.opponentSideOddTricks}</strong></div>
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
      <p class="outcome">{whistTrickFeedback(review)}</p>
      <p class="explanation">Check whether the trick stayed with your partnership, whether trump changed the winner, and who leads next.</p>
      {/if}
      {#if error}<p class="outcome warning">{error}</p>{/if}
    {:else}
      <ExerciseFeedback coach={guided ? "barbu" : undefined} reserveSpace={guided} eyebrow="Your turn" title="Choose your card"
        result={guidance ? `Rule: ${guidance.rule}` : hand.prompt} explanation={guidance ? `Tactic: ${guidance.tip}` : ""} {error} />
      <CardChoiceHand cards={hand.playerHand} ariaLabel="Your Whist hand" className="hand full-hand-cards"
        cardClassName="card hand-card full-hand-card"
        getCardClasses={card => ({ heart: card.suit === "H", legal: legal.has(card.id), illegal: !legal.has(card.id), selected: selectedCardId === card.id })}
        isPressed={card => selectedCardId === card.id} onSelect={card => onSelect(card.id)} />
    {/if}
    {#if guided && complete}
      <GuidedHandActions {onReplay} {onBack} onIndependentPlay={onNextHand} />
    {:else}<div class="action-row">
      <button class="secondary-action" onclick={onBack} type="button">Table</button>
      {#if complete}
        {#if !completion}<button class="secondary-action" onclick={onReplay} type="button">Replay</button>{/if}
        <button class="primary-action" disabled={dealing} onclick={onNextHand} type="button">{settlement.complete ? "New match" : settlement.gameComplete ? "Next game" : "Next hand"}</button>
      {:else if review}
        <button class="primary-action" onclick={onNextTrick} type="button">Next trick</button>
      {:else}
        <button class="primary-action" disabled={dealing || !legal.has(selectedCardId)} onclick={onPlay} type="button">Play card</button>
      {/if}
    </div>{/if}
  {/snippet}
</TablePlaySurface>
