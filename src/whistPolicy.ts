import type { Card, FullHandState, Suit } from "./lessonTypes";

type PublicPlay = { player: number; card: Card };
export type WhistPosition = {
  hand: Card[];
  player: number;
  trump: Suit;
  trick: PublicPlay[];
  history: PublicPlay[][];
  turnedTrump?: { player: number; card: Card };
};
const suits: Suit[] = ["C", "D", "S", "H"];
const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const rank = (card: Card) => ranks.indexOf(card.rank) + 2;
const low = (cards: Card[]) => [...cards].sort((a, b) => rank(a) - rank(b) || suits.indexOf(a.suit) - suits.indexOf(b.suit))[0];

// Keep this public-information policy in step with crates/barbu-core/src/whist.rs.
export function chooseWhistCard(p: WhistPosition): Card | undefined {
  const seen = (card: Card) => [...p.trick, ...p.history.flat()].some(play => play.card.id === card.id);
  const outside = (suit: Suit) => ranks.map(r => ({ id: `${r}${suit}`, rank: r, suit, label: `${r}${suit}` }))
    .filter(card => !p.hand.some(own => own.id === card.id) && !seen(card));
  const master = (card: Card) => outside(card.suit).every(other => rank(other) < rank(card));
  const isVoid = (player: number, suit: Suit) => [...p.history, p.trick].some(trick =>
    trick[0]?.card.suit === suit && trick.some(play => play.player === player && play.card.suit !== suit));
  const opponents = [0, 1, 2, 3].filter(player => player % 2 !== p.player % 2);
  const canRuff = (suit: Suit) => suit !== p.trump && outside(p.trump).length > 0
    && opponents.some(player => isVoid(player, suit) && !isVoid(player, p.trump));
  const winner = (trick: PublicPlay[]) => [...trick].sort((a, b) => {
    const value = (card: Card) => (card.suit === p.trump ? 2 : card.suit === trick[0].card.suit ? 1 : 0) * 20 + rank(card);
    return value(b.card) - value(a.card);
  })[0];
  const wins = (card: Card) => winner([...p.trick, { player: p.player, card }])?.player === p.player;
  const discard = (cards: Card[]) => {
    const plain = cards.filter(card => card.suit !== p.trump);
    const value = (card: Card) => Number(master(card)) * 300 + rank(card) ** 2
      + p.hand.filter(other => other.suit === card.suit).length * 3;
    return [...(plain.length ? plain : cards)].sort((a, b) => value(a) - value(b) || suits.indexOf(a.suit) - suits.indexOf(b.suit))[0];
  };
  const leadSuit = (suit: Suit, returning: boolean) => {
    const cards = p.hand.filter(card => card.suit === suit).sort((a, b) => rank(b) - rank(a));
    const top = cards[0];
    if (!top) return undefined;
    if (master(top) || (rank(top) >= 10 && cards[1]
      && !outside(suit).some(card => rank(card) > rank(cards[1]) && rank(card) < rank(top)))
      || (returning && cards.length === 2)) return top;
    return !returning && cards.length >= 4 ? cards[3] : low(cards);
  };
  const lead = () => {
    for (const trick of [...p.history].reverse()) {
      if (trick[0]?.player !== (p.player + 2) % 4) continue;
      const suit = trick[0].card.suit;
      const worthwhile = suit === p.trump
        ? outside(suit).length > 0 && opponents.some(player => !isVoid(player, suit))
        : !canRuff(suit) && !isVoid((p.player + 2) % 4, suit);
      const card = worthwhile ? leadSuit(suit, true) : undefined;
      if (card) return card;
    }
    const trumps = p.hand.filter(card => card.suit === p.trump);
    if (trumps.length >= 5 && trumps.some(master) && outside(p.trump).length
      && opponents.some(player => !isVoid(player, p.trump))) return leadSuit(p.trump, false);
    const value = (suit: Suit) => p.hand.filter(card => card.suit === suit).length * 10
      + p.hand.filter(card => card.suit === suit && rank(card) >= 11).length * 3 - Number(canRuff(suit)) * 100;
    const suit = suits.filter(suit => suit !== p.trump && p.hand.some(card => card.suit === suit))
      .sort((a, b) => value(b) - value(a) || suits.indexOf(a) - suits.indexOf(b))[0] ?? p.trump;
    return leadSuit(suit, false);
  };
  const led = p.trick[0]?.card.suit;
  const following = p.hand.filter(card => card.suit === led);
  const legal = following.length ? following : p.hand;
  if (!legal.length) return undefined;
  if (!p.trick.length) return lead();
  const current = winner(p.trick);
  const partnerWinning = current.player % 2 === p.player % 2;
  const winners = legal.filter(wins);
  if (following.length) {
    if (p.trick.length === 3) return partnerWinning ? low(legal) : low(winners) ?? low(legal);
    if (p.trick.length === 1) return low(winners.filter(card => rank(current.card) >= 11
      && rank(card) === rank(current.card) + 1 && legal.length > 1)) ?? low(legal);
    const fourth = (p.player + 1) % 4;
    if (partnerWinning && (master(current.card) || (isVoid(fourth, current.card.suit)
      && (current.card.suit === p.trump || isVoid(fourth, p.trump))))) return low(legal);
    const best = [...winners].sort((a, b) => rank(b) - rank(a))[0];
    if (!best) return low(legal);
    const known = p.turnedTrump;
    if (known?.player === fourth && !seen(known.card) && known.card.suit === best.suit
      && rank(known.card) > rank(best)) return low(legal);
    return low(winners.filter(card => !outside(best.suit).some(other => rank(other) > rank(card) && rank(other) < rank(best))));
  }
  return partnerWinning ? discard(legal) : low(winners) ?? discard(legal);
}

export function whistPositionFromHand(state: FullHandState): WhistPosition {
  const seats = ["Tutor", "Right", "You", "Left"];
  const convert = (play: FullHandState["currentTrick"][number]) => ({ player: seats.indexOf(play.seat), card: play.card });
  return {
    hand: state.hands[state.currentPlayerIndex], player: state.currentPlayerIndex,
    trump: state.trumpSuit ?? state.id.split("-").at(-1) as Suit,
    trick: state.currentTrick.map(convert), history: state.completedTricks.map(trick => trick.cards.map(convert)),
    turnedTrump: state.whistTurnedTrump && state.whistDealer !== undefined
      ? { player: state.whistDealer, card: state.whistTurnedTrump } : undefined
  };
}
