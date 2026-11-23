<script lang="ts">
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardTable from "../../components/CardTable.svelte";
  import CardFace from "../../components/CardFace.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import GameResult from "../../components/GameResult.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import GuidedHandActions from "../../components/GuidedHandActions.svelte";
  import GuidedTrickRecap from "../../components/GuidedTrickRecap.svelte";
  import Users from "@lucide/svelte/icons/users";
  import UserRound from "@lucide/svelte/icons/user-round";
  import { euchreComplete, euchrePosition, type EuchreAction, type EuchreSession } from "../../domain/euchreSession";
  import { euchreGuidance } from "../../domain/euchreLearning";
  import { euchreSuits, euchreRules, legalEuchreCards, type EuchreSeat } from "../../domain/euchreRules";
  import { trickTakingSeats } from "../../domain/trickTakingScore";
  import { compassSeatLabels, suitSymbol } from "../../presentation/cardDisplay";
  import { compareEuchreCards, euchreRole, euchreSeatNames, euchreSuitNames, euchreTurnPrompt, euchreTrickFeedback, euchreRecap } from "./euchrePresentation";
  import type { Suit } from "../../domain/types";

  let { session, selectedCardId, error, guided = false, onSelect, onAction, onBack, onNext, onReplay, onNew }: {
    guided?: boolean;
    session: EuchreSession; selectedCardId: string; error: string; onSelect: (id: string) => void;
    onAction: (action: EuchreAction) => void; onBack: () => void; onNext: () => void; onReplay: () => void; onNew: () => void;
  } = $props();
  let selectedTrump = $state<Suit | null>(null);
  let alone = $state(false);
  let hand = $derived(session.hand);
  let calling = $derived(hand.phase === "calling");
  let finished = $derived(hand.phase === "complete" || hand.phase === "passed_out");
  let gameOver = $derived(euchreComplete(session));
  let review = $derived(hand.phase === "review" ? hand.completedTricks.at(-1) : undefined);
  let choices = $derived(hand.round === 1 ? [hand.upcard.suit] : euchreSuits.filter(suit => suit !== hand.upcard.suit));
  let trumpChoice = $derived(selectedTrump && choices.includes(selectedTrump) ? selectedTrump : choices[0]);
  let legal = $derived(new Set(hand.phase === "discard" ? hand.hands[2].map(card => card.id)
    : hand.phase === "playing" && hand.contract && hand.turn === 2
    ? legalEuchreCards(hand.hands[2], hand.currentTrick, hand.contract.trump).map(card => card.id) : []));
  let selectable = $derived(hand.turn === 2 && (hand.phase === "playing" || hand.phase === "discard"));
  let tableCards = $derived((review?.cards ?? hand.currentTrick).map(play => ({ seat: trickTakingSeats[play.seat], card: play.card })));
  let roles = $derived(Object.fromEntries(trickTakingSeats.map((seat, index) => [seat, euchreRole(hand, index as EuchreSeat)])));
  let ownTricks = $derived(hand.completedTricks.filter(trick => trick.winner % 2 === 0).length);
  let contractText = $derived(hand.contract
    ? `${euchreSeatNames[hand.contract.maker]} called ${suitSymbol(hand.contract.trump)}${hand.contract.alone ? " alone" : ""}. Makers need 3 tricks.`
    : `Round ${hand.round}. ${euchreSeatNames[hand.dealer]} deals. South is you; North is your partner.`);
  let result = $derived(hand.result);
  let guidance = $derived(guided && !finished && !review ? euchreGuidance(euchrePosition(hand, 2)) : null);
  $effect(() => { hand.seed; hand.round; selectedTrump = null; alone = false; });
</script>

<TablePlaySurface flowLayout stableFeedback={guided} mode={finished ? "result" : "play"} title={guided ? "Guided Euchre" : "Euchre"} ariaLabel="Euchre hand"
  statusLabel={hand.contract ? "Trump" : "Calling"} statusValue={hand.contract ? euchreSuitNames[hand.contract.trump] : `Round ${hand.round}`}
  {onBack} showTable={!finished} useCustomTable tableCards={tableCards} tableAriaLabel="Euchre table"
  panelAriaLabel="Euchre decisions" surfaceClassName="euchre-play-surface">
  {#snippet summary()}
    <div class="full-hand-summary grouped-play-summary" aria-label="Euchre score">
      <div class="full-hand-summary-row current-hand" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        <div><span>You + North</span><strong>{session.scores[0]} / {euchreRules.target}</strong></div>
        <div><span>East + West</span><strong>{session.scores[1]} / {euchreRules.target}</strong></div>
        <div><span>Tricks</span><strong>{ownTricks}–{hand.completedTricks.length - ownTricks}</strong></div>
        <div><span>Hand</span><strong>{session.handNumber}</strong></div>
      </div>
      <p class="contract-copy">{contractText}</p>
    </div>
  {/snippet}
  {#snippet table()}
    {#if calling}
      <div class="calling-table" aria-label="Euchre calling table">
        <div class="upcard"><div class="upcard-face"><CardFace card={hand.upcard} /></div><strong>{hand.round === 1 ? "Upcard" : "Turned down"}</strong></div>
        <ol aria-label="Trump calls">{#each hand.calls as call}<li>{euchreSeatNames[call.seat]}: {call.trump ? `${suitSymbol(call.trump)}${call.alone ? " alone" : ""}` : "Pass"}</li>{/each}</ol>
      </div>
    {:else}
      <CardTable ariaLabel="Euchre card table" {tableCards} seatLabels={compassSeatLabels} seatRoleLabels={roles}
        pendingBySeat={hand.phase === "playing" && hand.turn === 2 ? { You: "Your turn" } : {}} />
    {/if}
  {/snippet}
  {#snippet panel()}
    {#if finished}
      <GameResult game="Euchre" completion={!guided && gameOver ? "game" : null}
        title={guided ? "Guided hand complete" : gameOver ? session.scores[0] >= euchreRules.target ? "Your partnership wins" : "East and West win" : hand.phase === "passed_out" ? "Hand passed out" : "Hand complete"}
        summary={result ? `${result.winner === 0 ? "You and North" : "East and West"} score ${result.points}. Makers took ${result.makerTricks} of 5 tricks${result.kind === "euchred" ? " and were euchred" : result.kind === "lone-march" ? " for a lone-hand sweep" : result.kind === "march" ? " for a sweep" : ""}.`
          : "Everyone passed twice. No points; the deal moves clockwise."} />
      {#if result}
        <div class="score-calculation" aria-label="Euchre score calculation">
          {#each [0, 1] as side}
            <p><span>{side === 0 ? "You + North" : "East + West"}</span><strong>{session.scores[side] - (result.winner === side ? result.points : 0)} + {result.winner === side ? result.points : 0} = {session.scores[side]}</strong></p>
          {/each}
        </div>
      {/if}
      {#if guided}
        <p class="explanation">Your saved match is unchanged.</p>
        <GuidedTrickRecap moments={euchreRecap(hand)} seatLabels={compassSeatLabels} />
        <GuidedHandActions {onReplay} {onBack} onIndependentPlay={onNext} />
      {:else}<div class="action-row">
        {#if !gameOver}<button class="secondary-action" onclick={onReplay} type="button">Replay hand</button>{/if}
        <button class="primary-action" onclick={gameOver ? onNew : onNext} type="button">{gameOver ? "New game" : "Next hand"}</button>
      </div>{/if}
    {:else}
      {#if guided}
        <ExerciseFeedback coach="barbu" reserveSpace eyebrow={review ? "Trick review" : "Your turn"} title={review ? "Read the trick" : "Choose your move"}
          result={review ? euchreTrickFeedback(hand) : `Rule: ${guidance?.rule}`}
          explanation={review ? "The winner leads next. Makers need at least three tricks; defenders try to stop them." : `Tactic: ${guidance?.tip}`} />
      {:else}<p class="result euchre-prompt" aria-live="polite">{review ? euchreTrickFeedback(hand) : euchreTurnPrompt(hand)}</p>{/if}
      <div class="calling-controls">
        {#if calling}
          <fieldset class="suit-options" disabled={hand.round === 1}>
            <legend>Trump</legend>
            {#each choices as suit}
              <button type="button" class:red={suit === "H" || suit === "D"} aria-label={`Call ${euchreSuitNames[suit]}`}
                aria-pressed={trumpChoice === suit} title={euchreSuitNames[suit]} onclick={() => { selectedTrump = suit; }}>{suitSymbol(suit)}</button>
            {/each}
          </fieldset>
          <fieldset class="calling-mode" aria-label="Calling format">
            <legend>Play</legend>
            <label title="Play with your partner"><input type="radio" name="euchre-format" aria-label="With partner" checked={!alone} onchange={() => { alone = false; }} /><Users size={16} aria-hidden="true" /><span>Partner</span></label>
            <label title="Go alone; your partner sits out"><input type="radio" name="euchre-format" aria-label="Go alone" checked={alone} onchange={() => { alone = true; }} /><UserRound size={16} aria-hidden="true" /><span>Alone</span></label>
          </fieldset>
        {:else if hand.inactiveSeat === 2}
          <p class="sitting-out">North is playing alone. Your hand sits out.</p>
        {/if}
      </div>
      <CardChoiceHand cards={hand.hands[2]} ariaLabel="Your Euchre hand" className="hand full-hand-cards" cardClassName="card hand-card full-hand-card"
        readonly={!selectable} compareCards={compareEuchreCards(hand.contract?.trump)}
        getCardClasses={card => ({ legal: selectable && legal.has(card.id), illegal: selectable && !legal.has(card.id), selected: selectedCardId === card.id })}
        isPressed={card => selectedCardId === card.id} onSelect={card => onSelect(card.id)} />
      <div class="action-row" aria-label="Euchre turn actions">
        {#if calling}
          <button class="secondary-action" onclick={() => onAction({ type: "pass" })} type="button">Pass</button>
          <button class="primary-action" onclick={() => onAction({ type: "call", trump: trumpChoice, alone })} type="button">{hand.round === 1 ? "Order up" : `Call ${suitSymbol(trumpChoice)}`}</button>
        {:else if review}
          <button class="secondary-action" onclick={onBack} type="button">Table</button>
          <button class="primary-action" onclick={() => onAction({ type: "next-trick" })} type="button">Next trick</button>
        {:else}
          <button class="secondary-action" onclick={onBack} type="button">Table</button>
          <button class="primary-action" disabled={!legal.has(selectedCardId)} onclick={() => onAction({ type: hand.phase === "discard" ? "discard" : "play-card", cardId: selectedCardId })}
            type="button">{hand.phase === "discard" ? "Discard" : "Play card"}</button>
        {/if}
      </div>
    {/if}
    {#if error}<p class="outcome warning" role="alert">{error}</p>{/if}
  {/snippet}
</TablePlaySurface>

<style>
  .contract-copy { grid-column: 1 / -1; width: 100%; color: #dce8d8; margin: 0; min-height: 2.6em; font-size: 0.75rem; line-height: 1.3; }
  .calling-table { height: 100%; display: flex; align-items: center; justify-content: center; gap: 24px; color: #f7faf3; background: #386b54; border: 1px solid #bec8b6; border-radius: 8px; padding: 12px; }
  .upcard { display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; justify-items: center; width: 66px; flex: none; }
  .upcard-face { width: 66px; aspect-ratio: 1 / 1.452; }
  .upcard strong { font-size: 0.7rem; text-align: center; overflow-wrap: anywhere; }
  ol { list-style: none; margin: 0; padding: 0; max-height: 100%; overflow-y: auto; font-size: 0.8rem; line-height: 1.5; }
  .calling-controls { height: 64px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .suit-options { display: flex; gap: 4px; margin: 0; padding: 0; border: 0; }
  .suit-options legend { font-size: 0.65rem; margin-bottom: 4px; }
  .suit-options button { width: 44px; height: 44px; border: 1px solid #8fa98d; border-radius: 4px; background: #edf0dd; color: #172a20; font-size: 1.3rem; cursor: pointer; }
  .suit-options button.red { color: #a32132; }
  .suit-options button[aria-pressed="true"] { outline: 2px solid #e7c766; outline-offset: 2px; }
  .suit-options:disabled button { opacity: 1; cursor: default; }
  .calling-mode { display: grid; grid-template-columns: repeat(2, 64px); padding: 0; margin: 0; gap: 2px; border: 0; }
  .calling-mode legend { font-size: 0.65rem; margin-bottom: 4px; }
  .calling-mode label { position: relative; display: grid; justify-items: center; align-content: center; gap: 2px; height: 44px; border: 1px solid #819c8e; border-radius: 4px; background: #142f24; color: #dce8d8; cursor: pointer; }
  .calling-mode label:has(input:checked) { background: #f5f1cf; color: #173728; border-color: #f5f1cf; }
  .calling-mode label:has(input:focus-visible) { outline: 2px solid #e7c766; outline-offset: 2px; }
  .calling-mode input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  .calling-mode span { font-size: 0.65rem; font-weight: 700; }
  .sitting-out { font-size: 0.8rem; margin: 0; }
  .score-calculation { border-block: 1px solid #ffffff26; padding: 8px 0; }
  .score-calculation p { display: flex; justify-content: space-between; gap: 12px; margin: 6px 0; color: #dce8d8; font-size: 0.875rem; }
  .score-calculation strong { color: #f5f1cf; font-variant-numeric: tabular-nums; }
  :global(.app-shell.fixed-play-screen .table-play-surface.euchre-play-surface.flow-play.compact-play) {
    --flow-card-width: min(62px, calc((100vw - 66px) / 6));
    --flow-hand-height: calc(var(--flow-card-width) * 1.452);
    --flow-panel-space: 180px;
  }
  :global(.app-shell.fixed-play-screen .euchre-play-surface.flow-play .table-play-panel .euchre-prompt) { height: 3.9em; overflow-y: auto; }
  :global(.app-shell.fixed-play-screen .table-play-surface.euchre-play-surface.flow-play.compact-play.stable-feedback) {
    --flow-feedback-height: clamp(72px, 15dvh, 128px);
    --flow-panel-space: calc(var(--flow-feedback-height) + 132px);
  }
  :global(.app-shell.fixed-play-screen .table-play-surface.euchre-play-surface.flow-play.compact-play .table-play-panel .full-hand-cards) {
    grid-template-columns: repeat(6, var(--flow-card-width)); grid-template-rows: var(--flow-hand-height); justify-content: center;
  }
</style>
