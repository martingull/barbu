<script lang="ts">
  import { untrack } from "svelte";
  import { typescriptHandEngine } from "../../domain/handEngine";
  import { dominoHandEngine } from "../../domain/dominoHand";
  import { transitionReviewedHand, type ReviewedHand } from "../../domain/reviewedHand";
  import { fullHandContracts } from "../../contractRegistry";
  import type { DominoHandState, FullHandContract } from "../../lessonTypes";
  import { dominoMoveExplanation } from "./barbuPresentation";
  import BarbuHandView from "./BarbuHandView.svelte";
  import DominoHandView from "./DominoHandView.svelte";

  let { initialContract, initialSeed, nextSeed, onBack }: {
    initialContract: FullHandContract; initialSeed: number; nextSeed: () => number; onBack: () => void;
  } = $props();
  let reviewed = $state<ReviewedHand | null>(null);
  let domino = $state<DominoHandState | null>(null);
  let selected = $state("");
  let error = $state("");
  let reason = $state("");
  let lastTap = { id: "", at: 0 };
  let hand = $derived(reviewed?.fullHand ?? domino);
  let initialized = false;
  $effect(() => {
    if (initialized) return;
    initialized = true;
    untrack(() => start(initialContract, initialSeed));
  });
  function clearSelection() { selected = ""; lastTap = { id: "", at: 0 }; }
  function start(contract: FullHandContract, seed: number) {
    if (contract === "Domino") { domino = dominoHandEngine.start({ seed }); reviewed = null; }
    else {
      const engine = typescriptHandEngine(contract);
      if (!engine) throw Error(`Unsupported contract: ${contract}`);
      reviewed = { fullHand: engine.start({ seed }), fullHandReviewTrickCount: 0 };
      domino = null;
    }
    clearSelection(); reason = error = "";
  }
  function change(action: { type: "play-card"; cardId: string } | { type: "pass" } | { type: "replay" } | { type: "next-trick" }) {
    error = "";
    try {
      if (domino && action.type !== "next-trick") {
        const next = dominoHandEngine.transition(domino, action);
        if (next === domino) return;
        reason = action.type === "play-card" ? dominoMoveExplanation(domino, domino.playerHand.find(card => card.id === action.cardId))
          : action.type === "pass" ? "You passed because no card in your hand could start or extend a lane." : "";
        domino = next;
      } else if (reviewed && action.type !== "pass") {
        const engine = typescriptHandEngine(reviewed.fullHand.contract)!;
        reviewed = action.type === "replay"
          ? { fullHand: engine.transition(reviewed.fullHand, action), fullHandReviewTrickCount: 0 }
          : transitionReviewedHand(reviewed, action, engine);
      }
      clearSelection();
    } catch (cause) { error = cause instanceof Error ? cause.message : "That card could not be played."; }
  }
  function play(id = selected) {
    if (hand?.status !== "in_progress" || reviewed?.fullHandReviewTrickCount || !hand.legalCardIds.includes(id)) return;
    change({ type: "play-card", cardId: id });
  }
  function select(id: string) {
    if (hand?.status !== "in_progress" || reviewed?.fullHandReviewTrickCount || !hand.playerHand.some(card => card.id === id)) return;
    const at = Date.now(), doubleTap = lastTap.id === id && at - lastTap.at < 450;
    selected = id; lastTap = { id, at };
    if (doubleTap) play(id);
  }
  function next() {
    if (hand?.status !== "complete") return;
    start(fullHandContracts[(fullHandContracts.indexOf(hand.contract) + 1) % fullHandContracts.length], nextSeed());
  }
  function place() {
    if (!domino) return;
    play(domino.legalCardIds.includes(selected) ? selected : domino.playerHand.find(card => domino!.legalCardIds.includes(card.id))?.id);
  }
</script>

{#if reviewed}
  <BarbuHandView hand={reviewed.fullHand} reviewCount={reviewed.fullHandReviewTrickCount} selectedCardId={selected} {error}
    {onBack} onSelect={select} onPlay={() => play()} onNextTrick={() => change({ type: "next-trick" })}
    onNextHand={next} onReplay={() => change({ type: "replay" })} />
{:else if domino}
  <DominoHandView dominoHand={domino} dominoSelectedCardId={selected} dominoError={error} dominoLastMoveReason={reason}
    {onBack} onSelect={select} onFocus={id => { selected = id; }} onPlace={place} onPass={() => change({ type: "pass" })}
    onNextHand={next} onReplay={() => change({ type: "replay" })} />
{/if}
