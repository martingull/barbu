<script lang="ts">
  import TablePlaySurface from "../../components/TablePlaySurface.svelte";
  import CardChoiceHand from "../../components/CardChoiceHand.svelte";
  import ExerciseFeedback from "../../components/ExerciseFeedback.svelte";
  import GuidedHandActions from "../../components/GuidedHandActions.svelte";
  import FeedbackBreakdown from "../../components/FeedbackBreakdown.svelte";
  import { dominoLearningPosition } from "../../domain/barbuLearning";
  import { dominoGuidance } from "./barbuGuidance";
  import { formatCardLabel } from "../../presentation/cardDisplay";
  import BarbuSessionResult from "./BarbuSessionResult.svelte";
  import { barbuSessionComplete, barbuSeatTotals, dominoSeatScores, type BarbuSession } from "../../domain/barbuSession";
  import { fullHandContracts } from "../../domain/contractRegistry";
  import { scoreSeats, scoreSeatRunLabel, formatSignedScore } from "../../presentation/scorePresentation";
  import type { Card, DominoHandState, Seat } from "../../domain/types";
  import { dominoOrderScores, dominoResultHeading, dominoResultText, dominoSuitLabel, dominoLaneText,
    dominoStartRank, dominoOutOrderText, dominoMoveExplanation } from "./barbuPresentation";
  export let dominoHand: DominoHandState;
  export let session: BarbuSession | undefined = undefined;
  export let guided = false;
  export let dominoSelectedCardId = "";
  export let dominoError = "";
  export let dominoLastMoveReason = "";
  export let onBack: () => void;
  export let onSelect: (cardId: string) => void;
  export let onFocus: (cardId: string) => void;
  export let onPlace: () => void;
  export let onPass: () => void;
  export let onNextHand: () => void;
  export let onReplay: () => void;
  export let onReplayWeakest: (() => void) | undefined = undefined;
  export let onNewGame: (() => void) | undefined = undefined;
  $: fullHandRunActive = Boolean(session);
  $: fullHandRunIsComplete = session ? barbuSessionComplete(session) : false;
  $: fullHandRunStatusLabel = fullHandRunIsComplete ? "Session complete" : session
    ? `Contract ${fullHandContracts.indexOf("Domino") + 1} of ${fullHandContracts.length}`
    : dominoHand.status === "complete" ? "Complete" : `${dominoHand.cardsRemaining} cards left`;
  $: fullHandNextActionLabel = session ? "Next contract" : "Try another";
  $: dominoLegalCardIds = new Set(dominoHand.legalCardIds);
  $: dominoSelectedCard = dominoHand.playerHand.find(card => card.id === dominoSelectedCardId);
  $: dominoDefaultPlayableCard = dominoHand.playerHand.find(card => dominoLegalCardIds.has(card.id));
  $: dominoScoreMap = dominoSeatScores(dominoHand);
  $: sessionTotals = barbuSeatTotals(session?.results ?? []);
  $: resultScores = fullHandRunIsComplete ? sessionTotals : dominoScoreMap;
  $: dominoResultTitle = dominoResultHeading(dominoHand);
  $: dominoResultSummary = dominoResultText(dominoHand);
  $: dominoNextOutScore = dominoOrderScores[dominoHand.outOrder.length] ?? -5;
  $: guidance = guided ? dominoGuidance(dominoLearningPosition(dominoHand)) : null;
  $: dominoMoveReason = dominoSelectedCard ? dominoMoveExplanation(dominoHand, dominoSelectedCard)
    : dominoLastMoveReason || dominoMoveExplanation(dominoHand, undefined);
  function dominoCardClasses(card: Card) {
    return { heart: card.suit === "H", legal: dominoLegalCardIds.has(card.id),
      illegal: !dominoLegalCardIds.has(card.id), selected: dominoSelectedCardId === card.id };
  }
</script>

      <TablePlaySurface
        mode={dominoHand.status === "complete" ? "result" : "play"}
        ariaLabel="Domino hand"
        title={fullHandRunIsComplete ? "Barbu session" : guided ? "Guided Domino" : "Domino hand"}
        eyebrow={fullHandRunActive ? "Play Barbu" : "Contract hand"}
        statusLabel={guided && dominoHand.status !== "complete" ? "Cards left" : fullHandRunStatusLabel}
        statusValue={guided && dominoHand.status !== "complete" ? String(dominoHand.cardsRemaining) : `${formatSignedScore(resultScores.You)} points`}
        tableAriaLabel="Domino layout"
        tableCards={[]}
        flowLayout
        stableFeedback={guided}
        useCustomTable
        surfaceClassName={guided ? "domino-play-surface guided-domino" : "domino-play-surface"}
        showTable={dominoHand.status !== "complete"}
        panelAriaLabel="Domino hand decision"
        onBack={onBack}
      >
        {#snippet summary()}
          {#if !fullHandRunIsComplete && dominoHand.status !== "complete"}
            <div class="full-hand-summary grouped-play-summary" aria-label="Domino hand score">
              <div class="full-hand-summary-row current-hand" aria-label="Current hand">
                <span class="summary-row-label">Current hand</span>
                <div>
                  <span>Your score</span>
                  <strong>{formatSignedScore(dominoScoreMap.You)}</strong>
                </div>
              <div>
                <span>Cards left</span>
                <strong>{dominoHand.cardsRemaining}</strong>
              </div>
              <div>
                <span>Next out</span>
                <strong>{formatSignedScore(dominoNextOutScore)}</strong>
              </div>
                <div>
                  <span>{guided ? "Finished" : "Order"}</span>
                  <strong>{guided ? `${dominoHand.outOrder.length} / 4` : dominoOutOrderText(dominoHand)}</strong>
                </div>
              </div>
              {#if fullHandRunActive}
                <div class="full-hand-summary-row table-score" aria-label="Table scores">
                  <span class="summary-row-label">Table scores</span>
                  {#each scoreSeats as seat}
                    <div>
                      <span>{scoreSeatRunLabel(seat)} score</span>
                      <strong>{formatSignedScore(sessionTotals[seat])}</strong>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {:else}
            <div class="full-hand-summary compact-run-complete" aria-label={fullHandRunIsComplete ? "Barbu final totals" : "Domino hand score"}>
              {#each scoreSeats as seat}
                <div>
                  <span>{scoreSeatRunLabel(seat)} {fullHandRunIsComplete ? "total" : "score"}</span>
                  <strong>{formatSignedScore(resultScores[seat])}</strong>
                </div>
              {/each}
            </div>
          {/if}
        {/snippet}

        {#snippet table()}
          <div class="domino-layout hand-domino-layout" aria-label="Domino layout">
            {#each dominoHand.layout as lane, index}
              <div>
                <span>{dominoSuitLabel(index)}</span>
                <strong>{guided && lane.length > 1 ? `${formatCardLabel(lane[0])} to ${formatCardLabel(lane.at(-1)!)}` : dominoLaneText(lane, dominoStartRank(dominoHand))}</strong>
              </div>
            {/each}
          </div>
        {/snippet}

        {#snippet panel()}
          {#if dominoHand.status === "complete"}
            {#if fullHandRunIsComplete}
              <BarbuSessionResult session={session!} />
            {:else}
              <div class="domino-result-card">
                <div class="lesson-heading">
                  <p class="eyebrow">Result</p>
                  <h2>{guided ? "Guided hand complete" : dominoResultTitle}</h2>
                </div>

                <p class="result" aria-label="Domino result summary">{dominoResultSummary}</p>

                <div class="domino-result-grid" aria-label="Domino result details">
                  <div>
                    <span>Your score</span>
                    <strong>{formatSignedScore(dominoScoreMap.You)}</strong>
                  </div>
                  <div>
                    <span>Winner</span>
                    <strong>{dominoOutOrderText(dominoHand).split(" ")[0] ?? "Table"}</strong>
                  </div>
                  <div>
                    <span>Order</span>
                    <strong>{dominoOutOrderText(dominoHand)}</strong>
                  </div>
                </div>
              </div>
              {#if guided}
                <FeedbackBreakdown breakdown={{ label: "Domino finishing order", rows: [
                  ...dominoHand.outOrder.map((seat, index) => ({ label: `${index + 1}. ${scoreSeatRunLabel(seat as Seat)}`,
                    value: `${formatSignedScore(dominoScoreMap[seat as Seat])} points` })),
                  { label: "In Play", value: "Domino is the final contract of the seven-contract training session. This guided hand leaves your saved session unchanged." }
                ] }} />
              {/if}
            {/if}
          {:else}
            <ExerciseFeedback
              coach={guided ? "barbu" : undefined}
              reserveSpace={guided}
              eyebrow="Your turn"
              title="Place a card"
              result={guidance ? `Rule: ${guidance.rule}` : dominoHand.prompt}
              error={dominoError}
              explanation={guidance ? `Tactic: ${guidance.tip} ${dominoMoveReason}` : dominoMoveReason}
            />

            <CardChoiceHand
              cards={dominoHand.playerHand}
              ariaLabel="Your Domino hand"
              className="hand full-hand-cards domino-cards"
              cardClassName="card hand-card full-hand-card"
              getCardClasses={dominoCardClasses}
              isPressed={(card) => dominoSelectedCardId === card.id}
              onSelect={(card) => onSelect(card.id)}
              onFocus={(card) => {
                onFocus(card.id);
              }}
            />
          {/if}

          {#if guided && dominoHand.status === "complete"}
            <GuidedHandActions {onReplay} {onBack} onIndependentPlay={onNextHand} />
          {:else}<div class="action-row">
            {#if dominoHand.status === "complete"}
              <button class="secondary-action" onclick={onBack} type="button">Table</button>
              {#if fullHandRunIsComplete}
                <button class="secondary-action" onclick={() => void onReplayWeakest?.()} type="button">Replay weakest</button>
                <button class="primary-action" onclick={onNewGame} type="button">New game</button>
              {:else}
                <button class="secondary-action" onclick={() => void onReplay()} type="button">Replay</button>
                <button class="primary-action" onclick={() => void onNextHand()} type="button">{fullHandNextActionLabel}</button>
              {/if}
            {:else}
              <button class="secondary-action" onclick={onBack} type="button">Table</button>
              <button
                class="secondary-action"
                disabled={dominoHand.legalCardIds.length > 0}
                onclick={() => void onPass()}
                type="button"
              >
                Pass
              </button>
              <button
                class="primary-action"
                disabled={!dominoDefaultPlayableCard}
                onclick={onPlace}
                type="button"
              >
                Place card
              </button>
            {/if}
          </div>{/if}
        {/snippet}
      </TablePlaySurface>
