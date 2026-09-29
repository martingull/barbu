<script lang="ts">
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardFace from "../../components/CardFace.svelte";
  import CardBack from "../../components/CardBack.svelte";
  import GameResult from "../../components/GameResult.svelte";
  import CanastaCards from "./CanastaCards.svelte";
  import CanastaMeldEditor from "./CanastaMeldEditor.svelte";
  import { canastaComplete, canastaNeedsThrees, legalCanastaDiscards, type CanastaAction, type CanastaSession } from "../../domain/canastaSession";
  import { completedCanastas, initialCanastaMinimum, isCanastaWild, canastaSpecial } from "../../domain/canastaRules";
  import { formatCardList, formatCardText } from "../../presentation/cardDisplay";
  let { session, error, onAction, onBack, onNext, onReplay, onNew }: {
    session: CanastaSession; error: string; onAction: (action: CanastaAction) => boolean;
    onBack: () => void; onNext: () => void; onReplay: () => void; onNew: () => void;
  } = $props();
  let selected = $state(""), team = $state(0), editor = $state<"meld" | "pickup" | null>(null);
  const hand = $derived(session.hand), cards = $derived(hand.hands[0]), top = $derived(hand.discards.at(-1));
  const finished = $derived(hand.phase === "complete"), complete = $derived(canastaComplete(session));
  const legal = $derived(legalCanastaDiscards(hand).map(card => card.id));
  const three = $derived(cards.find(card => card.id === selected && card.rank === "3") ?? cards.find(card => card.rank === "3"));
  const needsThrees = $derived(canastaNeedsThrees(hand));
  const special = $derived(hand.phase === "play" && hand.drewStock && !hand.sides[0].opened ? canastaSpecial(cards) : null);
  const canPickup = $derived(!!top && !needsThrees && cards.filter(card => card.rank === top.rank && !isCanastaWild(card)).length >= 2);
  const prompt = $derived(needsThrees ? "Expose threes before continuing. You may keep one before your team opens."
    : hand.phase === "draw" ? "Draw from stock or take the pile with a matching natural pair."
    : "Meld if you wish, then choose a discard.");
  function act(action: CanastaAction) { const accepted = onAction(action); if (accepted) selected = ""; return accepted; }
</script>

<TablePlaySurface flowLayout mode={finished ? "result" : "play"} title="Canasta" ariaLabel="Canasta hand" statusLabel="Hand"
  statusValue={String(session.handNumber)} {onBack} showTable={!finished} useCustomTable surfaceClassName="canasta-play-surface"
  tableAriaLabel="Canasta melds and piles" tableCards={[]} panelAriaLabel="Canasta decisions">
  {#snippet summary()}
    <div class="full-hand-summary grouped-play-summary" aria-label="Canasta score">
      <div class="full-hand-summary-row current-hand" style="grid-template-columns: repeat(4, minmax(0, 1fr))">
        <div><span>Us</span><strong>{session.scores[0]}</strong></div><div><span>Them</span><strong>{session.scores[1]}</strong></div>
        <div><span>Target</span><strong>8500</strong></div><div><span>Opening</span><strong>{hand.sides[0].opened ? "Made" : initialCanastaMinimum(session.scores[0])}</strong></div>
      </div>
    </div>
  {/snippet}
  {#snippet table()}
    <div class="canasta-table">
      <div class="players" aria-label="Canasta players"><span>West · {hand.hands[1].length}</span><strong>Barbu · Partner · {hand.hands[2].length}</strong><span>East · {hand.hands[3].length}</span></div>
      <div class="piles">
        <button type="button" disabled={hand.phase !== "draw" || needsThrees} onclick={() => act({ type: "draw" })} aria-label="Draw stock" class="pile">
          <span><CardBack decorative /></span><strong>Stock {hand.stock.length}</strong></button>
        <button type="button" disabled={hand.phase !== "draw" || !canPickup} onclick={() => { editor = "pickup"; }} aria-label="Take discard pile" class="pile">
          <span>{#if top}<CardFace card={top} />{:else}<span class="empty">Empty</span>{/if}</span><strong>Pile {hand.discards.length}</strong></button>
        <div class="table-facts"><strong>{completedCanastas(hand.sides[0])} / 2 canastas</strong><span>{hand.stock.length <= 8 ? "Bottom eight" : "Opening bonuses available"}</span>
          <span>{cards.length} cards in hand</span>
          {#if hand.talons[0].length}<span>{hand.talons[0].length} bonus cards next turn</span>{/if}</div>
      </div>
      <div class="team-tabs" role="tablist" aria-label="Meld partnership">
        <button role="tab" aria-selected={team === 0} onclick={() => { team = 0; }} type="button">Our melds ({hand.sides[0].melds.length})</button>
        <button role="tab" aria-selected={team === 1} onclick={() => { team = 1; }} type="button">Their melds ({hand.sides[1].melds.length})</button>
      </div>
      <div class="meld-area" role="tabpanel" aria-label={team === 0 ? "Our melds" : "Their melds"}>
        {#each hand.sides[team].melds as meld}
          <div class="meld" title={formatCardList(meld.cards)}>
            <span class="meld-card"><CardFace card={meld.cards[0]} decorative /></span>
            <div><strong>{meld.rank} · {meld.cards.length}/7</strong><small>{meld.cards.length === 7 ? "Canasta" : "Open meld"} · {meld.cards.filter(isCanastaWild).length} wild</small></div>
          </div>
        {:else}<p class="no-melds">No melds</p>{/each}
        {#if hand.sides[team].threes.length}<p class="threes">Threes: {formatCardList(hand.sides[team].threes)}</p>{/if}
      </div>
    </div>
  {/snippet}
  {#snippet panel()}
    {#if finished && hand.result}
      <GameResult game="Canasta" completion={complete ? "match" : null}
        title={complete ? session.scores[0] === session.scores[1] ? "Match tied" : session.scores[0] > session.scores[1] ? "You and Barbu won" : "West and East won" : "Hand complete"}
        summary={hand.result.reason} />
      <table class="score-breakdown" aria-label="Canasta hand scoring">
        <thead><tr><th>Hand score</th><th>Us</th><th>Them</th></tr></thead><tbody>
          {#each [{ label: "Bonuses", key: "bonuses", sign: 1 }, { label: "Melded cards", key: "melds", sign: 1 }, { label: "Threes", key: "threes", sign: 1 }, { label: "Penalties", key: "penalties", sign: -1 }, { label: "Cards in hand", key: "inHand", sign: -1 }, { label: "Total", key: "total", sign: 1 }] as row}
            <tr><th>{row.label}</th>{#each hand.result.scores as score}<td>{row.sign * score[row.key as keyof typeof score]}</td>{/each}</tr>
          {/each}
        </tbody>
      </table>
      <div class="action-row"><button class="secondary-action" onclick={onReplay} type="button">Replay hand</button>
        <button class="primary-action" onclick={complete ? onNew : onNext} type="button">{complete ? "New match" : "Next hand"}</button></div>
    {:else}
      <details class="play-log"><summary>{formatCardText(hand.log.at(-1) ?? "")}</summary><ol>{#each hand.log as entry}<li>{formatCardText(entry)}</li>{/each}</ol></details>
      <p class="result canasta-prompt" aria-live="polite">{prompt}</p>
      <CanastaCards {cards} selected={selected ? [selected] : []} legal={hand.phase === "play" ? [...legal, ...cards.filter(card => card.rank === "3").map(card => card.id)] : undefined}
        onSelect={card => { selected = selected === card.id ? "" : card.id; }} />
      <div class="action-row">
        {#if hand.phase === "draw"}
          <button class="primary-action" disabled={needsThrees} onclick={() => act({ type: "draw" })} type="button">{hand.stock.length ? "Draw stock" : "End hand"}</button>
          <button class="secondary-action" disabled={!canPickup} onclick={() => { editor = "pickup"; }} type="button">Take pile</button>
        {:else}
          <button class="secondary-action" disabled={needsThrees} onclick={() => { editor = "meld"; }} type="button">Meld cards</button>
          <button class="primary-action" disabled={!legal.includes(selected)} onclick={() => act({ type: "discard", cardId: selected })} type="button">{cards.length === 1 && completedCanastas(hand.sides[0]) >= 2 ? "Go out" : "Discard"}</button>
        {/if}
        {#if special}<button class="secondary-action" type="button" onclick={() => act({ type: "special" })}>Declare {special.name}</button>
        {:else if three}<button class="secondary-action" type="button" onclick={() => act({ type: "expose", cardId: three.id })}>Expose three</button>{/if}
      </div>
    {/if}
    {#if error}<p class="outcome warning" role="alert">{error}</p>{/if}
  {/snippet}
</TablePlaySurface>
{#if editor}<CanastaMeldEditor {session} pickup={editor === "pickup"} onConfirm={act} onClose={() => { editor = null; }} />{/if}

<style>
  :global(.canasta-play-surface) { --canasta-hand-height: clamp(96px, calc(100dvh - 560px), 164px); }
  :global(.canasta-play-surface.flow-play > .play-board-region) { min-height: clamp(192px, calc(100dvh - 412px), 220px); flex-basis: clamp(192px, calc(100dvh - 412px), 220px); }
  :global(.canasta-play-surface.flow-play .action-row) { height: 52px; min-height: 52px; }
  .canasta-table { height: 100%; display: flex; flex-direction: column; gap: 6px; padding: 8px; background: #285342; border-block: 1px solid #759783; color: #f7faf3; }
  .players { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px; font-size: 0.68rem; }
  .piles { display: flex; align-items: center; gap: 18px; padding: 4px 0; }
  .pile { display: grid; justify-items: center; gap: 3px; padding: 0; background: transparent; color: inherit; border: 0; }
  .pile > span { display: block; width: 44px; height: 64px; }.pile strong { font-size: 0.68rem; }.pile:disabled { opacity: 1; }
  .empty { display: grid; place-items: center; height: 100%; border: 1px dashed #98b9a7; font-size: 0.65rem; }
  .table-facts { display: grid; gap: 5px; flex: 1; font-size: 0.7rem; }.table-facts span { color: #cddfd1; }
  .team-tabs { display: flex; gap: 4px; }.team-tabs button { flex: 1; min-height: 32px; padding: 5px; font-size: 0.75rem; background: transparent; color: #e0eee6; border: 0; border-bottom: 2px solid transparent; }
  .team-tabs button[aria-selected="true"] { border-color: #f5f1cf; color: #fff6ce; }
  .meld-area { flex: 1; min-height: 38px; overflow: auto; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; align-content: start; }
  .meld { display: flex; gap: 6px; align-items: center; min-width: 0; }.meld-card { display: block; width: 26px; height: 38px; flex: none; }
  .meld strong, .meld small { display: block; font-size: 0.72rem; }.meld small { color: #ccdfd0; font-size: 0.62rem; margin-top: 3px; }
  .no-melds, .threes { margin: 0; font-size: 0.72rem; padding: 6px 0; grid-column: 1 / -1; }
  .canasta-prompt { min-height: 40px; }
  .play-log { font-size: 0.72rem; color: #d0dfd4; min-height: 18px; }.play-log summary { height: 18px; line-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }.play-log ol { margin: 4px 0; padding-left: 20px; max-height: 100px; overflow: auto; }
  .score-breakdown { width: 100%; border-collapse: collapse; font-size: 0.85rem; }.score-breakdown th, .score-breakdown td { border-bottom: 1px solid #ffffff30; padding: 8px 4px; text-align: right; }.score-breakdown th:first-child { text-align: left; }
  @media (max-height: 650px) {
    :global(.canasta-play-surface) { --canasta-hand-height: 72px; }
    :global(.app-shell.fixed-play-screen .table-play-surface.canasta-play-surface.flow-play .table-play-panel) { gap: 4px; }
    .pile > span { width: 36px; height: 52px; }
  }
</style>
