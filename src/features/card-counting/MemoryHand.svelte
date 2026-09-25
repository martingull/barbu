<script lang="ts">
  import { untrack } from "svelte";
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import { startMemoryHand, transitionMemoryHand, memoryHandQuestion, memoryHandDefinitions, type MemoryHandEvent } from "../../domain/cardCountingSession";
  import type { MemoryExercise } from "../../domain/cardCountingQuestions";
  import { contractScoreMeta } from "../../domain/contractScoring";
  import { formatCardLabel } from "../../presentation/cardDisplay";
  import { partnershipTrickCounts } from "../../domain/trickTakingScore";
  import { whistTrickFeedback } from "../whist/whistPresentation";
  import { heartsTrickFeedback } from "../hearts/heartsPresentation";
  import { fullHandTrickFeedback } from "../barbu/barbuPresentation";
  import { memoryPresentation, memoryQuestionHeading, memoryAnswerText, memoryReviewCards, memoryResult } from "./countingPresentation";
  import MemoryPrompt from "./MemoryPrompt.svelte";
  import CountingResult from "./CountingResult.svelte";

  let { exercise, initialSeed, nextSeed, onBack }: {
    exercise: MemoryExercise; initialSeed: number; nextSeed: () => number; onBack: () => void;
  } = $props();
  let session = $state(untrack(() => startMemoryHand(exercise, initialSeed)));
  let selected = $state("");
  let error = $state("");
  let lastTap = { id: "", at: 0 };
  let hand = $derived(session.fullHand);
  let complete = $derived(hand.status === "complete");
  let review = $derived(session.fullHandReviewTrickCount ? hand.completedTricks[session.fullHandReviewTrickCount - 1] : undefined);
  let question = $derived(memoryHandQuestion(session));
  let presentation = $derived(memoryPresentation[session.exercise]);
  let definition = $derived(memoryHandDefinitions[session.exercise]);
  let meta = $derived(contractScoreMeta(hand.contract));
  let partnership = $derived(hand.contract === "Whist");
  let tricks = $derived(partnershipTrickCounts(hand.completedTricks));
  let result = $derived(memoryResult(session));
  let feedback = $derived(review ? partnership ? whistTrickFeedback(review)
    : hand.contract === "Hearts" ? heartsTrickFeedback(review, hand) : fullHandTrickFeedback(review, hand) : "");
  let danger = $derived(session.exercise === "danger-count");
  let highCard = $derived(session.exercise === "high-card-memory");
  function clear() { selected = error = ""; lastTap = { id: "", at: 0 }; }
  function change(event: MemoryHandEvent) {
    try {
      const next = transitionMemoryHand(session, event);
      if (next !== session) { session = next; clear(); }
    } catch (cause) { error = cause instanceof Error ? cause.message : "That card could not be played."; }
  }
  function select(id: string) {
    if (complete || review || !hand.playerHand.some(card => card.id === id)) return;
    const at = Date.now();
    const doubleTap = id === lastTap.id && at - lastTap.at < 450;
    selected = id; lastTap = { id, at };
    if (doubleTap) change({ type: "play-card", cardId: id });
  }
</script>

<TablePlaySurface flowLayout surfaceClassName="counting-surface" mode={complete ? "result" : "play"}
  ariaLabel={`${hand.contract} full hand`} title={presentation.title} eyebrow="Card Counting I"
  statusLabel={presentation.game} statusValue={`${hand.completedTricks.length} / 13 tricks`}
  tableAriaLabel={`${hand.contract} hand table`} tableCards={review?.cards ?? hand.currentTrick}
  showTable={!complete && !question} pendingBySeat={!review && hand.currentPlayer === "You" ? { You: "You" } : {}}
  panelAriaLabel={`${hand.contract} hand decision`} {onBack} onSurfaceClick={review && !question ? () => change({ type: "next" }) : undefined}>
  {#snippet summary()}
    {#if !complete}
      <div class="full-hand-summary grouped-play-summary" aria-label={`${hand.contract} hand score`}>
        <div class="full-hand-summary-row current-hand" class:whist-hand-summary={partnership}>
          <div><span>{partnership ? "Your side" : meta.playerValueLabel}</span><strong>{partnership ? tricks.playerSide : hand.playerPenalty}</strong></div>
          <div><span>{partnership ? "Opponents" : meta.inPlayLabel}</span><strong>{partnership ? tricks.opponentSide : `${hand.totalPenalty} / ${meta.totalValue}`}</strong></div>
          <div><span>Memory</span><strong>{session.clean} / {session.attempts}</strong></div>
          {#if partnership && hand.whistTurnedTrump}<div><span>Trump</span><strong>{formatCardLabel(hand.whistTurnedTrump)}</strong></div>{/if}
        </div>
      </div>
    {/if}
  {/snippet}
  {#snippet panel()}
    {#if complete}
      <CountingResult label={`${presentation.title} intermission`} title={result.title} summary={result.summary}
        clean={session.clean} attempts={session.attempts} scoreLabel={result.scoreLabel} score={result.score} />
    {:else if question}
      <MemoryPrompt {question} answer={session.answer} checked={session.checked} labels={presentation}
        heading={memoryQuestionHeading(question, danger, highCard)}
        caption={`Memory check ${Math.min(session.attempts + Number(!session.checked), definition.checkpoints.length)} of ${definition.checkpoints.length}`}
        feedback={session.answer === question.answer ? "Correct. Memory held." : memoryAnswerText(question, danger, highCard)}
        cards={memoryReviewCards(session)} onAnswer={answer => change({ type: "answer", answer })} />
    {:else if review}
      <p class="outcome" class:warning={meta.kind === "avoidance" && review.outcome === "captured_penalty"}>{feedback}</p>
    {:else}
      <ExerciseFeedback eyebrow="Your turn" title="Choose your card" result={hand.prompt} {error} />
      <CardChoiceHand cards={hand.playerHand} ariaLabel={`Your ${hand.contract} hand`} className="hand full-hand-cards"
        cardClassName="card hand-card full-hand-card" isPressed={card => selected === card.id} onSelect={card => select(card.id)}
        getCardClasses={card => ({ heart: card.suit === "H", legal: hand.legalCardIds.includes(card.id), illegal: !hand.legalCardIds.includes(card.id), selected: selected === card.id })} />
    {/if}
    {#if error && (review || complete)}<p class="outcome warning" role="alert">{error}</p>{/if}
    <div class="action-row">
      <button class="secondary-action" onclick={onBack} type="button">Table</button>
      {#if complete}
        <button class="secondary-action" onclick={() => change({ type: "replay" })} type="button">Replay</button>
        <button class="primary-action" onclick={() => { session = startMemoryHand(exercise, nextSeed()); clear(); }} type="button">Next hand</button>
      {:else if question && !session.checked}
        <button class="primary-action" disabled={session.answer === null} onclick={() => change({ type: "check" })} type="button">Check memory</button>
      {:else if review}
        <button class="primary-action" onclick={() => change({ type: "next" })} type="button">Next trick</button>
      {:else}
        <button class="primary-action" disabled={!hand.legalCardIds.includes(selected)} onclick={() => change({ type: "play-card", cardId: selected })} type="button">Play card</button>
      {/if}
    </div>
  {/snippet}
</TablePlaySurface>
