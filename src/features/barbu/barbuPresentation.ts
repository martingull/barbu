import type { Card, CompletedHandTrick, DominoHandState, FullHandContract, FullHandState, Seat, Suit } from "../../domain/types";
import { contractRunScore, contractScoreMeta } from "../../domain/contractScoring";
import { formatContractValue } from "../../presentation/contractPresentation";
import { formatCardLabel } from "../../presentation/cardDisplay";
import { scoreSeats, scoreSeatLabel, formatSignedScore, formatOrdinal, type RunStanding } from "../../presentation/scorePresentation";
import { dominoSeatScores, type BarbuHandResult as FullHandRunResult } from "../../domain/barbuSession";
import { isLegalDominoPlacement } from "../../domain/dominoRules";
import { cardRank } from "../../domain/trickTakingRules";

export const dominoOrderScores = [45, 20, 5, -5];
const suitNames: Record<Suit, string> = { C: "clubs", D: "diamonds", H: "hearts", S: "spades" };
const suitIndex = (suit: Suit) => (["C", "D", "H", "S"] as Suit[]).indexOf(suit);

export function runStandings(scores: Record<Seat, number>): RunStanding[] {
  const orderedScores = scoreSeats
    .map((seat) => ({ seat, score: scores[seat] }))
    .sort((left, right) => right.score - left.score);
  let previousScore = -1;
  let previousRank = 0;

  return orderedScores.map((standing, index) => {
    const rank = index > 0 && standing.score === previousScore ? previousRank : index + 1;
    previousScore = standing.score;
    previousRank = rank;

    return {
      ...standing,
      rank
    };
  });
}


export function runResultHeading(standings: RunStanding[]) {
  const player = standings.find((standing) => standing.seat === "You");

  if (!player) {
    return "Game complete";
  }

  if (player.rank === 1) {
    const tiedWinners = standings.filter((standing) => standing.rank === 1);
    return tiedWinners.length > 1 ? "You tied for 1st" : "You won the game";
  }

  return `You finished ${formatOrdinal(player.rank)}`;
}


export function runResultSummary(standings: RunStanding[], contractsPlayed: number) {
  const leader = standings[0];
  const player = standings.find((standing) => standing.seat === "You");

  if (!leader || !player) {
    return `Game complete after ${contractsPlayed} contracts. Higher net score wins the table.`;
  }

  if (player.rank === 1) {
    return `You finished with ${formatSignedScore(player.score)} after ${contractsPlayed} contracts. Higher net score wins the table.`;
  }

  return `${scoreSeatLabel(leader.seat)} won with ${formatSignedScore(leader.score)}. You finished with ${formatSignedScore(
    player.score
  )} after ${contractsPlayed} contracts.`;
}


export function runBestContract(results: FullHandRunResult[]) {
  return [...results].sort((left, right) => {
    const leftScore = contractRunScore(left.contract, left.seatPenalties.You ?? 0);
    const rightScore = contractRunScore(right.contract, right.seatPenalties.You ?? 0);

    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    return runContractRelativeScore(right) - runContractRelativeScore(left);
  })[0];
}


export function runWeakestContract(results: FullHandRunResult[]) {
  return [...results].sort((left, right) => {
    const leftScore = contractRunScore(left.contract, left.seatPenalties.You ?? 0);
    const rightScore = contractRunScore(right.contract, right.seatPenalties.You ?? 0);

    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }

    return runContractRelativeScore(left) - runContractRelativeScore(right);
  })[0];
}


export function runContractValueLabel(result: FullHandRunResult) {
  return formatContractValue(result.contract, result.seatPenalties.You ?? 0);
}


export function runContractRelativeScore(result: FullHandRunResult) {
  const playerScore = contractRunScore(result.contract, result.seatPenalties.You ?? 0);
  const tableAverage =
    scoreSeats
      .filter((seat) => seat !== "You")
      .reduce((total, seat) => total + contractRunScore(result.contract, result.seatPenalties[seat] ?? 0), 0) / 3;

  return playerScore - tableAverage;
}


export function noLastTwoPhaseLabel(hand: FullHandState | null | undefined) {
  if (!hand || hand.contract !== "No Last Two") {
    return "";
  }
  if (hand.trickNumber >= 13) {
    return "Penalty trick";
  }
  if (hand.trickNumber === 12) {
    return "Penalty trick";
  }
  return "Setup trick";
}


export function noLastTwoPhaseValue(hand: FullHandState | null | undefined) {
  if (!hand || hand.contract !== "No Last Two") {
    return "";
  }
  if (hand.trickNumber >= 13) {
    return "20 points";
  }
  if (hand.trickNumber === 12) {
    return "10 points";
  }
  return "0 points";
}


export function fullHandCompletedTrickNumber(trick: CompletedHandTrick, fullHand: FullHandState) {
  return fullHand ? fullHand.completedTricks.indexOf(trick) + 1 : 0;
}


export function fullHandTrickHasTag(trick: CompletedHandTrick, tag: NonNullable<CompletedHandTrick["tacticalTags"]>[number]) {
  return (trick.tacticalTags ?? []).includes(tag);
}


export function fullHandTrickFeedback(trick: CompletedHandTrick, fullHand: FullHandState) {
  const { unitName: fullHandPenaltyName, unitPlural: fullHandPenaltyPlural } = contractScoreMeta(fullHand.contract);
  const penaltyText = `${trick.penalty} ${trick.penalty === 1 ? fullHandPenaltyName : fullHandPenaltyPlural}`;

  if (fullHand?.contract === "Hearts Trumps") {
    if (fullHandTrickHasTag(trick, "overtrumped")) {
      return trick.winner === "You"
        ? `You overtrumped and banked ${penaltyText}. Good: your heart beat the previous trump.`
        : `${trick.winner} overtrumped and banked ${penaltyText}. A higher heart took control.`;
    }
    if (fullHandTrickHasTag(trick, "trump_won")) {
      return trick.winner === "You"
        ? `Your heart won the trick and banked ${penaltyText}. Good: trumps beat the led suit.`
        : `${trick.winner} won with a heart and banked ${penaltyText}. Count which trumps are still out.`;
    }
    return trick.winner === "You"
      ? `You won the trick and banked ${penaltyText}. Good: you took control without needing a trump.`
      : `${trick.winner} won the trick and banked ${penaltyText}. Look for a heart or higher control next time.`;
  }

  if (fullHand?.contract === "No Last Two") {
    const trickNumber = fullHandCompletedTrickNumber(trick, fullHand);
    if (fullHandTrickHasTag(trick, "setup_trick")) {
      return trick.winner === "You"
        ? "You won a setup trick. No score yet; use these tricks to shed awkward high cards."
        : `${trick.winner} won a setup trick. No score yet; the final two tricks are still ahead.`;
    }
    return trick.winner === "You"
      ? `You won trick ${trickNumber} and took ${penaltyText}. This is one of the final two.`
      : `${trick.winner} won trick ${trickNumber} and took ${penaltyText}. Good: you stayed out of the final-two penalty.`;
  }

  if (trick.outcome === "captured_penalty") {
    if (fullHandTrickHasTag(trick, "danger_card_moved")) {
      return `You won the trick and took ${penaltyText}. Penalty cards moved, and your card held the trick.`;
    }
    return `You won the trick and took ${penaltyText}. Risky: your card became the highest card in the led suit.`;
  }
  if (trick.outcome === "avoided_penalty") {
    if (fullHandTrickHasTag(trick, "void_discard")) {
      return `${trick.winner} won the trick and took ${penaltyText}. Good: you were void, so your discard stayed clear.`;
    }
    if (fullHandTrickHasTag(trick, "danger_card_moved")) {
      return `${trick.winner} won the trick and took ${penaltyText}. Good: you kept below the danger.`;
    }
    return `${trick.winner} won the trick and took ${penaltyText}. Good: you stayed out of the penalty trick.`;
  }
  if (trick.outcome === "won_clean_trick") {
    if (fullHand?.contract === "King of Hearts") {
      return "You won a clean trick. Legal, but keep checking whether KH can still enter the trick.";
    }
    if (fullHand?.contract === "No Tricks") {
      return "You won a trick. Legal, but every trick you win scores in this contract.";
    }
    if (fullHandTrickHasTag(trick, "followed_suit")) {
      return `You followed suit and won a clean trick. Legal, but check whether ${fullHandPenaltyPlural} can still enter later.`;
    }
    return `You won a clean trick. Legal, but keep checking whether ${fullHandPenaltyPlural} can still enter the trick.`;
  }
  if (fullHand?.contract === "King of Hearts") {
    return `${trick.winner} won a clean trick. KH did not move, so you stayed clear.`;
  }
  if (fullHand?.contract === "No Tricks") {
    return `${trick.winner} won the trick. Good: you stayed out of it.`;
  }
  if (fullHandTrickHasTag(trick, "void_discard")) {
    return `${trick.winner} won a clean trick. Good: your void discard could not take the led suit.`;
  }
  return `${trick.winner} won a clean trick. No ${fullHandPenaltyPlural} moved, so you stayed clear.`;
}


export function fullHandResultHeading(hand: FullHandState) {

  if (hand.contract === "Hearts Trumps") {
    return hand.playerPenalty >= 5 ? "Strong trick count" : "Keep fighting for tricks";
  }
  if (hand.playerPenalty === 0) {
    return "Clean hand";
  }
  if (hand.playerPenalty === hand.totalPenalty) {
    return "Barbu caught you";
  }
  return "Damage limited";
}


export function fullHandResultText(hand: FullHandState) {
  const fullHandPenaltyName = contractScoreMeta(hand.contract).unitName;
  const formatFullHandPenalty = (value: number) => formatHandValue(value, hand.contract);

  if (hand.contract === "Hearts Trumps") {
    return `You won ${formatFullHandPenalty(hand.playerPenalty)}. The table won ${formatFullHandPenalty(
      hand.totalPenalty - hand.playerPenalty
    )}.`;
  }

  if (hand.playerPenalty === 0) {
    return hand.contract === "King of Hearts"
      ? "You kept KH out of your tricks."
      : hand.contract === "No Last Two"
        ? "You avoided both final tricks."
        : hand.contract === "No Tricks"
          ? "You avoided every trick."
      : `You avoided every ${fullHandPenaltyName}.`;
  }

  const youTook = formatFullHandPenalty(hand.playerPenalty);
  const tableTook = formatFullHandPenalty(hand.totalPenalty - hand.playerPenalty);

  if (hand.playerPenalty === hand.totalPenalty) {
    return `You took ${youTook}. Replay the contract and look for one duck or discard.`;
  }

  return `You took ${youTook}. The other seats absorbed ${tableTook}.`;
}


export function fullHandBestTrickLabel(hand: FullHandState) {
  const formatFullHandPenalty = (value: number) => formatHandValue(value, hand.contract);
  if (contractScoreMeta(hand.contract).kind !== "avoidance") {
    const won = hand.completedTricks
      .filter((trick) => trick.winnerIndex === 2 && trick.penalty > 0)
      .sort((left, right) => right.penalty - left.penalty)[0];

    return won ? `You won ${formatFullHandPenalty(won.penalty)}` : "No won tricks";
  }

  const avoided = hand.completedTricks
    .filter((trick) => trick.penalty > 0 && trick.winnerIndex !== 2)
    .sort((left, right) => right.penalty - left.penalty)[0];

  if (avoided) {
    return `${avoided.winner} took ${formatFullHandPenalty(avoided.penalty)}`;
  }

  const cleanWin = hand.completedTricks.find((trick) => trick.winnerIndex === 2 && trick.penalty === 0);
  return cleanWin ? "You won a clean trick" : "No escape trick";
}


export function fullHandWorstTrickLabel(hand: FullHandState) {
  const formatFullHandPenalty = (value: number) => formatHandValue(value, hand.contract);
  if (contractScoreMeta(hand.contract).kind !== "avoidance") {
    const missed = hand.completedTricks
      .filter((trick) => trick.winnerIndex !== 2 && trick.penalty > 0)
      .sort((left, right) => right.penalty - left.penalty)[0];

    return missed ? `${missed.winner} won ${formatFullHandPenalty(missed.penalty)}` : "No missed tricks";
  }

  const captured = hand.completedTricks
    .filter((trick) => trick.penalty > 0 && trick.winnerIndex === 2)
    .sort((left, right) => right.penalty - left.penalty)[0];

  return captured ? `You took ${formatFullHandPenalty(captured.penalty)}` : "No penalty tricks";
}


export function formatHandValue(value: number, contract: FullHandContract) {
  const { unitName: fullHandPenaltyName, unitPlural: fullHandPenaltyPlural } = contractScoreMeta(contract);
  return `${value} ${value === 1 ? fullHandPenaltyName : fullHandPenaltyPlural}`;
}


export function dominoResultHeading(state: DominoHandState) {
  const playerRank = state.outOrder.indexOf("You") + 1;

  if (playerRank === 1) {
    return "You went out first";
  }
  if (playerRank > 0) {
    return `You finished ${formatOrdinal(playerRank)}`;
  }
  return "Domino complete";
}


export function dominoResultText(state: DominoHandState) {
  const playerScore = state.scores[2] ?? 0;
  const leader = scoreSeats
    .map(seat => ({ seat, score: dominoSeatScores(state)[seat] }))
    .sort((left, right) => right.score - left.score)[0];

  if (!leader || leader.seat === "You") {
    return `You scored ${formatSignedScore(playerScore)}. Domino rewards the first players to empty their hands.`;
  }

  return `${scoreSeatLabel(leader.seat)} led Domino with ${formatSignedScore(leader.score)}. You scored ${formatSignedScore(playerScore)}.`;
}


export function dominoSuitLabel(index: number) {
  return ["Clubs", "Diamonds", "Hearts", "Spades"][index] ?? "Suit";
}


export function dominoStartRank(state?: DominoHandState | null) {
  return state?.startRank ?? "7";
}


export function dominoLaneText(lane: Card[], startRank = "7") {
  return lane.length ? lane.map(formatCardLabel).join(" ") : `Open with ${startRank}`;
}


export function dominoOutOrderText(state: DominoHandState) {
  return state.outOrder.length ? state.outOrder.map((seat) => scoreSeatLabel(seat as Seat)).join(" ") : "No one out";
}


export function dominoMoveExplanation(state: DominoHandState, card: Card | undefined) {
  const dominoNextOutScore = dominoOrderScores[state.outOrder.length] ?? -5;
  if (!card) {
    if (state.legalCardIds.length === 0) {
      return "You are blocked. Pass to wait for a lane to open.";
    }

    return `Legal cards are highlighted. Next out: ${formatSignedScore(dominoNextOutScore)}.`;
  }

  if (!state.legalCardIds.includes(card.id)) {
    return dominoIllegalMoveExplanation(state, card);
  }

  const lane = state.layout[suitIndex(card.suit)];
  const unlockedCards = dominoCardsUnlockedByPlacement(state, card);
  const finishText =
    state.playerHand.length === 1
      ? ` Out for ${formatSignedScore(dominoNextOutScore)}.`
      : "";
  const unlockText = unlockedCards.length ? ` Opens ${unlockedCards.map(formatCardLabel).join(" or ")} later.` : "";

  if (lane.length === 0) {
    return `${formatCardLabel(card)} opens ${suitNames[card.suit]} from ${dominoStartRank(state)}.${unlockText}${finishText}`;
  }

  const direction = dominoExtensionDirection(lane, card);
  return `${formatCardLabel(card)} extends ${suitNames[card.suit]} ${direction}.${unlockText}${finishText}`;
}


export function dominoIllegalMoveExplanation(state: DominoHandState, card: Card) {
  const lane = state.layout[suitIndex(card.suit)];

  if (lane.length === 0) {
    return `${formatCardLabel(card)} is blocked. Closed suits start with ${dominoStartRank(state)}.`;
  }

  return `${formatCardLabel(card)} is blocked. ${suitNames[card.suit]} needs the next lower or higher card.`;
}


export function dominoCardsUnlockedByPlacement(state: DominoHandState, card: Card) {
  const nextLayout = state.layout.map((lane) => [...lane]);
  const lane = nextLayout[suitIndex(card.suit)];
  lane.push(card);
  lane.sort((left, right) => cardRank(left) - cardRank(right));

  return state.playerHand
    .filter((heldCard) => heldCard.id !== card.id && heldCard.suit === card.suit)
    .filter((heldCard) => isLegalDominoPlacement(nextLayout[suitIndex(heldCard.suit)], heldCard, dominoStartRank(state)));
}


export function dominoExtensionDirection(lane: Card[], card: Card) {
  const low = Math.min(...lane.map((played) => cardRank(played)));
  const high = Math.max(...lane.map((played) => cardRank(played)));
  const rank = cardRank(card);

  if (rank === low - 1) {
    return "downward";
  }
  if (rank === high + 1) {
    return "upward";
  }
  return "by one rank";
}
