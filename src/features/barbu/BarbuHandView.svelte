<script lang="ts">
  import TablePlaySurface from "../../TablePlaySurface.svelte";
  import CardChoiceHand from "../../CardChoiceHand.svelte";
  import ExerciseFeedback from "../../ExerciseFeedback.svelte";
  import GameResult from "../../GameResult.svelte";
  import BarbuSessionResult from "./BarbuSessionResult.svelte";
  import type { FullHandState } from "../../lessonTypes";
  import { barbuSessionComplete, barbuSeatTotals, type BarbuSession } from "../../domain/barbuSession";
  import { fullHandContracts } from "../../contractRegistry";
  import { contractScoreMeta } from "../../contractScoring";
  import { formatSignedScore, scoreSeats, scoreSeatRunLabel } from "../../scorePresentation";
  import { noLastTwoPhaseLabel, noLastTwoPhaseValue, fullHandTrickFeedback, fullHandResultHeading,
    fullHandResultText, fullHandBestTrickLabel, fullHandWorstTrickLabel, formatHandValue } from "./barbuPresentation";

  let { hand, session, reviewCount = 0, selectedCardId = "", error = "", dealing = false,
    onBack, onSelect, onPlay, onNextTrick, onNextHand, onReplay, onReplayWeakest, onNewGame }: {
    hand: FullHandState; session?: BarbuSession; reviewCount?: number; selectedCardId?: string; error?: string; dealing?: boolean;
    onBack: () => void; onSelect: (cardId: string) => void; onPlay: () => void; onNextTrick: () => void;
    onNextHand: () => void; onReplay: () => void; onReplayWeakest?: () => void; onNewGame?: () => void;
  } = $props();
  let complete = $derived(hand.status === "complete");
  let runComplete = $derived(session ? barbuSessionComplete(session) : false);
  let scores = $derived(barbuSeatTotals(session?.results ?? []));
  let meta = $derived(contractScoreMeta(hand.contract));
  let review = $derived(!complete && reviewCount > 0 ? hand.completedTricks[reviewCount - 1] : undefined);
  let tableCards = $derived(review?.cards ?? (hand.currentTrick.length ? hand.currentTrick
    : complete ? hand.completedTricks.at(-1)?.cards ?? [] : []));
  let legal = $derived(new Set(hand.legalCardIds));
  let statusLabel = $derived(runComplete ? "Game complete" : session
    ? `Contract ${fullHandContracts.indexOf(hand.contract) + 1} of ${fullHandContracts.length}`
    : complete ? "Complete" : `Trick ${hand.trickNumber}`);
</script>

<TablePlaySurface flowLayout mode={complete ? "result" : "play"} ariaLabel={`${hand.contract} full hand`}
  title={`${hand.contract} hand`} eyebrow={session ? "Play Barbu" : "Contract hand"} {statusLabel}
  statusValue={formatHandValue(hand.playerPenalty, hand.contract)} tableAriaLabel={`${hand.contract} hand table`}
  {tableCards} showTable={!runComplete}
  pendingBySeat={!review && !complete && hand.currentTrick.length < 4 && hand.currentPlayer === "You" ? { You: "You" } : {}}
  panelAriaLabel={`${hand.contract} hand decision`} {onBack} onSurfaceClick={review ? onNextTrick : undefined}>
  {#snippet summary()}
    {#if !runComplete}
      <div class="full-hand-summary grouped-play-summary" aria-label={`${hand.contract} hand score`}>
        <div class:no-last-two={hand.contract === "No Last Two"} class="full-hand-summary-row current-hand" aria-label="Current hand">
          <span class="summary-row-label">Current hand</span>
          <div><span>{meta.playerValueLabel}</span><strong>{hand.playerPenalty}</strong></div>
          <div><span>{meta.inPlayLabel}</span><strong>{hand.totalPenalty} / {meta.totalValue}</strong></div>
          <div><span>Tricks</span><strong>{hand.completedTricks.length} / 13</strong></div>
          {#if hand.contract === "No Last Two"}
            <div><span>{noLastTwoPhaseLabel(hand)}</span><strong>{noLastTwoPhaseValue(hand)}</strong></div>
          {/if}
        </div>
        {#if session}
          <div class="full-hand-summary-row table-score" aria-label="Table scores">
            <span class="summary-row-label">Table scores</span>
            {#each scoreSeats as seat}<div><span>{scoreSeatRunLabel(seat)} score</span><strong>{formatSignedScore(scores[seat])}</strong></div>{/each}
          </div>
        {/if}
      </div>
    {:else}
      <div class="full-hand-summary compact-run-complete" aria-label={`${hand.contract} hand score`}>
        {#each scoreSeats as seat}<div><span>{scoreSeatRunLabel(seat)} score</span><strong>{formatSignedScore(scores[seat])}</strong></div>{/each}
      </div>
    {/if}
  {/snippet}
  {#snippet panel()}
    {#if complete}
      {#if runComplete && session}
        <BarbuSessionResult {session} />
      {:else}
        <GameResult game={hand.contract} completion={null} title={fullHandResultHeading(hand)} summary={fullHandResultText(hand)} />
        <div class="full-hand-result-tricks" aria-label={`${hand.contract} key tricks`}>
          <div><span>{meta.bestLabel}</span><strong>{fullHandBestTrickLabel(hand)}</strong></div>
          <div><span>{meta.weakestLabel}</span><strong>{fullHandWorstTrickLabel(hand)}</strong></div>
        </div>
      {/if}
    {:else if review}
      <div class="lesson-heading"><p class="eyebrow">Trick complete</p><h2>Read the table</h2></div>
      <p class:warning={meta.kind === "avoidance" && review.outcome === "captured_penalty"} class="outcome">{fullHandTrickFeedback(review, hand)}</p>
      <p class="explanation">{hand.contract === "No Last Two"
        ? "Check the trick number first. Tap the table or press Next trick when you are ready."
        : "Left's card is on the table. Tap the table or press Next trick when you are ready."}</p>
    {:else}
      <ExerciseFeedback eyebrow="Your turn" title="Choose your card" result={hand.prompt} {error} />
      <CardChoiceHand cards={hand.playerHand} ariaLabel={`Your ${hand.contract} hand`} className="hand full-hand-cards"
        cardClassName="card hand-card full-hand-card"
        getCardClasses={card => ({ heart: card.suit === "H", legal: legal.has(card.id), illegal: !legal.has(card.id), selected: selectedCardId === card.id })}
        isPressed={card => selectedCardId === card.id} onSelect={card => onSelect(card.id)} />
    {/if}
    {#if error && (complete || review)}<p class="error" role="alert">{error}</p>{/if}
    <div class="action-row">
      <button class="secondary-action" onclick={onBack} type="button">Table</button>
      {#if complete}
        {#if runComplete}
          <button class="secondary-action" onclick={onReplayWeakest} type="button">Replay weakest</button>
          <button class="primary-action" disabled={dealing} onclick={onNewGame} type="button">New game</button>
        {:else}
          <button class="secondary-action" onclick={onReplay} type="button">Replay</button>
          <button class="primary-action" disabled={dealing} onclick={onNextHand} type="button">{session ? "Next contract" : "Try another"}</button>
        {/if}
      {:else if review}
        <button class="primary-action" onclick={onNextTrick} type="button">Next trick</button>
      {:else}
        <button class="primary-action" disabled={dealing || !legal.has(selectedCardId)} onclick={onPlay} type="button">Play card</button>
      {/if}
    </div>
  {/snippet}
</TablePlaySurface>
