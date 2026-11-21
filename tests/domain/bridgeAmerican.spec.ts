import { expect, test } from "@playwright/test";
import { get } from "svelte/store";
import { standardDeck } from "../../src/domain/deck";
import { bridgeOpeningCall, suggestBridgeCall, bridgeHighCardPoints } from "../../src/domain/bridgeBidding";
import { bridgeAuctionStatus, bridgeLegalCallOptions, bridgeSuggestedCallForHand, normalizeBridgeCall } from "../../src/domain/bridgeAuction";
import { createBridgeSession, transitionBridgeSession } from "../../src/domain/bridgeSession";
import { bridgeNotrumpContext } from "../../src/domain/bridgeNotrump";
import { trickTakingSeats as seats } from "../../src/domain/trickTakingScore";
import type { BridgeAuctionCall } from "../../src/domain/types";
import { bridgeChoiceSteps } from "../../src/lessons/bridge/learning";
import { bridgeCoursesFor } from "../../src/lessons/bridge/courses";
import { bridgeDefinitionFor } from "../../src/games/bridge";
import { bridgeActiveHand } from "../../src/features/bridge/bridgePresentation";
import { explainBridgeCall } from "../../src/features/bridge/bridgeBidExplanation";
import { createBridgeFeature } from "../../src/features/bridge/bridgeFeature";
import { bridgeSaveKey, normalizeBridgeSave, saveBridgeSession } from "../../src/persistence/bridgeSave";

const system = "standard-american";
const cards = (ids: string) => ids.split(" ").map(id => standardDeck().find(card => card.id === id)!);
const history = (calls: string[], dealer = 0): BridgeAuctionCall[] => calls.map((call, i) => ({ seat: seats[(dealer + i) % 4], call }));
function suggest(hand: string, calls: string[], dealer = 0) {
  const auction = history(calls, dealer), seat = seats[(dealer + calls.length) % 4];
  return suggestBridgeCall(cards(hand), seat, auction, bridgeLegalCallOptions(auction, seat, dealer), system);
}

test("Standard American lessons have legal engine-matched answers at every seat", () => {
  for (const topic of ["bidding", "responding", "support", "rebidding", "stayman", "transfers"] as const) {
    const steps = bridgeChoiceSteps(topic, system);
    expect(steps.map(step => step.teaching.stage)).toEqual(["worked", "supported", "independent"]);
    for (const base of steps) for (const step of [base, base.followUp!]) {
      expect(step.hand).toHaveLength(13);
      expect(new Set(step.hand.map(card => card.id)).size).toBe(13);
      expect(step.contextDetail).toContain("Standard American Foundation");
      for (let rotation = 0; rotation < 4; rotation++) {
        const calls = step.auction!.map(call => ({ ...call, seat: seats[(seats.indexOf(call.seat) + rotation) % 4] }));
        const seat = seats[(2 + rotation) % 4], dealer = seats.indexOf(calls[0]?.seat ?? seat);
        const legal = bridgeLegalCallOptions(calls, seat, dealer);
        expect(step.options.every(option => legal.includes(option.id)), step.id).toBe(true);
        for (const hand of [step.hand, [...step.hand].reverse()]) expect(suggestBridgeCall(hand, seat, calls, legal, system), step.id).toBe(step.correct);
      }
    }
  }
});

test("Jacoby transfers describe length first and strength only after acceptance", () => {
  const weak = "QS 8S 3S KH 9H 7H 5H 2H JD 8D 4D 6C 2C";
  const invite = "KS 8S 3S QH JH 7H 5H 2H QD 8D 4D 6C 2C";
  const game = "KS 8S 3S AH JH 7H 5H 2H QD 8D 4D 6C 2C";
  for (const hand of [weak, invite, game]) expect(suggest(hand, ["1NT", "Pass"])).toBe("2D");
  const accepted = ["1NT", "Pass", "2D", "Pass", "2H", "Pass"];
  expect(suggest(weak, accepted)).toBe("Pass");
  expect(suggest(invite, accepted)).toBe("2NT");
  expect(suggest(game, accepted)).toBe("3NT");
  const opener = "AS 3S KH QH 8H AD JD 7D 4D QC 9C 6C 2C";
  expect(suggest(opener, ["1NT", "Pass", "2H", "Pass"])).toBe("2S");
  expect(explainBridgeCall("2H", history(["1NT", "Pass"]), "You", system)).toContain("spades");
  expect(explainBridgeCall("2NT", history(accepted), "You", system)).toContain("8-9");
  expect(explainBridgeCall("2H", history(["1NT", "Pass"]), "You", "acol-foundation")).toContain("sign-off");
});

test("transfers choose the correct strain after invitations and superaccepts", () => {
  const maximumFit = "AS QS 3S KH QH 8H 2H AD JD 7D JC 6C 2C";
  expect(bridgeHighCardPoints(cards(maximumFit))).toBe(17);
  expect(suggest(maximumFit, ["1NT", "Pass", "2D", "Pass"])).toBe("3H");
  const invite = "KS 8S 3S QH JH 7H 5H 2H QD 8D 4D 6C 2C";
  expect(suggest(invite, ["1NT", "Pass", "2D", "Pass", "3H", "Pass"])).toBe("4H");
  const minimumFit = "AS 3S KH 8H 2H AD JD 7D 4D QC 9C 6C 2C";
  expect(suggest(minimumFit, ["1NT", "Pass", "2D", "Pass", "2H", "Pass", "2NT", "Pass"])).toBe("3H");
  expect(suggest(minimumFit, ["1NT", "Pass", "2D", "Pass", "2H", "Pass", "3NT", "Pass"])).toBe("4H");
});

test("notrump conventions are contextual, survive doubles, and do not attach to natural rebids", () => {
  const spades = "KS QS 8S 5S 3S AH 7H 2H JD 9D 4D 6C 2C";
  expect(suggest(spades, ["1NT", "Double"])).toBe("2H");
  expect(bridgeNotrumpContext(history(["1NT", "2S"]), "You", system)).toBeNull();
  expect(bridgeNotrumpContext(history(["1D", "Pass", "1H", "Pass", "1NT", "Pass"]), "You", system)).toBeNull();
  expect(bridgeNotrumpContext(history(["2C", "Pass", "2D", "Pass", "2NT", "Pass"]), "You", system)).toMatchObject({ minimum: 22, maximum: 24, level: 3 });
  expect(suggest(spades, ["2NT", "Pass"])).toBe("3H");
  expect(suggest(spades, ["2C", "Pass", "2D", "Pass", "2NT", "Pass"])).toBe("3H");
});

test("strong responses, weak-two enquiries and Jacoby raises are not misread as natural notrump", () => {
  const positive = "KS QS 8S 5S 3S AH 7H 2H JD 9D 4D 6C 2C";
  expect(suggest(positive, ["2C", "Pass"])).toBe("2S");
  const weakTwo = "AS KS JS 9S 7S 2S 8H 3H KD 4D 10C 6C 2C";
  expect(suggest(weakTwo, ["2S", "Pass", "2NT", "Pass"])).toBe("3D");
  const support = "AS 8S 3S QH 7H 5H 2H KD 9D 4D AC 8C 2C";
  expect(suggest(support, ["1H", "Pass"])).toBe("2NT");
  expect(explainBridgeCall("2NT", history(["1H", "Pass"]), "You", system)).toContain("Jacoby 2NT");
  const opening = "AS KS 3S KH QH JH 8H 2H AD 7D 4D JC 2C";
  expect(suggest(opening, ["1H", "Pass", "2NT", "Pass"])).toBe("3H");
  const minimum = "KS 9S 3S AH QH 8H 5H 2H KD 7D 4D JC 2C";
  expect(suggest(minimum, ["1H", "Pass", "2NT", "Pass"])).toBe("4H");
  expect(suggest(support, ["1H", "Pass", "2NT", "Pass", "4H", "Pass"])).toBe("Pass");
});

test("foundation rebids avoid unsupported slams and do not invent a second-major fit", () => {
  const strong = "AS KS QS AH KH QH AD KD 7D KC 9C 6C 2C";
  expect(bridgeHighCardPoints(cards(strong))).toBe(28);
  expect(suggest(strong, ["2C", "Pass", "2D", "Pass"])).toBe("3NT");
  const threeSpades = "KS 8S 3S QH 7H 5H 2H QD 9D 4D QC 8C 2C";
  expect(suggest(threeSpades, ["1D", "Pass", "1H", "Pass", "1S", "Pass"])).toBe("2NT");
});

test("both named profiles retain legal auctions, card conservation and save/next-board agreement", () => {
  for (const profile of [system, "acol-foundation"] as const) for (let seed = 0; seed < 32; seed++) {
    let session = createBridgeSession(seed, seed + 1, profile);
    const dealer = seats.indexOf(session.fullHand.bridgeDealer!);
    for (let turns = 0; !bridgeAuctionStatus(session.auctionCalls, dealer).complete; turns++) {
      expect(turns, `seed ${seed}`).toBeLessThan(40);
      const call = bridgeSuggestedCallForHand(session.fullHand, session.auctionCalls, "You", profile);
      expect(bridgeLegalCallOptions(session.auctionCalls, "You", dealer)).toContain(call);
      session = transitionBridgeSession(transitionBridgeSession(session, { type: "select-call", call }), { type: "make-call" });
    }
    session.auctionCalls.forEach((entry, i) => expect(bridgeLegalCallOptions(session.auctionCalls.slice(0, i), entry.seat, dealer)).toContain(normalizeBridgeCall(entry.call)));
    if (!bridgeAuctionStatus(session.auctionCalls, dealer).passedOut) {
      session = transitionBridgeSession(session, { type: "start-play" });
      for (let turns = 0; session.fullHand.status !== "complete"; turns++) {
        expect(turns).toBeLessThan(60);
        session = transitionBridgeSession(session, session.fullHandReviewTrickCount ? { type: "next-trick" }
          : { type: "play-card", cardId: bridgeActiveHand(session.fullHand).legalCardIds[0] });
      }
      expect(new Set(session.fullHand.completedTricks.flatMap(trick => trick.cards.map(play => play.card.id))).size).toBe(52);
    }
    expect(normalizeBridgeSave(saveBridgeSession(session, "now"))?.biddingSystem).toBe(profile);
    expect(transitionBridgeSession(session, { type: "next-hand", seed: seed + 1 }).biddingSystem).toBe(profile);
  }
});

test("new tables default to Standard American without upgrading a legacy board or preference", async () => {
  const legacy: Record<string, unknown> = { ...saveBridgeSession(createBridgeSession(8), "then") };
  delete legacy.biddingSystem;
  const data = new Map([[bridgeSaveKey, JSON.stringify(legacy)]]);
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
  const options = { storage: () => storage, nextSeed: () => 8 };
  const feature = createBridgeFeature(options);
  expect(get(feature.biddingSystem)).toBe(system);
  feature.resume();
  expect(get(feature).session?.biddingSystem).toBe("barbu-natural");
  feature.openTable();
  await feature.start();
  expect(get(feature).session?.biddingSystem).toBe(system);
  data.set("barbu.bridgeBiddingSystem.v1", JSON.stringify("barbu-natural"));
  expect(get(createBridgeFeature(options).biddingSystem)).toBe("barbu-natural");
});

test("American learning has ten topics and does not inherit another profile's bidding credit", () => {
  const definition = bridgeDefinitionFor(system), acol = bridgeDefinitionFor("acol-foundation"), courses = bridgeCoursesFor(system);
  expect(definition.learnSteps).toHaveLength(10);
  expect(courses.map(course => course.pathStepId)).toEqual(definition.learnSteps.map(step => step.id));
  expect(courses.every(course => course.concept.body && course.review.body)).toBe(true);
  expect(definition.learnSteps.filter(step => acol.learnSteps.some(other => step.id === other.id))).toHaveLength(4);
  expect(definition.learnSteps.filter(step => step.id.startsWith("bridge-american-"))).toHaveLength(6);
});
