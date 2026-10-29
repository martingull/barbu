import { bestMeldLayout } from "../../domain/rummyMelds";
import { ginDiscardChoices, type GinObservation } from "../../domain/ginRummyPolicy";
import { ginRules } from "../../domain/ginRummySession";
import type { GinGuidedMoment } from "../../domain/ginRummyLearning";
import { formatCardText } from "../../presentation/cardDisplay";
import { formatRummyMeld } from "../../presentation/rummyDisplay";

export function ginGuidance(position: GinObservation, selected: string) {
  const layout = bestMeldLayout(position.hand);
  const melds = layout.melds.length ? layout.melds.map(formatRummyMeld).join("; ") : "None yet";
  const facts = `Deadwood: ${layout.points} with ${position.hand.length} cards. Melds: ${melds}.`;
  if (position.phase === "discard") {
    const choices = ginDiscardChoices(position.hand, position.blockedDiscard, position.opponentKnown);
    const preview = choices.find(choice => choice.card.id === selected);
    const rule = `Discard one card. ${position.blockedDiscard ? "You cannot discard the upcard you just took. " : ""}Knock at ${ginRules.knockLimit} deadwood or less; gin needs zero.`;
    const tip = preview ? `Discarding ${formatCardText(preview.card.label)} leaves ${preview.layout.points} deadwood. ${preview.layout.points === 0
      ? "You can go gin; Barbu cannot lay off cards."
      : preview.layout.points <= ginRules.knockLimit ? "You may knock, but Barbu can lay off and might undercut."
      : "Keep playing; this is too much deadwood to knock."}`
      : selected === position.blockedDiscard && selected ? "Keep the upcard you just took and choose another card."
      : "Compare your discards: protect sets and runs, and reduce unmelded points.";
    return { rule, tip, facts };
  }
  const rule = position.phase === "offer" ? "Take the opening upcard or pass. You cannot draw stock until the opening offers end."
    : position.forcedStock ? "Both players passed the opening upcard. You must draw from stock."
    : "Draw one card from stock or take the face-up upcard, then discard.";
  const best = position.upcard && !position.forcedStock
    ? ginDiscardChoices([...position.hand, position.upcard], position.upcard.id)[0] : undefined;
  const tip = best ? `${formatCardText(position.upcard!.label)} can leave ${best.layout.points} deadwood after another card is discarded, compared with ${layout.points} now. The stock card is unknown.`
    : "The stock card is unknown. After drawing, look for sets and runs before choosing a discard.";
  return { rule, tip, facts };
}

export function ginGuidedReview(moment: GinGuidedMoment) {
  const card = moment.card ? formatCardText(moment.card.label) : "the upcard";
  if (moment.action.type === "pass") return {
    title: `You passed ${card}.`, explanation: "Your cards did not change. Passing declines only this opening offer; it does not discard a card."
  };
  if (moment.action.type === "draw") return {
    title: `You ${moment.action.source === "stock" ? "drew" : "took"} ${card}.`,
    explanation: `Deadwood: ${moment.before} with 10 cards, now ${moment.after} with 11. This is not your final count: discard next.${moment.action.source === "discard" ? " You must keep the upcard this turn." : ""}`
  };
  return { title: `You discarded ${card}${moment.action.knock ? moment.after === 0 ? " and went gin" : " and knocked" : ""}.`,
    explanation: `Deadwood: ${moment.before} with 11 cards, ${moment.after} with 10 after your discard.${!moment.action.knock ? " The hand continues unless Barbu knocks or the stock runs out." : ""}` };
}
