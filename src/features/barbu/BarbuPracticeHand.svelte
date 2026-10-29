<script lang="ts">
  import { untrack } from "svelte";
  import { createGuidedHandFeature } from "../guidedHandFeature";
  import { createBarbuLearningHand, transitionBarbuLearningHand } from "../../domain/barbuLearning";
  import { fullHandContracts } from "../../domain/contractRegistry";
  import type { FullHandContract } from "../../domain/types";
  import { dominoMoveExplanation } from "./barbuPresentation";
  import BarbuHandView from "./BarbuHandView.svelte";
  import DominoHandView from "./DominoHandView.svelte";

  let { initialContract, initialSeed, nextSeed, onBack, guided = false, onIndependentPlay }: {
    initialContract: FullHandContract; initialSeed: number; nextSeed: () => number; onBack: () => void;
    guided?: boolean; onIndependentPlay?: () => void;
  } = $props();
  function create(contract: FullHandContract, seed: number) {
    return createGuidedHandFeature(seed, { create: () => createBarbuLearningHand(contract, seed),
      transition: transitionBarbuLearningHand, replay: () => createBarbuLearningHand(contract, seed) });
  }
  let feature = $state(untrack(() => create(initialContract, initialSeed)));
  let reason = $state("");
  let lastTap = { id: "", at: 0 };
  let reviewed = $derived($feature.session.kind === "trick" ? $feature.session.reviewed : null);
  let domino = $derived($feature.session.kind === "domino" ? $feature.session.hand : null);
  let hand = $derived(reviewed?.fullHand ?? domino!);
  function play(id = $feature.selectedCardId) {
    if (hand.status !== "in_progress" || reviewed?.fullHandReviewTrickCount || !hand.legalCardIds.includes(id)) return;
    reason = domino ? dominoMoveExplanation(domino, domino.playerHand.find(card => card.id === id)) : "";
    feature.dispatch({ type: "play-card", cardId: id }); lastTap = { id: "", at: 0 };
  }
  function select(id: string) {
    if (hand.status !== "in_progress" || reviewed?.fullHandReviewTrickCount) return;
    const at = Date.now(), doubleTap = lastTap.id === id && at - lastTap.at < 450;
    feature.select(id); lastTap = { id, at };
    if (doubleTap) play(id);
  }
  function replay() { feature.replay(); reason = ""; lastTap = { id: "", at: 0 }; }
  function next() {
    if (hand.status !== "complete") return;
    if (guided) { onIndependentPlay?.(); return; }
    feature = create(fullHandContracts[(fullHandContracts.indexOf(hand.contract) + 1) % fullHandContracts.length], nextSeed());
    reason = ""; lastTap = { id: "", at: 0 };
  }
</script>

{#if reviewed}
  <BarbuHandView hand={reviewed.fullHand} reviewCount={reviewed.fullHandReviewTrickCount}
    selectedCardId={$feature.selectedCardId} error={$feature.error} {guided}
    {onBack} onSelect={select} onPlay={() => play()} onNextTrick={() => feature.dispatch({ type: "next-trick" })}
    onNextHand={next} onReplay={replay} />
{:else if domino}
  <DominoHandView dominoHand={domino} dominoSelectedCardId={$feature.selectedCardId} dominoError={$feature.error}
    dominoLastMoveReason={reason} {guided} {onBack} onSelect={select} onFocus={feature.select}
    onPlace={() => play(domino!.legalCardIds.includes($feature.selectedCardId) ? $feature.selectedCardId : domino!.legalCardIds[0])}
    onPass={() => { reason = "You passed because no card could be placed."; feature.dispatch({ type: "pass" }); }}
    onNextHand={next} onReplay={replay} />
{/if}
