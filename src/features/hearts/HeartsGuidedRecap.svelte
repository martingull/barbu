<script lang="ts">
  import GuidedTrickRecap from "../../components/GuidedTrickRecap.svelte";
  import { heartsLearningRecap } from "../../domain/heartsLearning";
  import type { CompletedHandTrick } from "../../domain/types";
  import { heartsGuidedReview } from "./heartsGuidance";

  let { tricks }: { tricks: CompletedHandTrick[] } = $props();
  let moments = $derived(heartsLearningRecap(tricks).map(moment => {
    const review = heartsGuidedReview(moment.trick)!;
    return { number: moment.number, title: moment.facts.queen ? "Q♠" : moment.facts.hearts ? "Heart points" : "Your off-suit discard",
      summary: `${review.scoring} ${review.choice}`, explanation: review.winning, cards: moment.trick.cards };
  }));
</script>

<GuidedTrickRecap {moments} />
