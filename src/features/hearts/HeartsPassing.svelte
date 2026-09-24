<script lang="ts">
  import TablePlaySurface from "../../TablePlaySurface.svelte";
  import CardChoiceHand from "../../CardChoiceHand.svelte";
  import { formatCardList } from "../../cardDisplay";
  import { heartsPassDirectionLabel, heartsPassTargetLabel, heartsPassReceiveLabel } from "./heartsPresentation";
  import type { HeartsSession } from "../../domain/heartsSession";
  let { session, error: heartsPassError, onBack, onSelect, onPass }: {
    session: HeartsSession; error: string; onBack: () => void; onSelect: (id: string) => void; onPass: () => void;
  } = $props();
  let heartsPassingHand = $derived(session.fullHand);
  let heartsPassDirection = $derived(session.passDirection);
  let heartsPassSelectedCardIds = $derived(session.selectedPassCardIds);
  let heartsPassCanSubmit = $derived(heartsPassSelectedCardIds.length === 3);
  let heartsPassSelectedCards = $derived(heartsPassingHand.playerHand.filter(card => heartsPassSelectedCardIds.includes(card.id)));
</script>

<TablePlaySurface
  mode="play"
  ariaLabel="Hearts passing phase"
  flowLayout
  title="Pass cards"
  eyebrow="Hearts"
  statusLabel={heartsPassDirectionLabel(heartsPassDirection)}
  statusValue={`${heartsPassSelectedCardIds.length} of 3`}
  tableAriaLabel="Hearts passing table"
  tableCards={[]}
  showTable={false}
  panelAriaLabel="Hearts pass cards"
  onBack={onBack}
>
  {#snippet summary()}
    <div class="full-hand-summary grouped-play-summary" aria-label="Hearts pass summary">
      <div class="full-hand-summary-row current-hand" aria-label="Passing direction">
        <span class="summary-row-label">Passing</span>
        <div>
          <span>You pass</span>
          <strong>{heartsPassTargetLabel(heartsPassDirection)}</strong>
        </div>
        <div>
          <span>You receive</span>
          <strong>{heartsPassReceiveLabel(heartsPassDirection)}</strong>
        </div>
        <div>
          <span>Cards</span>
          <strong>{heartsPassSelectedCardIds.length} / 3</strong>
        </div>
      </div>
    </div>
  {/snippet}

  {#snippet panel()}
    <div class="lesson-heading">
      <p class="eyebrow">Before the first trick</p>
      <h2>Pass three cards</h2>
    </div>

    <p class="result">
      Choose exactly three cards to pass to {heartsPassTargetLabel(heartsPassDirection)}. You will receive three cards
      from {heartsPassReceiveLabel(heartsPassDirection)}.
    </p>
    {#if heartsPassSelectedCards.length}
      <p class="explanation">
        Passing: {formatCardList(heartsPassSelectedCards)}
      </p>
    {/if}
    {#if heartsPassError}
      <p class="outcome warning">{heartsPassError}</p>
    {/if}

    <CardChoiceHand
      cards={heartsPassingHand.playerHand}
      ariaLabel="Your Hearts passing hand"
      className="hand full-hand-cards hearts-pass-cards"
      cardClassName="card hand-card full-hand-card"
      getCardClasses={(card) => ({
        heart: card.suit === "H",
        legal: !heartsPassSelectedCardIds.includes(card.id),
        selected: heartsPassSelectedCardIds.includes(card.id)
      })}
      isPressed={(card) => heartsPassSelectedCardIds.includes(card.id)}
      onSelect={(card) => onSelect(card.id)}
    />

    <div class="action-row">
      <button class="secondary-action" onclick={onBack} type="button">Table</button>
      <button class="primary-action" disabled={!heartsPassCanSubmit} onclick={onPass} type="button">
        Pass cards
      </button>
    </div>
  {/snippet}
</TablePlaySurface>
