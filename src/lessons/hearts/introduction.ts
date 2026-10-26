import { heartsLearningDecision } from "../../domain/heartsLearning";
import type { Card, TableCard } from "../../domain/types";
import type { DrillStep } from "../drillDecision";
import { formatCardLabel } from "../../presentation/cardDisplay";

function card(id: string): Card {
  return { id, rank: id.slice(0, -1), suit: id.slice(-1) as Card["suit"], label: id };
}

function position(id: string, title: string, prompt: string, tableIds: string[], handIds: string[], skill: "follow" | "winner" | "points" | "avoid" = "avoid"): DrillStep {
  const identify = skill === "winner" || skill === "points";
  const table: TableCard[] = tableIds.map((id, index) => ({ seat: (["Left", "Tutor", "Right", "You"] as const)[index], card: card(id) }));
  const hand = (identify ? tableIds : handIds).map(card);
  const step: DrillStep = {
    scenarioId: id, contract: "Hearts", title, choiceMode: identify ? "identify" : undefined,
    handLabel: identify ? "Which card won?" : undefined,
    trick: { title, trickNumber: 5, beforeResult: prompt, afterResult: "", emptyExplanation: "",
      hand, legalCardIds: [], tableBeforeChoice: table, tableAfterChoice: [],
      pendingBySeat: identify ? {} : { You: "Your turn" }, playedExplanations: {}, cardOutcomes: {}, cardReasons: {} }
  };
  for (const choice of hand) {
    const decision = heartsLearningDecision(table, hand, choice, identify);
    if (decision.legal) step.trick.legalCardIds.push(choice.id);
    step.trick.cardOutcomes[choice.id] = decision.correct ? "good" : identify ? "risky" : "penalty";
    step.trick.cardReasons![choice.id] = skill === "follow" ? "followed_suit" : decision.points && decision.winner.seat === "You" ? "captured_penalty" : "avoided_penalty";
    const winner = `${formatCardLabel(decision.winner.card)} wins: it is the highest card of the suit led.`;
    const points = decision.points === 1 ? "1 point" : `${decision.points} points`;
    step.trick.playedExplanations[choice.id] = !decision.legal
      ? `Follow the suit of ${formatCardLabel(table[0].card)} because you still hold that suit. ${formatCardLabel(choice)} is a different suit.`
      : skill === "follow" ? `${formatCardLabel(choice)} follows the suit that was led. Each player adds one card; together those four cards are a trick.`
      : skill === "winner" ? `${winner} That player takes all four cards and plays first in the next trick.`
      : `${winner} ${decision.winner.seat === "You" ? "You take" : "That player takes"} ${points}.${decision.points ? " Points go to the trick winner, not whoever played the penalty card." : " No hearts or queen of spades means no penalty."}`;
  }
  return step;
}

export function heartsIntroductionSteps(_seed: number): DrillStep[] {
  const steps = [
    position("follow", "Follow suit", "A trick is one card from each player. Clubs were played first. Play a club from your hand below.", ["9C", "4C", "KC"], ["3C", "QS", "7H"], "follow"),
    position("winner", "Who wins the trick?", "All four cards are down. Clubs were played first. The highest club wins; ace is highest. Which card won?", ["9C", "KC", "4C", "3C"], [], "winner"),
    position("points", "Who takes the point?", "Diamonds were led. A player without diamonds played a heart, worth 1 point. Choose the card that wins all four cards and the point.", ["9D", "KH", "JD", "3D"], [], "points"),
    position("heart", "Avoid a heart", "Clubs were led and a heart is in the trick. You play last. Which card leaves the point with another player?", ["9C", "4H", "KC"], ["3C", "AC", "7S"]),
    position("queen", "Avoid the queen", "Diamonds were led. The queen of spades costs 13 points to whoever wins this trick. Play last and avoid those points.", ["9D", "QS", "KD"], ["2D", "AD", "7C"])
  ];
  const followUps = [
    position("follow-again", "Follow suit again", "This time diamonds were played first. You still have a diamond. Which card must you play?", ["8D", "JD", "4D"], ["3D", "QH", "7S"], "follow"),
    position("winner-again", "Find another winner", "Spades were played first. Choose the highest spade, not the highest card from another suit.", ["8S", "AH", "JS", "3S"], [], "winner"),
    position("points-again", "Find who takes this point", "Spades were led. A heart is worth 1 point but cannot beat a spade. Which card wins the trick?", ["10S", "4S", "AH", "2S"], [], "points"),
    position("heart-again", "Avoid another heart", "Diamonds were led and a heart is in the trick. Choose a diamond that stays below the current winner.", ["8D", "6H", "QD"], ["3D", "AD", "7C"]),
    position("queen-again", "Leave the queen behind", "Clubs were led. You play last. Which club leaves the queen's 13 points with another player?", ["8C", "QS", "JC"], ["3C", "AC", "7D"])
  ];
  return steps.map((step, index) => ({ ...step, followUp: followUps[index] }));
}
