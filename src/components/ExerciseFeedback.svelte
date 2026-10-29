<script lang="ts">
  import { formatCardText } from "../presentation/cardDisplay";
  import CharacterPortrait from "./CharacterPortrait.svelte";
  import { learningCharacters, type LearningCharacterId } from "../presentation/learningCharacters";
  import { teachingLabels, type Teaching, type FeedbackBreakdown as Breakdown } from "../lessons/learningPresentation";
  import FeedbackBreakdown from "./FeedbackBreakdown.svelte";

  type Props = {
    eyebrow: string;
    title: string;
    result?: string;
    resultAriaLabel?: string;
    explanation?: string;
    outcome?: string;
    warning?: boolean;
    error?: string;
    coach?: LearningCharacterId;
    reserveSpace?: boolean;
    teaching?: Teaching;
    breakdown?: Breakdown;
  };

  let {
    eyebrow,
    title,
    result = "",
    resultAriaLabel = "",
    explanation = "",
    outcome = "",
    warning = false,
    error = "",
    coach,
    reserveSpace = false,
    teaching,
    breakdown
  }: Props = $props();
  let feedbackRegion: HTMLDivElement | undefined = $state();
  $effect(() => {
    // Each new decision starts at the rule, even after scrolling the last review.
    result; explanation; outcome; error;
    if (reserveSpace && feedbackRegion) feedbackRegion.scrollTop = 0;
  });
</script>

<div class="lesson-heading">
  <p class="eyebrow">{eyebrow}</p>
  <h2>{title}</h2>
</div>

{#snippet feedback()}
{#if teaching}
  <p class="teaching-stage">{teachingLabels[teaching.stage]}</p>
{/if}
{#if result}
  <p class="result" aria-label={resultAriaLabel || undefined}>{formatCardText(result)}</p>
{/if}

{#if error}
  <p class="outcome warning">{formatCardText(error)}</p>
{/if}

{#if explanation && formatCardText(explanation) !== formatCardText(result)}
  <p class="explanation">{formatCardText(explanation)}</p>
{/if}

{#if outcome}
  <p class:warning class="outcome">{formatCardText(outcome)}</p>
{/if}
{#if teaching?.guidance}<p class="explanation">{formatCardText(teaching.guidance)}</p>{/if}
{#if breakdown}<FeedbackBreakdown {breakdown} />{/if}
{/snippet}

{#if coach}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable guidance needs keyboard access.) -->
  <div class="coach-feedback" class:reserved={reserveSpace} bind:this={feedbackRegion}
    role={reserveSpace ? "region" : undefined} aria-label={reserveSpace ? "Turn guidance" : undefined}
    tabindex={reserveSpace ? 0 : undefined}>
    <CharacterPortrait character={coach} size={32} />
    <div class="feedback-copy">
      <span class="coach-name">{learningCharacters[coach].name}</span>
      {@render feedback()}
    </div>
  </div>
{:else}
  {@render feedback()}
{/if}

<style>
  .teaching-stage { margin: 2px 0; font-size: 0.7rem; font-weight: 700; color: #e7c766; }
  .coach-feedback { display: flex; gap: 8px; align-items: flex-start; min-width: 0; }
  .feedback-copy { min-width: 0; flex: 1; }
  .coach-name { font-size: 0.65rem; color: #e7c766; font-weight: 700; }
  .reserved { height: var(--flow-feedback-height, 8rem); overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: #819c8e transparent; }
  .reserved:focus-visible { outline: 2px solid #f5f1cf; outline-offset: 2px; }
</style>
