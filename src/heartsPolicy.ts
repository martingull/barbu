import type { Card, FullHandState } from "./lessonTypes";

type PublicPlay = { player: number; card: Card };
export type HeartsPosition = {
  hand: Card[];
  legal: Card[];
  player: number;
  trick: PublicPlay[];
  history: { cards: PublicPlay[]; winner: number; penalty: number }[];
};
const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const suits = ["C", "D", "S", "H"];
const rank = (card: Card) => ranks.indexOf(card.rank) + 2;
const suit = (card: Card) => suits.indexOf(card.suit);
const penalty = (card: Card) => card.id === "QS" ? 13 : card.suit === "H" ? 1 : 0;
const low = (cards: Card[]) => [...cards].sort((a, b) => rank(a) - rank(b) || suit(a) - suit(b))[0];
const high = (cards: Card[]) => [...cards].sort((a, b) => rank(b) - rank(a) || suit(b) - suit(a))[0];

// Mirror crates/barbu-core/src/hearts.rs; both policies use the same fixtures.
export function chooseHeartsCard(p: HeartsPosition): Card | undefined {
  const seen = (id: string) => [...p.history.flatMap(t => t.cards), ...p.trick].some(play => play.card.id === id);
  const queenOutside = !p.hand.some(card => card.id === "QS") && !seen("QS");
  const master = (card: Card) => ranks.filter(r => ranks.indexOf(r) + 2 > rank(card))
    .every(r => p.hand.some(held => held.id === `${r}${card.suit}`) || seen(`${r}${card.suit}`));
  const voidCount = (card: Card) => [0, 1, 2, 3].filter(player => player !== p.player && p.history.some(t =>
    t.cards[0]?.card.suit === card.suit && t.cards.some(play => play.player === player && play.card.suit !== card.suit))).length;
  const points = [0, 0, 0, 0];
  for (const trick of p.history) points[trick.winner] += trick.penalty;
  const total = points.reduce((sum, value) => sum + value, 0);
  const threat = total >= 8 ? points.findIndex(value => value === total) : -1;
  const moonAttempt = threat === p.player && (total >= 20 || p.hand.filter(card => card.suit === "H" && master(card)).length >= 2);
  const winner = (trick: PublicPlay[]) => [...trick].filter(play => play.card.suit === trick[0]?.card.suit)
    .sort((a, b) => rank(b.card) - rank(a.card))[0]?.player;
  const wins = (card: Card) => winner([...p.trick, { player: p.player, card }]) === p.player;

  if (!p.trick.length) {
    if (moonAttempt) return high(p.legal.filter(card => card.suit === "H" && master(card)))
      ?? high(p.legal.filter(master)) ?? low(p.legal);
    return [...p.legal].filter(card => !penalty(card) && !(card.suit === "S" && rank(card) > 12 && queenOutside))
      .sort((a, b) => voidCount(a) - voidCount(b)
        || p.hand.filter(c => c.suit === a.suit).length - p.hand.filter(c => c.suit === b.suit).length
        || (voidCount(a) > 0 ? rank(a) - rank(b) : rank(b) - rank(a)) || suit(a) - suit(b))[0]
      ?? low(p.legal.filter(card => card.suit === "H")) ?? low(p.legal);
  }
  const loaded = p.trick.some(play => penalty(play.card) > 0);
  const threatWinning = threat >= 0 && threat !== p.player && winner(p.trick) === threat;
  const follows = p.legal.some(card => card.suit === p.trick[0].card.suit);
  if (!follows) {
    if (threatWinning) return high(p.legal.filter(card => !penalty(card)))
      ?? [...p.legal].sort((a, b) => penalty(a) - penalty(b) || rank(a) - rank(b) || suit(a) - suit(b))[0];
    const value = (card: Card) => penalty(card) === 13 ? 1000
      : card.suit === "S" && rank(card) > 12 && queenOutside ? 900 + rank(card)
      : card.suit === "H" && rank(card) >= 11 ? 600 + rank(card)
      : rank(card) >= 11 ? 400 + rank(card)
      : card.suit === "H" ? 200 + rank(card) : rank(card);
    return [...p.legal].sort((a, b) => value(b) - value(a) || suit(b) - suit(a))[0];
  }
  if (loaded && (threatWinning || moonAttempt)) {
    const stopper = low(p.legal.filter(wins));
    if (stopper) return stopper;
  }
  if (p.trick.length === 3 && !loaded) {
    const safe = high(p.legal.filter(card => !penalty(card)));
    if (safe) return safe;
  }
  return [...p.legal].filter(card => !wins(card)).sort((a, b) => penalty(b) - penalty(a) || rank(b) - rank(a) || suit(b) - suit(a))[0]
    ?? (p.trick.length === 3 ? high(p.legal) : low(p.legal.filter(card => !penalty(card))) ?? low(p.legal));
}

export function chooseHeartsPass(hand: Card[]): Card[] {
  let remaining = [...hand];
  const passed: Card[] = [];
  for (let i = 0; i < 3; i++) {
    const value = (card: Card) => {
      const r = rank(card);
      const length = remaining.filter(held => held.suit === card.suit).length;
      return penalty(card) === 13 ? length <= 3 ? 1000 : 120
        : card.suit === "S" && r > 12 ? length <= 3 ? 900 + r : 350 + r
        : card.suit === "H" && r >= 11 ? 400 + r * 5
        : r >= 11 ? 300 + r * 5 + (length <= 3 ? 60 : 0)
        : (card.suit === "C" || card.suit === "D") && length <= 3 ? 200 + r
        : card.suit === "H" ? 20 + r : r;
    };
    const card = [...remaining].sort((a, b) => value(b) - value(a) || suit(b) - suit(a))[0];
    if (card) { passed.push(card); remaining = remaining.filter(held => held.id !== card.id); }
  }
  return passed;
}

export function heartsPositionFromHand(state: FullHandState, legal: Card[]): HeartsPosition {
  const seats = ["Tutor", "Right", "You", "Left"];
  const plays = (cards: FullHandState["currentTrick"]) => cards.map(play => ({ player: seats.indexOf(play.seat), card: play.card }));
  return { hand: state.hands[state.currentPlayerIndex], legal, player: state.currentPlayerIndex,
    trick: plays(state.currentTrick), history: state.completedTricks.map(t => ({ cards: plays(t.cards), winner: t.winnerIndex, penalty: t.penalty })) };
}
