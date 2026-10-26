import type { CompletedHandTrick, FullHandState } from "../../domain/types";
import { formatCardLabel } from "../../presentation/cardDisplay";
import { scoreSeatLabel } from "../../presentation/scorePresentation";
import { heartsHaveBeenBroken } from "../../domain/heartsRules";
import { heartsLearningTrick } from "../../domain/heartsLearning";

const suits = { C: "clubs", D: "diamonds", H: "hearts", S: "spades" };

export function heartsGuidance(hand: FullHandState) {
  const lead = hand.currentTrick[0]?.card;
  if (hand.trickNumber === 1) return {
    rule: !lead ? "You hold 2♣, so you must lead it."
      : hand.playerHand.some(card => card.suit === "C") ? "Clubs were led. You must follow clubs."
        : "You have no clubs. On the first trick, discard without points if you can.",
    tip: "The highest club wins and leads next. A low club can leave the lead to someone else."
  };
  if (!lead) return {
    rule: heartsHaveBeenBroken(hand) ? "You lead next. Hearts are broken, so any suit is allowed."
      : hand.playerHand.every(card => card.suit === "H") ? "Only hearts remain. You may lead one; this breaks hearts."
        : "You lead next. Hearts are not broken, so lead another suit if you can.",
    tip: "A low lead can help you avoid winning; it does not guarantee a safe trick."
  };
  return hand.playerHand.some(card => card.suit === lead.suit) ? {
    rule: `${formatCardLabel(lead)} was led. You must follow ${suits[lead.suit]}.`,
    tip: "Playing below the highest card can leave points with someone else. Later cards may change the winner."
  } : {
    rule: `${formatCardLabel(lead)} was led. You have no ${suits[lead.suit]}, so any card is legal.`,
    tip: "You cannot win off-suit in Hearts. Discarding a heart or Q♠ sends its points to the winner."
  };
}

export function heartsGuidedReview(trick: CompletedHandTrick, final = false) {
  const facts = heartsLearningTrick(trick);
  if (!facts) return null;
  const { winner, player, lead, hearts, queen, points, playerLed, followedSuit } = facts;
  const name = scoreSeatLabel(winner.seat);
  const winning = `${name} ${winner.seat === "You" ? "win" : "wins"} with ${formatCardLabel(winner.card)}, the highest card in ${suits[lead.card.suit]}.`;
  const source = [hearts ? `${hearts} heart${hearts === 1 ? "" : "s"}` : "", queen ? "Q♠ (13)" : ""].filter(Boolean).join(" + ");
  const scoring = points ? `${source} = ${points} point${points === 1 ? "" : "s"} for ${name}.`
    : "No hearts or Q♠: nobody takes points.";
  const choice = playerLed ? `You led ${formatCardLabel(player.card)}, setting the suit.`
    : followedSuit ? `Your ${formatCardLabel(player.card)} followed suit${winner.seat === "You" ? " and won" : " without winning"}.`
      : `Your ${formatCardLabel(player.card)} was off-suit, so it could not win.`;
  return { winning, scoring, choice, next: final ? "That was the last trick. The hand is scored below."
    : `${name} ${winner.seat === "You" ? "lead" : "leads"} next.` };
}
