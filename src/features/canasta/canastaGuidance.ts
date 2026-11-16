import type { CanastaGuidedMoment } from "../../domain/canastaLearning";
import { formatCardList } from "../../presentation/cardDisplay";

export function canastaGuidedReview(moment: CanastaGuidedMoment) {
  const facts = `Your cards: ${moment.before} to ${moment.after}. Canastas: ${moment.canastasAfter}.`;
  const cards = formatCardList(moment.cards);
  switch (moment.action.type) {
    case "draw": return { title: `You drew ${cards}.`, explanation: "That stock card was unknown before drawing. Look for matching ranks, then meld or discard.", facts };
    case "expose": return { title: `You exposed a three${cards ? ` and received ${cards}` : ""}.`, explanation: "Exposed threes count against your team with no canasta, zero with one, and positively with two or more.", facts };
    case "pickup": return { title: `You took a ${moment.pileCount}-card pile.`, explanation: "Your natural pair and the top discard belong to the partnership's meld. The remaining pile cards join your hand.", facts };
    case "meld": return { title: moment.opened ? "Your partnership opened." : "You added to your partnership's melds.", explanation: moment.opened
      ? "Both partners can now build on these groups. If enough stock remains when you discard, opening bonus cards are reserved until your next turn."
      : moment.canastasAfter > moment.canastasBefore ? "Seven cards completed a canasta. Your partnership needs two before going out."
      : "These cards stay on the table. Your partner can also add to the same melds.", facts };
    case "discard": return { title: `You discarded ${cards}.`, explanation: "That ended your turn. Check the public melds and pile again after the other players' turns; their hidden cards are not known.", facts };
    case "special": return { title: "You declared a special hand.", explanation: "This profile awards the special-hand bonus instead of your partnership's ordinary hand score.", facts };
  }
}
