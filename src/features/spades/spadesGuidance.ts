import { suggestedSpadesBidForCards } from "../../domain/spadesBidding";
import { spadesHaveBeenBroken } from "../../domain/trickTakingHand";
import { spadesSideBid, spadesPlayerSideSeats } from "../../domain/spadesScoring";
import { spadesLearningTrick, type SpadesLearningPosition } from "../../domain/spadesLearning";
import { trickWinner } from "../../domain/trickTakingRules";
import type { CompletedHandTrick } from "../../domain/types";
import { formatCardLabel } from "../../presentation/cardDisplay";
import { scoreSeatLabel } from "../../presentation/scorePresentation";
import { spadesTrickFeedback } from "./spadesFeedback";
import type { SpadesBidState } from "../../domain/spadesBidding";

const suits = { C: "clubs", D: "diamonds", H: "hearts", S: "spades" };
export function spadesGuidance(position: SpadesLearningPosition) {
  const { playerHand, currentTrick, completedTricks, bids } = position;
  if (!position.playStarted) {
    const estimate = suggestedSpadesBidForCards(playerHand);
    return { rule: "Bid expected tricks. You and Barbu combine bids; nil (0) means no tricks for you. Bids need not total 13.",
      tip: `Estimate: ${estimate === 0 ? "nil" : estimate}, from aces, protected kings, high and long spades. Not a guarantee. ${bids.You === 0 && estimate > 0 ? "Your likely winners make nil risky. " : ""}Nil scores +100 if kept, -100 if broken.` };
  }
  const lead = currentTrick[0]?.card;
  const rule = lead ? playerHand.some(card => card.suit === lead.suit)
    ? `${formatCardLabel(lead)} was led. You must follow ${suits[lead.suit]}, even though spades are trump.`
    : `You have no ${suits[lead.suit]}. Any card is legal; a spade can trump, but you do not have to trump.`
    : spadesHaveBeenBroken(position) ? "You lead. Spades are broken, so any suit is legal."
    : playerHand.every(card => card.suit === "S") ? "Only spades remain. You may lead one even though spades are not broken."
    : "You lead. Spades are not broken; lead a different suit while you still have one.";
  const ownTricks = completedTricks.filter(trick => trick.winner === "You").length;
  const partnerTricks = completedTricks.filter(trick => trick.winner === "Tutor").length;
  const target = spadesSideBid(bids, spadesPlayerSideSeats);
  const winner = trickWinner(currentTrick, "S");
  const tip = bids.You === 0 && ownTricks === 0 ? "Your nil is intact. Follow suit, but look for a card that will not win. Later players may change the winner."
    : bids.Tutor === 0 && partnerTricks === 0 ? "Barbu's nil is intact. Cover partner's winning card when you legally can; protecting nil can be worth an extra bag."
    : ownTricks + partnerTricks >= target ? `Your side has covered its bid of ${target}. Further tricks add bags; avoid unnecessary winners. Ten accumulated bags cost 100 points.`
    : winner?.seat === "Tutor" ? "Barbu is currently winning. Saving your high card may leave your side another winner later; cards still to come can change this trick."
    : `Your side still needs ${target - ownTricks - partnerTricks} tricks. Consider a low winning card, keeping stronger cards for later. Winning is a tactic, not a requirement.`;
  return { rule, tip: `${bids.You === 0 && ownTricks > 0 ? "Your nil has failed (-100); now help the partnership. " : ""}${tip}` };
}
export function spadesGuidedReview(tricks: CompletedHandTrick[], bids: SpadesBidState) {
  const trick = tricks.at(-1);
  const facts = trick && spadesLearningTrick(trick);
  if (!facts) return null;
  const { winner, lead, player, trumped } = facts;
  const name = scoreSeatLabel(winner.seat);
  return { winning: `${name} ${winner.seat === "You" ? "win" : "wins"} with ${formatCardLabel(winner.card)}, ${trumped ? "the highest spade (trump)" : `the highest card in ${suits[lead.card.suit]}`}.`,
    scoring: spadesTrickFeedback(tricks, bids),
    choice: `${player.seat === lead.seat ? "You led" : player.card.suit === lead.card.suit ? "You followed suit with" : "You played off-suit with"} ${formatCardLabel(player.card)}.`,
    next: tricks.length === 13 ? "All 13 tricks are played. The hand is scored below." : `${name} ${winner.seat === "You" ? "lead" : "leads"} next.` };
}
