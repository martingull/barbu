<script lang="ts">
  import GuidedTrickRecap from "../../components/GuidedTrickRecap.svelte";
  import FeedbackBreakdown from "../../components/FeedbackBreakdown.svelte";
  import { spadesLearningScore, spadesLearningRecap } from "../../domain/spadesLearning";
  import { spadesPlayerSideSeats, spadesOpponentSideSeats } from "../../domain/spadesScoring";
  import type { SpadesSession } from "../../domain/spadesSession";
  import { scoreSeatLabel, formatSignedScore } from "../../presentation/scorePresentation";
  import { spadesGuidedReview } from "./spadesGuidance";
  let { session }: { session: SpadesSession } = $props();
  let moments = $derived(spadesLearningRecap(session.fullHand.completedTricks, session.bids).map(moment => {
    const review = spadesGuidedReview(session.fullHand.completedTricks.slice(0, moment.number), session.bids)!;
    return { number: moment.number, title: moment.nilFailed ? "Nil broken" : moment.targetReached ? "Bid reached" : moment.firstBag ? "First bag" : moment.facts?.trumped ? "Trump wins" : "Last trick",
      summary: review.scoring, explanation: `${review.winning} ${review.choice}`, cards: moment.trick.cards };
  }));
</script>

{#each [{ label: "You + Barbu", seats: spadesPlayerSideSeats, bags: session.bags.playerSide }, { label: "Left + Right", seats: spadesOpponentSideSeats, bags: session.bags.opponentSide }] as side}
  {@const score = spadesLearningScore(session.fullHand.completedTricks, session.bids, side.seats, side.bags)}
  <h3>{side.label}: {formatSignedScore(score.score)}</h3>
  <FeedbackBreakdown breakdown={{ label: `${side.label} scoring`, rows: [
    { label: "Bids", value: side.seats.map(seat => `${scoreSeatLabel(seat)} ${session.bids[seat] === 0 ? "nil" : session.bids[seat]}`).join(" + ") },
    { label: "Books / bid", value: `${score.won} / ${score.bid}` },
    { label: score.won >= score.bid ? "Bid made" : "Bid missed", value: `${formatSignedScore(score.contractPoints)} points` },
    { label: "Extra books", value: `${score.extra} ${score.extra === 1 ? "bag" : "bags"} = +${score.extra} ${score.extra === 1 ? "point" : "points"}` },
    ...score.nilResults.map(nil => ({ label: `${scoreSeatLabel(nil.seat)} nil`, value: `${nil.tricks} tricks: ${formatSignedScore(nil.score)}` })),
    { label: "Ten-bag penalty", value: String(-score.bagPenalty) },
    { label: "Hand total", value: formatSignedScore(score.score) },
    { label: "Bags carried", value: String(score.remainingBags) }
  ] }} />
{/each}
<GuidedTrickRecap {moments} />

<style>
  h3 { font-size: 1rem; line-height: 1.3; margin: 12px 0 0; }
</style>
