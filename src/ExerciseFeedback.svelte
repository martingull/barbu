<script lang="ts">
  type Props = {
    eyebrow: string;
    title: string;
    result?: string;
    resultAriaLabel?: string;
    explanation?: string;
    outcome?: string;
    warning?: boolean;
    error?: string;
  };

  let {
    eyebrow,
    title,
    result = "",
    resultAriaLabel = "",
    explanation = "",
    outcome = "",
    warning = false,
    error = ""
  }: Props = $props();
</script>

<div class="lesson-heading">
  <p class="eyebrow">{eyebrow}</p>
  <h2>{title}</h2>
</div>

{#if result}
  <p class="result" aria-label={resultAriaLabel || undefined}>{result}</p>
{/if}

{#if error}
  <p class="outcome warning">{error}</p>
{/if}

{#if explanation}
  <p class="explanation">{explanation}</p>
{/if}

{#if outcome}
  <p class:warning class="outcome">{outcome}</p>
{/if}
