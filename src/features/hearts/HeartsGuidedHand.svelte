<script lang="ts">
  import { untrack } from "svelte";
  import { createHeartsSession, transitionHeartsSession, type HeartsSessionEvent } from "../../domain/heartsSession";
  import HeartsPassing from "./HeartsPassing.svelte";
  import HeartsHandView from "./HeartsHandView.svelte";

  let { seed, onBack, onIndependentPlay }: { seed: number; onBack: () => void; onIndependentPlay: () => void } = $props();
  // This component owns an unsaved session; no match controller or storage is used.
  let session = $state(untrack(() => createHeartsSession(seed)));
  let selected = $state("");
  function dispatch(event: HeartsSessionEvent) {
    session = transitionHeartsSession(session, event);
    selected = "";
  }
</script>

{#if session.phase === "passing"}
  <HeartsPassing {session} error="" guided {onBack}
    onSelect={cardId => dispatch({ type: "select-pass", cardId })} onPass={() => dispatch({ type: "pass" })} />
{:else}
  <HeartsHandView {session} selectedCardId={selected} error="" dealing={false} guided {onBack}
    onSelect={id => { selected = id; }} onPlay={() => dispatch({ type: "play-card", cardId: selected })}
    onNextTrick={() => dispatch({ type: "next-trick" })} onNextHand={onIndependentPlay}
    onReplay={() => dispatch({ type: "replay" })} />
{/if}
