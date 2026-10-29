<script lang="ts">
  import GuidedTrickRecap from "../../components/GuidedTrickRecap.svelte";
  import FeedbackBreakdown from "../../components/FeedbackBreakdown.svelte";
  import { whistLearningPosition, whistLearningScore, whistLearningRecap } from "../../domain/whistLearning";
  import type { FullHandState } from "../../domain/types";
  import { whistGuidedReview } from "./whistGuidance";
  let { hand }: { hand: FullHandState } = $props();
  let score = $derived(whistLearningScore(hand.completedTricks));
  const points = (tricks: number, value: number) => tricks <= 6
    ? `${tricks} tricks: none above six, so 0 points`
    : `${tricks} tricks - 6 = ${value} ${value === 1 ? "point" : "points"}`;
  let moments = $derived(whistLearningRecap(hand.completedTricks, whistLearningPosition(hand).trump).map(moment => {
    const review = whistGuidedReview(hand.completedTricks.slice(0, moment.number), whistLearningPosition(hand).trump)!;
    return { number: moment.number, title: moment.kind === "first-point" ? "First odd trick" : moment.kind === "trump" ? "Trump wins" : "Last trick",
      summary: review.scoring, explanation: `${review.winning} ${review.choice}`, cards: moment.trick.cards };
  }));
</script>

<FeedbackBreakdown breakdown={{ label: "Whist hand scoring", rows: [
  { label: "You + Barbu", value: points(score.tricks.playerSide, score.points.playerSide) },
  { label: "Left + Right", value: points(score.tricks.opponentSide, score.points.opponentSide) },
  { label: "Honours", value: "Not scored at this table" },
  { label: "In Play", value: "First to 5 points wins a game; a rubber is first to two games. This guided hand does not change your saved match." }
] }} />
<GuidedTrickRecap {moments} />
