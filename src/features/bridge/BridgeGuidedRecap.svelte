<script lang="ts">
  import GuidedTrickRecap from "../../components/GuidedTrickRecap.svelte";
  import FeedbackBreakdown from "../../components/FeedbackBreakdown.svelte";
  import { bridgeLearningRecap } from "../../domain/bridgeLearning";
  import type { FullHandState } from "../../domain/types";
  import { bridgeGuidedReview } from "./bridgeGuidance";
  import { compassSeatLabels } from "../../presentation/cardDisplay";
  let { hand }: { hand: FullHandState } = $props();
  let moments = $derived(bridgeLearningRecap(hand.completedTricks, hand.bridgeContract!).map(moment => {
    const review = bridgeGuidedReview(hand.completedTricks.slice(0, moment.number), hand.bridgeContract!)!;
    return { number: moment.number, title: moment.kind === "contract" ? "Contract decided" : moment.kind === "opening" ? "Opening trick" : "Last trick",
      summary: review.scoring, explanation: `${review.winning} ${review.next}`, cards: moment.trick.cards };
  }));
</script>

<FeedbackBreakdown breakdown={{ label: "Bridge guided board", rows: [
  { label: "Target", value: `Six base tricks + level ${hand.bridgeContract!.level} = ${hand.bridgeContract!.target}` },
  { label: "In Play", value: "Duplicate points are recorded by board. This guided board does not change your saved game or learning progress." }
] }} />
<GuidedTrickRecap {moments} seatLabels={compassSeatLabels} />
