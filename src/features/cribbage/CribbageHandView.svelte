<script lang="ts">
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import CardFace from "../../components/CardFace.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import GameResult from "../../components/GameResult.svelte";
  import GuidedHandActions from "../../components/GuidedHandActions.svelte";
  import CribbageScoreTable from "./CribbageScoreTable.svelte";
  import { cribbageCards, cribbageComplete, cribbageDealer, cribbageName, cribbageLegalCards, cribbageScores, cribbageSuggestion, cribbageScoreParts,
    type CribbageAction, type CribbageSession } from "../../domain/cribbage";
  import { formatCardLabel, formatCardText } from "../../presentation/cardDisplay";
  import { compareCribbageCardsForDisplay } from "../../presentation/cardOrdering";

  let { session, selectedCardId, discards, error, guided = false, onSelect, onAction, onBack, onNew, onIndependentPlay }:
    { session: CribbageSession; selectedCardId: string; discards: string[]; error: string; guided?: boolean;
      onSelect: (id: string) => void; onAction: (action: CribbageAction) => void; onBack: () => void; onNew: () => void; onIndependentPlay?: () => void } = $props();
  let review = $derived(session.review);
  let row = $derived(review?.rows[review.index]);
  let complete = $derived(cribbageComplete(session));
  let crib = $derived(!review && session.game.phase === "crib");
  let scores = $derived(cribbageScores(session));
  let hand = $derived(cribbageCards(row?.cards ?? session.game.hands[session.player]));
  let starter = $derived(cribbageCards(review ? [review.starter] : session.game.starter ? [session.game.starter] : [])[0]);
  let legal = $derived(cribbageLegalCards(session));
  let recommendation = $derived(guided ? cribbageSuggestion(session) : []);
  let suggested = $derived(cribbageCards(recommendation).map(formatCardLabel).join(" and "));
  let finishedGuided = $derived(guided && review?.index === (review?.rows.length ?? 0) - 1);
  let prompt = $derived(row ? `${cribbageName(session, row.seat)}: ${row.label.toLowerCase()}, ${row.count.total} points. ${cribbageScoreParts(row.count)}.`
    : crib ? `Choose two cards for ${cribbageDealer(session) === session.player ? "your" : "Barbu's"} crib. Keep the other four.`
    : `Choose a card. Add its value to ${session.game.count}, without exceeding 31. Go and count resets are automatic.`);
  let hint = $derived(row ? "Count non-dealer first, then dealer, then the crib. Use the same starter each time. Stop immediately if anyone reaches 121."
    : crib ? `Suggested discard: ${suggested}. Balance your four kept cards against ${cribbageDealer(session) === session.player ? "helping your own crib" : "feeding Barbu's crib"}. This is advice, not a forced choice.`
    : `Suggested: ${suggested}. Fifteen and 31 score two; pairs and runs also score. Suits do not restrict your play. Your four kept cards will be counted again afterwards.`);
</script>

<TablePlaySurface flowLayout stableFeedback={guided} surfaceClassName="cribbage-surface" title="Cribbage"
  mode={complete ? "result" : "play"} showTable={!complete}
  ariaLabel="Cribbage hand" statusLabel={row ? "Counting" : complete ? "Finished" : guided ? "Guided" : "Target"} statusValue={row ? `${review!.index + 1} / ${review!.rows.length}` : "121"}
  {onBack} tableCards={[]} useCustomTable tableAriaLabel="Cribbage table" panelAriaLabel="Cribbage hand and actions">
  {#snippet summary()}
    <div class="scores" aria-label="Cribbage scores">
      {#each ["You", "Barbu"] as name, index}<div><span>{name}</span><strong>{scores[index]} / 121</strong><progress max="121" value={scores[index]} aria-label={`${name} score`}></progress></div>{/each}
      <div><span>{row ? "Counting for" : "Dealer / crib"}</span><strong>{row ? cribbageName(session, row.seat) : cribbageName(session, cribbageDealer(session))}</strong></div>
    </div>
  {/snippet}
  {#snippet table()}
    <div class="cribbage-board" aria-label="Cribbage table">
      <div class="starter"><span>Starter</span><div class="starter-card">{#if starter}<CardFace card={starter} />{:else}<span class="face-down">?</span>{/if}</div></div>
      <div class="pegging-area">
        <div class="count"><span>{row ? row.label : crib ? "Lay away two" : "Running count"}</span><strong>{row ? `+${row.count.total}` : crib ? `${discards.length} / 2` : session.game.count}</strong></div>
        {#if row}
          <!-- svelte-ignore a11y_no_noninteractive_tabindex (Long score breakdowns need keyboard scrolling.) -->
          <div class="count-breakdown" role="region" aria-label="Hand scoring details" tabindex="0"><CribbageScoreTable count={row.count} /></div>
        {:else if !crib}
          <div class="pegged" aria-label="Cards played this hand">
            {#each session.game.pegged as play, index}
              <div class="played-card" class:earlier={!session.game.run.some(current => current.card === play.card)}>
                <CardFace card={cribbageCards([play.card])[0]} /><span>{cribbageName(session, play.seat)}</span>
              </div>
            {/each}
          </div>
        {:else}<p>The crib stays face down until counting.</p>{/if}
      </div>
    </div>
  {/snippet}
  {#snippet panel()}
    {#if complete}
      <GameResult game="Cribbage" completion="game" title={scores[0] >= 121 ? "You reached 121" : "Barbu reached 121"} summary={`You ${scores[0]} - Barbu ${scores[1]}. The game ends as soon as a player reaches 121.`} />
      <button type="button" class="primary-action" onclick={onNew}>New game</button>
      <button type="button" class="secondary-action" onclick={onBack}>Table</button>
    {:else}
      {#if guided}<ExerciseFeedback coach="barbu" reserveSpace eyebrow="Cribbage" title={row ? "Count the hand" : crib ? "Choose the crib" : "Peg combinations"} result={`${finishedGuided ? "Guided hand complete. " : ""}${prompt}`} explanation={`${hint} ${session.messages.slice(-2).join(" ")}`} />
      {:else}<p class="instruction">{prompt}</p>{/if}
      {#if !guided}<div class="last-plays" role="log" aria-label="Recent Cribbage plays">{formatCardText(session.messages.slice(-2).join(" "))}</div>{/if}
      <CardChoiceHand cards={hand} readonly={Boolean(review)} compareCards={compareCribbageCardsForDisplay} ariaLabel={row ? row.label : "Your Cribbage hand"} className="hand full-hand-cards"
        cardClassName="card hand-card full-hand-card" onSelect={card => onSelect(card.id)}
        isPressed={card => crib ? discards.includes(card.id) : selectedCardId === card.id}
        getCardClasses={card => ({ legal: Boolean(review) || legal.includes(card.id), illegal: !review && !legal.includes(card.id), selected: crib ? discards.includes(card.id) : selectedCardId === card.id })} />
      {#if error}<p class="warning" role="alert">{error}</p>{/if}
      {#if finishedGuided}
        <GuidedHandActions onReplay={onNew} onIndependentPlay={onIndependentPlay ?? onBack} {onBack} />
      {:else}
        <div class="action-row">
          <button type="button" class="secondary-action" onclick={onBack}>Table</button>
          {#if review}<button type="button" class="primary-action" onclick={() => onAction({ type: "continue" })}>{review.index < review.rows.length - 1 ? "Next count" : session.game.phase === "over" ? "See result" : "Next deal"}</button>
          {:else if crib}<button type="button" class="primary-action" disabled={discards.length !== 2} onclick={() => onAction({ type: "discard", cards: [discards[0], discards[1]] })}>Lay away two</button>
          {:else}<button type="button" class="primary-action" disabled={!legal.includes(selectedCardId)} onclick={() => onAction({ type: "play", card: selectedCardId })}>Play card</button>{/if}
        </div>
      {/if}
    {/if}
  {/snippet}
</TablePlaySurface>

<style>
  .scores { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; color: #f4f8ef; padding: 4px 0 8px; border-bottom: 1px solid #53705c; }
  .scores > div { min-width: 0; display: grid; gap: 2px; }
  .scores span { font-size: 0.65rem; color: #c9d9cb; } .scores strong { font-size: 0.85rem; overflow-wrap: anywhere; }
  progress { width: 100%; height: 5px; accent-color: #f0d66a; }
  .cribbage-board { height: 100%; min-height: 120px; display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 12px; padding: 8px; box-sizing: border-box; border: 1px solid #708f78; border-radius: 6px; background: #37694f; }
  .starter { display: flex; flex-direction: column; gap: 5px; align-items: center; } .starter > span { font-size: 0.7rem; color: #fff3bd; }
  .starter-card { width: var(--flow-card-width, 52px); aspect-ratio: 1 / 1.452; }
  .face-down { display: grid; place-items: center; height: 100%; border: 1px dashed #b5c8b8; border-radius: 4px; color: #e2ebdc; }
  .pegging-area { min-width: 0; min-height: 0; display: flex; flex-direction: column; justify-content: center; gap: 5px; }
  .count-breakdown { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
  .count { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #f5f8ed; }
  .count span { font-size: 0.8rem; } .count strong { font-size: 1.4rem; }
  .pegged { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; justify-items: center; }
  .played-card { width: min(100%, 42px, max(20px, calc((100cqh - 76px) / 2.904))); aspect-ratio: 1 / 1.452; position: relative; margin-bottom: 12px; }
  .played-card > span { position: absolute; top: 100%; left: 0; right: 0; text-align: center; font-size: 0.55rem; color: #fff; }
  .played-card.earlier { opacity: 0.5; }
  .pegging-area > p { font-size: 0.8rem; line-height: 1.4; color: #e4efdf; margin: 0; }
  .instruction { margin: 0; min-height: 48px; font-size: 0.8rem; line-height: 1.35; color: #f2f6ee; }
  .last-plays { height: 40px; overflow: auto; font-size: 0.7rem; line-height: 1.3; color: #cddbd0; flex: none; }
  :global(.app-shell.fixed-play-screen .table-play-surface.cribbage-surface.flow-play.compact-play) {
    --flow-card-width: min(62px, calc((100vw - 66px) / 6));
    --flow-hand-height: calc(var(--flow-card-width) * 1.452);
    --flow-panel-space: 156px;
  }
  :global(.app-shell.fixed-play-screen .table-play-surface.cribbage-surface.flow-play.compact-play.stable-feedback) {
    --flow-feedback-height: clamp(80px, 16dvh, 112px);
    --flow-panel-space: calc(var(--flow-feedback-height) + 114px);
  }
  :global(.app-shell.fixed-play-screen .table-play-surface.cribbage-surface.flow-play.compact-play .table-play-panel .full-hand-cards) {
    grid-template-columns: repeat(6, var(--flow-card-width)); grid-template-rows: var(--flow-hand-height); justify-content: center;
  }
</style>
