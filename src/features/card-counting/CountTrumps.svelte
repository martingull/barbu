<script lang="ts">
  import { untrack } from "svelte";
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import { formatCardLabel } from "../../presentation/cardDisplay";
  import { startCountRound, transitionCountRound, type MemoryEvent } from "../../domain/cardCountingSession";
  import MemoryPrompt from "./MemoryPrompt.svelte";
  import CountingResult from "./CountingResult.svelte";
  let { initialSeed, nextSeed, onBack }: { initialSeed: number; nextSeed: () => number; onBack: () => void } = $props();
  let session = $state(untrack(() => startCountRound(initialSeed)));
  let complete = $derived(session.stage === "complete");
  let question = $derived(session.round.questions[session.question]);
  let segment = $derived(`tricks ${question.startTrick + 1}-${question.endTrick + 1}`);
  let cards = $derived(session.round.tricks.slice(question.startTrick, question.endTrick + 1)
    .flatMap(trick => trick.map(play => play.card)).filter(card => card.suit === session.round.trumpSuit));
  let feedback = $derived(session.answer === question.answer ? "Correct. Memory held."
    : question.kind === "count" ? `${question.answer} hearts appeared in ${segment}.`
    : `${formatCardLabel(question.targetCard)} ${question.answer ? "was" : "was not"} in ${segment}.`);
  function change(event: MemoryEvent) { session = transitionCountRound(session, event); }
</script>

<TablePlaySurface flowLayout surfaceClassName="counting-surface" mode={complete ? "result" : "play"}
  ariaLabel="Count trumps trainer" title="Count trumps" eyebrow="Card Counting I" statusLabel="Memory" statusValue={`${session.clean} of ${session.attempts}`}
  tableAriaLabel="Trump trick reveal" tableCards={session.round.tricks[session.trick]} showTable={session.stage === "reveal"}
  panelAriaLabel="Count trumps decision" {onBack}>
  {#snippet summary()}
    {#if !complete}
      <div class="full-hand-summary" aria-label="Count trumps status"><div class="full-hand-summary-row current-hand">
        <div><span>Hearts are trumps</span><strong>Trick {session.trick + 1} of 13</strong></div>
        <div><span>Memory check</span><strong>{session.question + 1} / 3</strong></div>
      </div></div>
    {/if}
  {/snippet}
  {#snippet panel()}
    {#if complete}
      <CountingResult label="Count trumps intermission" title={session.clean === session.attempts ? "Clean warm-up" : "Warm-up complete"}
        summary="All thirteen tricks are complete. Keep a separate heart count for each segment."
        clean={session.clean} attempts={session.attempts} scoreLabel="Tricks watched" score="13 / 13" />
    {:else if session.stage === "reveal"}
      <p class="result" aria-label="Trump count prompt">Track the hearts in {segment}.</p>
    {:else}
      {#if !session.checked}<p class="result" aria-label="Trump memory prompt">Cards hidden</p>{/if}
      <MemoryPrompt {question} answer={session.answer} checked={session.checked}
        heading={question.kind === "count" ? "How many hearts appeared?" : "Did this heart appear?"}
        caption={`Memory check ${session.question + 1} of 3`} {feedback} {cards}
        labels={{ target: "Target trump card", count: "Trump count answers", specific: "Trump specific answers", seen: "Hearts in this segment" }}
        onAnswer={answer => change({ type: "answer", answer })} />
      {#if session.checked}<p class="explanation" aria-label="Trump count review">{cards.length} hearts appeared in {segment}.</p>{/if}
    {/if}
    <div class="action-row">
      <button class="secondary-action" onclick={onBack} type="button">Table</button>
      {#if complete}
        <button class="secondary-action" onclick={() => change({ type: "replay" })} type="button">Replay</button>
        <button class="primary-action" onclick={() => { session = startCountRound(nextSeed()); }} type="button">Next hand</button>
      {:else if session.stage === "reveal"}
        <button class="primary-action" onclick={() => change({ type: "next" })} type="button">{session.trick === question.endTrick ? "Answer memory" : "Next trick"}</button>
      {:else if session.checked}
        <button class="primary-action" onclick={() => change({ type: "next" })} type="button">{session.question === 2 ? "Review round" : "Continue"}</button>
      {:else}
        <button class="primary-action" disabled={session.answer === null} onclick={() => change({ type: "check" })} type="button">Check memory</button>
      {/if}
    </div>
  {/snippet}
</TablePlaySurface>
