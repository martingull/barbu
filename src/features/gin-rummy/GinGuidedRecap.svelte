<script lang="ts">
  import { ginGuidedRecap, type GinGuidedMoment } from "../../domain/ginRummyLearning";
  import { ginGuidedReview } from "./ginGuidance";
  let { moments }: { moments: GinGuidedMoment[] } = $props();
</script>

<section aria-label="Your hand in review">
  <h2>Your hand in review</h2>
  {#each ginGuidedRecap(moments) as { moment, decision }}
    {@const review = ginGuidedReview(moment)}
    <div class="moment"><h3>Decision {decision}: {review.title}</h3><p>{review.explanation}</p></div>
  {/each}
</section>

<style>
  h2 { font-size: 1rem; margin: 0 0 8px; }
  h3, p { font-size: 0.8rem; line-height: 1.4; margin: 4px 0; }
  .moment { padding: 8px 0; border-top: 1px solid #ffffff26; }
</style>
