import type { CanastaGuidedMoment } from "../../domain/canastaLearning";
import { formatCardList } from "../../presentation/cardDisplay";
import { canastaValue } from "../../domain/canastaRules";
import { canastaMeldChangeText } from "./canastaScorePresentation";

export function canastaGuidedReview(moment: CanastaGuidedMoment) {
  const facts = `Your move: ${moment.before} to ${moment.after} cards. Team canastas: ${moment.canastasAfter}.`;
  const cards = formatCardList(moment.cards);
  const melds = canastaMeldChangeText(moment.meldChanges);
  const next = moment.nextPhase === "complete" ? "The hand is over. Compare the score breakdown below."
    : moment.needsThrees ? "Next: Continue, then Expose three before another move."
    : moment.nextPhase === "draw" ? "Next: Continue, then draw or take a legal pile."
    : "Next: Continue, then meld or choose a discard.";
  switch (moment.action.type) {
    case "draw": return { title: cards ? `You drew ${cards}.` : "The stock was empty.", explanation: cards
      ? moment.endedHand ? "The last stock card was a three, so the hand ended immediately."
        : moment.cards.some(card => card.rank === "3") ? "This is a three, not an ordinary meld card. Expose three replaces it. Drawing does not end your turn."
        : `That card counts ${moment.cards.reduce((sum, card) => sum + canastaValue(card), 0)} card points. Drawing does not end your turn.`
      : "No card was drawn, so the hand ended without a going-out bonus.", facts, next };
    case "expose": return { title: moment.exposedThree ? `You exposed a three${cards ? ` and received ${cards}` : ""}.` : "No replacement card remained.",
      explanation: moment.exposedThree ? "The replacement keeps your hand size unchanged. This is separate from your normal draw; exposed threes score at the end of the hand."
        : "The three stayed in your hand and the hand ended. It was not added to your exposed threes.", facts, next };
    case "pickup": return { title: `You took a ${moment.pileCount}-card pile.`, explanation: `Your matching pair and the top discard went into a shared meld. ${melds} The buried cards joined your hand; finish with a legal discard.`, facts, next };
    case "meld": return { title: moment.opened ? "Your partnership opened." : "You added to your partnership's melds.", explanation:
      `${moment.cards.reduce((sum, card) => sum + canastaValue(card), 0)} card points moved from your hand to the table. ${melds || "Your partner can add to these same groups."} You still need to discard.`, facts, next };
    case "discard": return { title: `You discarded ${cards}.`, explanation: moment.endedHand
      ? "Your final discard went out: your partnership had at least two canastas."
      : moment.nextPhase === "complete" ? "Your discard ended your turn. Another player then ended the hand."
      : "That ended your turn. The other players have now played; look again at the pile and both teams' melds.", facts, next };
    case "special": return { title: "You declared a special hand.", explanation: "Your special-hand award replaces your team's ordinary hand score.", facts, next };
  }
}
