<script lang="ts">
  import CardFace from "../../components/CardFace.svelte";
  import { formatCardLabel } from "../../presentation/cardDisplay";
  import { scoreSeatLabel } from "../../presentation/scorePresentation";
  import type { Card, Seat } from "../../domain/types";
  import type { MemoryAnswer, MemoryQuestion } from "../../domain/cardCountingQuestions";
  let { question, answer, checked, heading, caption, feedback, labels, cards, onAnswer }: {
    question: MemoryQuestion; answer: MemoryAnswer | null; checked: boolean; heading: string; caption: string;
    feedback: string; labels: { target: string; count: string; specific: string; seen: string };
    cards: Card[]; onAnswer: (answer: MemoryAnswer) => void;
  } = $props();
  let target = $derived("targetCard" in question ? question.targetCard : null);
  let options = $derived<Array<{ value: MemoryAnswer; label: string }>>("options" in question
    ? question.options.map(value => ({ value, label: String(value) }))
    : question.kind === "void_spotter"
      ? (["Left", "Right", "Tutor"] as Seat[]).map(value => ({ value, label: scoreSeatLabel(value) }))
      : [{ value: true, label: "Yes" }, { value: false, label: "No" }]);
</script>

<section class="memory-prompt" aria-label="Memory question">
  <div class="question-copy">
    <small>{caption}</small>
    <h2>{heading}</h2>
    <p>{question.prompt}</p>
  </div>
  <div class:trump-specific-check={Boolean(target)} class="answer-layout">
    {#if target}
      <div class="memory-target" aria-label={`${labels.target} ${formatCardLabel(target)}`}><CardFace card={target} /></div>
    {/if}
    <div class="trump-count-options memory-options" aria-label={target ? labels.specific : question.kind === "void_spotter" ? "Void spotter options" : labels.count}>
      {#each options as option}
        <button type="button" class:selected={answer === option.value}
          class:correct={checked && option.value === question.answer}
          class:wrong={checked && answer === option.value && option.value !== question.answer}
          aria-pressed={answer === option.value} disabled={checked} onclick={() => onAnswer(option.value)}>{option.label}</button>
      {/each}
    </div>
  </div>
  <p class="outcome" class:warning={checked && answer !== question.answer} aria-live="polite">
    {checked ? feedback : "Answer from memory. Old tricks are hidden."}
  </p>
  {#if checked}
    <div class="trump-review-cards memory-review" aria-label={labels.seen}>
      {#each cards as card}<CardFace {card} />{/each}
    </div>
  {/if}
</section>

<style>
  .memory-prompt { display: grid; gap: 12px; min-width: 0; padding: 0 0 16px; }
  .question-copy { display: grid; gap: 6px; }
  small { color: #c1d1bf; font-size: 0.75rem; }
  h2 { margin: 0; font-size: 1rem; line-height: 1.3; color: #f7faf3; }
  p { margin: 0; font-size: 0.82rem; line-height: 1.35; color: #e7eee1; }
  .answer-layout { display: grid; align-items: center; min-width: 0; gap: 12px; }
  .answer-layout.trump-specific-check { grid-template-columns: 52px minmax(0, 1fr); min-height: 0; }
  .memory-target { width: 52px; aspect-ratio: 5 / 7; }
  .memory-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; min-width: 0; }
  .memory-options button { min-height: 44px; min-width: 0; padding: 8px; font-size: 0.9rem; font-weight: 900; border: 1px solid #f5f1cf85; border-radius: 6px; background: #f5f1cf14; color: #f5f1cf; }
  .memory-options button.selected, .memory-options button.correct { border-color: #f5f1cf; background: #f5f1cf; color: #21372d; }
  .memory-options button.wrong { border-color: #f0b3a8; background: #f0b3a829; color: #f0b3a8; }
  .memory-options button:focus-visible { outline: 2px solid #f5f1cf; outline-offset: 2px; }
  .memory-review { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; max-height: none; padding: 0; overflow: visible; }
  .memory-review :global(.card-face) { width: 100%; height: auto; max-width: 40px; aspect-ratio: 5 / 7; justify-self: center; }
</style>
