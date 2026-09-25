<script lang="ts">
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import GameResult from "../../components/GameResult.svelte";
  import { bridgeHighCardPoints } from "../../domain/bridgeBidding";
  import { explainBridgeCall } from "./bridgeBidExplanation";
  import { bridgeAuctionStatus, bridgeLegalCallOptions, bridgeSuggestedCallForHand, bridgeFinalizeContract,
    bridgeBidOptions, bridgeCallLongLabel, type BridgeCallOption } from "../../domain/bridgeAuction";
  import type { BridgeSession } from "../../domain/bridgeSession";
  import { bridgeSeatLabel, bridgeDealerSeat, bridgeDealerIndex, bridgeVulnerabilityForHand } from "./bridgePresentation";
  let { session, error, dealing, onBack, onSelectCall, onConfirm }: {
    session: BridgeSession; error: string; dealing: boolean; onBack: () => void;
    onSelectCall: (call: BridgeCallOption) => void; onConfirm: () => void;
  } = $props();
  let fullHand = $derived(session.fullHand);
  let bridgeAuctionCalls = $derived(session.auctionCalls);
  let bridgeAuctionSelectedCall = $derived(session.selectedCall);
  let bridgeAuctionCurrentStatus = $derived(bridgeAuctionStatus(bridgeAuctionCalls, bridgeDealerIndex(fullHand)));
  let bridgeAuctionLegalCalls = $derived(bridgeLegalCallOptions(bridgeAuctionCalls, bridgeAuctionCurrentStatus.currentSeat, bridgeDealerIndex(fullHand)));
  let bridgeAuctionReadyToPlay = $derived(bridgeAuctionCurrentStatus.complete && !bridgeAuctionCurrentStatus.passedOut);
  let bridgeAuctionActionLabel = $derived(bridgeAuctionReadyToPlay ? "Start play" : bridgeAuctionCurrentStatus.passedOut ? "Deal again" : "Make call");
  let bridgeSuggestedCall = $derived(bridgeSuggestedCallForHand(fullHand, bridgeAuctionCalls, "You"));
  let bridgeVisibleContract = $derived(bridgeFinalizeContract(bridgeAuctionCalls, fullHand));
  let bridgeAuctionSelectedCallExplanation = $derived(explainBridgeCall(bridgeAuctionSelectedCall, bridgeAuctionCalls, bridgeAuctionCurrentStatus.currentSeat));
</script>

<header class="topbar table-play-topbar" aria-label="Bridge auction">
  <button class="back-button" onclick={onBack} type="button">Table</button>
  <div>
    <p class="eyebrow">Contract Bridge</p>
    <h1>Bridge auction</h1>
  </div>
  <div class="contract-status">
    <span>Dealer</span>
    <strong>{bridgeSeatLabel(bridgeDealerSeat(fullHand))}</strong>
  </div>
</header>

<section class="bridge-auction-screen" aria-label="Bridge auction">
  <section class="lesson-panel bridge-auction-panel" aria-label="Bridge bidding box">
    {#if bridgeAuctionCurrentStatus.passedOut}
      <GameResult game="Bridge" completion="board" title="Auction complete" summary="All four players passed. No contract was played and neither side scores." />
    {:else}
    <div class="lesson-heading">
      <p class="eyebrow">Before dummy appears</p>
      <h2>{bridgeAuctionCurrentStatus.complete ? "Auction complete" : bridgeAuctionCurrentStatus.currentSeat === "You" ? "Choose your call" : "Auction in progress"}</h2>
    </div>

    <p class="result">
      You are South. The auction uses basic natural bidding: five-card majors, better minor, 15-17 1NT, strong 2C,
      and weak twos. The final contract sets declarer, dummy, opening lead, vulnerability, and scoring.
    </p>
    {/if}

    <div class="bridge-auction-metrics" aria-label="Bridge hand estimate">
      <div>
        <span>HCP</span>
        <strong>{bridgeHighCardPoints(fullHand.playerHand)}</strong>
      </div>
      <div>
        <span>Suggested</span>
        <strong>{bridgeCallLongLabel(bridgeSuggestedCall)}</strong>
      </div>
      <div>
        <span>Turn</span>
        <strong>{bridgeAuctionCurrentStatus.complete ? "Done" : bridgeSeatLabel(bridgeAuctionCurrentStatus.currentSeat)}</strong>
      </div>
      <div>
        <span>Vuln.</span>
        <strong>{bridgeVulnerabilityForHand(fullHand)}</strong>
      </div>
    </div>

    <CardChoiceHand
      cards={fullHand.playerHand}
      ariaLabel="Your Bridge auction hand"
      className="hand full-hand-cards bridge-auction-hand"
      cardClassName="card hand-card full-hand-card"
      getCardClasses={() => ({ legal: false })}
      isPressed={() => false}
      onSelect={() => {}}
    />

    <div class="bridge-call-grid" aria-label="Bridge calls">
      <button
        aria-pressed={bridgeAuctionSelectedCall === "Pass"}
        class:recommended={bridgeSuggestedCall === "Pass"}
        class:selected={bridgeAuctionSelectedCall === "Pass"}
        class="secondary-action"
        disabled={bridgeAuctionCurrentStatus.currentSeat !== "You" || !bridgeAuctionLegalCalls.includes("Pass")}
        onclick={() => onSelectCall("Pass")}
        type="button"
      >
        Pass
      </button>
      <button
        aria-label="Double"
        aria-pressed={bridgeAuctionSelectedCall === "Double"}
        class:recommended={bridgeSuggestedCall === "Double"}
        class:selected={bridgeAuctionSelectedCall === "Double"}
        class="secondary-action"
        disabled={bridgeAuctionCurrentStatus.currentSeat !== "You" || !bridgeAuctionLegalCalls.includes("Double")}
        onclick={() => onSelectCall("Double")}
        type="button"
      >
        X
      </button>
      <button
        aria-label="Redouble"
        aria-pressed={bridgeAuctionSelectedCall === "Redouble"}
        class:recommended={bridgeSuggestedCall === "Redouble"}
        class:selected={bridgeAuctionSelectedCall === "Redouble"}
        class="secondary-action"
        disabled={bridgeAuctionCurrentStatus.currentSeat !== "You" || !bridgeAuctionLegalCalls.includes("Redouble")}
        onclick={() => onSelectCall("Redouble")}
        type="button"
      >
        XX
      </button>
    </div>

    <div class="bridge-bidding-grid" aria-label="Bridge bids">
      {#each bridgeBidOptions as bid}
        <button
          aria-pressed={bridgeAuctionSelectedCall === bid.id}
          class:selected={bridgeAuctionSelectedCall === bid.id}
          class:recommended={bridgeSuggestedCall === bid.id}
          disabled={bridgeAuctionCurrentStatus.currentSeat !== "You" || !bridgeAuctionLegalCalls.includes(bid.id)}
          onclick={() => onSelectCall(bid.id)}
          type="button"
        >
          {bid.label}
        </button>
      {/each}
    </div>

    <div class="bridge-auction-history" aria-label="Bridge auction history">
      <span>Auction</span>
      <div>
        {#if bridgeAuctionCalls.length === 0}
          <p>
            <strong>{bridgeSeatLabel(bridgeAuctionCurrentStatus.currentSeat)}</strong>
            <span>to call</span>
          </p>
        {/if}
        {#each bridgeAuctionCalls as call}
          <p>
            <strong>{bridgeSeatLabel(call.seat)}</strong>
            <span>{call.call}</span>
          </p>
        {/each}
      </div>
    </div>

    {#if bridgeAuctionReadyToPlay && bridgeVisibleContract}
      <div class="bridge-auction-history bridge-contract-preview" aria-label="Bridge contract preview">
        <span>Contract</span>
        <div>
          <p>
            <strong>{bridgeVisibleContract.label}</strong>
            <span>{bridgeSeatLabel(bridgeVisibleContract.declarer)} declares; {bridgeSeatLabel(bridgeVisibleContract.dummy)} is dummy.</span>
          </p>
        </div>
      </div>
    {/if}

    {#if error}
      <p class="outcome warning">{error}</p>
    {/if}

    {#if bridgeAuctionSelectedCallExplanation && !bridgeAuctionReadyToPlay && bridgeAuctionCurrentStatus.currentSeat === "You"}
      <p class="bridge-call-explanation">
        Meaning: {bridgeAuctionSelectedCallExplanation}
      </p>
    {/if}

    <div class="action-row">
      <button class="secondary-action" onclick={onBack} type="button">Table</button>
      <button
        class="secondary-action"
        disabled={bridgeAuctionCurrentStatus.currentSeat !== "You" || !bridgeAuctionLegalCalls.includes(bridgeSuggestedCall)}
        onclick={() => onSelectCall(bridgeSuggestedCall)}
        type="button"
      >
        Use suggestion
      </button>
      <button
        class="primary-action"
        disabled={dealing || !bridgeAuctionCurrentStatus.passedOut && !bridgeAuctionReadyToPlay && bridgeAuctionCurrentStatus.currentSeat !== "You"}
        onclick={onConfirm}
        type="button"
      >
        {bridgeAuctionActionLabel}
      </button>
    </div>
  </section>
</section>
