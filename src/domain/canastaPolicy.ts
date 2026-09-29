import type { Card } from "./types";
import { canastaRanks, canastaTeam, isCanastaWild, canastaValue, canastaSpecial, deadCanastaRank, validateCanastaMeld, type MeldRequest } from "./canastaRules";
import { transitionCanastaSession, legalCanastaDiscards, type CanastaAction, type CanastaSession } from "./canastaSession";

// A rules-validation position containing only the acting seat's cards and public information.
// Stock placeholders preserve its count, never its values or order; opponents' hands are absent.
export function canastaObservation(session: CanastaSession): CanastaSession {
  const hand = session.hand;
  return { ...session, initialSeed: 0, events: [], hand: { ...structuredClone(hand),
    hands: hand.hands.map((cards, index) => index === hand.turn ? [...cards] : []),
    stock: hand.stock.map((_, index) => ({ id: `unknown-${index}`, rank: "?", suit: "C", label: "Unknown" })),
    talons: [[], [], [], []] } };
}
function possible(session: CanastaSession, action: CanastaAction) {
  try { transitionCanastaSession(session, action); return true; } catch { return false; }
}

export function suggestedCanastaMelds(observation: CanastaSession, pickupPair?: string[]): MeldRequest[] {
  const { hand } = observation, team = canastaTeam(hand.turn), side = hand.sides[team], cards = hand.hands[hand.turn];
  if (cards.some(card => card.rank === "3")) return [];
  const wilds = cards.filter(isCanastaWild), opening = !side.opened;
  const ranks = canastaRanks.filter(rank => rank === "Wild" || !deadCanastaRank(hand.sides, rank));
  const valid = (groups: MeldRequest[]) => possible(observation, pickupPair
    ? { type: "pickup", pair: pickupPair, groups } : { type: "meld", groups });
  let visited = 0;
  function search(index: number, groups: MeldRequest[], usedWild: number): MeldRequest[] | null {
    if (++visited > 1800) return null;
    if (groups.length && valid(groups)) return groups;
    if (index >= ranks.length) return null;
    const rank = ranks[index], existing = side.melds.find(meld => meld.rank === rank);
    const naturals = cards.filter(card => card.rank === rank && !isCanastaWild(card));
    const room = 7 - (existing?.cards.length ?? 0);
    if (rank === "Wild") {
      for (let count = Math.min(room, wilds.length - usedWild); count >= (existing ? 1 : 3); count--) {
        const result = search(index + 1, [...groups, { rank, cardIds: wilds.slice(usedWild, usedWild + count).map(card => card.id) }], usedWild + count);
        if (result) return result;
      }
    } else {
      for (let count = Math.min(room, naturals.length); count >= (existing ? 0 : 2); count--) {
        for (let wild = 0; wild <= Math.min(2, wilds.length - usedWild, room - count); wild++) {
          if (!count && !wild || !existing && count + wild < 3) continue;
          // Avoid voluntarily opening high-penalty melds without a completion prospect.
          if (!opening && !existing && ["7", "A"].includes(rank) && count < 7) continue;
          const request = { rank, cardIds: [...naturals.slice(0, count), ...wilds.slice(usedWild, usedWild + wild)].map(card => card.id) };
          try { validateCanastaMeld(rank, cards.filter(card => request.cardIds.includes(card.id)), existing, opening); }
          catch { continue; }
          const result = search(index + 1, [...groups, request], usedWild + wild);
          if (result) return result;
        }
      }
    }
    return search(index + 1, groups, usedWild);
  }
  return search(0, [], 0) ?? [];
}

export function canastaPickupAction(observation: CanastaSession): CanastaAction | null {
  const hand = observation.hand, top = hand.discards.at(-1);
  if (hand.phase !== "draw" || !top) return null;
  const pair = hand.hands[hand.turn].filter(card => card.rank === top.rank && !isCanastaWild(card)).slice(0, 2).map(card => card.id);
  if (pair.length !== 2) return null;
  const groups = hand.sides[canastaTeam(hand.turn)].opened ? [] : suggestedCanastaMelds(observation, pair);
  const action: CanastaAction = { type: "pickup", pair, groups };
  return possible(observation, action) ? action : null;
}

export function chooseCanastaAction(observation: CanastaSession): CanastaAction {
  const hand = observation.hand, cards = hand.hands[hand.turn], team = canastaTeam(hand.turn);
  if (hand.phase === "play" && hand.drewStock && !hand.sides[team].opened && canastaSpecial(cards)) return { type: "special" };
  const three = cards.find(card => card.rank === "3");
  if (three) return { type: "expose", cardId: three.id };
  if (hand.phase === "draw") return canastaPickupAction(observation) ?? { type: "draw" };
  const groups = suggestedCanastaMelds(observation);
  if (groups.length) return { type: "meld", groups };
  const opponents = hand.sides[1 - team].melds;
  const value = (card: Card) => {
    const count = cards.filter(other => other.rank === card.rank).length;
    const safe = deadCanastaRank(hand.sides, card.rank) || opponents.some(meld => meld.rank === card.rank && meld.cards.length >= 5);
    const danger = ["A", "7"].includes(card.rank) && count >= 3 ? 250 : 0;
    return (safe ? 200 : 0) + danger + canastaValue(card) - count * 25 - (isCanastaWild(card) ? 100 : 0);
  };
  const discard = legalCanastaDiscards(hand).sort((a, b) => value(b) - value(a) || a.id.localeCompare(b.id))[0];
  if (!discard) throw Error("Canasta has no legal discard in this position.");
  return { type: "discard", cardId: discard.id };
}
export function advanceCanastaOpponents(session: CanastaSession): CanastaSession {
  let next = session;
  // Three opponents, at most 108 card-moving actions each. A bound catches a broken transition.
  for (let step = 0; step < 400 && next.hand.turn !== 0 && next.hand.phase !== "complete"; step++) {
    next = transitionCanastaSession(next, chooseCanastaAction(canastaObservation(next)));
  }
  if (next.hand.turn !== 0 && next.hand.phase !== "complete") throw Error("Canasta opponents could not finish their turns.");
  return next;
}
