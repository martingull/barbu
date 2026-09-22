import type { Card, Seat, TableCard } from "../lessonTypes";
import type { BarbuTrickContract } from "./barbuRules";
import { cardRank, legalCards, trickWinner } from "./trickTakingRules";

// Policy sees only its own cards and public play, never the opponents' hands.
export function chooseBarbuCard(contract: BarbuTrickContract, hand: Card[], currentTrick: TableCard[], seat: Seat, completedTricks: number): Card | undefined {
  const led = currentTrick[0]?.card.suit;
  // Preserve native policy tie-breaking independently of the display suit order.
  const legal = [...legalCards(hand, led)].sort((a, b) => cardRank(a) - cardRank(b) || a.suit.localeCompare(b.suit));
  const lowest = (cards = legal) => cards[0];
  const highest = (cards = legal) => cards.at(-1);
  const danger = (card: Card) => contract === "No Hearts" ? card.suit === "H"
    : contract === "No Queens" ? card.rank === "Q" : contract === "King of Hearts" && card.id === "KH";
  const wins = (card: Card) => trickWinner([...currentTrick, { seat, card }], contract === "Hearts Trumps" ? "H" : undefined)?.seat === seat;
  if (!legal.length) return undefined;
  if (!led) {
    if (contract === "Hearts Trumps") return highest(legal.filter(c => c.suit === "H")) ?? highest();
    if (contract === "No Last Two") return completedTricks >= 10 ? lowest() : highest();
    return lowest(legal.filter(c => !danger(c))) ?? lowest();
  }
  const follows = legal.every(c => c.suit === led);
  if (contract === "Hearts Trumps") {
    return lowest(legal.filter(wins)) ?? (!follows ? lowest(legal.filter(c => c.suit !== "H")) : undefined) ?? lowest();
  }
  if (!follows) return highest(legal.filter(danger)) ?? highest();
  if (contract === "No Last Two" && completedTricks < 10) return highest();
  const losing = legal.filter(c => !wins(c));
  if (contract === "No Queens") return highest(losing.filter(c => c.rank === "Q")) ?? highest(losing) ?? lowest();
  return highest(losing) ?? lowest();
}
