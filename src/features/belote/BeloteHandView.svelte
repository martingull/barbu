<script lang="ts">
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardTable from "../../components/CardTable.svelte";
  import CardFace from "../../components/CardFace.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import GameResult from "../../components/GameResult.svelte";
  import GuidedHandActions from "../../components/GuidedHandActions.svelte";
  import { beloteComplete, belotePosition, type BeloteSession, type BeloteAction } from "../../domain/beloteSession";
  import { beloteSide, beloteSuits, legalBeloteCards, type BeloteSeat } from "../../domain/beloteRules";
  import { beloteGuidance } from "../../domain/beloteLearning";
  import { trickTakingSeats } from "../../domain/trickTakingScore";
  import { compareBeloteCards, beloteSeatNames, beloteSuitNames } from "../../presentation/beloteDisplay";
  import { compassSeatLabels, suitSymbol, formatCardText } from "../../presentation/cardDisplay";
  import { beloteTrickFeedback, beloteResultText, beloteLivePoints } from "./belotePresentation";

  let { session, selectedCardId, error, guided = false, onSelect, onAction, onBack, onNext, onReplay, onNew }: {
    session: BeloteSession; selectedCardId: string; error: string; guided?: boolean;
    onSelect: (id: string) => void; onAction: (action: BeloteAction) => void; onBack: () => void;
    onNext: () => void; onReplay: () => void; onNew: () => void;
  } = $props();
  let hand = $derived(session.hand);
  let trump = $derived(hand.contract?.trump ?? hand.upcard.suit);
  let calling = $derived(hand.phase === "calling");
  let finished = $derived(hand.phase === "complete" || hand.phase === "passed_out");
  let gameOver = $derived(beloteComplete(session));
  let review = $derived(hand.phase === "review" ? hand.completedTricks.at(-1) : undefined);
  let tableCards = $derived((review?.cards ?? hand.currentTrick).map(play => ({ seat: trickTakingSeats[play.seat], card: play.card })));
  let legal = $derived(new Set(hand.phase === "playing" && hand.turn === 2 ? legalBeloteCards(hand.hands[2], hand.currentTrick, trump, 2).map(card => card.id) : []));
  let roles = $derived(Object.fromEntries(trickTakingSeats.map((seat, index) => [seat, hand.contract
    ? hand.contract.taker === index ? "Taker" : beloteSide(index as BeloteSeat) === beloteSide(hand.contract.taker) ? "Taking side" : "Defender"
    : index === hand.dealer ? "Dealer" : ""])));
  let guidance = $derived(beloteGuidance(belotePosition(hand, 2)));
  let points = $derived(beloteLivePoints(hand));
  let calls = $derived(hand.round === 1 ? [hand.upcard.suit] : beloteSuits.filter(s => s !== hand.upcard.suit));
  let result = $derived(hand.result);
  let announcement = $derived(hand.announcements.at(-1));
</script>

<TablePlaySurface flowLayout stableFeedback mode={finished ? "result" : "play"} title={guided ? "Guided Belote" : "Belote"}
  ariaLabel="Belote hand" statusLabel={calling ? "Taking" : "Trump"} statusValue={calling ? `Round ${hand.round}` : beloteSuitNames[trump]}
  {onBack} showTable={!finished} useCustomTable {tableCards} tableAriaLabel="Belote table" panelAriaLabel="Belote decisions" surfaceClassName="belote-surface">
  {#snippet summary()}
    <div class="full-hand-summary grouped-play-summary" aria-label="Belote score">
      <div class="full-hand-summary-row current-hand" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        <div><span>You + North</span><strong>{session.scores[0]}</strong></div><div><span>East + West</span><strong>{session.scores[1]}</strong></div>
        <div><span>Card points</span><strong>{points[0]} / {points[1]}</strong></div><div><span>Tricks</span><strong>{hand.completedTricks.length} / 8</strong></div>
      </div>
      <p class="contract-copy">{hand.contract ? `${beloteSeatNames[hand.contract.taker]} took ${suitSymbol(trump)}. Takers: ${beloteSide(hand.contract.taker) === 0 ? "South + North" : "East + West"}.` : `${beloteSeatNames[hand.dealer]} deals. You are South; partner North.`} Anticlockwise. Target 1,000{session.carry ? `; litige pot ${session.carry}` : ""}.</p>
    </div>
  {/snippet}
  {#snippet table()}
    {#if calling}
      <div class="belote-taking-table" aria-label="Belote taking table">
        <div class="upcard"><span>{hand.round === 1 ? "Upcard" : "Turned down"}</span><div><CardFace card={hand.upcard} /></div></div>
        <ol aria-label="Belote calls">{#each hand.calls as call}<li>{beloteSeatNames[call.seat]}: {call.trump ? `Take ${suitSymbol(call.trump)}` : "Pass"}</li>{/each}</ol>
      </div>
    {:else}
      <CardTable ariaLabel="Belote card table" {tableCards} seatLabels={compassSeatLabels} seatRoleLabels={roles}
        pendingBySeat={hand.phase === "playing" ? { [trickTakingSeats[hand.turn]]: "To play" } : {}} />
    {/if}
  {/snippet}
  {#snippet panel()}
    {#if finished}
      <GameResult game="Belote" completion={!guided && gameOver ? "game" : null}
        title={guided ? "Guided deal complete" : gameOver ? session.scores[0] > session.scores[1] ? "Your partnership wins" : "East and West win" : hand.phase === "passed_out" ? "Deal passed out" : "Deal complete"}
        summary={beloteResultText(hand)} />
      {#if result}
        <div class="belote-calculation" aria-label="Belote score calculation">
          <table><thead><tr><th>Points</th><th>You + North</th><th>East + West</th></tr></thead><tbody>
            <tr><th>Cards + last trick</th><td>{result.cardPoints[0]}</td><td>{result.cardPoints[1]}</td></tr>
            <tr><th>Belote</th><td>{result.belote[0]}</td><td>{result.belote[1]}</td></tr>
            <tr><th>After settlement</th><td>{result.awarded[0]}</td><td>{result.awarded[1]}</td></tr>
            <tr><th>Match total</th><td>{session.scores[0]}</td><td>{session.scores[1]}</td></tr>
          </tbody></table>
        </div>
      {/if}
      {#if guided}
        <p class="explanation">Your saved match is unchanged.</p>
        <GuidedHandActions {onBack} {onReplay} onIndependentPlay={onNext} />
      {:else}
        <div class="action-row">{#if !gameOver}<button class="secondary-action" type="button" onclick={onReplay}>Replay deal</button>{/if}
          <button class="primary-action" type="button" onclick={gameOver ? onNew : onNext}>{gameOver ? "New game" : "Next deal"}</button></div>
      {/if}
    {:else}
      <ExerciseFeedback coach="barbu" reserveSpace eyebrow={review ? "Trick review" : guided ? "Your turn" : "Belote"}
        title={review ? "Read the trick" : "Choose your move"} result={review ? beloteTrickFeedback(hand) : formatCardText(guidance.rule)}
        explanation={guided ? review ? "The winner leads next. Count the card values, not just the number of tricks." : formatCardText(guidance.tip) : announcement ? `${beloteSeatNames[announcement.seat]}: ${announcement.label}` : ""} />
      <div class="belote-hand-area">
        <CardChoiceHand cards={hand.hands[2]} ariaLabel="Your Belote hand" className="hand full-hand-cards" cardClassName="card hand-card full-hand-card"
          compareCards={compareBeloteCards(trump)} onSelect={card => { if (legal.has(card.id)) onSelect(card.id); }} readonly={calling || Boolean(review)}
          isPressed={card => selectedCardId === card.id} getCardClasses={card => ({ legal: legal.has(card.id), illegal: hand.phase === "playing" && !legal.has(card.id), selected: selectedCardId === card.id })} />
      </div>
      {#if error}<p class="warning" role="alert">{error}</p>{/if}
      <div class="action-row belote-actions" aria-label="Belote turn actions" style:grid-template-columns={`repeat(${calling ? calls.length + 1 : 1}, minmax(0,1fr))`}>
        {#if calling}
          <button class="secondary-action" type="button" onclick={() => onAction({ type: "pass" })}>Pass</button>
          {#each calls as suit}<button class="primary-action" type="button" onclick={() => onAction({ type: "take", trump: suit })}>Take {suitSymbol(suit)}</button>{/each}
        {:else if review}<button class="primary-action" type="button" onclick={() => onAction({ type: "next-trick" })}>Next trick</button>
        {:else}<button class="primary-action" type="button" disabled={!legal.has(selectedCardId)} onclick={() => onAction({ type: "play-card", cardId: selectedCardId })}>Play card</button>{/if}
      </div>
    {/if}
  {/snippet}
</TablePlaySurface>

<style>
  .belote-taking-table { height: 100%; width: 100%; display: flex; align-items: center; justify-content: center; gap: 24px; background: #386b54; border: 1px solid #9cb3a0; border-radius: 6px; padding: 10px; color: #f7faf3; }
  .upcard { flex: none; width: 60px; display: grid; gap: 4px; text-align: center; font-size: 0.7rem; }
  .upcard > div { width: 60px; aspect-ratio: 1 / 1.452; }
  ol { margin: 0; padding-left: 20px; max-height: 100%; overflow-y: auto; font-size: 0.75rem; }
  .belote-actions { display: grid; grid-template-columns: repeat(auto-fit,minmax(0,1fr)); gap: 6px; }
  .belote-actions button { padding-inline: 4px; font-size: 0.85rem; min-height: 44px; }
  .belote-calculation { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 0.8rem; color: #f5f1cf; }
  th, td { padding: 6px 3px; text-align: right; overflow-wrap: anywhere; border-bottom: 1px solid #ffffff26; }
  th:first-child { text-align: left; }
  .contract-copy { grid-column: 1 / -1; color: #c8d8ca; font-size: 0.7rem; line-height: 1.35; margin: 0; height: 2.7em; overflow-y: auto; }
  :global(.app-shell.fixed-play-screen .table-play-surface.belote-surface.flow-play.compact-play.stable-feedback) {
    --flow-card-width: min(64px, calc((100vw - 50px) / 4), max(40px, calc((100dvh - 368px) / 5)));
    --flow-hand-height: calc(var(--flow-card-width) * 2.904 + 6px);
    --flow-feedback-height: clamp(64px, 11dvh, 110px);
    --flow-panel-space: calc(var(--flow-feedback-height) + 70px);
  }
  .belote-hand-area { height: var(--flow-hand-height); flex: none; }
  :global(.app-shell.fixed-play-screen .table-play-surface.belote-surface.flow-play.compact-play .table-play-panel .full-hand-cards) {
    grid-template-columns: repeat(4,var(--flow-card-width)); grid-template-rows: repeat(2,calc(var(--flow-card-width) * 1.452)); justify-content: center; gap: 6px;
  }
  :global(.app-shell.fixed-play-screen .belote-surface.flow-play .play-board-region .card-table.compass-table) {
    --table-card-face-width: clamp(20px, min(11cqw, calc((100cqh - 92px) / 2.8)), 58px);
    --table-holder-width: max(78px, calc(var(--table-card-face-width) + 18px));
  }
  :global(.app-shell.fixed-play-screen .belote-surface.flow-play .play-board-region .cardholder) {
    height: calc(var(--table-card-face-width) * 1.4 + 28px); grid-template-rows: calc(var(--table-card-face-width) * 1.4) 22px; align-content: start; row-gap: 0; padding: 1px 4px;
  }
  :global(.app-shell.fixed-play-screen .belote-surface.flow-play .play-board-region .cardholder-label) { position: static; grid-column: 1; grid-row: 2; align-self: center; width: 100%; }
  :global(.app-shell.fixed-play-screen .belote-surface.flow-play .play-board-region .table-card) { height: calc(var(--table-card-face-width) * 1.4); min-height: 0; }
</style>
