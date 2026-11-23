import { expect, test } from "@playwright/test";
import { standardDeck } from "../../src/domain/deck";
import { legalCards, trickWinner } from "../../src/domain/trickTakingRules";
import { euchreDeck, euchreEffectiveSuit, euchreCardRank, euchrePartner, euchreSuits,
  legalEuchreCards, euchreTrickWinner, scoreEuchreHand } from "../../src/domain/euchreRules";
import { createEuchreSession, transitionEuchreSession, replayEuchreHand, euchrePosition, euchreComplete } from "../../src/domain/euchreSession";
import { chooseEuchreAction } from "../../src/domain/euchrePolicy";
import { saveEuchreSession, restoreEuchreSession, normalizeEuchreSave, createEuchreSaveStore, euchreSaveKey } from "../../src/persistence/euchreSave";

const card = id => standardDeck().find(card => card.id === id);
const pass = session => transitionEuchreSession(session, { type: "pass" });
const play = (session, cardId) => transitionEuchreSession(session, { type: "play-card", cardId });
const stamp = "2026-11-23T12:00:00.000Z";
function call(session, trump = session.hand.upcard.suit, alone = false) {
  return transitionEuchreSession(session, { type: "call", trump, alone });
}
function discard(session) {
  return transitionEuchreSession(session, chooseEuchreAction(euchrePosition(session.hand, session.hand.turn)));
}
function finishHand(session) {
  for (let steps = 0; !["complete", "passed_out"].includes(session.hand.phase); steps++) {
    expect(steps).toBeLessThan(50);
    session = transitionEuchreSession(session, session.hand.phase === "review" ? { type: "next-trick" }
      : chooseEuchreAction(euchrePosition(session.hand, session.hand.turn)));
  }
  return session;
}
function cardsInHand(hand) {
  const cards = [...hand.hands.flat(), ...hand.kitty,
    ...hand.currentTrick.map(play => play.card), ...hand.completedTricks.flatMap(trick => trick.cards.map(play => play.card))];
  // The upcard is only outside the kitty/hands before a contract is made.
  if (!hand.contract) cards.push(hand.upcard);
  return cards;
}

test("Euchre deals 24 unique cards in packets with five per seat and a visible upcard", () => {
  expect(euchreDeck()).toHaveLength(24);
  for (let dealer = 0; dealer < 4; dealer++) {
    const session = createEuchreSession(42, dealer);
    expect(session.hand.hands.map(cards => cards.length)).toEqual([5, 5, 5, 5]);
    expect(session.hand.kitty).toHaveLength(3);
    expect(session.hand.turn).toBe((dealer + 1) % 4);
    expect(new Set(cardsInHand(session.hand).map(card => card.id)).size).toBe(24);
    expect(session).toEqual(createEuchreSession(42, dealer));
  }
  for (const seed of [-1, 1.5, NaN, Infinity]) expect(() => createEuchreSession(seed)).toThrow();
  expect(() => createEuchreSession(1, 4)).toThrow();
});

test("both bowers have trump suit and rank above the ace for every trump", () => {
  const left = { C: "JS", S: "JC", H: "JD", D: "JH" };
  for (const trump of euchreSuits) {
    expect(euchreEffectiveSuit(card(left[trump]), trump)).toBe(trump);
    expect(euchreCardRank(card(`J${trump}`), trump)).toBeGreaterThan(euchreCardRank(card(left[trump]), trump));
    expect(euchreCardRank(card(left[trump]), trump)).toBeGreaterThan(euchreCardRank(card(`A${trump}`), trump));
    expect(euchreTrickWinner([{ seat: 0, card: card(`A${trump}`) }, { seat: 1, card: card(left[trump]) }], trump)).toBe(1);
  }
});

test("the left bower follows trump, not its printed suit, and sets trump when led", () => {
  const hand = [card("JD"), card("9D"), card("AH"), card("AC")];
  expect(legalEuchreCards(hand, [{ seat: 0, card: card("QH") }], "H").map(c => c.id)).toEqual(["JD", "AH"]);
  expect(legalEuchreCards(hand, [{ seat: 0, card: card("QD") }], "H").map(c => c.id)).toEqual(["9D"]);
  expect(legalEuchreCards(hand, [{ seat: 0, card: card("JD") }], "H").map(c => c.id)).toEqual(["JD", "AH"]);
  const voidHand = [card("JD"), card("AC")];
  expect(legalEuchreCards(voidHand, [{ seat: 0, card: card("QD") }], "H")).toEqual(voidHand);
});

test("new rule hooks leave standard follow-suit and rank behavior unchanged", () => {
  const hand = [card("JD"), card("AH")];
  expect(legalCards(hand, "D")).toEqual([card("JD")]);
  expect(trickWinner([{ seat: "Tutor", card: card("AH") }, { seat: "Right", card: card("JD") }], "H")?.seat).toBe("Tutor");
  expect(trickWinner([])).toBeUndefined();
  expect(euchreTrickWinner([], "H")).toBeUndefined();
});

test("first-round calling accepts only the upcard suit and requires the dealer's private discard", () => {
  const initial = createEuchreSession(10, 3), snapshot = JSON.stringify(initial);
  const unavailable = euchreSuits.find(suit => suit !== initial.hand.upcard.suit);
  expect(() => call(initial, unavailable)).toThrow();
  const ordered = call(initial);
  expect(ordered.hand.phase).toBe("discard");
  expect(ordered.hand.turn).toBe(3);
  expect(ordered.hand.hands[3]).toHaveLength(6);
  expect(() => play(ordered, ordered.hand.hands[3][0].id)).toThrow();
  expect(() => transitionEuchreSession(ordered, { type: "discard", cardId: "2C" })).toThrow();
  const ready = discard(ordered);
  expect(ready.hand.hands[3]).toHaveLength(5);
  expect(ready.hand.kitty).toHaveLength(4);
  expect(ready.hand.phase).toBe("playing");
  expect(ready.hand.turn).toBe(0);
  expect(new Set(cardsInHand(ready.hand).map(card => card.id)).size).toBe(24);
  expect(JSON.stringify(initial)).toBe(snapshot);
});

test("the dealer's partner may order up without being forced alone", () => {
  const session = call(pass(createEuchreSession(22, 3)));
  expect(session.hand.contract.maker).toBe(1);
  expect(session.hand.contract.alone).toBe(false);
  expect(session.hand.inactiveSeat).toBeNull();
});

test("second calling round excludes the rejected suit; eight passes redeal without scoring", () => {
  let session = createEuchreSession(2, 2);
  for (let i = 0; i < 4; i++) session = pass(session);
  expect(session.hand.round).toBe(2);
  expect(session.hand.turn).toBe(3);
  expect(() => call(session)).toThrow();
  const suit = euchreSuits.find(suit => suit !== session.hand.upcard.suit);
  const ready = call(session, suit);
  expect(ready.hand.phase).toBe("playing");
  expect(ready.hand.hands.map(cards => cards.length)).toEqual([5, 5, 5, 5]);
  expect(ready.hand.kitty).toHaveLength(4);
  for (let i = 0; i < 4; i++) session = pass(session);
  expect(session.hand.phase).toBe("passed_out");
  expect(session.scores).toEqual([0, 0]);
  const next = transitionEuchreSession(session, { type: "next-hand", seed: 3 });
  expect(next.hand.dealer).toBe(3);
  expect(next.handNumber).toBe(2);
  expect(next.scores).toEqual([0, 0]);
  expect(() => pass(session)).toThrow();
});

test("going alone skips only maker's partner, including an inactive opening leader", () => {
  let session = createEuchreSession(20, 3);
  session = pass(pass(session));
  session = discard(call(session, session.hand.upcard.suit, true));
  expect(session.hand.contract.maker).toBe(2);
  expect(session.hand.inactiveSeat).toBe(0);
  expect(session.hand.turn).toBe(1);
  const finished = finishHand(session);
  expect(finished.hand.completedTricks).toHaveLength(5);
  expect(finished.hand.completedTricks.every(trick => trick.cards.length === 3 && trick.cards.every(play => play.seat !== 0))).toBe(true);
  expect(finished.hand.hands.map(cards => cards.length)).toEqual([5, 0, 0, 0]);
  expect(new Set(cardsInHand(finished.hand).map(card => card.id)).size).toBe(24);
});

test("an inactive dealer still discards before sitting out the lone hand", () => {
  let session = pass(createEuchreSession(44, 3));
  session = call(session, session.hand.upcard.suit, true);
  expect(session.hand.inactiveSeat).toBe(3);
  expect(session.hand.phase).toBe("discard");
  expect(session.hand.turn).toBe(3);
  session = discard(session);
  expect(session.hand.hands[3]).toHaveLength(5);
  expect(finishHand(session).hand.completedTricks.every(trick => trick.cards.every(play => play.seat !== 3))).toBe(true);
});

test("off-suit play is rejected when an effective-suit card is available", () => {
  let session = discard(call(createEuchreSession(23)));
  for (let i = 0; i < 10; i++) {
    if (session.hand.phase === "review") session = transitionEuchreSession(session, { type: "next-trick" });
    const hand = session.hand.hands[session.hand.turn];
    const legal = legalEuchreCards(hand, session.hand.currentTrick, session.hand.contract.trump);
    const illegal = hand.find(card => !legal.some(candidate => candidate.id === card.id));
    if (illegal) { expect(() => play(session, illegal.id)).toThrow(/effective suit/); return; }
    session = play(session, legal[0].id);
  }
  throw Error("Fixture did not exercise an illegal off-suit play.");
});

test("completed tricks pause for review and their winner leads next", () => {
  let session = discard(call(createEuchreSession(55)));
  while (session.hand.phase === "playing") session = transitionEuchreSession(session, chooseEuchreAction(euchrePosition(session.hand, session.hand.turn)));
  expect(session.hand.phase).toBe("review");
  expect(session.hand.turn).toBe(session.hand.completedTricks[0].winner);
  expect(() => play(session, session.hand.hands[session.hand.turn][0].id)).toThrow();
  session = transitionEuchreSession(session, { type: "next-trick" });
  expect(session.hand.currentTrick).toEqual([]);
  expect(session.hand.phase).toBe("playing");
});

test("all partnership and lone-hand scores use the makers' three-trick target", () => {
  for (const maker of [0, 1, 2, 3]) for (const alone of [false, true]) for (let tricks = 0; tricks <= 5; tricks++) {
    const result = scoreEuchreHand({ maker, trump: "S", alone }, tricks);
    expect(result.winner).toBe(tricks >= 3 ? maker % 2 : 1 - maker % 2);
    expect(result.points).toBe(tricks < 3 ? 2 : tricks < 5 ? 1 : alone ? 4 : 2);
  }
  for (const tricks of [-1, 6, 1.5, NaN]) expect(() => scoreEuchreHand({ maker: 0, trump: "S", alone: false }, tricks)).toThrow();
});

test("settlement happens once, next deal preserves scores and replay recovers the actual hand", () => {
  const initial = createEuchreSession(66);
  const finished = finishHand(discard(call(initial)));
  expect(finished.scores.reduce((a, b) => a + b)).toBe(finished.hand.result.points);
  expect(() => transitionEuchreSession(finished, { type: "next-trick" })).toThrow();
  expect(() => play(finished, "AS")).toThrow();
  expect(replayEuchreHand(finished)).toEqual(initial);
  const next = transitionEuchreSession(finished, { type: "next-hand", seed: 67 });
  expect(next.scores).toEqual(finished.scores);
  expect(next.hand.dealer).toBe((finished.hand.dealer + 1) % 4);
  const afterCall = discard(call(next));
  expect(replayEuchreHand(afterCall)).toEqual(next);
  expect(() => transitionEuchreSession(next, { type: "next-hand", seed: 68 })).toThrow();
});

test("a full seeded game ends at ten and blocks further play or deals", () => {
  let session = createEuchreSession(77), hands = 0;
  while (!euchreComplete(session)) {
    expect(hands++).toBeLessThan(100);
    session = finishHand(session);
    if (!euchreComplete(session)) session = transitionEuchreSession(session, { type: "next-hand", seed: 77 + hands });
  }
  expect(session.scores.some(score => score >= 10)).toBe(true);
  expect(session.hand.phase).toBe("complete");
  expect(() => transitionEuchreSession(session, { type: "next-hand", seed: 88 })).toThrow(/game is complete/);
  expect(() => replayEuchreHand(session)).toThrow(/game is complete/);
  expect(restoreEuchreSession(saveEuchreSession(session, stamp))).toEqual(session);
});

test("public observations omit the seed, kitty and other hands and cannot mutate the deal", () => {
  const session = discard(call(createEuchreSession(88))), snapshot = JSON.stringify(session);
  const position = euchrePosition(session.hand, 2);
  expect(position).not.toHaveProperty("seed");
  expect(position).not.toHaveProperty("kitty");
  expect(position).not.toHaveProperty("hands");
  position.hand[0].rank = "2";
  position.upcard.rank = "2";
  position.contract.trump = "C";
  position.calls[0].trump = "D";
  expect(JSON.stringify(session)).toBe(snapshot);
  expect(() => euchrePosition(session.hand, 4)).toThrow();
});

test("opponents see identical decisions when only concealed hands are rearranged", () => {
  const session = createEuchreSession(99), viewer = session.hand.turn;
  const other = structuredClone(session.hand);
  const hidden = [0, 1, 2, 3].filter(seat => seat !== viewer);
  [other.hands[hidden[0]], other.hands[hidden[1]]] = [other.hands[hidden[1]], other.hands[hidden[0]]];
  other.kitty.reverse(); other.seed = 123;
  expect(euchrePosition(other, viewer)).toEqual(euchrePosition(session.hand, viewer));
  expect(chooseEuchreAction(euchrePosition(other, viewer))).toEqual(chooseEuchreAction(euchrePosition(session.hand, viewer)));
});

test("policy makes legal, deterministic decisions across complete normal and lone hands", () => {
  for (let seed = 0; seed < 100; seed++) {
    const initial = createEuchreSession(seed);
    const normal = finishHand(initial);
    expect(normal).toEqual(finishHand(createEuchreSession(seed)));
    expect(new Set(cardsInHand(normal.hand).map(card => card.id)).size).toBe(24);
    const lone = finishHand(discard(call(initial, initial.hand.upcard.suit, true)));
    expect(lone.hand.completedTricks).toHaveLength(5);
    expect(lone.hand.completedTricks.every(trick => trick.cards.length === 3)).toBe(true);
    expect(lone.hand.hands[euchrePartner(lone.hand.contract.maker)]).toHaveLength(5);
  }
});

test("save/resume reconstructs calling, dealer discard, play, review, settlement and passed-out phases", () => {
  const initial = createEuchreSession(12);
  const ordered = call(initial), playing = discard(ordered);
  let reviewed = playing;
  while (reviewed.hand.phase === "playing") reviewed = transitionEuchreSession(reviewed, chooseEuchreAction(euchrePosition(reviewed.hand, reviewed.hand.turn)));
  let passedOut = initial;
  for (let i = 0; i < 8; i++) passedOut = pass(passedOut);
  for (const session of [initial, pass(initial), ordered, playing, reviewed, finishHand(playing), passedOut]) {
    const saved = saveEuchreSession(session, stamp);
    expect(restoreEuchreSession(saved)).toEqual(session);
    expect(normalizeEuchreSave(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  }
});

test("save validation rejects illegal histories, malformed actions, dates and deals", () => {
  const saved = saveEuchreSession(createEuchreSession(14), stamp);
  for (const patch of [{ version: 2 }, { initialSeed: -1 }, { initialDealer: 4 }, { savedAt: "not a date" },
    { events: [{ type: "play-card", cardId: "AS" }] }, { events: [{ type: "call", trump: "NT" }] },
    { events: [{ type: "discard", cardId: "2C" }] }, { events: [{ type: "next-trick" }] },
    { events: [{ type: "pass", hidden: true }] }, { events: [{ type: "call", trump: "S", alone: "yes" }] },
    { events: Array.from({ length: 20001 }, () => ({ type: "pass" })) }]) expect(normalizeEuchreSave({ ...saved, ...patch })).toBeNull();
  const active = discard(call(createEuchreSession(15)));
  const persisted = saveEuchreSession(active, stamp);
  persisted.events[0].trump = "X";
  expect(active.events[0].trump).not.toBe("X");
});

test("Euchre storage uses the shared save factory without overwriting another game", () => {
  const values = new Map([["barbu.savedWhistRun.v1", "untouched"]]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const store = createEuchreSaveStore(() => storage), saved = saveEuchreSession(createEuchreSession(16), stamp);
  store.write(saved);
  expect(store.load()).toEqual(saved);
  expect(values.get("barbu.savedWhistRun.v1")).toBe("untouched");
  expect(values.has(euchreSaveKey)).toBe(true);
});
