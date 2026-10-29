<script lang="ts">
  import type { SpadesBidState } from "../../domain/spadesBidding";
  import { scoreSeats as spadesBidSeats } from "../../presentation/scorePresentation";
  import { spadesSideBid, spadesPlayerSideSeats, spadesOpponentSideSeats } from "../../domain/spadesScoring";
  import { spadesBidSeatLabel } from "./spadesPresentation";
  let { bids: spadesBids, editable = true, compact = false, onBid, label = "Spades bids for this hand" }: {
    bids: SpadesBidState; editable?: boolean; compact?: boolean; onBid: (bid: number) => void; label?: string;
  } = $props();
  let spadesPartnershipBids = $derived({
    playerSide: spadesSideBid(spadesBids, spadesPlayerSideSeats), opponentSide: spadesSideBid(spadesBids, spadesOpponentSideSeats)
  });
  let spadesBidTotal = $derived(spadesBidSeats.reduce((sum, seat) => sum + spadesBids[seat], 0));
</script>

<section class="play-spades-bids" class:compact aria-label={label}>
  {#if !compact}<p class="eyebrow">Set your bid for this hand</p>{/if}
  <div class="spades-bid-grid">
    {#each compact ? spadesBidSeats.filter(seat => seat === "You") : spadesBidSeats as seat}
      <label class="spades-bid-control" class:auto={seat !== "You"}>
        <span>{spadesBidSeatLabel(seat)}{spadesBids[seat] === 0 ? " nil" : ""}</span>
        {#if seat === "You"}
          <div class="spades-bid-stepper">
            <button
              class="drill-action spades-bid-button"
              aria-label="Decrease You bid"
              disabled={!editable || spadesBids.You <= 0}
              onclick={() => onBid(spadesBids.You - 1)}
              type="button"
            >
              -
            </button>
            <strong class="spades-bid-value" aria-label={`You bid ${spadesBids.You}`}>
              {spadesBids.You}
            </strong>
            <button
              class="drill-action spades-bid-button"
              aria-label="Increase You bid"
              disabled={!editable || spadesBids.You >= 13}
              onclick={() => onBid(spadesBids.You + 1)}
              type="button"
            >
              +
            </button>
          </div>
        {:else}
          <div class="spades-bid-stepper auto">
            <span class="spades-bid-placeholder" aria-hidden="true"></span>
            <strong class="spades-bid-value auto" aria-label={`${spadesBidSeatLabel(seat)} bid ${spadesBids[seat]}`}>
              {spadesBids[seat]}
            </strong>
            <small>Auto</small>
          </div>
        {/if}
      </label>
    {/each}
  </div>
  {#if compact}
    <p class="other-bids">{spadesBidSeats.filter(seat => seat !== "You").map(seat => `${spadesBidSeatLabel(seat)}: ${spadesBids[seat] === 0 ? "nil" : spadesBids[seat]}`).join(" / ")}</p>
  {:else}
  <p class="saved-run-note">
    {editable
      ? "Your opening estimate comes from aces, protected kings, high spades, and spade length. Set 0 for nil."
      : "Bids are locked for this hand."}
  </p>
  <p class="spades-bid-summary">
    Team bids:
    <strong>You + Barbu {spadesPartnershipBids.playerSide}</strong>
    <strong>Left + Right {spadesPartnershipBids.opponentSide}</strong>
    <span>Table total {spadesBidTotal}</span>
  </p>
  {/if}
</section>

<style>
  .play-spades-bids.compact { padding: 0; margin: 0; border: 0; background: transparent; gap: 4px; }
  .compact .spades-bid-grid { grid-template-columns: 1fr; gap: 4px; }
  .compact .spades-bid-control { display: grid; grid-template-columns: 1fr 2fr; align-items: center; gap: 8px; }
  .compact .spades-bid-button, .compact .spades-bid-value { min-height: 44px; }
  .other-bids { font-size: 0.75rem; margin: 4px 0; line-height: 1.3; }
</style>
