import { trickWinner } from "../../domain/trickTakingRules";
import { whistLearningScore, whistLearningTrick, type WhistLearningPosition } from "../../domain/whistLearning";
import type { CompletedHandTrick, Suit } from "../../domain/types";
import { formatCardLabel } from "../../presentation/cardDisplay";
import { scoreSeatLabel } from "../../presentation/scorePresentation";

const suitName = (suit: Suit) => ({ C: "clubs", D: "diamonds", H: "hearts", S: "spades" })[suit];
const pointsLabel = (points: number) => `${points} ${points === 1 ? "point" : "points"}`;

export function whistGuidance(position: WhistLearningPosition) {
  const { currentTrick: trick, playerHand: hand, completedTricks: history, trump } = position;
  const led = trick[0]?.card.suit;
  const winner = trickWinner(trick, trump);
  let rule = !led ? "You lead. Any card is legal, including trump; the trick winner leads next."
    : hand.some(card => card.suit === led) ? `You must follow ${suitName(led)}, the led suit.`
    : `You have no ${suitName(led)}. Any card is legal: you may trump or discard, but need not trump or overtrump.`;
  if (!history.length) {
    const turned = position.whistTurnedTrump;
    rule = `${turned ? `The dealer's last card, ${formatCardLabel(turned)}, set` : "This hand uses"} ${suitName(trump)} as trump. ${rule}`;
  }
  const partnerLead = [...history].reverse().find(trick => trick.cards[0]?.seat === "Tutor")?.cards[0].card.suit;
  let tip = !led ? partnerLead && hand.some(card => card.suit === partnerLead)
    ? `Barbu previously led ${suitName(partnerLead)}. Consider returning it, unless shown voids or exhausted winners suggest another plan.`
    : "Consider a long plain suit: low from broken length, top of an honour sequence. Leading trump is legal, but should serve a plan."
    : winner?.seat === "Tutor" ? "Barbu is currently winning for your side. Consider saving strength; any player still to act could change the winner."
    : trick.length === 2 ? "Third hand often plays high to support partner. Left still has to play; allow for unseen honours rather than just beating the current card."
    : trick.length === 3 ? "You play last. Use the lowest winning card if you can take the trick for your side; otherwise preserve useful cards."
    : "Second hand often plays low, leaving partner a chance. This is a guideline, not a rule or a guaranteed winner.";
  const { tricks, points } = whistLearningScore(history);
  tip += points.playerSide > 0 ? ` Your ${tricks.playerSide} tricks currently mean ${pointsLabel(points.playerSide)} above six.`
    : ` Your side has ${tricks.playerSide} tricks; seven earns the first point.`;
  return { rule, tip };
}

export function whistGuidedReview(tricks: CompletedHandTrick[], trump: Suit) {
  const last = tricks.at(-1);
  const facts = last && whistLearningTrick(last, trump);
  if (!facts) return null;
  const { winner, lead, player, trumped } = facts;
  const score = whistLearningScore(tricks);
  return {
    winning: `${scoreSeatLabel(winner.seat)} wins with ${formatCardLabel(winner.card)}, the highest ${trumped ? `trump (${suitName(trump)})` : `card of the led suit (${suitName(lead.card.suit)})`}.`,
    scoring: `You + Barbu: ${score.tricks.playerSide} tricks, ${pointsLabel(score.points.playerSide)} above six. Left + Right: ${score.tricks.opponentSide} tricks, ${pointsLabel(score.points.opponentSide)}.`,
    choice: player ? `You ${lead.seat === "You" ? "led" : player.card.suit === lead.card.suit ? "followed suit with" : "were void and played"} ${formatCardLabel(player.card)}.` : "",
    next: tricks.length === 13 ? "All 13 tricks are complete. Only tricks above six score; honours are not scored here."
      : `${scoreSeatLabel(winner.seat)} ${winner.seat === "You" ? "lead" : "leads"} next.`
  };
}
