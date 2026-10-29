<script lang="ts">
  import GuidedTrickRecap from "../../components/GuidedTrickRecap.svelte";
  import FeedbackBreakdown from "../../components/FeedbackBreakdown.svelte";
  import { barbuLearningPosition, barbuLearningRecap } from "../../domain/barbuLearning";
  import { contractRunScore } from "../../domain/contractScoring";
  import { barbuGuidedReview } from "./barbuGuidance";
  import { formatSignedScore } from "../../presentation/scorePresentation";
  import type { FullHandState } from "../../domain/types";
  let { hand }: { hand: FullHandState } = $props();
  let position = $derived(barbuLearningPosition(hand));
  let moments = $derived(barbuLearningRecap(position).map(moment => {
    const review = barbuGuidedReview(position, moment.number)!;
    return { number: moment.number, title: moment.number === 1 ? "Opening trick" : moment.number === 13 ? "Final trick"
      : hand.contract === "No Last Two" ? "First penalty trick" : hand.contract === "Hearts Trumps" ? "Reward collected" : "Penalty collected", summary: review.scoring,
      explanation: `${review.winning} ${review.choice}`, cards: moment.trick.cards };
  }));
</script>

<FeedbackBreakdown breakdown={{ label: "Contract scoring", rows: [
  { label: "Your tricks", value: String(hand.completedTricks.filter(trick => trick.winner === "You").length) },
  { label: hand.contract === "Hearts Trumps" ? "Reward points" : "Penalty points", value: String(hand.playerPenalty) },
  { label: "Contract score", value: formatSignedScore(contractRunScore(hand.contract, hand.playerPenalty)) },
  { label: "In Play", value: "The seven-contract training session combines contract scores. This guided hand leaves your saved session unchanged." }
] }} />
<GuidedTrickRecap {moments} />
