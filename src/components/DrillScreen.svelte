<script lang="ts">
  import type { Snippet } from "svelte";
  import type { Card, Seat, TableCard } from "../domain/types";
  import { drillDecision, drillOutcomeLabels, type DrillStep, type DrillResult } from "../lessons/drillDecision";
  import TablePlaySurface from "./TablePlaySurface.svelte";
  import CardChoiceHand from "./CardChoiceHand.svelte";
  import ExerciseFeedback from "./ExerciseFeedback.svelte";
  let { step, selectedCardId, checkedCardId, results, total, index, title, eyebrow, topic,
    seatLabels = {}, customTable, allowEarlyFinish = true, finishLabel = "Review session", onBack, onSelect, onCheck, onNext, onFinish }: {
    step: DrillStep; selectedCardId: string; checkedCardId: string; results: DrillResult[];
    total: number; index: number; title: string; eyebrow: string; topic: string;
    seatLabels?: Partial<Record<Seat, string>>; customTable?: Snippet<[TableCard[]]>;
    allowEarlyFinish?: boolean; finishLabel?: string;
    onBack: () => void; onSelect: (card: Card) => void; onCheck: () => void; onNext: () => void; onFinish: () => void;
  } = $props();
  let trick = $derived(step.trick);
  let legal = $derived(new Set(trick.legalCardIds));
  let checked = $derived(trick.hand.find(card => card.id === checkedCardId));
  let decision = $derived(checked ? drillDecision(step, checked) : null);
  let tableCards: TableCard[] = $derived(checked && legal.has(checked.id)
    ? [...trick.tableBeforeChoice, { seat: "You", card: checked }, ...trick.tableAfterChoice] : trick.tableBeforeChoice);
  let last = $derived(index >= total - 1);
</script>

<TablePlaySurface mode="play" flowLayout ariaLabel={title} {title} {eyebrow}
  surfaceClassName={customTable ? "learning-play-surface domino-play-surface" : "learning-play-surface"}
  statusLabel={step.contract} statusValue={`Decision ${checked ? results.length : results.length + 1} of ${total}`}
  tableAriaLabel="Drill card table" pendingBySeat={trick.pendingBySeat} {seatLabels}
  useCustomTable={!!customTable} tableCards={customTable ? [] : tableCards} panelAriaLabel="Drill decision" {onBack}>
  {#snippet table()}{#if customTable}{@render customTable(tableCards)}{/if}{/snippet}
  {#snippet summary()}
    <div class="full-hand-summary grouped-play-summary" aria-label="Drill progress">
      <div class="full-hand-summary-row learning-drill-summary">
        <div><span>Played</span><strong>{results.length} / {total}</strong></div>
        <div><span>Clean</span><strong>{results.filter(result => result.clean).length}</strong></div>
        <div><span>Topic</span><strong>{topic || "Mixed contracts"}</strong></div>
      </div>
    </div>
  {/snippet}
  {#snippet panel()}
    <ExerciseFeedback eyebrow={step.contract} title={trick.title} result={checked ? "" : trick.beforeResult}
      explanation={decision?.feedback ?? trick.emptyExplanation}
      outcome={decision ? drillOutcomeLabels[decision.result.outcome] : ""}
      warning={decision ? decision.result.outcome !== "good" : false} />
    <CardChoiceHand cards={trick.hand} ariaLabel="Your drill hand" className="hand drill-hand full-hand-cards"
      cardClassName="card hand-card full-hand-card"
      getCardClasses={card => ({ heart: card.suit === "H", legal: legal.has(card.id) && !checkedCardId,
        illegal: !legal.has(card.id) && !checkedCardId, selected: selectedCardId === card.id, played: checkedCardId === card.id })}
      isPressed={card => selectedCardId === card.id} {onSelect} />
    <div class="action-row">
      <button class="secondary-action" onclick={allowEarlyFinish && checked && !last ? onFinish : onBack} type="button">{allowEarlyFinish && checked && !last ? "Finish session" : "Table"}</button>
      {#if checked}
        <button class="primary-action" onclick={onNext} type="button">{last ? finishLabel : "Next decision"}</button>
      {:else}
        <button class="primary-action" disabled={!trick.hand.some(card => card.id === selectedCardId)} onclick={onCheck} type="button">Check answer</button>
      {/if}
    </div>
  {/snippet}
</TablePlaySurface>
