import type { Card } from "./types";
import { canastaRanks, canastaTeam, canastaTarget, completedCanastas, isCanastaWild, canastaValue, canastaSpecial,
  deadCanastaRank, validateCanastaMeld, scoreCanastaSide, type MeldRequest } from "./canastaRules";
import { transitionCanastaSession, legalCanastaDiscards, type CanastaAction, type CanastaHand, type CanastaSession } from "./canastaSession";

export type CanastaObservation = CanastaSession & { handCounts: number[] };

// A rules-validation position containing only the acting seat's cards and public information.
// Stock placeholders preserve its count, never its values or order; opponents' hands are absent.
export function canastaObservation(session: CanastaSession): CanastaObservation {
  const hand = session.hand;
  return { ...session, initialSeed: 0, events: [], handCounts: hand.hands.map(cards => cards.length), hand: { ...structuredClone(hand),
    hands: hand.hands.map((cards, index) => index === hand.turn ? [...cards] : []),
    stock: hand.stock.map((_, index) => ({ id: `unknown-${index}`, rank: "?", suit: "C", label: "Unknown" })),
    talons: [[], [], [], []] } };
}
// Hidden cards are priced approximately, not inspected. A negative hand can still
// be a good finish if it catches the opponents with a substantially worse score.
export function shouldCanastaGoOut(observation: CanastaObservation, hand = observation.hand) {
  const player = hand.turn, team = canastaTeam(player), other = 1 - team;
  const own = scoreCanastaSide(hand.sides[team], [hand.hands[player]], true);
  const theirs = scoreCanastaSide(hand.sides[other], [], false);
  const partnerCount = observation.handCounts[(player + 2) % 4];
  const opponentCounts = observation.handCounts.filter((_, seat) => canastaTeam(seat) === other);
  const oursEstimate = own.total - partnerCount * 10;
  const theirsEstimate = theirs.total - opponentCounts.reduce((sum, count) => sum + count * 10, 0);
  const margin = oursEstimate - theirsEstimate;
  if (observation.scores[team] + oursEstimate >= canastaTarget
    && observation.scores[team] + oursEstimate > observation.scores[other] + theirsEstimate) return true;
  if (hand.stock.length <= 8 || completedCanastas(hand.sides[other]) >= 2 && Math.min(...opponentCounts) <= 3) return true;
  if (own.penalties && margin < 1000) return false;
  return partnerCount < 8 || margin >= 300;
}

function meldValue(before: CanastaHand, after: CanastaHand) {
  const team = canastaTeam(before.turn), cards = after.hands[after.turn];
  const score = (hand: CanastaHand) => scoreCanastaSide(hand.sides[team], [hand.hands[hand.turn]], false).total;
  const completed = completedCanastas(after.sides[team]) - completedCanastas(before.sides[team]);
  const movedWilds = before.hands[before.turn].filter(isCanastaWild).length - cards.filter(isCanastaWild).length;
  const progress = after.sides[team].melds.reduce((sum, meld) => {
    const old = before.sides[team].melds.find(existing => existing.rank === meld.rank);
    return sum + (meld.cards.length - (old?.cards.length ?? 0)) * (old ? 12 : 3);
  }, 0);
  const opening = !before.sides[team].opened && after.sides[team].opened ? 180 : 0;
  return score(after) - score(before) + opening + completed * 200 + progress - (completed ? 0 : movedWilds * 45);
}

export function suggestedCanastaMelds(observation: CanastaObservation, pickupPair?: string[]): MeldRequest[] {
  const { hand } = observation, team = canastaTeam(hand.turn), side = hand.sides[team], cards = hand.hands[hand.turn];
  if (cards.some(card => card.rank === "3")) return [];
  const wilds = cards.filter(isCanastaWild), opening = !side.opened;
  const ranks = canastaRanks.filter(rank => rank === "Wild" || !deadCanastaRank(hand.sides, rank)).sort((a, b) => {
    const priority = (rank: string) => {
      const existing = side.melds.find(meld => meld.rank === rank);
      const available = rank === "Wild" ? wilds.length : cards.filter(card => card.rank === rank).length;
      return (existing ? 20 : 0) + ((existing?.cards.length ?? 0) + available >= 7 ? 40 : 0);
    };
    return priority(b) - priority(a);
  });
  let visited = 0, candidates = 0, best: MeldRequest[] = [], bestValue = 0;
  function search(index: number, groups: MeldRequest[], usedWild: number) {
    if (++visited > 1800 || candidates >= 96) return;
    if (groups.length) {
      try {
        const after = transitionCanastaSession(observation, pickupPair
          ? { type: "pickup", pair: pickupPair, groups } : { type: "meld", groups }).hand;
        candidates++;
        const finishes = after.hands[after.turn].length === 1 && completedCanastas(after.sides[team]) >= 2;
        const value = meldValue(hand, after);
        if ((!finishes || shouldCanastaGoOut(observation, after)) && value > bestValue) {
          best = groups; bestValue = value;
        }
        // Further groups are played as a separate action in this same turn.
        return;
      } catch { /* An opening may need several groups to reach its minimum. */ }
    }
    if (index >= ranks.length) return;
    const rank = ranks[index], existing = side.melds.find(meld => meld.rank === rank);
    const naturals = cards.filter(card => card.rank === rank && !isCanastaWild(card));
    const room = 7 - (existing?.cards.length ?? 0);
    if (rank === "Wild") {
      for (let count = Math.min(room, wilds.length - usedWild); count >= (existing ? 1 : 3); count--) {
        if (!existing && count < 7) continue;
        search(index + 1, [...groups, { rank, cardIds: wilds.slice(usedWild, usedWild + count).map(card => card.id) }], usedWild + count);
      }
    } else {
      for (let count = Math.min(room, naturals.length); count >= (existing ? 0 : 2); count--) {
        for (let wild = 0; wild <= Math.min(2, wilds.length - usedWild, room - count); wild++) {
          if (!count && !wild || !existing && count + wild < 3) continue;
          // Do not create a new penalty commitment unless this move completes it.
          const pickupCard = pickupPair && hand.discards.at(-1)?.rank === rank ? 1 : 0;
          if (!existing && (rank === "7" || rank === "A" && !wild) && count + pickupCard < 7) continue;
          const request = { rank, cardIds: [...naturals.slice(0, count), ...wilds.slice(usedWild, usedWild + wild)].map(card => card.id) };
          try { validateCanastaMeld(rank, cards.filter(card => request.cardIds.includes(card.id)), existing, opening); }
          catch { continue; }
          search(index + 1, [...groups, request], usedWild + wild);
        }
      }
    }
    search(index + 1, groups, usedWild);
  }
  search(0, [], 0);
  return best;
}

export function canastaPickupAction(observation: CanastaObservation): CanastaAction | null {
  const hand = observation.hand, top = hand.discards.at(-1);
  if (hand.phase !== "draw" || !top) return null;
  const pair = hand.hands[hand.turn].filter(card => card.rank === top.rank && !isCanastaWild(card)).slice(0, 2).map(card => card.id);
  if (pair.length !== 2) return null;
  const groups = hand.sides[canastaTeam(hand.turn)].opened ? [] : suggestedCanastaMelds(observation, pair);
  const action: CanastaAction = { type: "pickup", pair, groups };
  try { transitionCanastaSession(observation, action); return action; } catch { return null; }
}

function shouldTakeCanastaPile(observation: CanastaObservation, action: CanastaAction) {
  const hand = observation.hand, top = hand.discards.at(-1)!;
  let after: CanastaHand;
  try { after = transitionCanastaSession(observation, action).hand; } catch { return false; }
  const meld = after.sides[canastaTeam(hand.turn)].melds.find(meld => meld.rank === top.rank)!;
  if ((top.rank === "7" || top.rank === "A" && !meld.cards.some(isCanastaWild)) && meld.cards.length < 7
    && !hand.sides[canastaTeam(hand.turn)].melds.some(existing => existing.rank === top.rank)
    && meld.cards.length + after.hands[hand.turn].filter(card => card.rank === top.rank).length < 7) return false;
  if (after.hands[hand.turn].length === 1 && completedCanastas(after.sides[canastaTeam(hand.turn)]) >= 2
    && !shouldCanastaGoOut(observation, after)) return false;
  return true;
}

export function chooseCanastaAction(observation: CanastaObservation): CanastaAction {
  const hand = observation.hand, cards = hand.hands[hand.turn], team = canastaTeam(hand.turn);
  if (hand.phase === "play" && hand.drewStock && !hand.sides[team].opened && canastaSpecial(cards)) return { type: "special" };
  const three = cards.find(card => card.rank === "3");
  if (three) return { type: "expose", cardId: three.id };
  if (hand.phase === "draw") {
    const pickup = canastaPickupAction(observation);
    return pickup && shouldTakeCanastaPile(observation, pickup) ? pickup : { type: "draw" };
  }
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
