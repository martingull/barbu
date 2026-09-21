import { test, expect } from "@playwright/test";
import fixture from "../fixtures/bridge-native-rules.json" with { type: "json" };
import { bridgeLegacyCases } from "../fixtures/bridgeLegacy";
import type { BridgeAuctionCall, BridgeStrain, BridgeVulnerability, FullHandState } from "../../src/lessonTypes";
import { bridgeAuctionStatus, bridgeFinalizeContract, bridgeLegalCallOptions } from "../../src/domain/bridgeAuction";
import { bridgeDuplicateScore } from "../../src/domain/bridgeScoring";
import { createBridgeSession, transitionBridgeSession, bridgeSessionSettlement, type BridgeSession } from "../../src/domain/bridgeSession";
import { bridgeHandEngine } from "../../src/domain/handEngine";
import { trickTakingSeats as seats } from "../../src/domain/trickTakingScore";
import { normalizeBridgeSave, saveBridgeSession, restoreBridgeSession } from "../../src/persistence/bridgeSave";

function auction(text: string, dealer: number): BridgeAuctionCall[] {
  return text ? text.split(" ").map((call, i) => ({ seat: seats[(dealer + i) % 4], call })) : [];
}
function contractSession(seed: number, declarer: number): BridgeSession {
  const session = createBridgeSession(seed, declarer + 1);
  return transitionBridgeSession({ ...session, auctionCalls: auction("1NT Pass Pass Pass", declarer) }, { type: "start-play" });
}
const legal = (hand: FullHandState) => hand.currentPlayerIndex === 2 ? hand.legalCardIds : hand.dummyLegalCardIds!;
function finish(session: BridgeSession): BridgeSession {
  for (let n = 0; n < 60 && session.fullHand.status !== "complete"; n++) {
    session = transitionBridgeSession(session, session.fullHandReviewTrickCount
      ? { type: "next-trick" } : { type: "play-card", cardId: legal(session.fullHand)[0] });
  }
  expect(session.fullHand.status).toBe("complete");
  return session;
}

test("Bridge resumes pre-migration v1 saves with identical next cards at all declarer seats", () => {
  for (const { saved, cardId, next } of bridgeLegacyCases) {
    const restored = normalizeBridgeSave(saved);
    expect(restored).not.toBeNull();
    expect(restored!.fullHand).toEqual(saved.fullHand);
    const session = transitionBridgeSession(restoreBridgeSession(restored!), { type: "next-trick" });
    expect(transitionBridgeSession(session, { type: "play-card", cardId }).fullHand).toEqual(next);
  }
});

test("Bridge auction legality, modifiers and contracts match frozen Rust results at every seat", () => {
  for (const sample of fixture.auctions) for (let dealer = 0; dealer < 4; dealer++) {
    const calls = auction(sample.calls, dealer);
    for (let n = 0; n <= calls.length; n++) {
      const { legal, ...status } = sample.steps[n];
      expect(bridgeAuctionStatus(calls.slice(0, n), dealer)).toMatchObject(status);
      expect(bridgeLegalCallOptions(calls.slice(0, n), seats[(dealer + n) % 4], dealer)).toEqual(legal);
      expect(bridgeLegalCallOptions(calls.slice(0, n), seats[(dealer + n + 1) % 4], dealer)).toEqual([]);
    }
    const hand = { ...bridgeHandEngine.start({ seed: 1, boardNumber: dealer + 1 }), bridgeVulnerability: "NS" as const };
    const result = bridgeFinalizeContract(calls, hand);
    const expected = sample.contract;
    expect(result).toEqual(expected ? { ...expected,
      declarer: seats[(expected.declarer + dealer) % 4], dummy: seats[(expected.dummy + dealer) % 4],
      openingLeader: seats[(expected.openingLeader + dealer) % 4], dealer: seats[dealer],
      declarerSide: (expected.declarer + dealer) % 2 === 0 ? "NS" : "EW" } : null);
  }
});

test("Bridge duplicate scores match Rust for all 2940 contract outcomes and both partnerships", () => {
  for (const row of fixture.scores) {
    const [level, strain, vulnerable, multiplier, scores] = row as [number, BridgeStrain, boolean, number, number[]];
    for (const declarer of ["You", "Left"] as const) {
      const side = declarer === "You" ? "NS" : "EW";
      const otherSide = side === "NS" ? "EW" : "NS";
      for (const vulnerability of (vulnerable ? [side, "Both"] : ["None", otherSide]) as BridgeVulnerability[]) {
        const contract = { level, strain, target: level + 6, label: "", declarer, dummy: declarer === "You" ? "Tutor" as const : "Right" as const,
          vulnerability, doubled: multiplier === 2, redoubled: multiplier === 4, declarerSide: side as "NS" | "EW" };
        expect(scores.map((_, tricks) => bridgeDuplicateScore(contract, tricks))).toEqual(scores);
        expect(scores.map((_, tricks) => bridgeDuplicateScore({ ...contract, declarerSide: undefined }, tricks))).toEqual(scores);
      }
    }
  }
});

test("Bridge sessions gate auction, opening lead, reviewed tricks and settlement immutably", () => {
  const initial = createBridgeSession(12, 3);
  const snapshot = JSON.stringify(initial);
  expect(initial.fullHand.hands.map(hand => hand.length)).toEqual([13, 13, 13, 13]);
  expect(transitionBridgeSession(initial, { type: "start-play" })).toBe(initial);
  expect(transitionBridgeSession(initial, { type: "play-card", cardId: initial.fullHand.playerHand[0].id })).toBe(initial);
  expect(bridgeHandEngine.transition(initial.fullHand, { type: "play-card", cardId: initial.fullHand.playerHand[0].id })).toBe(initial.fullHand);
  expect(transitionBridgeSession(initial, { type: "select-call", call: "8NT" })).toBe(initial);
  expect(transitionBridgeSession(initial, { type: "next-hand", seed: 44 })).toBe(initial);
  expect(JSON.stringify(initial)).toBe(snapshot);

  for (let seed = 0; seed < 32; seed++) {
    let session = contractSession(seed, seed % 4);
    const started = JSON.stringify(session);
    const startHand = session.fullHand;
    expect(transitionBridgeSession(session, { type: "start-play" })).toBe(session);
    expect(transitionBridgeSession(session, { type: "make-call" })).toBe(session);
    while (!session.fullHandReviewTrickCount && session.fullHand.status !== "complete") {
      session = transitionBridgeSession(session, { type: "play-card", cardId: legal(session.fullHand)[0] });
    }
    expect(transitionBridgeSession(session, { type: "play-card", cardId: legal(session.fullHand)[0] })).toBe(session);
    expect(startHand).toEqual(JSON.parse(started).fullHand);
    const complete = finish(session);
    const settlement = bridgeSessionSettlement(complete);
    expect(settlement.result!.tricks + settlement.result!.defenders).toBe(13);
    const replay = transitionBridgeSession(complete, { type: "replay" });
    expect(replay.fullHand).toEqual(startHand);
    expect(replay.scores).toEqual(complete.scores);
    expect(replay.results).toEqual([]);
    const next = transitionBridgeSession(complete, { type: "next-hand", seed: 200 });
    expect(next.scores).toEqual(settlement.scores);
    expect(next.results).toEqual([settlement.result]);
    expect(next.fullHand.bridgeBoardNumber).toBe((complete.fullHand.bridgeBoardNumber ?? 1) + 1);
    expect(transitionBridgeSession(next, { type: "next-hand", seed: 201 })).toBe(next);
  }
});

test("Bridge passed-out boards settle zero and move along the board schedule", () => {
  const session = { ...createBridgeSession(4, 2), auctionCalls: auction("Pass Pass Pass Pass", 1),
    scores: { ns: 90, ew: -90 } };
  expect(transitionBridgeSession(session, { type: "start-play" })).toBe(session);
  const next = transitionBridgeSession(session, { type: "next-hand", seed: 44 });
  expect(next.results).toHaveLength(1);
  expect(next.results[0]).toMatchObject({ passedOut: true, score: 0, handNumber: 2 });
  expect(next.scores).toEqual(session.scores);
  expect(next.fullHand).toMatchObject({ bridgeBoardNumber: 3, bridgeDealer: "You", bridgeVulnerability: "EW" });
});

test("Bridge natural auctions terminate legally without playing before the contract is confirmed", () => {
  for (let seed = 0; seed < 128; seed++) {
    let session = createBridgeSession(seed, seed + 1);
    const hands = JSON.stringify(session.fullHand.hands);
    const dealer = seed % 4;
    let calls = 0;
    while (!bridgeAuctionStatus(session.auctionCalls, dealer).complete && calls++ < 40) {
      expect(bridgeLegalCallOptions(session.auctionCalls, "You", dealer)).toContain(session.selectedCall);
      session = transitionBridgeSession(session, { type: "make-call" });
      expect(JSON.stringify(session.fullHand.hands)).toBe(hands);
    }
    expect(bridgeAuctionStatus(session.auctionCalls, dealer).complete).toBe(true);
    expect(normalizeBridgeSave(saveBridgeSession(session, ""))).not.toBeNull();
    if (!bridgeAuctionStatus(session.auctionCalls, dealer).passedOut) {
      const playing = transitionBridgeSession(session, { type: "start-play" });
      expect(playing.view).toBe("fullHand");
      expect(normalizeBridgeSave(saveBridgeSession(playing, ""))).not.toBeNull();
    }
  }
});

test("Bridge v1 saves restore auction, dummy turns, review and completed boards without trusting caches", () => {
  for (let dealer = 0; dealer < 4; dealer++) {
    const initial = createBridgeSession(8, dealer + 1);
    const saved = saveBridgeSession(initial, "legacy");
    expect(restoreBridgeSession(normalizeBridgeSave(saved)!)).toEqual(JSON.parse(JSON.stringify(initial)));
    let session = contractSession(8, dealer);
    for (let n = 0; n < 60; n++) {
      const saved = saveBridgeSession(session, "legacy");
      saved.usingBrowserFullHand = false;
      const restored = normalizeBridgeSave(JSON.parse(JSON.stringify(saved)));
      expect(restored, `dealer ${dealer}, turn ${session.fullHand.currentPlayer}, trick ${session.fullHand.trickNumber}`).not.toBeNull();
      expect(restored!.fullHand).toEqual(session.fullHand);
      if (session.fullHand.status === "complete") break;
      session = transitionBridgeSession(session, session.fullHandReviewTrickCount
        ? { type: "next-trick" } : { type: "play-card", cardId: legal(session.fullHand)[0] });
    }
  }
  const saved = saveBridgeSession(contractSession(8, 2), "");
  saved.fullHand.legalCardIds = ["invalid"];
  saved.fullHand.dummyHand = [];
  expect(normalizeBridgeSave(saved)!.fullHand).toEqual(contractSession(8, 2).fullHand);
  const old = JSON.parse(JSON.stringify(saved));
  delete old.fullHand.bridgeBoardNumber;
  expect(normalizeBridgeSave(old)!.fullHand.bridgeBoardNumber).toBe(1);
});

test("Bridge rejects malformed saves and impossible auctions instead of resuming a stuck board", () => {
  const saved = saveBridgeSession(contractSession(8, 2), "");
  for (const change of [
    (s: any) => { s.fullHand.hands[0][0] = s.fullHand.hands[1][0]; },
    (s: any) => { s.auctionCalls.push({ seat: "You", call: "Pass" }); },
    (s: any) => { s.auctionCalls[0].seat = "Tutor"; },
    (s: any) => { s.fullHand.bridgeContract.dummy = "Left"; },
    (s: any) => { s.fullHand.bridgeContract.level = 8; },
    (s: any) => { s.fullHand.currentPlayerIndex = 1; },
    (s: any) => { s.scores.ns = Infinity; }
  ]) {
    const corrupted = JSON.parse(JSON.stringify(saved));
    change(corrupted);
    expect(normalizeBridgeSave(corrupted)).toBeNull();
  }
});

test("Bridge restores legacy redouble flags and keeps historical board conditions until the next deal", () => {
  const session = contractSession(8, 2);
  session.auctionCalls = auction("1NT X XX Pass Pass Pass", 2);
  session.fullHand.bridgeVulnerability = "Both";
  session.fullHand.bridgeContract = { ...session.fullHand.bridgeContract!, vulnerability: "Both",
    doubled: true, redoubled: true, label: "1 No Trump redoubled" };
  const saved = saveBridgeSession(session, "legacy");
  const restored = normalizeBridgeSave(saved)!;
  expect(restored.fullHand.bridgeVulnerability).toBe("Both");
  expect(restored.fullHand.bridgeContract).toMatchObject({ doubled: false, redoubled: true, vulnerability: "Both" });
  const complete = finish(restoreBridgeSession(restored));
  const next = transitionBridgeSession(complete, { type: "next-hand", seed: 9 });
  expect(next.fullHand).toMatchObject({ bridgeBoardNumber: 4, bridgeDealer: "Left", bridgeVulnerability: "Both" });
});
