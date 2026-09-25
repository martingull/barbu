<script lang="ts">
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardFace from "../../components/CardFace.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import GameResult from "../../components/GameResult.svelte";
  import { bestMeldLayout } from "../../domain/rummyMelds";
  import { ginComplete, ginDiscardLayout, ginFinalScores, type GinSession, type GinAction } from "../../domain/ginRummySession";
  import { formatCardList, formatCardText } from "../../presentation/cardDisplay";
  import mark from "../../../src-tauri/icons/128x128@2x.png";

  let { session, selectedCardId, error, onSelect, onAction, onBack, onNext, onReplay, onNew }: {
    session: GinSession; selectedCardId: string; error: string; onSelect: (id: string) => void;
    onAction: (action: GinAction) => void; onBack: () => void; onNext: () => void; onReplay: () => void; onNew: () => void;
  } = $props();
  let hand = $derived(session.hand);
  let finished = $derived(hand.phase === "complete");
  let gameOver = $derived(ginComplete(session));
  let layout = $derived(bestMeldLayout(hand.hands[0]));
  let preview = $derived(ginDiscardLayout(hand, selectedCardId));
  let upcard = $derived(hand.discards.at(-1));
  let scores = $derived(ginFinalScores(session));
  let prompt = $derived(hand.phase === "offer" ? "Take the opening upcard or pass."
    : hand.phase === "draw" ? hand.forcedStock ? "Both players passed. Draw from the stock." : "Draw from the stock or take the upcard."
    : "Choose your discard. Knock with 10 or less, or keep playing.");
  let resultTitle = $derived(gameOver ? session.scores[0] >= 100 ? "You won the game" : "Barbu won the game"
    : hand.result?.kind === "draw" ? "Hand drawn" : `${hand.result?.winner === 0 ? "You" : "Barbu"} ${hand.result?.kind === "gin" ? "went gin" : hand.result?.kind === "undercut" ? "undercut" : "won the hand"}`);
</script>

<TablePlaySurface flowLayout mode={finished ? "result" : "play"} title="Gin Rummy" ariaLabel="Gin Rummy hand"
  statusLabel="Hand" statusValue={String(session.handNumber)} {onBack} showTable={!finished} useCustomTable
  tableAriaLabel="Gin Rummy piles" tableCards={[]} panelAriaLabel="Gin Rummy decisions" surfaceClassName="gin-play-surface">
  {#snippet summary()}
    <div class="full-hand-summary grouped-play-summary" aria-label="Gin Rummy score">
      <div class="full-hand-summary-row current-hand" style="grid-template-columns: repeat(4, minmax(0, 1fr))">
        <div><span>You</span><strong>{scores[0]}</strong></div>
        <div><span>Barbu</span><strong>{scores[1]}</strong></div>
        <div><span>Target</span><strong>100</strong></div>
        <div><span>Dealer</span><strong>{hand.dealer === 0 ? "You" : "Barbu"}</strong></div>
      </div>
    </div>
  {/snippet}
  {#snippet table()}
    <div class="gin-table">
      <p class="opponent">Barbu <span>10 cards</span></p>
      <div class="piles">
        <button class="pile" disabled={hand.phase !== "draw"} onclick={() => onAction({ type: "draw", source: "stock" })} aria-label="Draw stock" type="button">
          <span class="stock-back"><img src={mark} alt="" /></span><strong>Stock <span>{hand.stock.length}</span></strong>
        </button>
        <button class="pile" disabled={hand.phase === "discard" || hand.forcedStock} onclick={() => onAction({ type: "draw", source: "discard" })} aria-label="Take upcard" type="button">
          <span class="upcard">{#if upcard}<CardFace card={upcard} />{:else}<span class="empty-pile">Empty</span>{/if}</span><strong>Upcard</strong>
        </button>
      </div>
      <p class="last-action" aria-live="polite">{formatCardText(hand.message)}</p>
    </div>
  {/snippet}
  {#snippet panel()}
    {#if finished && hand.result}
      <GameResult game="Gin Rummy" title={resultTitle} completion={gameOver ? "game" : null}
        summary={hand.result.kind === "draw" ? "Two stock cards remain. No points; the same dealer deals again."
          : `${hand.result.winner === 0 ? "You score" : "Barbu scores"} ${hand.result.points} points ${hand.result.kind === "gin" ? "for gin" : hand.result.kind === "undercut" ? "for an undercut" : "after knocking"}.`} />
      {#if gameOver}<p class="result">Final score: You {scores[0]}, Barbu {scores[1]}. Includes game and box bonuses.</p>{/if}
      {#each hand.result.layouts as final, player}
        <section class="meld-review" aria-label={`${player === 0 ? "Your" : "Barbu's"} melds`}>
          <h2>{player === 0 ? "You" : "Barbu"}: {final.points} deadwood</h2>
          {#each final.melds as meld}<p>{meld.kind === "set" ? "Set" : "Run"}: {formatCardList(meld.cards)}</p>{/each}
          {#each final.layoffs as layoff}<p>Laid off: {formatCardList(layoff.cards)}</p>{/each}
          <p>Deadwood: {final.deadwood.length ? formatCardList(final.deadwood) : "None"}</p>
        </section>
      {/each}
      <div class="action-row">
        <button class="secondary-action" onclick={onReplay} type="button">Replay hand</button>
        <button class="primary-action" onclick={gameOver ? onNew : onNext} type="button">{gameOver ? "New game" : "Next hand"}</button>
      </div>
    {:else}
      <p class="result turn-prompt">{prompt}</p>
      <div class="hand-analysis" aria-label="Your Gin Rummy melds">
        <strong>Deadwood: {preview ? preview.points : layout.points}{preview ? " after discard" : ""}</strong>
        <span>{layout.melds.length ? layout.melds.map(meld => formatCardList(meld.cards)).join(" / ") : "No complete melds yet"}</span>
      </div>
      <CardChoiceHand cards={hand.hands[0]} ariaLabel="Your Gin Rummy hand" className="hand full-hand-cards"
        cardClassName="card hand-card full-hand-card" onSelect={card => onSelect(card.id)} isPressed={card => card.id === selectedCardId}
        getCardClasses={card => ({ legal: card.id !== hand.blockedDiscard, illegal: card.id === hand.blockedDiscard, selected: card.id === selectedCardId })} />
      <div class="action-row">
        <button class="secondary-action" onclick={onBack} type="button">Table</button>
        {#if hand.phase === "offer"}
          <button class="primary-action" onclick={() => onAction({ type: "pass" })} type="button">Pass upcard</button>
        {:else if hand.phase === "draw"}
          <button class="primary-action" onclick={() => onAction({ type: "draw", source: "stock" })} type="button">Draw stock</button>
        {:else}
          <button class="secondary-action" disabled={!preview} onclick={() => onAction({ type: "discard", cardId: selectedCardId })} type="button">Discard</button>
          <button class="primary-action" disabled={!preview || preview.points > 10} onclick={() => onAction({ type: "discard", cardId: selectedCardId, knock: true })} type="button">{preview?.points === 0 ? "Go gin" : "Knock"}</button>
        {/if}
      </div>
    {/if}
    {#if error}<p class="outcome warning" role="alert">{error}</p>{/if}
  {/snippet}
</TablePlaySurface>

<style>
  :global(.gin-play-surface.flow-play > .play-board-region) { min-height: 168px; flex-basis: 168px; }
  .gin-table { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 6px; background: #285342; color: #f7faf3; border-block: 1px solid #718d77; }
  .opponent, .last-action { margin: 0; font-size: 0.8rem; line-height: 1.3; text-align: center; }
  .opponent { font-weight: 700; }.opponent span { margin-left: 8px; font-weight: 400; color: #d8e1d5; }
  .last-action { min-height: 2.6em; }
  .turn-prompt { min-height: calc(2.08rem + 8px); }
  .piles { display: flex; justify-content: center; gap: 28px; }
  .pile { display: grid; gap: 5px; justify-items: center; padding: 2px; min-width: 70px; background: transparent; color: #f7faf3; border: 0; cursor: pointer; }
  .pile:disabled { opacity: 1; cursor: default; }.pile:focus-visible { outline: 2px solid #ead490; outline-offset: 3px; }
  .pile strong { font-size: 0.75rem; }.pile strong span { margin-left: 4px; color: #ead490; }
  .upcard, .stock-back { display: block; width: 45px; height: 63px; }
  .empty-pile { display: grid; place-items: center; width: 100%; height: 100%; border: 1px dashed #b7cabb; border-radius: 3px; font-size: 0.65rem; color: #d8e1d5; }
  .stock-back { display: grid; place-items: center; background: #773c4d; border: 2px solid #f5f1cf; border-radius: 3px; }
  .stock-back img { width: 33px; height: 33px; object-fit: contain; }
  .hand-analysis { display: grid; gap: 4px; font-size: 0.75rem; line-height: 1.3; min-height: 36px; }
  .hand-analysis strong { color: #ead490; }.hand-analysis span { color: #d8e1d5; min-height: 2.6em; }
  .meld-review { border-top: 1px solid #ffffff26; padding: 10px 0; }
  .meld-review h2 { font-size: 1rem; margin: 0 0 8px; }.meld-review p { font-size: 0.85rem; line-height: 1.4; margin: 4px 0; }
</style>
