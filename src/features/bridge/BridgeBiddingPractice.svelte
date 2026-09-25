<script lang="ts">
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import { bridgeBiddingPracticeSteps } from "../../lessons/bridge/exercises";
  import { bridgeHighCardPoints } from "../../domain/bridgeBidding";
  import { bridgeCallLabel, type BridgeCallOption } from "../../domain/bridgeAuction";
  import { bridgeHandShapeLabel, bridgeSeatLabel } from "./bridgePresentation";
  let { onBack, onComplete }: { onBack: () => void; onComplete: () => void } = $props();
  let index = $state(0);
  let selected = $state<BridgeCallOption>(bridgeBiddingPracticeSteps[0]?.correctCall ?? "Pass");
  let checked = $state<BridgeCallOption | "">("");
  let step = $derived(bridgeBiddingPracticeSteps[index]);
  let last = $derived(index >= bridgeBiddingPracticeSteps.length - 1);
  let feedback = $derived(checked
    ? step.explanations[checked] ?? "Compare your call with basic natural bidding."
    : "Choose the call that best describes South's hand for basic natural bidding.");
  let outcome = $derived(checked ? checked === step.correctCall ? "Good" : "Risky" : "");
  function select(call: BridgeCallOption) { if (!checked) selected = call; }
  function check() { if (!checked) checked = selected; }
  function next() {
    if (!checked) return;
    if (last) { onComplete(); return; }
    index += 1;
    selected = bridgeBiddingPracticeSteps[index].correctCall;
    checked = "";
  }
</script>

<TablePlaySurface flowLayout showTable={false} surfaceClassName="learning-play-surface"
  ariaLabel="Bridge bidding practice" title="Bridge bidding" eyebrow="Basic natural"
  statusLabel="Decision" statusValue={`${index + 1} of ${bridgeBiddingPracticeSteps.length}`}
  tableAriaLabel="Bridge bidding table" tableCards={[]} panelAriaLabel="Bridge bidding exercise" onBack={onBack}>
  {#snippet summary()}
    <div class="full-hand-summary grouped-play-summary" aria-label="Bridge bidding estimate">
    <div class="full-hand-summary-row current-hand bridge-current-hand-row">
      <div>
        <span>HCP</span>
        <strong>{bridgeHighCardPoints(step.hand)}</strong>
      </div>
      <div>
        <span>Shape</span>
        <strong>{bridgeHandShapeLabel(step.hand)}</strong>
      </div>
      <div>
        <span>Dealer</span>
        <strong>{bridgeSeatLabel(step.dealer)}</strong>
      </div>
      <div>
        <span>Vuln.</span>
        <strong>{step.vulnerability}</strong>
      </div>
    </div>
    </div>
  {/snippet}
  {#snippet panel()}
    <ExerciseFeedback
      eyebrow="Opening bid"
      title={step.title}
      result={checked ? "" : step.prompt}
      explanation={feedback}
      outcome={outcome}
      warning={outcome === "Risky"}
    />

    <CardChoiceHand
      cards={step.hand}
      ariaLabel="Your Bridge bidding practice hand"
      className="hand full-hand-cards bridge-auction-hand"
      cardClassName="card hand-card full-hand-card"
      getCardClasses={() => ({ legal: false })}
      isPressed={() => false}
      onSelect={() => {}}
    />

    <div class="bridge-call-grid bridge-practice-call-grid" aria-label="Bridge bidding choices">
      {#each step.options as call}
        <button
          aria-pressed={selected === call}
          class:recommended={checked && step.correctCall === call}
          class:selected={selected === call}
          class="secondary-action"
          onclick={() => select(call)}
          type="button"
        >
          {bridgeCallLabel(call)}
        </button>
      {/each}
    </div>

    <div class="action-row">
      <button class="secondary-action" onclick={onBack} type="button">Table</button>
      {#if checked}
        <button class="primary-action" onclick={next} type="button">
          {last ? "Finish practice" : "Next decision"}
        </button>
      {:else}
        <button class="primary-action" onclick={check} type="button">
          Check answer
        </button>
      {/if}
    </div>
  {/snippet}
</TablePlaySurface>
