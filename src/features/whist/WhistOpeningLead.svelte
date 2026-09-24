<script lang="ts">
  import WhistHandView from "./WhistHandView.svelte";
  import { emptyWhistScore, transitionWhistSession, type WhistSession } from "../../domain/whistSession";
  import { buildWhistOpeningLeadPracticeHand, whistOpeningLeadPracticeMaxRounds } from "./openingLeadPractice";
  let { onBack, onComplete }: { onBack: () => void; onComplete: () => void } = $props();
  const deal = (round: number): WhistSession => ({ mode: "game", scores: emptyWhistScore(), games: emptyWhistScore(), results: [],
    fullHand: buildWhistOpeningLeadPracticeHand(round), fullHandReviewTrickCount: 0 });
  let round = $state(0);
  let practice = $state(deal(0));
  let selected = $state("");
  let error = $state("");
  let lastTap = { id: "", at: 0 };
  function start(nextRound: number) {
    round = nextRound;
    practice = deal(round);
    selected = error = "";
    lastTap = { id: "", at: 0 };
  }
  function play() {
    if (!practice.fullHand.legalCardIds.includes(selected)) return;
    try {
      practice = transitionWhistSession(practice, { type: "play-card", cardId: selected });
      selected = "";
      lastTap = { id: "", at: 0 };
    } catch (cause) { error = cause instanceof Error ? cause.message : "That card could not be played."; }
  }
  function select(id: string) {
    if (practice.fullHandReviewTrickCount) return;
    const at = Date.now();
    const doubleTap = lastTap.id === id && at - lastTap.at < 450;
    selected = id;
    lastTap = { id, at };
    if (doubleTap) play();
  }
</script>

<WhistHandView session={practice} selectedCardId={selected} {error} practiceRound={round}
  {onBack} onSelect={select} onPlay={play} onReplay={() => start(round)} onNextHand={() => start(round)}
  onNextTrick={() => round >= whistOpeningLeadPracticeMaxRounds - 1 ? onComplete() : start(round + 1)} />
