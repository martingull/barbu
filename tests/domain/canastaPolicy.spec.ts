import { expect, test } from "@playwright/test";
import { canastaObservation, chooseCanastaAction, suggestedCanastaMelds, canastaPickupAction, shouldCanastaGoOut } from "../../src/domain/canastaPolicy";
import { canastaDeck, isCanastaWild, completedCanastas, type CanastaSide } from "../../src/domain/canastaRules";
import { createCanastaSession, transitionCanastaSession, type CanastaSession } from "../../src/domain/canastaSession";
import { normalizeCanastaSave, restoreCanastaSession, saveCanastaSession } from "../../src/persistence/canastaSave";

const deck = canastaDeck(0);
const cards = (ids: string) => ids.split(" ").filter(Boolean).map(id => deck.find(card => card.id === id)!);
function position(ids: string, opened = true) {
  const session = createCanastaSession(3);
  session.hand.hands = [cards(ids), [], [], []];
  const side = (): CanastaSide => ({ opened, melds: [], threes: [] });
  session.hand.sides = [side(), side()];
  session.hand.phase = "play"; session.hand.drewStock = true;
  session.hand.discards = cards("1-6S");
  return session;
}
function meld(session: CanastaSession, team: 0 | 1, rank: string, count: number) {
  const used = new Set([...session.hand.hands.flat(), ...session.hand.discards,
    ...session.hand.sides.flatMap(side => side.melds.flatMap(meld => meld.cards))].map(card => card.id));
  const selected = deck.filter(card => !used.has(card.id) && (rank === "Wild" ? isCanastaWild(card) : card.rank === rank)).slice(0, count);
  expect(selected).toHaveLength(count);
  session.hand.sides[team].melds.push({ rank, cards: selected });
}
function fillHands(session: CanastaSession, counts = [0, 10, 10, 10]) {
  const used = new Set([...session.hand.hands.flat(), ...session.hand.discards,
    ...session.hand.sides.flatMap(side => side.melds.flatMap(meld => meld.cards))].map(card => card.id));
  const remaining = deck.filter(card => !used.has(card.id));
  for (let seat = 1; seat < 4; seat++) session.hand.hands[seat] = remaining.splice(0, counts[seat]);
  session.hand.stock = remaining;
  return session;
}
function finishPosition() {
  const session = position("0-QC 0-QD 0-QH 0-KC");
  meld(session, 0, "4", 7); meld(session, 0, "5", 7); meld(session, 0, "A", 3);
  return fillHands(session);
}

test("suggestions avoid speculative penalty melds without forbidding legal manual play", () => {
  for (const [ids, rank] of [
    ["0-JR 0-JB 1-JR 0-4C", "Wild"],
    ["0-AC 0-AD 0-AH 0-AS 1-AC 1-AD 0-QC 0-QD 0-QH 0-4C", "A"],
    ["0-7C 0-7D 0-7H 0-4C 0-5C", "7"]
  ]) {
    const session = position(ids, rank === "7");
    const groups = [{ rank, cardIds: session.hand.hands[0].filter(card => rank === "Wild" ? isCanastaWild(card) : card.rank === rank).map(card => card.id) }];
    if (rank === "A") groups.push({ rank: "Q", cardIds: ["0-QC", "0-QD", "0-QH"] });
    expect(() => transitionCanastaSession(session, { type: "meld", groups })).not.toThrow();
    expect(suggestedCanastaMelds(canastaObservation(session))).toEqual([]);
    expect(chooseCanastaAction(canastaObservation(session)).type).toBe("discard");
  }
});

test("safe opening combinations still use wilds and meet the actual minimum", () => {
  const session = position("0-QC 0-QD 0-QH 0-KC 0-KD 0-JR 0-JB 0-4C", false);
  const groups = suggestedCanastaMelds(canastaObservation(session));
  expect(groups.length).toBeGreaterThan(0);
  const next = transitionCanastaSession(session, { type: "meld", groups });
  expect(next.hand.sides[0].opened).toBe(true);
  expect(next.hand.sides[0].melds.some(meld => meld.rank === "Wild")).toBe(false);
  expect(next.hand.hands[0].length).toBeGreaterThanOrEqual(1);
});

test("finishing an existing wild commitment outranks starting another small meld", () => {
  const session = position("0-2S 1-2S 0-4C 0-4D 0-4H 0-KC");
  meld(session, 0, "Wild", 5);
  const groups = suggestedCanastaMelds(canastaObservation(session));
  expect(groups).toEqual([{ rank: "Wild", cardIds: ["0-2S", "1-2S"] }]);
  expect(completedCanastas(transitionCanastaSession(session, { type: "meld", groups }).hand.sides[0])).toBe(1);
});

test("a wild finishes five natural cards before being spent on a small new meld", () => {
  const session = position("0-2S 1-2S 0-4C 0-4D 0-4H 0-KC");
  meld(session, 0, "Q", 5);
  const groups = suggestedCanastaMelds(canastaObservation(session));
  expect(groups[0].rank).toBe("Q");
  expect(groups[0].cardIds).toEqual(["0-2S", "1-2S"]);
  expect(completedCanastas(transitionCanastaSession(session, { type: "meld", groups }).hand.sides[0])).toBe(1);
});

test("a complete high-value canasta is still suggested as a splash", () => {
  for (const rank of ["7", "A", "Wild"]) {
    const session = position("0-KC", false);
    session.hand.hands[0].unshift(...deck.filter(card => rank === "Wild" ? isCanastaWild(card) : card.rank === rank).slice(0, 7));
    const groups = suggestedCanastaMelds(canastaObservation(session));
    expect(groups[0].rank).toBe(rank);
    expect(completedCanastas(transitionCanastaSession(session, { type: "meld", groups }).hand.sides[0])).toBe(1);
  }
});

test("the policy leaves a continuing card rather than volunteering a costly finish", () => {
  const session = finishPosition(), before = structuredClone(session);
  expect(shouldCanastaGoOut(canastaObservation(session))).toBe(false);
  const action = chooseCanastaAction(canastaObservation(session));
  const next = transitionCanastaSession(session, action);
  expect(next.hand.phase).not.toBe("complete");
  expect(next.hand.hands[0].length).toBeGreaterThan(1);
  expect(session).toEqual(before);
  // The policy is advice, not a new restriction on the player's legal finish.
  const melded = transitionCanastaSession(session, { type: "meld", groups: [{ rank: "Q", cardIds: ["0-QC", "0-QD", "0-QH"] }] });
  expect(transitionCanastaSession(melded, { type: "discard", cardId: "0-KC" }).hand.phase).toBe("complete");
});

test("a finish can protect the lead even when our hand score is negative", () => {
  const session = finishPosition();
  meld(session, 1, "7", 3); meld(session, 1, "Wild", 3); meld(session, 1, "A", 3);
  const observation = canastaObservation(session);
  expect(shouldCanastaGoOut(observation)).toBe(true);
  const action = chooseCanastaAction(observation);
  expect(action.type).toBe("meld");
  const melded = transitionCanastaSession(session, action);
  const ended = transitionCanastaSession(melded, chooseCanastaAction(canastaObservation(melded)));
  expect(ended.hand.phase).toBe("complete");
  expect(ended.hand.result!.scores[0].total).toBeLessThan(0);
  expect(ended.hand.result!.scores[0].total).toBeGreaterThan(ended.hand.result!.scores[1].total);
});

test("low stock, an imminent opponent finish and an estimated match win justify closing", () => {
  const lowStock = finishPosition(); lowStock.hand.stock = lowStock.hand.stock.slice(0, 8);
  expect(shouldCanastaGoOut(canastaObservation(lowStock))).toBe(true);
  const threat = finishPosition(); threat.hand.hands = [threat.hand.hands[0], [], [], []];
  meld(threat, 1, "8", 7); meld(threat, 1, "9", 7); fillHands(threat);
  threat.hand.hands[1] = threat.hand.hands[1].slice(0, 2);
  expect(shouldCanastaGoOut(canastaObservation(threat))).toBe(true);
  const win = finishPosition(); win.hand.sides[0].melds = win.hand.sides[0].melds.filter(meld => meld.rank !== "A");
  win.scores = [8400, 0];
  expect(shouldCanastaGoOut(canastaObservation(win))).toBe(true);
});

test("a large partner hand can justify waiting without inventing its card values", () => {
  const session = position("0-QC 0-QD 0-QH 0-KC");
  for (const rank of ["4", "5"]) meld(session, 0, rank, 7);
  for (const rank of ["8", "9"]) meld(session, 1, rank, 7);
  fillHands(session);
  expect(shouldCanastaGoOut(canastaObservation(session))).toBe(false);
  session.hand.hands[2] = session.hand.hands[2].slice(0, 2);
  expect(shouldCanastaGoOut(canastaObservation(session))).toBe(true);
});

test("an already committed last card is discarded rather than stalling", () => {
  const session = finishPosition(); session.hand.hands[0] = cards("0-KC");
  expect(shouldCanastaGoOut(canastaObservation(session))).toBe(false);
  expect(transitionCanastaSession(session, chooseCanastaAction(canastaObservation(session))).hand.phase).toBe("complete");
});

test("pile pickup does not create an unfinished high-penalty meld without the cards to close it", () => {
  const session = position("0-7C 0-7D 0-4C 0-5C"); session.hand.phase = "draw";
  session.hand.discards = cards("0-7H");
  expect(canastaPickupAction(canastaObservation(session))?.type).toBe("pickup");
  expect(chooseCanastaAction(canastaObservation(session))).toEqual({ type: "draw" });
  session.hand.discards.unshift(...cards("0-7S 1-7C 1-7D 1-7H"));
  expect(canastaPickupAction(canastaObservation(session))?.type).toBe("pickup");
  expect(chooseCanastaAction(canastaObservation(session)).type).toBe("pickup");
});

test("public counts inform decisions, but hidden identities and order do not", () => {
  const session = finishPosition(), changed = structuredClone(session);
  [changed.hand.hands[1][0], changed.hand.stock[0]] = [changed.hand.stock[0], changed.hand.hands[1][0]];
  changed.hand.stock.reverse(); changed.hand.hands[2].reverse(); changed.initialSeed = 99;
  changed.hand.talons[1] = cards("1-JR");
  const observation = canastaObservation(session);
  expect(observation.handCounts).toEqual(session.hand.hands.map(hand => hand.length));
  expect(observation.hand.hands.slice(1)).toEqual([[], [], []]);
  expect(canastaObservation(changed)).toEqual(observation);
  expect(chooseCanastaAction(canastaObservation(changed))).toEqual(chooseCanastaAction(observation));
});

test("new policy actions round-trip through the unchanged action-log save", () => {
  let session = createCanastaSession(9);
  for (let step = 0; step < 30 && session.hand.phase !== "complete"; step++) {
    session = transitionCanastaSession(session, chooseCanastaAction(canastaObservation(session)));
  }
  const saved = saveCanastaSession(session, "2026-11-17T12:00:00Z");
  expect(restoreCanastaSession(normalizeCanastaSave(saved)!)).toEqual(session);
});
