<script lang="ts">
  import TablePlaySurface from "../../TablePlaySurface.svelte";
  import BridgeTable from "../../BridgeTable.svelte";
  import CardChoiceHand from "../../CardChoiceHand.svelte";
  import ExerciseFeedback from "../../ExerciseFeedback.svelte";
  import GameResult from "../../GameResult.svelte";
  import { bridgeSessionSettlement, type BridgeSession } from "../../domain/bridgeSession";
  import { bridgeDeclarerTrickCounts } from "../../domain/bridgeScoring";
  import { bridgeSideForSeat } from "../../domain/bridgeAuction";
  import { formatSignedScore } from "../../scorePresentation";
  import { bridgeActiveHand, bridgeSeatLabel, bridgePartnershipLabel, bridgeResultCopy, bridgeReviewFeedback } from "./bridgePresentation";
  let { session, selectedCardId, error, dealing, onBack, onSelect, onPlay, onNextTrick, onNextHand, onReplay }: {
    session: BridgeSession; selectedCardId: string; error: string; dealing: boolean;
    onBack: () => void; onSelect: (id: string) => void; onPlay: () => void;
    onNextTrick: () => void; onNextHand: () => void; onReplay: () => void;
  } = $props();
  let hand = $derived(session.fullHand);
  let contract = $derived(hand.bridgeContract!);
  let complete = $derived(hand.status === "complete");
  let active = $derived(bridgeActiveHand(hand));
  let legal = $derived(new Set(active.legalCardIds));
  let review = $derived(!complete && session.fullHandReviewTrickCount > 0
    ? hand.completedTricks[session.fullHandReviewTrickCount - 1] : undefined);
  let tableCards = $derived(review?.cards ?? (hand.currentTrick.length ? hand.currentTrick : complete ? hand.completedTricks.at(-1)?.cards ?? [] : []));
  let pending = $derived(!review && !complete ? hand.currentPlayer === "You" ? { You: "You" }
    : hand.currentPlayer === "Tutor" ? { Tutor: "Dummy" } : {} : {});
  let tricks = $derived(bridgeDeclarerTrickCounts(hand));
  let settlement = $derived(bridgeSessionSettlement(session));
  let result = $derived(bridgeResultCopy(hand, settlement.scores));
  let ledSuit = $derived(hand.currentTrick[0]?.card.suit);
  const suitNames = { C: "Clubs", D: "Diamonds", H: "Hearts", S: "Spades" };
  let prompt = $derived(ledSuit ? `Led: ${suitNames[ledSuit]}. Follow suit if you can.`
    : hand.completedTricks.length === 0 ? "Make the opening lead." : "Lead any card.");
  let activeLabel = $derived(`${bridgeSeatLabel(active.isDummyTurn ? active.dummySeat : "You")} · ${active.isDummyTurn || active.dummySeat === "You" ? "Dummy" : active.declares ? "Declarer" : "Defender"}`);
</script>

<TablePlaySurface flowLayout mode={complete ? "result" : "play"} ariaLabel="Bridge full hand"
  title="Bridge hand" eyebrow="Play Bridge" statusLabel="Contract" statusValue={contract.label}
  tableAriaLabel="Bridge hand table" pendingBySeat={pending} surfaceClassName="bridge-play-surface"
  showTable={!complete} {tableCards} tableVariant="bridge" panelAriaLabel="Bridge hand decision"
  {onBack} onSurfaceClick={review ? onNextTrick : undefined} useCustomTable>
  {#snippet table()}
    <BridgeTable ariaLabel="Bridge hand table" dummyHand={hand.dummyHand} playerHand={hand.playerHand}
      dummySeat={active.dummySeat} declarerSeat={active.declarerSeat} isDummyTurn={active.isDummyTurn}
      isReviewing={!!review} pendingBySeat={pending} {tableCards} />
  {/snippet}
  {#snippet summary()}
    {#if !complete}
      <div class="full-hand-summary grouped-play-summary bridge-play-summary" aria-label="Bridge hand score">
        <div class="full-hand-summary-row current-hand bridge-current-hand-row" aria-label="Current hand">
          <div><span>Declarer</span><strong>{tricks.declarer}</strong></div>
          <div><span>Defense</span><strong>{tricks.defenders}</strong></div>
          <div><span>Tricks</span><strong>{hand.completedTricks.length} / 13</strong></div>
          <div><span>Target</span><strong>{contract.target}</strong></div>
        </div>
        <div class="full-hand-summary-row table-score bridge-duplicate-row" aria-label="Bridge score">
          <div><span>NS</span><strong>{formatSignedScore(settlement.scores.ns)}</strong></div>
          <div><span>EW</span><strong>{formatSignedScore(settlement.scores.ew)}</strong></div>
          <div><span>Board</span><strong>{hand.bridgeBoardNumber ?? session.results.length + 1}</strong></div>
          <div><span>Score</span><strong>{settlement.result ? formatSignedScore(settlement.result.score) : "Playing"}</strong></div>
        </div>
      </div>
    {/if}
  {/snippet}
  {#snippet panel()}
    {#if complete}
      <GameResult game="Bridge" completion="board" title={result.heading} summary={result.summary} />
      <div class="hearts-result-stack" aria-label="Bridge hand score">
        <div class="hearts-hand-breakdown" aria-label="Bridge contract breakdown">
          <div class="hearts-hand-breakdown-row whist-score-row header">
            <span>Contract</span><span>Target</span><span>Declarer</span><span>Defense</span>
          </div>
          <div class="hearts-hand-breakdown-row whist-score-row active">
            <span>{contract.label}</span><strong>{contract.target}</strong><strong>{tricks.declarer}</strong><strong>{tricks.defenders}</strong>
          </div>
          <div class="hearts-hand-breakdown-row whist-score-row">
            <span>{bridgePartnershipLabel(contract.declarerSide ?? bridgeSideForSeat(contract.declarer))}</span>
            <strong>{contract.vulnerability}</strong><strong>{formatSignedScore(settlement.result?.score ?? 0)}</strong><strong>{bridgeSeatLabel(contract.declarer)}</strong>
          </div>
          <div class="hearts-hand-breakdown-row whist-score-row">
            <span>Score</span><strong>NS {formatSignedScore(settlement.scores.ns)}</strong><strong>EW {formatSignedScore(settlement.scores.ew)}</strong>
            <strong>Board {hand.bridgeBoardNumber ?? session.results.length + 1}</strong>
          </div>
        </div>
      </div>
    {:else if review}
      <div class="lesson-heading"><p class="eyebrow">Trick complete</p><h2>Read the table</h2></div>
      <p class="outcome">{bridgeReviewFeedback(review, contract)}</p>
      <p class="explanation">Check who won and press Next trick when ready.</p>
    {:else}
      <div class:bridge-dummy-turn-feedback={active.isDummyTurn} class="bridge-play-feedback">
        <ExerciseFeedback eyebrow="Your turn" title={active.isDummyTurn ? "Play from dummy" : active.declares ? "Play as declarer" : "Defend the contract"}
          result={prompt} {error} />
        <div class="bridge-active-hand-label">{activeLabel}</div>
      </div>
      <CardChoiceHand cards={active.cards} ariaLabel={active.isDummyTurn ? `${bridgeSeatLabel(active.dummySeat)} dummy hand` : "South Bridge hand"}
        className="hand full-hand-cards bridge-thumb-hand" cardClassName="card hand-card full-hand-card"
        getCardClasses={card => ({ heart: card.suit === "H", legal: legal.has(card.id), illegal: !legal.has(card.id), selected: selectedCardId === card.id })}
        isPressed={card => selectedCardId === card.id} onSelect={card => onSelect(card.id)} />
    {/if}
    {#if error && (complete || review)}<p class="outcome warning">{error}</p>{/if}
    <div class="action-row">
      <button class="secondary-action" onclick={onBack} type="button">Table</button>
      {#if complete}
        <button class="secondary-action" onclick={onReplay} type="button">Replay</button>
        <button class="primary-action" disabled={dealing} onclick={onNextHand} type="button">Next board</button>
      {:else if review}
        <button class="primary-action" onclick={onNextTrick} type="button">Next trick</button>
      {:else}
        <button class="primary-action" disabled={dealing || !legal.has(selectedCardId)} onclick={onPlay} type="button">Play card</button>
      {/if}
    </div>
  {/snippet}
</TablePlaySurface>
