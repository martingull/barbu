import { expect, test } from "@playwright/test";
import { get } from "svelte/store";
import { standardDeck } from "../../src/domain/deck";
import { bridgeOpeningCall, bridgeHighCardPoints, suggestBridgeCall } from "../../src/domain/bridgeBidding";
import { bridgeAuctionStatus, bridgeLegalCallOptions, bridgeSuggestedCallForHand, normalizeBridgeCall } from "../../src/domain/bridgeAuction";
import { createBridgeSession, transitionBridgeSession } from "../../src/domain/bridgeSession";
import { trickTakingSeats as seats } from "../../src/domain/trickTakingScore";
import { bridgeActiveHand } from "../../src/features/bridge/bridgePresentation";
import { explainBridgeCall } from "../../src/features/bridge/bridgeBidExplanation";
import { createBridgeFeature } from "../../src/features/bridge/bridgeFeature";
import { bridgeSaveKey, normalizeBridgeSave, restoreBridgeSession, saveBridgeSession } from "../../src/persistence/bridgeSave";
import { bridgeChoiceSteps } from "../../src/lessons/bridge/learning";
import { bridgeCoursesFor } from "../../src/lessons/bridge/courses";
import { bridgeDefinitionFor } from "../../src/games/bridge";
import type { BridgeAuctionCall } from "../../src/domain/types";

const acol = "acol-foundation";
const cards = (ids: string) => ids.split(" ").map(id => standardDeck().find(card => card.id === id)!);
const auction = (calls: string[], dealer = 0): BridgeAuctionCall[] => calls.map((call, i) => ({ seat: seats[(dealer + i) % 4], call }));
const suggest = (hand: string, calls: string[], dealer = 0) => {
  const history = auction(calls, dealer), seat = seats[(dealer + calls.length) % 4];
  return suggestBridgeCall(cards(hand), seat, history, bridgeLegalCallOptions(history, seat, dealer), acol);
};

test("Acol lessons agree with live policy at every seat and card ordering", () => {
  let positions = 0;
  for (const topic of ["bidding", "responding", "support", "rebidding", "stayman"] as const) {
    const steps = bridgeChoiceSteps(topic, acol);
    expect(steps.map(step => step.teaching.stage)).toEqual(["worked", "supported", "independent"]);
    expect(steps[2].teaching.guidance).toBeUndefined();
    for (const original of steps) {
      expect(original.hand).not.toEqual(original.followUp!.hand);
      expect(original.followUp!.followUp).toBeUndefined();
      for (const step of [original, original.followUp!]) {
        positions++;
        expect(step.hand.every(Boolean)).toBe(true);
        expect(new Set(step.hand.map(card => card.id)).size).toBe(13);
        expect(step.hand).toHaveLength(13);
        expect(step.contextDetail).toContain(`${bridgeHighCardPoints(step.hand)} HCP`);
        for (let rotation = 0; rotation < 4; rotation++) {
          const history = step.auction!.map(call => ({ ...call, seat: seats[(seats.indexOf(call.seat) + rotation) % 4] }));
          const seat = seats[(2 + rotation) % 4];
          const dealer = history[0]?.seat ?? seat;
          const legal = bridgeLegalCallOptions(history, seat, seats.indexOf(dealer));
          expect(step.options.every(option => legal.includes(option.id)), step.id).toBe(true);
          for (const hand of [step.hand, [...step.hand].reverse()]) {
            expect(suggestBridgeCall(hand, seat, history, legal, acol), step.id).toBe(step.correct);
          }
        }
      }
    }
  }
  expect(positions).toBe(30);
});

test("Acol and Barbu Natural retain different openings on the same cards", () => {
  const weakNt = cards("AS 8S 3S QH 7H 2H KD 9D 4D AC 8C 6C 2C");
  expect(bridgeOpeningCall(weakNt, acol)).toBe("1NT");
  expect(bridgeOpeningCall(weakNt)).toBe("1C");
  const fourHearts = cards("AS KS 8S 3S QH 7H 5H 2H JD 9D 6D 4D QC");
  expect(bridgeOpeningCall(fourHearts, acol)).toBe("1H");
  expect(bridgeOpeningCall(fourHearts)).toBe("Pass");
  const openingRanges = [
    ["AS 8S 3S KH 7H 2H QD 8D 4D QC 10C 6C 2C", "Pass"],
    ["AS 8S 3S KH 7H 2H QD 8D 4D KC 10C 6C 2C", "1NT"],
    ["AS QS 3S KH 8H 2H AD JD 7D 4D JC 6C 2C", "1D"],
    ["AS KS QS AH KH 2H AD 8D 7D 10C 6C 4C 2C", "2NT"],
    ["AS KS QS AH KH 2H AD JD 7D JC 6C 4C 2C", "2NT"],
    ["AS KS QS AH KH 2H AD 8D 7D KC 6C 4C 2C", "2C"],
    ["AS KS QS AH KH QH AD JD 7D KC 6C 4C 2C", "2C"]
  ];
  for (const [hand, call] of openingRanges) expect(bridgeOpeningCall(cards(hand), acol)).toBe(call);
  for (const [hand, call] of [
    ["KS QS 8S 9S 7S 2S 8H 3H 9D 4D 10C 6C 2C", "Pass"],
    ["KS QS JS 9S 7S 2S 8H 3H 9D 4D 10C 6C 2C", "2S"],
    ["KS QS JS 9S 7S 2S AH 3H 9D 4D 10C 6C 2C", "2S"],
    ["KS QS JS 9S 7S 2S AH 3H JD 4D 10C 6C 2C", "Pass"]
  ]) expect(bridgeOpeningCall(cards(hand), acol)).toBe(call);
});

test("Acol weak takeouts and Stayman have distinct meanings and continuations", () => {
  const weakDiamonds = "KS 2S QH 3H JD 10D 9D 7D 4D 3D 10C 6C 2C";
  expect(suggest(weakDiamonds, ["1NT", "Pass"])).toBe("2D");
  const noMajor = "AS 8S 3S QH 7H 2H KD 9D 4D AC 8C 6C 2C";
  const bothMajors = "AS QS 8S 3S KH 7H 5H 2H JD 9D 4D QC 8C";
  const spades = "AS QS 8S 3S KH 7H 2H JD 9D 4D QC 8C 2C";
  for (const [hand, reply] of [[noMajor, "2D"], [bothMajors, "2H"], [spades, "2S"]]) {
    expect(suggest(hand, ["1NT", "Pass", "2C", "Pass"])).toBe(reply);
  }
  const history = auction(["1NT", "Pass", "2C", "Pass"]);
  expect(explainBridgeCall("2D", history, "Tutor", acol)).toContain("no four-card major");
  expect(explainBridgeCall("2C", auction(["1NT", "Pass"]), "You", acol)).toContain("Stayman");
  expect(explainBridgeCall("2D", auction(["2C", "Pass"]), "You", acol)).toContain("waiting");
  expect(explainBridgeCall("2NT", [], "You", acol)).toContain("20-22");
  expect(suggest(bothMajors, ["1NT", "Pass", "2C", "Pass", "2H", "Pass", "2NT", "Pass"])).toBe("3S");
  expect(suggest(bothMajors, ["1NT", "Pass", "2C", "Pass", "2H", "Pass", "3NT", "Pass"])).toBe("4S");
  expect(suggest(bothMajors, ["1NT", "Pass", "2C", "Pass", "2H", "Pass", "3S", "Pass"])).toBe("4S");
  for (const [hand, expected] of [
    ["AS 8S 3S KH 7H 2H QD 8D 4D KC 10C 6C 2C", "Pass"],
    [noMajor, "Pass"],
    ["AS QS 3S KH 8H 2H QD JD 4D QC 9C 6C 2C", "3NT"]
  ]) expect(suggest(hand, ["1NT", "Pass", "2NT", "Pass"])).toBe(expected);
  // A double changes the agreement too, despite not being a suit bid.
  expect(suggest(noMajor, ["1NT", "Double", "2C", "Pass"])).not.toBe("2D");
});

test("Acol continuations use the rebid range rather than the opening notrump range", () => {
  const ten = "KS 9S 4S AH 8H 2H QD 7D 3D JC 9C 5C 2C";
  const nine = "AS 8S 3S QH 7H 2H KD 9D 4D 10C 8C 6C 2C";
  expect(suggest(ten, ["1D", "Pass", "1H", "Pass", "1NT", "Pass"])).toBe("3NT");
  expect(suggest(nine, ["1D", "Pass", "1H", "Pass", "1NT", "Pass"])).toBe("2NT");
  const fifteen = "AS QS 3S KH 8H 2H AD JD 7D 4D JC 6C 2C";
  const sixteen = "AS QS 3S KH 8H 2H AD JD 7D 4D QC 6C 2C";
  expect(suggest(fifteen, ["1D", "Pass", "1H", "Pass", "1NT", "Pass", "2NT", "Pass"])).toBe("Pass");
  expect(suggest(sixteen, ["1D", "Pass", "1H", "Pass", "1NT", "Pass", "2NT", "Pass"])).toBe("3NT");
});

test("Acol boards finish legally, conserve cards, and retain the profile through save/replay/next", () => {
  for (let seed = 0; seed < 32; seed++) {
    let session = createBridgeSession(seed, seed + 1, acol);
    const dealer = seats.indexOf(session.fullHand.bridgeDealer!);
    for (let turns = 0; !bridgeAuctionStatus(session.auctionCalls, dealer).complete; turns++) {
      expect(turns).toBeLessThan(40);
      const call = bridgeSuggestedCallForHand(session.fullHand, session.auctionCalls, "You", acol);
      expect(bridgeLegalCallOptions(session.auctionCalls, "You", dealer)).toContain(call);
      session = transitionBridgeSession(transitionBridgeSession(session, { type: "select-call", call }), { type: "make-call" });
    }
    for (let i = 0; i < session.auctionCalls.length; i++) {
      const entry = session.auctionCalls[i];
      expect(bridgeLegalCallOptions(session.auctionCalls.slice(0, i), entry.seat, dealer)).toContain(normalizeBridgeCall(entry.call));
    }
    if (!bridgeAuctionStatus(session.auctionCalls, dealer).passedOut) {
      session = transitionBridgeSession(session, { type: "start-play" });
      const original = JSON.stringify(session.fullHand.hands);
      for (let turns = 0; session.fullHand.status !== "complete"; turns++) {
        expect(turns).toBeLessThan(60);
        session = transitionBridgeSession(session, session.fullHandReviewTrickCount ? { type: "next-trick" }
          : { type: "play-card", cardId: bridgeActiveHand(session.fullHand).legalCardIds[0] });
      }
      expect(new Set(session.fullHand.completedTricks.flatMap(trick => trick.cards.map(play => play.card.id))).size).toBe(52);
      const replay = transitionBridgeSession(session, { type: "replay" });
      expect(replay.biddingSystem).toBe(acol);
      expect(JSON.stringify(replay.fullHand.hands)).toBe(original);
    }
    const restored = normalizeBridgeSave(saveBridgeSession(session, "now"));
    expect(restored?.biddingSystem).toBe(acol);
    expect(restoreBridgeSession(restored!).auctionCalls).toEqual(session.auctionCalls);
    expect(transitionBridgeSession(session, { type: "next-hand", seed: seed + 1 }).biddingSystem).toBe(acol);
  }
});

test("legacy boards stay Natural and Acol's preference never reinterprets a saved auction", async () => {
  const legacy: Record<string, unknown> = { ...saveBridgeSession(createBridgeSession(8), "then") };
  delete legacy.biddingSystem;
  expect(normalizeBridgeSave(legacy)?.biddingSystem).toBe("barbu-natural");
  expect(normalizeBridgeSave({ ...legacy, biddingSystem: "unknown" })).toBeNull();
  const data = new Map([[bridgeSaveKey, JSON.stringify(legacy)]]);
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
  const options = { storage: () => storage, nextSeed: () => 8 };
  const feature = createBridgeFeature(options);
  feature.selectSystem(acol);
  expect(data.get(bridgeSaveKey)).toBe(JSON.stringify(legacy));
  const restored = createBridgeFeature(options);
  expect(get(restored.biddingSystem)).toBe(acol);
  restored.resume();
  expect(get(restored).session?.biddingSystem).toBe("barbu-natural");
  restored.selectSystem("barbu-natural");
  expect(get(restored.biddingSystem)).toBe(acol);
  restored.openTable();
  await restored.start();
  expect(get(restored).session?.biddingSystem).toBe(acol);
  const blocked = createBridgeFeature({ storage: () => { throw Error("unavailable"); }, nextSeed: () => 8 });
  blocked.selectSystem(acol);
  await blocked.start();
  expect(get(blocked).session?.biddingSystem).toBe(acol);
});

test("Acol shares cardplay progress but has separate, fully mapped bidding lessons", () => {
  const natural = bridgeDefinitionFor("barbu-natural"), definition = bridgeDefinitionFor(acol), courses = bridgeCoursesFor(acol);
  expect(natural.learnSteps).toHaveLength(7);
  expect(definition.learnSteps).toHaveLength(9);
  expect(courses.map(course => course.pathStepId)).toEqual(definition.learnSteps.map(step => step.id));
  expect(definition.learnSteps.filter(step => natural.learnSteps.some(other => step.id === other.id)).map(step => step.action))
    .toEqual(["contracts", "dummy", "declarer", "defense"]);
  expect(courses.every(Boolean)).toBe(true);
});
