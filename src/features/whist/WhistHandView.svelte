<script lang="ts">
  import TablePlaySurface from "../../TablePlaySurface.svelte";
  import CardChoiceHand from "../../CardChoiceHand.svelte";
  import ExerciseFeedback from "../../ExerciseFeedback.svelte";
  import GameResult from "../../GameResult.svelte";
  import { formatCardLabel } from "../../cardDisplay";
  import { whistSessionSettlement, type WhistSession } from "../../domain/whistSession";
  import { whistOddProgress, whistResultCopy } from "../../whistScoring";
  import { whistPartnershipTrickCounts, whistTrickFeedback, whistTrumpSuitFromHandId } from "../../whistPresentation";
  import { whistOpeningLeadPracticeFeedback, whistOpeningLeadPracticeMaxRounds } from "./openingLeadPractice";

  let { session, selectedCardId, error = "", dealing = false, practiceRound,
    onBack, onSelect, onPlay, onNextTrick, onNextHand, onReplay }: {
    session: WhistSession; selectedCardId: string; error?: string; dealing?: boolean; practiceRound?: number;
    onBack: () => void; onSelect: (cardId: string) => void; onPlay: () => void;
    onNextTrick: () => void; onNextHand: () => void; onReplay: () => void;
  } = $props();
  let hand = $derived(session.fullHand);
  let complete = $derived(hand.status === "complete");
  let review = $derived(!complete && session.fullHandReviewTrickCount > 0
    ? hand.completedTricks[session.fullHandReviewTrickCount - 1] : undefined);
  let tableCards = $derived(review?.cards ?? hand.currentTrick);
  let legal = $derived(new Set(hand.legalCardIds));
  let tricks = $derived(whistPartnershipTrickCounts(hand.completedTricks));
  let odd = $derived(whistOddProgress(tricks));
  let settlement = $derived(whistSessionSettlement(session));
  let rubber = $derived(session.mode === "rubber");
  let result = $derived(whistResultCopy(settlement, tricks, session.mode));
  let completion = $derived(complete && settlement.gameComplete ? rubber && settlement.complete ? "rubber" : "game" : null);
  let trump = $derived(whistTrumpSuitFromHandId(hand.id));
  let turnedVisible = $derived(hand.whistTurnedTrump && hand.completedTricks.length === 0
    && !hand.currentTrick.some(play => play.seat === ["Tutor", "Right", "You", "Left"][hand.whistDealer ?? -1]));
</script>

<TablePlaySurface flowLayout mode={complete ? "result" : "play"} ariaLabel="Whist full hand"
  title="Whist hand" eyebrow={practiceRound === undefined ? "Play Whist" : "Whist practice"}
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
          <div><span>{practiceRound === undefined ? "Tricks" : "Lead"}</span><strong>{practiceRound === undefined ? `${hand.completedTricks.length} / 13` : `${practiceRound + 1} / ${whistOpeningLeadPracticeMaxRounds}`}</strong></div>
          <div><span>{practiceRound === undefined ? odd.label : "Focus"}</span><strong>{practiceRound === undefined ? odd.value : "Opening"}</strong></div>
        </div>
        <div class="full-hand-summary-row table-score" aria-label="Whist match score">
          <span class="summary-row-label">Game to 5</span>
          <div><span>You + Barbu</span><strong>{settlement.points.playerSide}</strong></div>
          <div><span>Left + Right</span><strong>{settlement.points.opponentSide}</strong></div>
          <div aria-label={rubber ? "Whist rubber games" : undefined}><span>{rubber ? "Games" : "Hands"}</span><strong>{rubber ? `${settlement.games.playerSide}-${settlement.games.opponentSide}` : session.results.length}</strong></div>
          {#if hand.whistDealer !== undefined}
            <div><span>Dealer</span><strong aria-label="Whist dealer">{["Barbu", "Right", "You", "Left"][hand.whistDealer]}{#if turnedVisible && hand.whistTurnedTrump} <b class="whist-turned-card" aria-label="Turned trump">{formatCardLabel(hand.whistTurnedTrump)}</b>{/if}</strong></div>
          {/if}
        </div>
      </div>
    {/if}
  {/snippet}
  {#snippet panel()}
    {#if complete}
      <GameResult game="Whist" {completion} title={result.heading} summary={result.summary} />
      <div class="hearts-result-stack" aria-label="Whist hand score">
        <div class="hearts-hand-breakdown" aria-label="Whist partnership breakdown">
          <div class="hearts-hand-breakdown-row whist-score-row header"><span>Partnership</span><span>Game</span><span>Tricks</span><span>Odd</span></div>
          <div class="hearts-hand-breakdown-row whist-score-row active"><span>You + Barbu</span><strong>{settlement.points.playerSide}</strong><strong>{tricks.playerSide}</strong><strong>{odd.playerSideOddTricks}</strong></div>
          <div class="hearts-hand-breakdown-row whist-score-row"><span>Left + Right</span><strong>{settlement.points.opponentSide}</strong><strong>{tricks.opponentSide}</strong><strong>{odd.opponentSideOddTricks}</strong></div>
        </div>
      </div>
    {:else if review}
      <div class="lesson-heading"><p class="eyebrow">Trick complete</p><h2>Read the table</h2></div>
      <p class="outcome">{practiceRound === undefined ? whistTrickFeedback(review) : whistOpeningLeadPracticeFeedback(review, hand, practiceRound)}</p>
      <p class="explanation">Check whether the trick stayed with your partnership, whether trump changed the winner, and who leads next.</p>
      {#if error}<p class="outcome warning">{error}</p>{/if}
    {:else}
      <ExerciseFeedback eyebrow="Your turn" title="Choose your card" result={hand.prompt} {error} />
      <CardChoiceHand cards={hand.playerHand} ariaLabel="Your Whist hand" className="hand full-hand-cards"
        cardClassName="card hand-card full-hand-card"
        getCardClasses={card => ({ heart: card.suit === "H", legal: legal.has(card.id), illegal: !legal.has(card.id), selected: selectedCardId === card.id })}
        isPressed={card => selectedCardId === card.id} onSelect={card => onSelect(card.id)} />
    {/if}
    <div class="action-row">
      <button class="secondary-action" onclick={onBack} type="button">Table</button>
      {#if complete}
        {#if !completion}<button class="secondary-action" onclick={onReplay} type="button">Replay</button>{/if}
        <button class="primary-action" disabled={dealing} onclick={onNextHand} type="button">{settlement.complete ? "New match" : settlement.gameComplete ? "Next game" : "Next hand"}</button>
      {:else if review}
        <button class="primary-action" onclick={onNextTrick} type="button">{practiceRound === undefined ? "Next trick" : practiceRound >= whistOpeningLeadPracticeMaxRounds - 1 ? "Finish session" : "Next lead"}</button>
      {:else}
        <button class="primary-action" disabled={dealing || !legal.has(selectedCardId)} onclick={onPlay} type="button">Play card</button>
      {/if}
    </div>
  {/snippet}
</TablePlaySurface>
